/**
 * Better Potree Playground
 *
 * 这个示例展示如何使用 better-potree 加载和渲染点云
 */

import './style.css';
import { ThreeJsRenderer, ThreeScene, PointCloudMaterial } from '@better-potree/rendering-three';
import { EarthControls, PotreeLoader, ViewerAPI, PointCloudColorMode } from '@better-potree/viewer';
import type { IPointCloudOctree, IPotreeMetadata } from '@better-potree/core';
import * as THREE from 'three';

console.log('Better Potree Playground - 初始化中...');

// 获取 DOM 元素
const container = document.getElementById('viewer-container');
const canvas = document.getElementById('viewer') as HTMLCanvasElement;
const infoPanel = document.getElementById('info');
const controlsPanel = document.getElementById('controls');

if (!container || !canvas) {
  throw new Error('Required DOM elements not found');
}

// 创建渲染器和场景
const renderer = new ThreeJsRenderer({ canvas });
const scene = new ThreeScene();

// 创建相机
const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
camera.position.set(10, 10, 10);
camera.lookAt(0, 0, 0);

// 创建 Viewer
const viewer = new ViewerAPI({
  container,
  renderer,
  scene,
  camera,
  pointBudget: 1_000_000,
  pointSize: 1.0,
  edlEnabled: true,
  backgroundColor: 0x000000,
});

// 创建控制器
const controls = new EarthControls(camera, canvas);
controls.rotationSpeed = 0.5;
controls.zoomSpeed = 1.0;
controls.fadeFactor = 10;

// 创建加载器
const loader = new PotreeLoader();

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
function updateInfo() {
  if (!infoPanel) return;

  const fps = Math.round(1000 / (performance.now() - lastTime));
  lastTime = performance.now();

  infoPanel.innerHTML = `
    <div class="info-section">
      <h2>Better Potree Playground</h2>
      <div class="info-item">
        <span class="label">FPS:</span>
        <span class="value">${fps}</span>
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

  // 加载本地文件夹
  const loadFolderButton = document.getElementById('load-local-folder');
  const loadStatus = document.getElementById('load-status');

  loadFolderButton?.addEventListener('click', async () => {
    try {
      // 检查浏览器是否支持 File System Access API
      if (!('showDirectoryPicker' in window)) {
        alert('您的浏览器不支持本地文件夹选择功能。\n请使用 Chrome 86+、Edge 86+ 或其他支持 File System Access API 的浏览器。');
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

        console.log('加载本地文件:', cleanPath);

        // 分割路径
        const pathParts = cleanPath.split('/');

        // 遍历文件夹层级
        let currentHandle = directoryHandle;
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentHandle = await currentHandle.getDirectoryHandle(pathParts[i]);
        }

        // 获取文件
        const fileName = pathParts[pathParts.length - 1];
        const fileHandle = await currentHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();

        return await file.arrayBuffer();
      };

      // 使用自定义加载函数创建 loader
      const customLoader = new PotreeLoader({
        customFileLoader: loadLocalFile,
        autoLoadHierarchy: true,
      });

      if (loadStatus) {
        loadStatus.innerHTML = `正在解析点云结构...`;
      }

      // 加载点云 octree
      const octree: IPointCloudOctree = await customLoader.load(metadataFileName);

      console.log('点云结构加载成功:', octree);
      console.log('根节点:', octree.root);
      console.log('点属性:', octree.pointAttributes);

      if (loadStatus) {
        loadStatus.innerHTML = `正在加载根节点点数据...`;
      }

      // 加载根节点的点数据
      if (!octree.root) {
        throw new Error('点云没有根节点');
      }

      // 从 octree.url 中获取 octreeDir (PotreeLoader 已经构建好了完整路径)
      // octree.url 格式类似 "data/" 或完整路径
      // 我们需要从 metadata 中获取 octreeDir
      let octreeDir = 'data'; // 默认值

      // 重新读取元数据来获取 octreeDir
      const metadataText = await metadataFile.text();
      let metadata: IPotreeMetadata;

      if (metadataFileName.toLowerCase() === 'metadata.json') {
        metadata = JSON.parse(metadataText);
      } else {
        // cloud.js 格式
        const jsonMatch = metadataText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          metadata = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('无法解析元数据');
        }
      }

      if (metadata.octreeDir) {
        octreeDir = metadata.octreeDir;
      }

      const rootNodePath = `${octreeDir}/r.bin`;

      console.log('加载根节点数据:', rootNodePath);

      // 加载根节点二进制数据
      const rootData = await loadLocalFile(rootNodePath);

      console.log('根节点数据大小:', rootData.byteLength, 'bytes');

      // 简单解析二进制数据（基础实现，仅用于演示）
      // 注意：完整实现应该使用 BinaryDecoderWorker
      const view = new DataView(rootData);
      const numPoints = octree.root.numPoints;

      console.log('点数:', numPoints);

      // 假设是 Potree 2.0 格式，带有 position(xyz, int32) + color(rgb, uint16)
      // 实际格式需要根据 pointAttributes 来确定
      const positions = new Float32Array(numPoints * 3);
      const colors = new Uint8Array(numPoints * 3);

      // 获取点属性的字节大小
      const pointByteSize = octree.pointAttributes.byteSize;

      console.log('点字节大小:', pointByteSize);

      // 解析每个点（简化版本）
      let offset = 0;
      for (let i = 0; i < numPoints; i++) {
        // 读取位置 (假设是 int32 * 3)
        const x = view.getInt32(offset, true);
        const y = view.getInt32(offset + 4, true);
        const z = view.getInt32(offset + 8, true);

        // 转换到实际坐标
        const scale = octree.scale;
        const bbox = octree.boundingBox;
        positions[i * 3] = bbox.min.x + x * scale;
        positions[i * 3 + 1] = bbox.min.y + y * scale;
        positions[i * 3 + 2] = bbox.min.z + z * scale;

        // 读取颜色 (假设是 uint16 * 3)
        const r = view.getUint16(offset + 12, true);
        const g = view.getUint16(offset + 14, true);
        const b = view.getUint16(offset + 16, true);

        // 转换到 0-255
        colors[i * 3] = (r / 65535) * 255;
        colors[i * 3 + 1] = (g / 65535) * 255;
        colors[i * 3 + 2] = (b / 65535) * 255;

        offset += pointByteSize;
      }

      console.log('点数据解析完成');

      // 创建 BufferGeometry
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));

      // 创建点云材质
      const material = new PointCloudMaterial({
        size: viewer.getPointSize(),
        colorMode: PointCloudColorMode.RGB,
      });

      // 创建点云对象
      const points = new THREE.Points(geometry, material);
      points.name = `PointCloud_${directoryHandle.name}`;

      // 添加到场景
      scene.add(points);

      console.log('点云已添加到场景');

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
        loadStatus.innerHTML = `
          ✅ 成功加载并显示点云<br>
          文件夹: ${directoryHandle.name}<br>
          元数据: ${metadataFileName}<br>
          版本: ${octree.version}<br>
          点数: ${numPoints.toLocaleString()}<br>
          包围盒: (${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})
        `;
        loadStatus.style.background = 'rgba(0,255,0,0.1)';
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

      console.log('正在加载点云:', url);
      const pointCloud = await loader.load(url);
      console.log('点云加载成功:', pointCloud);

      if (loadStatus) {
        loadStatus.innerHTML = `✅ 成功加载远程点云<br>URL: ${url}`;
      }

      // TODO: 将点云添加到场景
      // 这需要等待 rendering-three 包实现 PointCloudObject3D

      alert('点云元数据加载成功！\n(渲染功能将在后续实现)');
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

// 渲染循环
let lastTime = performance.now();
let frameCount = 0;

function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const delta = (currentTime - lastTime) / 1000; // 转换为秒

  // 更新控制器
  controls.update(delta);

  // 渲染场景
  viewer.render();

  // 每 30 帧更新一次信息面板
  frameCount++;
  if (frameCount % 30 === 0) {
    updateInfo();
  }

  lastTime = currentTime;
}

// 初始化
createControlsPanel();
updateInfo();
animate();

console.log('✅ Better Potree Playground 初始化完成');
console.log('📦 Viewer:', viewer);
console.log('🎮 Controls:', controls);
console.log('📥 Loader:', loader);
