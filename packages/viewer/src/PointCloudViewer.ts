/**
 * 点云查看器
 *
 * 集成 TraversalSystem、StreamingSystem 和 RenderSystem 的高层级 API
 *
 * @module @better-potree/viewer
 * @example
 * ```ts
 * const viewer = new PointCloudViewer({
 *   container: document.getElementById('viewer')!,
 *   pointBudget: 1_000_000
 * });
 *
 * // 加载点云
 * const octree = await viewer.loadPointCloud('http://example.com/pointcloud/');
 *
 * // 开始渲染
 * viewer.start();
 *
 * // 清理
 * viewer.dispose();
 * ```
 */

import {
  StreamingSystem,
  TraversalSystem,
  TypedEventEmitter,
  type IPointCloudOctree,
  type IPointCloudOctreeNode,
} from '@better-potree/core';
import { PointCloudMaterial } from '@better-potree/rendering-three';
import * as THREE from 'three';
import { PotreeLoader } from './loaders/PotreeLoader.js';

/**
 * 点云查看器配置
 */
export interface PointCloudViewerConfig {
  /** 容器元素 */
  readonly container: HTMLElement;
  /** 点预算（每帧最大点数） */
  readonly pointBudget?: number;
  /** 最大并发加载数 */
  readonly maxConcurrentLoads?: number;
  /** 背景颜色 */
  readonly backgroundColor?: THREE.ColorRepresentation;
  /** 初始相机位置 */
  readonly cameraPosition?: THREE.Vector3;
  /** 是否自动旋转 */
  readonly autoRotate?: boolean;
}

/**
 * 查看器事件
 */
export interface PointCloudViewerEvents {
  /** 点云加载完成 */
  'pointcloud-loaded': { octree: IPointCloudOctree; name: string };
  /** 点云移除 */
  'pointcloud-removed': { name: string };
  /** 帧更新 */
  update: { deltaTime: number; fps: number };
  /** 渲染完成 */
  render: { visiblePoints: number };
  /** 查看器销毁 */
  dispose: Record<string, never>;
  /** 索引签名 */
  [key: string]: unknown;
}

/**
 * 点云查看器
 *
 * 提供完整的点云可视化解决方案，集成：
 * - 数据加载（PotreeLoader）
 * - LOD 遍历（TraversalSystem）
 * - 流式加载（StreamingSystem）
 * - WebGL 渲染（Three.js）
 */
export class PointCloudViewer extends TypedEventEmitter<PointCloudViewerEvents> {
  private container: HTMLElement;
  private config: Required<Omit<PointCloudViewerConfig, 'container'>>;

  // Three.js 核心
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;

  // 系统
  private traversalSystem!: TraversalSystem;
  private streamingSystem!: StreamingSystem;
  private loader: PotreeLoader;

  // 点云管理
  private pointClouds: Map<string, IPointCloudOctree> = new Map();
  private materials: Map<string, PointCloudMaterial> = new Map();
  private sceneObjects: Map<string, THREE.Points> = new Map();

  // 动画
  private animationId: number | null = null;
  private lastTime = 0;
  private isRunning = false;

  // 统计
  private frameCount = 0;
  private fps = 0;
  private lastFpsTime = 0;

  /**
   * 创建点云查看器
   *
   * @param config - 配置选项
   */
  constructor(config: PointCloudViewerConfig) {
    super();

    this.container = config.container;
    this.config = {
      pointBudget: config.pointBudget ?? 1_000_000,
      maxConcurrentLoads: config.maxConcurrentLoads ?? 8,
      backgroundColor: config.backgroundColor ?? 0x000000,
      cameraPosition: config.cameraPosition ?? new THREE.Vector3(0, 0, 10),
      autoRotate: config.autoRotate ?? false,
    };

    // 初始化 Three.js
    this.initThreeJS();

    // 初始化系统
    this.initSystems();

    // 初始化加载器
    this.loader = new PotreeLoader();

    // 设置事件监听
    this.setupEventListeners();
  }

  /**
   * 初始化 Three.js
   */
  private initThreeJS(): void {
    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(this.config.backgroundColor);
    this.container.appendChild(this.renderer.domElement);

    // 创建场景
    this.scene = new THREE.Scene();

    // 创建相机
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
    this.camera.position.copy(this.config.cameraPosition);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * 初始化系统
   */
  private initSystems(): void {
    // 创建遍历系统
    this.traversalSystem = new TraversalSystem({
      pointBudget: this.config.pointBudget,
      screenWidth: this.container.clientWidth,
      screenHeight: this.container.clientHeight,
    });
    this.traversalSystem.setCamera(this.camera);

    // 创建流式加载系统
    this.streamingSystem = new StreamingSystem({
      maxConcurrentLoads: this.config.maxConcurrentLoads,
      maxRetries: 3,
    });

    // 设置加载完成回调
    this.streamingSystem.setOnLoadComplete((event) => {
      this.onNodeLoaded(event.octree, event.node);
    });
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 窗口大小变化
    window.addEventListener('resize', this.onResize.bind(this));
  }

  /**
   * 处理窗口大小变化
   */
  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    this.traversalSystem.setScreenSize(width, height);
  }

  /**
   * 加载点云
   *
   * @param url - 点云 URL
   * @param name - 点云名称（可选）
   * @returns 加载的点云
   */
  async loadPointCloud(url: string, name?: string): Promise<IPointCloudOctree> {
    const octree = await this.loader.load(url);
    const cloudName = name ?? `pointcloud-${this.pointClouds.size}`;

    // 添加到管理器
    this.pointClouds.set(cloudName, octree);

    // 添加到遍历系统
    this.traversalSystem.addPointCloud(cloudName, octree);

    // 创建材质
    const material = new PointCloudMaterial({
      size: 1.0,
      sizeType: 'ADAPTIVE' as any,
      shape: 'CIRCLE' as any,
    });
    material.updateOctreeSpacing(octree.spacing);
    this.materials.set(cloudName, material);

    // 如果有根节点，创建初始几何体
    if (octree.root) {
      this.createPointCloudObject(cloudName, octree);
    }

    // 发送事件
    this.emit('pointcloud-loaded', { octree, name: cloudName });

    return octree;
  }

  /**
   * 创建点云 Three.js 对象
   */
  private createPointCloudObject(name: string, _octree: IPointCloudOctree): void {
    const material = this.materials.get(name);
    if (!material) return;

    // 创建初始空几何体
    const geometry = new THREE.BufferGeometry();

    // 添加基本顶点（占位符）
    const positions = new Float32Array(3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false; // 我们自己处理剔除

    this.sceneObjects.set(name, points);
    this.scene.add(points);
  }

  /**
   * 处理节点加载完成
   */
  private onNodeLoaded(_octree: IPointCloudOctree, _node: IPointCloudOctreeNode): void {
    // 这里会更新几何体
    // 简化版本：只更新统计信息
    // 完整实现需要：
    // 1. 从 Worker 获取解码数据
    // 2. 更新 BufferGeometry
    // 3. 刷新渲染
  }

  /**
   * 移除点云
   *
   * @param name - 点云名称
   */
  removePointCloud(name: string): void {
    const octree = this.pointClouds.get(name);
    if (!octree) return;

    // 从系统中移除
    this.traversalSystem.removePointCloud(name);

    // 移除场景对象
    const sceneObject = this.sceneObjects.get(name);
    if (sceneObject) {
      this.scene.remove(sceneObject);
      sceneObject.geometry.dispose();
      this.sceneObjects.delete(name);
    }

    // 移除材质
    const material = this.materials.get(name);
    if (material) {
      material.dispose();
      this.materials.delete(name);
    }

    // 从管理器移除
    this.pointClouds.delete(name);

    this.emit('pointcloud-removed', { name });
  }

  /**
   * 开始渲染循环
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.lastFpsTime = this.lastTime;
    this.animate();
  }

  /**
   * 停止渲染循环
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 动画循环
   */
  private animate(): void {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // 更新 FPS
    this.frameCount++;
    if (currentTime - this.lastFpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = currentTime;
    }

    // 更新系统
    this.update(deltaTime);

    // 渲染
    this.render();
  }

  /**
   * 更新系统
   */
  private update(deltaTime: number): void {
    // 自动旋转相机
    if (this.config.autoRotate) {
      const time = performance.now() * 0.0001;
      this.camera.position.x = Math.sin(time) * 10;
      this.camera.position.z = Math.cos(time) * 10;
      this.camera.lookAt(0, 0, 0);
    }

    // 更新遍历系统
    this.traversalSystem.update(deltaTime);

    // 获取可见节点并请求加载
    const result = this.traversalSystem.getLastResult();
    for (const visibleNode of result.visibleNodes) {
      if (!visibleNode.node.loaded && !visibleNode.node.loading) {
        this.streamingSystem.requestLoad(visibleNode.octree, visibleNode.node, visibleNode.priority);
      }
    }

    // 更新流式加载系统
    this.streamingSystem.update(deltaTime);

    // 更新材质
    for (const material of this.materials.values()) {
      material.updateCamera(this.camera);
      material.updateScreenSize(this.container.clientWidth, this.container.clientHeight);
    }

    this.emit('update', { deltaTime, fps: this.fps });
  }

  /**
   * 渲染场景
   */
  private render(): void {
    this.renderer.render(this.scene, this.camera);

    const result = this.traversalSystem.getLastResult();
    this.emit('render', { visiblePoints: result.totalPoints });
  }

  /**
   * 获取相机
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * 获取场景
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * 获取渲染器
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * 设置点预算
   */
  setPointBudget(budget: number): void {
    (this.config as { pointBudget: number }).pointBudget = budget;
    this.traversalSystem.setPointBudget(budget);
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    fps: number;
    visiblePoints: number;
    loadedNodes: number;
    pendingLoads: number;
  } {
    const traversalResult = this.traversalSystem.getLastResult();
    const streamingStats = this.streamingSystem.getStats();

    return {
      fps: this.fps,
      visiblePoints: traversalResult.totalPoints,
      loadedNodes: streamingStats.completedLoads,
      pendingLoads: streamingStats.pendingRequests,
    };
  }

  /**
   * 销毁查看器
   */
  dispose(): void {
    this.stop();

    // 移除所有点云
    for (const name of Array.from(this.pointClouds.keys())) {
      this.removePointCloud(name);
    }

    // 销毁系统
    this.traversalSystem.dispose();
    this.streamingSystem.dispose();

    // 销毁 Three.js 资源
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);

    // 移除事件监听
    window.removeEventListener('resize', this.onResize.bind(this));

    this.emit('dispose', {});
    this.removeAllListeners();
  }
}
