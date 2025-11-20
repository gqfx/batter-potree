/**
 * Better Potree Playground
 *
 * 这个示例展示如何使用 better-potree 加载和渲染点云
 */

import './style.css';
import type { IPointCloudOctree } from '@better-potree/core';
import { ThreeJsRenderer, ThreeScene } from '@better-potree/rendering-three';
import { EarthControls, PotreeLoader, ViewerAPI } from '@better-potree/viewer';
import * as THREE from 'three';
import { debugSystem as debug, LogCategory } from './debugger';

debug.info(LogCategory.INIT, 'Better Potree Playground - 初始化中...');
console.log('Better Potree Playground - 初始化中...');

// 获取 DOM 元素
const container = document.getElementById('viewer-container');
const canvas = document.getElementById('viewer') as HTMLCanvasElement;
const infoPanel = document.getElementById('info');
const controlsPanel = document.getElementById('controls');

if (!container || !canvas) {
  debug.error(LogCategory.INIT, 'Required DOM elements not found');
  throw new Error('Required DOM elements not found');
}

debug.info(LogCategory.INIT, 'DOM elements found', { container, canvas });

// 创建渲染器和场景
debug.info(LogCategory.INIT, 'Creating renderer and scene...');
const renderer = new ThreeJsRenderer({ canvas });
const scene = new ThreeScene();
debug.info(LogCategory.INIT, 'Renderer and scene created');

// 创建相机
debug.info(LogCategory.CAMERA, 'Creating camera...');
const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(10, 10, 10);
camera.lookAt(0, 0, 0);
debug.info(LogCategory.CAMERA, 'Camera created', {
  position: camera.position,
  aspect: camera.aspect,
});

// 创建 Viewer
// ThreeJsRenderer 现在已经实现了正确的 IRenderer 接口(来自 @better-potree/core)
debug.info(LogCategory.VIEWER, 'Creating Viewer API...');
const viewer = new ViewerAPI({
  container,
  renderer: renderer as any, // ThreeJsRenderer 实现了 IRenderer 接口
  scene,
  camera,
  pointBudget: 1_000_000,
  pointSize: 5.0, // 增大点大小，方便查看
  edlEnabled: false, // 暂时禁用 EDL，简化调试
  backgroundColor: 0x000000,
  // 使用从 public 目录提供的 Worker 文件
  workerUrl: '/BinaryDecoderWorker.js',
});
debug.info(LogCategory.VIEWER, 'Viewer API created', {
  pointBudget: viewer.getPointBudget(),
  pointSize: viewer.getPointSize(),
  edlEnabled: viewer.getEDLConfig().enabled,
});

// 将对象暴露到全局,方便调试
(window as any).viewerAPI = viewer;
(window as any).threeScene = scene;
(window as any).threeCamera = camera;
(window as any).threeRenderer = renderer;

// 检查 Worker Pool 状态
const streamingSystem = viewer.getStreamingSystem();
const hasWorkerPool = !!(streamingSystem as any).config?.workerPool;
debug.info(LogCategory.VIEWER, 'Worker Pool status', {
  hasWorkerPool,
  streamingSystemExists: !!streamingSystem,
});
console.log('[DEBUG] StreamingSystem config:', (streamingSystem as any).config);

// 测试 Worker 是否能被创建
try {
  console.log('[DEBUG] Testing simple worker...');
  const simpleWorker = new Worker('/test-worker.js');
  simpleWorker.addEventListener('message', (event) => {
    console.log('[DEBUG] Simple worker message:', event.data);
  });
  simpleWorker.addEventListener('error', (event) => {
    console.error('[DEBUG] Simple worker error:', event);
  });
  simpleWorker.postMessage({ test: 'simple' });

  console.log('[DEBUG] Testing BinaryDecoderWorker...');
  const testWorker = new Worker('/BinaryDecoderWorker.js');
  testWorker.addEventListener('message', (event) => {
    console.log('[DEBUG] Test worker message:', event.data);
  });
  testWorker.addEventListener('error', (event) => {
    console.error('[DEBUG] Test worker error:', event);
  });
  console.log('[DEBUG] Test worker created successfully:', testWorker);
  // 发送测试消息
  testWorker.postMessage({ test: true });
} catch (error) {
  console.error('[DEBUG] Failed to create test worker:', error);
}

// 创建控制器
debug.info(LogCategory.CAMERA, 'Creating EarthControls...');
const controls = new EarthControls(camera, canvas);
controls.rotationSpeed = 0.5;
controls.zoomSpeed = 1.0;
controls.fadeFactor = 10;
debug.info(LogCategory.CAMERA, 'EarthControls created');

// 创建加载器
const loader = new PotreeLoader();

// 添加 Viewer 事件监听用于调试
debug.info(LogCategory.VIEWER, 'Setting up Viewer event listeners...');

viewer.on('pointcloud-loaded', ({ pointCloud, name }) => {
  debug.info(LogCategory.LOADER, '点云加载完成', {
    name,
    version: pointCloud.version,
    numPoints: pointCloud.root?.numPoints,
    boundingBox: pointCloud.boundingBox,
    spacing: pointCloud.spacing,
  });
});

viewer.on('node-loaded', ({ pointCloud, node, data }) => {
  console.log('[DEBUG] Node loaded:', node.name, 'numPoints:', data.numPoints);
  debug.debug(LogCategory.STREAMING, '节点加载完成', {
    nodeName: node.name,
    numPoints: data.numPoints,
    level: node.level,
    attributeKeys: Object.keys(data.attributeBuffers || {}),
  });

  // 更新调试统计
  const loadedNodes = viewer.getLoadedNodesCount();
  const totalPoints = viewer.getTotalPointsLoaded();
  debug.updateStats({
    loadedNodes,
    visiblePoints: totalPoints,
  });

  // 检查场景中的节点数量
  const pcScenes = viewer.getPointCloudScenes();
  if (pcScenes.length > 0) {
    console.log('[DEBUG] After node load - PointCloudScene children:', pcScenes[0].children.length);
    console.log('[DEBUG] After node load - PointCloudScene nodeCount:', pcScenes[0].nodeCount);
  }
});

viewer.on('node-load-failed', ({ node, error, retries }) => {
  console.error('[DEBUG] Node load failed:', node.name, 'error:', error, 'retries:', retries);
  debug.error(LogCategory.STREAMING, '节点加载失败', {
    nodeName: node.name,
    level: node.level,
    error: error.message,
    retries,
  });

  // 更新失败请求统计
  const stats = viewer.getStreamingSystem().getStats();
  debug.updateStats({
    failedRequests: stats.failedRequests,
  });
});

viewer.on('render', () => {
  // 每帧更新可见节点统计
  try {
    const traversal = viewer.getTraversalSystem();
    const result = traversal?.getLastResult();
    const streaming = viewer.getStreamingSystem();
    const streamingStats = streaming?.getStats();

    debug.updateStats({
      visibleNodes: result?.visibleNodes?.length ?? 0,
      visiblePoints: result?.totalPoints ?? 0,
      pendingRequests: streamingStats?.pendingRequests ?? 0,
      completedRequests: streamingStats?.completedLoads ?? 0,
    });
  } catch (error) {
    console.error('[DEBUG] render 事件处理出错:', error);
  }
});

// 每秒输出一次渲染状态（用于调试）
let lastDebugTime = 0;
viewer.on('update', () => {
  const now = performance.now();
  if (now - lastDebugTime > 2000) { // 每2秒
    lastDebugTime = now;

    try {
      const pointClouds = viewer.getPointClouds();
      const traversal = viewer.getTraversalSystem();
      const streaming = viewer.getStreamingSystem();
      const result = traversal?.getLastResult();
      const streamingStats = streaming?.getStats();

      debug.info(LogCategory.RENDER, '渲染状态检查', {
        pointCloudCount: pointClouds?.length ?? 0,
        visibleNodes: result?.visibleNodes?.length ?? 0,
        totalPoints: result?.totalPoints ?? 0,
        pendingRequests: streamingStats?.pendingRequests ?? 0,
        activeLoads: streamingStats?.activeLoads ?? 0,
        completedLoads: streamingStats?.completedLoads ?? 0,
        failedLoads: streamingStats?.failedLoads ?? 0,
      });

      // 检查点云是否在场景中
      if (pointClouds && pointClouds.length > 0) {
        const pc = pointClouds[0];
        debug.debug(LogCategory.RENDER, '点云详情', {
          url: pc.url,
          rootLoaded: pc.root?.loaded,
          rootLoading: pc.root?.loading,
          rootNumPoints: pc.root?.numPoints,
          rootChildren: pc.root?.children?.filter(c => c !== null).length ?? 0,
        });
      }
    } catch (error) {
      console.error('[DEBUG] 渲染状态检查出错:', error);
    }
  }
});

debug.info(LogCategory.VIEWER, 'Viewer event listeners configured');

// 添加环境光和方向光
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// 添加网格辅助
const gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);

// 添加坐标轴辅助
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

// 更新信息面板
let lastUpdateTime = performance.now();
let currentFPS = 60;

function updateInfo() {
  if (!infoPanel) return;

  // 计算 FPS
  const now = performance.now();
  const delta = now - lastUpdateTime;
  if (delta > 0) {
    currentFPS = Math.round(1000 / delta);
  }
  lastUpdateTime = now;

  infoPanel.innerHTML = `
    <div class="info-section">
      <h2>Better Potree Playground</h2>
      <div class="info-item">
        <span class="label">FPS:</span>
        <span class="value">${currentFPS}</span>
      </div>
      <div class="info-item">
        <span class="label">点预算:</span>
        <span class="value">${viewer.getPointBudget().toLocaleString()}</span>
      </div>
      <div class="info-item">
        <span class="label">点大小:</span>
        <span class="value">${viewer.getPointSize().toFixed(1)}</span>
      </div>
      <div class="info-item">
        <span class="label">相机位置:</span>
        <span class="value">
          (${camera.position.x.toFixed(1)},
           ${camera.position.y.toFixed(1)},
           ${camera.position.z.toFixed(1)})
        </span>
      </div>
      <div class="info-item">
        <span class="label">已加载点云:</span>
        <span class="value">${viewer.getPointClouds().length}</span>
      </div>
    </div>
  `;
}

// 创建控制面板
function createControlsPanel() {
  if (!controlsPanel) return;

  controlsPanel.innerHTML = `
    <div class="controls-section">
      <h3>渲染控制</h3>

      <div class="control-group">
        <label for="point-size">点大小</label>
        <input
          type="range"
          id="point-size"
          min="0.1"
          max="5"
          step="0.1"
          value="${viewer.getPointSize()}"
        />
        <span id="point-size-value">${viewer.getPointSize().toFixed(1)}</span>
      </div>

      <div class="control-group">
        <label for="point-budget">点预算 (万)</label>
        <input
          type="range"
          id="point-budget"
          min="10"
          max="500"
          step="10"
          value="${viewer.getPointBudget() / 10000}"
        />
        <span id="point-budget-value">${(viewer.getPointBudget() / 10000).toFixed(0)}</span>
      </div>

      <div class="control-group">
        <label>
          <input type="checkbox" id="edl-enabled" ${viewer.getEDLConfig().enabled ? 'checked' : ''} />
          启用 EDL
        </label>
      </div>

      <div class="control-group">
        <label>
          <input type="checkbox" id="grid-helper" checked />
          显示网格
        </label>
      </div>

      <div class="control-group">
        <label>
          <input type="checkbox" id="axes-helper" checked />
          显示坐标轴
        </label>
      </div>
    </div>

    <div class="controls-section">
      <h3>相机控制</h3>

      <div class="control-group">
        <label for="rotation-speed">旋转速度</label>
        <input
          type="range"
          id="rotation-speed"
          min="0.1"
          max="2"
          step="0.1"
          value="${controls.rotationSpeed}"
        />
        <span id="rotation-speed-value">${controls.rotationSpeed.toFixed(1)}</span>
      </div>

      <div class="control-group">
        <label for="zoom-speed">缩放速度</label>
        <input
          type="range"
          id="zoom-speed"
          min="0.1"
          max="2"
          step="0.1"
          value="${controls.zoomSpeed}"
        />
        <span id="zoom-speed-value">${controls.zoomSpeed.toFixed(1)}</span>
      </div>

      <div class="control-group">
        <button id="reset-camera">重置相机</button>
      </div>
    </div>

    <div class="controls-section">
      <h3>点云加载</h3>

      <div class="control-group">
        <button id="load-local-folder" style="width: 100%; margin-bottom: 8px;">
          📁 选择本地文件夹
        </button>
      </div>

      <div class="control-group">
        <button id="load-test-data" style="width: 100%; margin-bottom: 8px;">
          🧪 加载测试数据
        </button>
      </div>

      <div class="control-group">
        <input
          type="text"
          id="pointcloud-url"
          placeholder="或输入点云 URL (cloud.js 或 metadata.json)"
          style="width: 100%; margin-bottom: 8px;"
        />
        <button id="load-pointcloud">加载远程点云</button>
      </div>

      <div class="info-text" id="load-status" style="display: none; margin-top: 8px; padding: 8px; background: rgba(0,255,0,0.1); border-radius: 4px;">
      </div>

      <div class="info-text">
        <p><strong>提示:</strong></p>
        <ul>
          <li>左键拖拽：旋转</li>
          <li>滚轮：缩放</li>
          <li>右键拖拽：平移</li>
        </ul>
      </div>
    </div>
  `;

  // 绑定事件
  const pointSizeSlider = document.getElementById('point-size') as HTMLInputElement;
  const pointSizeValue = document.getElementById('point-size-value');
  pointSizeSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    viewer.setPointSize(value);
    if (pointSizeValue) pointSizeValue.textContent = value.toFixed(1);
  });

  const pointBudgetSlider = document.getElementById('point-budget') as HTMLInputElement;
  const pointBudgetValue = document.getElementById('point-budget-value');
  pointBudgetSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value) * 10000;
    viewer.setPointBudget(value);
    if (pointBudgetValue) pointBudgetValue.textContent = (value / 10000).toFixed(0);
  });

  const edlCheckbox = document.getElementById('edl-enabled') as HTMLInputElement;
  edlCheckbox?.addEventListener('change', (e) => {
    viewer.setEDLEnabled((e.target as HTMLInputElement).checked);
  });

  const gridCheckbox = document.getElementById('grid-helper') as HTMLInputElement;
  gridCheckbox?.addEventListener('change', (e) => {
    gridHelper.visible = (e.target as HTMLInputElement).checked;
  });

  const axesCheckbox = document.getElementById('axes-helper') as HTMLInputElement;
  axesCheckbox?.addEventListener('change', (e) => {
    axesHelper.visible = (e.target as HTMLInputElement).checked;
  });

  const rotationSpeedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
  const rotationSpeedValue = document.getElementById('rotation-speed-value');
  rotationSpeedSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    controls.rotationSpeed = value;
    if (rotationSpeedValue) rotationSpeedValue.textContent = value.toFixed(1);
  });

  const zoomSpeedSlider = document.getElementById('zoom-speed') as HTMLInputElement;
  const zoomSpeedValue = document.getElementById('zoom-speed-value');
  zoomSpeedSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    controls.zoomSpeed = value;
    if (zoomSpeedValue) zoomSpeedValue.textContent = value.toFixed(1);
  });

  const resetButton = document.getElementById('reset-camera');
  resetButton?.addEventListener('click', () => {
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    controls.setPivot(new THREE.Vector3(0, 0, 0));
  });

  // 加载测试数据
  const loadTestDataButton = document.getElementById('load-test-data');
  const loadStatus = document.getElementById('load-status');

  loadTestDataButton?.addEventListener('click', async () => {
    // 使用代理服务器路径加载测试数据
    const testDataUrl = '/pointcloud/inchurch_colorized_las_converted/';

    debug.info(LogCategory.LOADER, '开始加载测试数据', { url: testDataUrl });

    try {
      if (loadStatus) {
        loadStatus.style.display = 'block';
        loadStatus.innerHTML = `正在加载测试数据...`;
        loadStatus.style.background = 'rgba(0,255,0,0.1)';
      }

      debug.debug(LogCategory.NETWORK, '发起加载请求', { url: testDataUrl });
      console.log('正在加载测试数据:', testDataUrl);

      // 使用 viewer.load() API 加载点云
      debug.info(LogCategory.LOADER, '调用 viewer.load()');
      const octree = await viewer.load(testDataUrl);

      debug.info(LogCategory.LOADER, '测试数据加载成功', {
        version: octree.version,
        root: octree.root ? '存在' : '不存在',
        numPoints: octree.root?.numPoints,
        boundingBox: octree.boundingBox,
        pointAttributes: octree.pointAttributes,
      });
      console.log('测试数据加载成功:', octree);

      // 调整相机以适应点云边界
      if (octree.boundingBox) {
        const boundingBox = octree.boundingBox;
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        debug.info(LogCategory.CAMERA, '调整相机位置以适应点云', {
          center,
          size,
          maxDim,
        });

        camera.position.copy(center);
        camera.position.z += maxDim * 2;
        camera.lookAt(center);
        controls.setPivot(center);

        // 隐藏网格和坐标轴（可选）
        gridHelper.visible = false;
        axesHelper.visible = false;
      } else {
        debug.warn(LogCategory.LOADER, '点云没有边界框信息');
      }

      // 检查点云是否已添加到 viewer
      const pointClouds = viewer.getPointClouds();
      debug.info(LogCategory.VIEWER, '当前 viewer 中的点云数量', {
        count: pointClouds.length,
        pointClouds: pointClouds.map(pc => ({
          name: pc.name,
          version: pc.version,
          hasRoot: !!pc.root,
        })),
      });

      // 调试：检查场景中的对象
      const threeScene = scene.getThreeScene();
      console.log('[DEBUG] Scene children count:', threeScene.children.length);
      console.log('[DEBUG] Scene children:', threeScene.children);

      // 检查 PointCloudScene
      const pcScenes = viewer.getPointCloudScenes();
      console.log('[DEBUG] PointCloudScenes:', pcScenes.length);
      if (pcScenes.length > 0) {
        const pcScene = pcScenes[0];
        console.log('[DEBUG] PointCloudScene children:', pcScene.children.length);
        console.log('[DEBUG] PointCloudScene material:', pcScene.material);
        console.log('[DEBUG] PointCloudScene material uniforms:', pcScene.material.uniforms);
        console.log('[DEBUG] PointCloudScene visible:', pcScene.visible);
        console.log('[DEBUG] PointCloudScene nodeCount:', pcScene.nodeCount);
        console.log('[DEBUG] PointCloudScene visiblePointCount:', pcScene.visiblePointCount);
      }

      if (loadStatus) {
        const numPoints = octree.root?.numPoints ?? 0;
        const size = octree.boundingBox?.getSize(new THREE.Vector3());
        loadStatus.innerHTML = `
          ✅ 测试数据加载成功<br>
          URL: ${testDataUrl}<br>
          版本: ${octree.version}<br>
          根节点点数: ${numPoints.toLocaleString()}<br>
          ${size ? `包围盒: (${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})<br>` : ''}
        `;
        loadStatus.style.background = 'rgba(0,255,0,0.1)';
      }

      // 5秒后检查加载状态
      setTimeout(() => {
        console.log('\n===== 5秒后状态检查 =====');
        const pcScenes2 = viewer.getPointCloudScenes();
        if (pcScenes2.length > 0) {
          const pcScene2 = pcScenes2[0];
          console.log('[DEBUG] PointCloudScene children:', pcScene2.children.length);
          console.log('[DEBUG] PointCloudScene nodeCount:', pcScene2.nodeCount);
          console.log('[DEBUG] PointCloudScene visiblePointCount:', pcScene2.visiblePointCount);

          if (pcScene2.children.length > 0) {
            console.log('[DEBUG] First child:', pcScene2.children[0]);
          }
        }

        const streamingStats2 = viewer.getStreamingSystem().getStats();
        console.log('[DEBUG] StreamingSystem stats:', streamingStats2);
        console.log('[DEBUG] Loaded nodes count:', viewer.getLoadedNodesCount());
        console.log('[DEBUG] Total points loaded:', viewer.getTotalPointsLoaded());
        console.log('========================\n');
      }, 5000);
    } catch (error) {
      debug.error(LogCategory.LOADER, '加载测试数据失败', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      console.error('加载测试数据失败:', error);

      if (loadStatus) {
        loadStatus.innerHTML = `❌ 加载失败: ${error instanceof Error ? error.message : String(error)}`;
        loadStatus.style.background = 'rgba(255,0,0,0.1)';
      }

      alert(`加载失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // 加载本地文件夹
  const loadFolderButton = document.getElementById('load-local-folder');

  loadFolderButton?.addEventListener('click', async () => {
    try {
      // 检查浏览器是否支持 File System Access API
      if (!('showDirectoryPicker' in window)) {
        alert(
          '您的浏览器不支持本地文件夹选择功能。\n请使用 Chrome 86+、Edge 86+ 或其他支持 File System Access API 的浏览器。',
        );
        return;
      }

      // 显示加载状态
      if (loadStatus) {
        loadStatus.style.display = 'block';
        loadStatus.innerHTML = '正在选择文件夹...';
      }

      // 打开文件夹选择器
      const directoryHandle = await (window as any).showDirectoryPicker({
        mode: 'read',
        startIn: 'documents',
      });

      console.log('已选择文件夹:', directoryHandle.name);

      if (loadStatus) {
        loadStatus.innerHTML = `正在扫描文件夹: ${directoryHandle.name}...`;
      }

      // 列出文件夹中的所有内容
      console.log('[文件夹扫描] 开始扫描文件夹结构...');
      const entries: { name: string; kind: string }[] = [];
      for await (const entry of (directoryHandle as any).values()) {
        entries.push({ name: entry.name, kind: entry.kind });
      }
      console.log('[文件夹扫描] 找到以下文件和文件夹:', entries);

      // 查找 metadata.json 或 cloud.js
      let metadataFile: File | null = null;
      let metadataFileName = '';

      for await (const entry of (directoryHandle as any).values()) {
        if (entry.kind === 'file') {
          const name = entry.name.toLowerCase();
          if (name === 'metadata.json' || name === 'cloud.js') {
            const fileHandle = entry;
            metadataFile = await fileHandle.getFile();
            metadataFileName = entry.name;
            console.log('[文件夹扫描] 找到元数据文件:', metadataFileName);
            break;
          }
        }
      }

      if (!metadataFile) {
        throw new Error('在所选文件夹中未找到 metadata.json 或 cloud.js 文件');
      }

      console.log('找到元数据文件:', metadataFileName);

      if (loadStatus) {
        loadStatus.innerHTML = `正在加载: ${metadataFileName}...`;
      }

      // 创建本地文件读取函数
      const loadLocalFile = async (relativePath: string): Promise<ArrayBuffer> => {
        // 移除开头的 './' 或 '/'
        const cleanPath = relativePath.replace(/^\.?\//, '');

        console.log('[文件加载] 请求加载文件:', {
          原始路径: relativePath,
          清理后路径: cleanPath,
        });

        // 分割路径
        const pathParts = cleanPath.split('/');
        console.log('[文件加载] 路径分段:', pathParts);

        // 遍历文件夹层级
        let currentHandle = directoryHandle;
        try {
          for (let i = 0; i < pathParts.length - 1; i++) {
            console.log(`[文件加载] 进入子文件夹: ${pathParts[i]}`);
            currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
          }

          // 获取文件
          const fileName = pathParts[pathParts.length - 1];
          console.log('[文件加载] 读取文件:', fileName);
          const fileHandle = await currentHandle.getFileHandle(fileName);
          const file = await fileHandle.getFile();
          const buffer = await file.arrayBuffer();
          console.log('[文件加载] 文件读取成功，大小:', buffer.byteLength, 'bytes');

          return buffer;
        } catch (error) {
          console.error('[文件加载] 文件读取失败:', {
            路径: cleanPath,
            路径分段: pathParts,
            错误: error,
          });
          throw error;
        }
      };

      // 使用自定义加载函数创建 loader
      const customLoader = new PotreeLoader({
        customFileLoader: loadLocalFile,
        autoLoadHierarchy: true,
      });

      if (loadStatus) {
        loadStatus.innerHTML = `正在解析点云结构...`;
      }

      // 加载点云 octree（仅元数据和层级结构）
      const octree: IPointCloudOctree = await customLoader.load(metadataFileName);

      console.log('点云结构加载成功:', octree);
      console.log('根节点:', octree.root);
      console.log('点属性:', octree.pointAttributes);

      if (!octree.root) {
        throw new Error('点云没有根节点');
      }

      // 将 octree 添加到 viewer 中以进行渲染
      console.log('正在将点云添加到 viewer...');
      viewer.addPointCloud(octree, directoryHandle.name);
      console.log('点云已添加到 viewer');

      // 调整相机以适应点云边界
      const boundingBox = octree.boundingBox;
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      camera.position.copy(center);
      camera.position.z += maxDim * 2;
      camera.lookAt(center);
      controls.setPivot(center);

      console.log('相机已调整到点云位置');

      // 隐藏网格和坐标轴（可选）
      gridHelper.visible = false;
      axesHelper.visible = false;

      // 更新加载状态
      if (loadStatus) {
        const numPoints = octree.root.numPoints;
        loadStatus.innerHTML = `
          ✅ 点云元数据加载成功<br>
          文件夹: ${directoryHandle.name}<br>
          元数据: ${metadataFileName}<br>
          版本: ${octree.version}<br>
          根节点点数: ${numPoints.toLocaleString()}<br>
          包围盒: (${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})<br>
          <br>
          ⚠️ 点云渲染功能待实现（Phase 4）
        `;
        loadStatus.style.background = 'rgba(255,165,0,0.1)';
      }
    } catch (error) {
      console.error('加载本地文件夹失败:', error);

      if (loadStatus) {
        loadStatus.innerHTML = `❌ 加载失败: ${error instanceof Error ? error.message : String(error)}`;
        loadStatus.style.background = 'rgba(255,0,0,0.1)';
      }

      if ((error as Error).name !== 'AbortError') {
        // 用户取消不需要弹窗
        alert(`加载失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });

  // 加载远程 URL
  const loadButton = document.getElementById('load-pointcloud');
  const urlInput = document.getElementById('pointcloud-url') as HTMLInputElement;
  loadButton?.addEventListener('click', async () => {
    const url = urlInput?.value.trim();
    if (!url) {
      alert('请输入点云 URL');
      return;
    }

    try {
      if (loadStatus) {
        loadStatus.style.display = 'block';
        loadStatus.innerHTML = `正在加载: ${url}...`;
        loadStatus.style.background = 'rgba(0,255,0,0.1)';
      }

      console.log('正在使用 Viewer API 加载点云:', url);

      // 使用 viewer.load() API 加载点云
      const octree = await viewer.load(url);

      console.log('点云加载成功:', octree);

      // 调整相机以适应点云边界
      if (octree.boundingBox) {
        const boundingBox = octree.boundingBox;
        const center = boundingBox.getCenter(new THREE.Vector3());
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        camera.position.copy(center);
        camera.position.z += maxDim * 2;
        camera.lookAt(center);
        controls.setPivot(center);

        // 隐藏网格和坐标轴（可选）
        gridHelper.visible = false;
        axesHelper.visible = false;
      }

      if (loadStatus) {
        const numPoints = octree.root?.numPoints ?? 0;
        const size = octree.boundingBox?.getSize(new THREE.Vector3());
        loadStatus.innerHTML = `
          ✅ 点云元数据加载成功<br>
          URL: ${url}<br>
          版本: ${octree.version}<br>
          根节点点数: ${numPoints.toLocaleString()}<br>
          ${size ? `包围盒: (${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})<br>` : ''}
          <br>
          ⚠️ 点云渲染功能待实现（Phase 4）
        `;
        loadStatus.style.background = 'rgba(255,165,0,0.1)';
      }
    } catch (error) {
      console.error('加载点云失败:', error);

      if (loadStatus) {
        loadStatus.innerHTML = `❌ 加载失败: ${error instanceof Error ? error.message : String(error)}`;
        loadStatus.style.background = 'rgba(255,0,0,0.1)';
      }

      alert(`加载失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

// 窗口大小调整
function onWindowResize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

window.addEventListener('resize', onWindowResize);

// 使用 Viewer 内置的动画循环
let frameCount = 0;

// 监听 Viewer 的 update 事件来更新控制器和 UI
viewer.on('update', ({ deltaTime }) => {
  debug.startFrame();

  // 更新控制器
  controls.update(deltaTime);

  // 每 30 帧更新一次信息面板和调试统计
  frameCount++;
  if (frameCount % 30 === 0) {
    updateInfo();

    // 更新调试统计
    const pointClouds = viewer.getPointClouds();
    debug.updateStats({
      totalPointClouds: pointClouds.length,
      cameraPosition: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      },
      cameraDistance: camera.position.length(),
    });
  }

  debug.endFrame();
});

// 初始化
debug.info(LogCategory.INIT, 'Creating controls panel...');
createControlsPanel();
updateInfo();

// 启动 Viewer 内置的动画循环
// 这会启动系统调度器，包括 TraversalSystem 和 StreamingSystem
debug.info(LogCategory.VIEWER, 'Starting animation loop...');
viewer.startAnimation();

debug.info(LogCategory.INIT, '初始化完成 - 按 Ctrl+D 打开调试面板');
console.log('✅ Better Potree Playground 初始化完成');
console.log('📦 Viewer:', viewer);
console.log('🎮 Controls:', controls);
console.log('📥 Loader:', loader);
console.log('🎬 动画循环已启动，系统调度器运行中...');
console.log('🐛 按 Ctrl+D 打开调试面板');

// 自动加载测试数据
(async () => {
  const testDataUrl = '/pointcloud/inchurch_colorized_las_converted/';
  debug.info(LogCategory.LOADER, '自动加载测试数据', { url: testDataUrl });
  console.log('🚀 自动加载测试数据:', testDataUrl);

  try {
    const octree = await viewer.load(testDataUrl);

    debug.info(LogCategory.LOADER, '测试数据加载成功', {
      version: octree.version,
      root: octree.root ? '存在' : '不存在',
      numPoints: octree.root?.numPoints,
      boundingBox: octree.boundingBox,
    });
    console.log('✅ 测试数据自动加载成功:', octree);

    // 调整相机以适应点云边界
    if (octree.boundingBox) {
      const boundingBox = octree.boundingBox;
      const center = boundingBox.getCenter(new THREE.Vector3());
      const size = boundingBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);

      camera.position.copy(center);
      camera.position.z += maxDim * 2;
      camera.lookAt(center);
      controls.setPivot(center);

      gridHelper.visible = false;
      axesHelper.visible = false;

      console.log('📷 相机已调整:', { center, size, maxDim });
    }
  } catch (error) {
    debug.error(LogCategory.LOADER, '自动加载测试数据失败', {
      error: error instanceof Error ? error.message : String(error),
    });
    console.error('❌ 自动加载测试数据失败:', error);
  }
})();
