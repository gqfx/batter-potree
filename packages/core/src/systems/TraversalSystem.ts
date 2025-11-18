/**
 * LOD 遍历系统
 *
 * 负责视锥剔除和 LOD 选择，决定哪些八叉树节点应该被加载和渲染
 *
 * @module systems
 * @example
 * ```ts
 * const traversalSystem = new TraversalSystem({
 *   pointBudget: 1_000_000,
 *   maxLevel: 20,
 *   minScreenSize: 100
 * });
 *
 * scheduler.addSystem(traversalSystem);
 *
 * // 添加点云
 * traversalSystem.addPointCloud(octree);
 *
 * // 更新相机
 * traversalSystem.setCamera(camera);
 * ```
 */

import * as THREE from 'three';
import type { IPointCloudOctree, IPointCloudOctreeNode } from '../types/potree.js';
import type { ISystem, SystemStage } from '../types/system.js';
import { ClipMethod, ClipTask } from '../types/rendering.js';
import { BinaryHeap } from '../utils/BinaryHeap.js';

/**
 * 遍历系统配置
 */
export interface TraversalSystemConfig {
  /** 每帧最大点数预算 */
  readonly pointBudget?: number;
  /** 最大 LOD 层级 */
  readonly maxLevel?: number;
  /** 最小屏幕大小（像素），低于此值的节点会被跳过 */
  readonly minScreenSize?: number;
  /** 屏幕宽度 */
  readonly screenWidth?: number;
  /** 屏幕高度 */
  readonly screenHeight?: number;
  /** 裁剪框数组 (4x4 变换矩阵) */
  readonly clipBoxes?: readonly THREE.Matrix4[];
  /** 裁剪任务 */
  readonly clipTask?: ClipTask;
  /** 裁剪方法 */
  readonly clipMethod?: ClipMethod;
  /** 强制加载的深度（前N层始终显示，防止空白屏幕） */
  readonly forceLoadDepth?: number;
}

/**
 * 可见节点信息
 */
export interface VisibleNode {
  /** 节点引用 */
  readonly node: IPointCloudOctreeNode;
  /** 所属点云 */
  readonly octree: IPointCloudOctree;
  /** 到相机的距离 */
  readonly distance: number;
  /** 屏幕上的投影大小 */
  readonly screenSize: number;
  /** 优先级（距离越近优先级越高） */
  readonly priority: number;
}

/**
 * 遍历结果
 */
export interface TraversalResult {
  /** 可见节点列表（按优先级排序） */
  readonly visibleNodes: readonly VisibleNode[];
  /** 总点数 */
  readonly totalPoints: number;
  /** 遍历的节点数 */
  readonly traversedNodes: number;
  /** 遍历耗时（毫秒） */
  readonly traversalTime: number;
}

/**
 * 优先级队列中的元素
 *
 * @internal
 */
interface PriorityQueueElement {
  /** 八叉树节点 */
  readonly node: IPointCloudOctreeNode;
  /** 所属点云 */
  readonly octree: IPointCloudOctree;
  /** 父节点（用于调试） */
  readonly parent: IPointCloudOctreeNode | null;
  /** 节点权重（用于优先级排序） */
  weight: number;
}

/**
 * LOD 遍历系统
 *
 * 实现视锥体剔除和基于屏幕大小的 LOD 选择算法
 */
export class TraversalSystem implements ISystem {
  readonly name = 'bp:traversal';
  readonly stage: SystemStage = 100; // UPDATE stage
  readonly priority = 0;

  private config: Required<TraversalSystemConfig>;
  private camera: THREE.Camera | null = null;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private pointClouds: Map<string, IPointCloudOctree> = new Map();

  private lastResult: TraversalResult = {
    visibleNodes: [],
    totalPoints: 0,
    traversedNodes: 0,
    traversalTime: 0,
  };

  // 变换缓存相关
  private lastCameraPosition = new THREE.Vector3();
  private lastCameraQuaternion = new THREE.Quaternion();
  private lastCameraMatrix = new THREE.Matrix4();
  private lastOctreeTransforms = new Map<string, THREE.Matrix4>();
  private transformChangeThreshold = 0.001; // 变换变化阈值
  private transformCacheValid = false;

  /**
   * 创建遍历系统
   *
   * @param config - 系统配置
   */
  constructor(config: TraversalSystemConfig = {}) {
    this.config = {
      pointBudget: config.pointBudget ?? 1_000_000,
      maxLevel: config.maxLevel ?? 20,
      minScreenSize: config.minScreenSize ?? 100,
      screenWidth: config.screenWidth ?? 1920,
      screenHeight: config.screenHeight ?? 1080,
      clipBoxes: config.clipBoxes ?? [],
      clipTask: config.clipTask ?? ClipTask.NONE,
      clipMethod: config.clipMethod ?? ClipMethod.INSIDE_ANY,
      forceLoadDepth: config.forceLoadDepth ?? 3, // 默认强制加载前3层
    };
  }

  /**
   * 设置相机
   *
   * @param camera - Three.js 相机
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * 设置点预算
   *
   * @param budget - 每帧最大点数
   */
  setPointBudget(budget: number): void {
    this.config = { ...this.config, pointBudget: budget };
  }

  /**
   * 设置屏幕尺寸
   *
   * @param width - 屏幕宽度
   * @param height - 屏幕高度
   */
  setScreenSize(width: number, height: number): void {
    this.config = { ...this.config, screenWidth: width, screenHeight: height };
  }

  /**
   * 设置裁剪框
   *
   * @param clipBoxes - 裁剪框矩阵数组
   *
   * @example
   * ```typescript
   * const box = new THREE.Matrix4();
   * box.makeTranslation(0, 0, 0);
   * box.scale(new THREE.Vector3(10, 10, 10));
   * traversalSystem.setClipBoxes([box]);
   * ```
   */
  setClipBoxes(clipBoxes: readonly THREE.Matrix4[]): void {
    this.config = { ...this.config, clipBoxes };
  }

  /**
   * 设置裁剪任务
   *
   * @param task - 裁剪任务类型
   */
  setClipTask(task: ClipTask): void {
    this.config = { ...this.config, clipTask: task };
  }

  /**
   * 设置裁剪方法
   *
   * @param method - 裁剪方法（AND/OR）
   */
  setClipMethod(method: ClipMethod): void {
    this.config = { ...this.config, clipMethod: method };
  }

  /**
   * 设置强制加载深度
   *
   * 前N层节点将始终被显示,不受 LOD 和屏幕大小限制
   * 这可以防止在远距离观看时出现空白屏幕
   *
   * @param depth - 强制加载的层数 (0-10)
   *
   * @example
   * ```typescript
   * // 强制加载前3层
   * traversalSystem.setForceLoadDepth(3);
   * ```
   */
  setForceLoadDepth(depth: number): void {
    this.config = { ...this.config, forceLoadDepth: Math.max(0, Math.min(10, depth)) };
  }

  /**
   * 添加点云
   *
   * @param id - 点云 ID
   * @param octree - 点云八叉树
   */
  addPointCloud(id: string, octree: IPointCloudOctree): void {
    this.pointClouds.set(id, octree);
    this.transformCacheValid = false; // 失效缓存
  }

  /**
   * 移除点云
   *
   * @param id - 点云 ID
   */
  removePointCloud(id: string): void {
    this.pointClouds.delete(id);
    this.lastOctreeTransforms.delete(id);
    this.transformCacheValid = false; // 失效缓存
  }

  /**
   * 检查点云是否存在
   *
   * @param id - 点云 ID
   * @returns 是否存在
   *
   * @example
   * ```ts
   * if (traversalSystem.hasPointCloud('myCloud')) {
   *   console.log('Cloud exists');
   * }
   * ```
   */
  hasPointCloud(id: string): boolean {
    return this.pointClouds.has(id);
  }

  /**
   * 获取最后的遍历结果
   *
   * @returns 遍历结果
   */
  getLastResult(): TraversalResult {
    return this.lastResult;
  }

  /**
   * 系统更新
   *
   * @param _deltaTime - 帧间隔时间（秒）
   */
  update(_deltaTime: number): void {
    if (!this.camera || this.pointClouds.size === 0) {
      return;
    }

    // 检查变换是否改变
    const transformChanged = this.checkTransformChanged();

    // 如果变换没有改变且缓存有效，复用上一帧结果
    if (!transformChanged && this.transformCacheValid) {
      return;
    }

    const startTime = performance.now();

    // 更新视锥体
    this.updateFrustum();

    // 遍历所有点云
    const visibleNodes: VisibleNode[] = [];
    let traversedNodes = 0;

    for (const octree of this.pointClouds.values()) {
      if (!octree.root) continue;

      const { nodes, traversed } = this.traverseOctree(octree);
      visibleNodes.push(...nodes);
      traversedNodes += traversed;
    }

    // 按优先级排序（距离近的优先）
    visibleNodes.sort((a, b) => b.priority - a.priority);

    // 应用点预算
    const budgetedNodes = this.applyPointBudget(visibleNodes);

    const endTime = performance.now();

    this.lastResult = {
      visibleNodes: budgetedNodes,
      totalPoints: budgetedNodes.reduce((sum, n) => sum + n.node.numPoints, 0),
      traversedNodes,
      traversalTime: endTime - startTime,
    };

    // 更新变换缓存
    this.updateTransformCache();
    this.transformCacheValid = true;
  }

  /**
   * 销毁系统
   */
  dispose(): void {
    this.pointClouds.clear();
    this.camera = null;
    this.lastOctreeTransforms.clear();
    this.transformCacheValid = false;
  }

  /**
   * 检查相机和点云变换是否改变
   *
   * @returns true 表示变换改变，需要重新遍历
   *
   * @internal
   */
  private checkTransformChanged(): boolean {
    if (!this.camera) {
      return true;
    }

    // 检查相机位置变化
    const positionDelta = this.camera.position.distanceTo(this.lastCameraPosition);
    if (positionDelta > this.transformChangeThreshold) {
      return true;
    }

    // 检查相机旋转变化
    this.camera.updateMatrixWorld();
    this.camera.getWorldQuaternion(this.lastCameraQuaternion);
    const angle = this.lastCameraQuaternion.angleTo(this.camera.quaternion);
    if (angle > this.transformChangeThreshold) {
      return true;
    }

    // 检查相机投影矩阵变化
    const currentCameraMatrix = new THREE.Matrix4();
    currentCameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );
    if (!this.matricesEqual(currentCameraMatrix, this.lastCameraMatrix)) {
      return true;
    }

    // 检查点云变换变化
    for (const [id, octree] of this.pointClouds) {
      const lastTransform = this.lastOctreeTransforms.get(id);
      if (!lastTransform || !this.matricesEqual(octree.matrixWorld, lastTransform)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 更新变换缓存
   *
   * @internal
   */
  private updateTransformCache(): void {
    if (!this.camera) return;

    // 更新相机位置
    this.lastCameraPosition.copy(this.camera.position);

    // 更新相机旋转
    this.camera.getWorldQuaternion(this.lastCameraQuaternion);

    // 更新相机矩阵
    this.lastCameraMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );

    // 更新点云变换
    this.lastOctreeTransforms.clear();
    for (const [id, octree] of this.pointClouds) {
      this.lastOctreeTransforms.set(id, octree.matrixWorld.clone());
    }
  }

  /**
   * 比较两个矩阵是否相等
   *
   * @param a - 矩阵 A
   * @param b - 矩阵 B
   * @returns 是否相等
   *
   * @internal
   */
  private matricesEqual(a: THREE.Matrix4, b: THREE.Matrix4): boolean {
    const ae = a.elements;
    const be = b.elements;

    for (let i = 0; i < 16; i++) {
      if (Math.abs(ae[i] - be[i]) > this.transformChangeThreshold) {
        return false;
      }
    }

    return true;
  }

  /**
   * 更新视锥体
   */
  private updateFrustum(): void {
    if (!this.camera) return;

    this.camera.updateMatrixWorld();

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.projScreenMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse,
      );
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      this.projScreenMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse,
      );
    }

    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
  }

  /**
   * 遍历单个八叉树
   *
   * @param octree - 八叉树
   * @returns 可见节点和遍历计数
   */
  private traverseOctree(octree: IPointCloudOctree): {
    nodes: VisibleNode[];
    traversed: number;
  } {
    const visibleNodes: VisibleNode[] = [];
    let traversedCount = 0;

    if (!octree.root || !this.camera) {
      return { nodes: visibleNodes, traversed: traversedCount };
    }

    const cameraPosition = this.camera.position;

    // 使用优先级队列（最小堆），权重越小优先级越高
    const priorityQueue = new BinaryHeap<PriorityQueueElement>((element) => 1 / element.weight);

    // 初始化：将根节点加入队列
    const rootWeight = this.computeWeight(octree.root, cameraPosition);
    priorityQueue.push({
      node: octree.root,
      octree,
      parent: null,
      weight: rootWeight,
    });

    let numVisiblePoints = 0;

    // 优先级队列遍历
    while (priorityQueue.size() > 0) {
      const element = priorityQueue.pop()!;
      const node = element.node;
      traversedCount++;

      // 视锥剔除
      if (!this.frustum.intersectsBox(node.boundingBox)) {
        continue;
      }

      // 裁剪框检查
      if (!this.shouldRenderNodeWithClipping(node.boundingBox)) {
        continue;
      }

      // 点预算检查（提前终止）
      if (numVisiblePoints + node.numPoints > this.config.pointBudget) {
        break;
      }

      // 计算到相机的距离
      const center = node.boundingBox.getCenter(new THREE.Vector3());
      const distance = center.distanceTo(cameraPosition);

      // 计算屏幕大小
      const screenSize = this.calculateScreenSize(node, distance);

      // LOD 判断：是否应该继续细分
      // 对于前 forceLoadDepth 层，强制细分（如果有子节点）
      const isForceLoadLevel = node.level < this.config.forceLoadDepth;
      const shouldSubdivide =
        node.level < this.config.maxLevel &&
        node.children.some((child) => child !== null) &&
        (isForceLoadLevel || screenSize >= this.config.minScreenSize);

      if (!shouldSubdivide) {
        // 不再细分，添加当前节点到可见列表
        const priority = this.calculatePriority(distance, screenSize, node.level);
        visibleNodes.push({
          node,
          octree,
          distance,
          screenSize,
          priority,
        });
        numVisiblePoints += node.numPoints;
      } else {
        // 继续细分，将子节点加入优先级队列
        for (const child of node.children) {
          if (child) {
            const childWeight = this.computeWeight(child, cameraPosition);
            priorityQueue.push({
              node: child,
              octree,
              parent: node,
              weight: childWeight,
            });
          }
        }
      }
    }

    return { nodes: visibleNodes, traversed: traversedCount };
  }

  /**
   * 计算节点的屏幕大小
   *
   * @param node - 八叉树节点
   * @param distance - 到相机的距离
   * @returns 屏幕上的像素大小
   */
  private calculateScreenSize(node: IPointCloudOctreeNode, distance: number): number {
    if (!this.camera) return 0;

    // 获取节点的世界空间大小
    const size = node.boundingBox.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.5;

    if (this.camera instanceof THREE.PerspectiveCamera) {
      // 透视相机：使用 FOV 计算屏幕投影大小
      const fov = (this.camera.fov * Math.PI) / 180;
      const slope = Math.tan(fov * 0.5);
      const projFactor = (0.5 * this.config.screenHeight) / (slope * distance);
      return radius * projFactor;
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      // 正交相机：直接映射
      const orthoWidth = this.camera.right - this.camera.left;
      return (radius / orthoWidth) * this.config.screenWidth;
    }

    return radius * 100; // 默认值
  }

  /**
   * 计算节点优先级
   *
   * @param distance - 到相机的距离
   * @param screenSize - 屏幕大小
   * @param level - 节点层级
   * @returns 优先级分数
   */
  private calculatePriority(distance: number, screenSize: number, level: number): number {
    // 优先级基于：
    // 1. 距离（近的优先）
    // 2. 屏幕大小（大的优先）
    // 3. 层级（高层级给予适当权重）

    const distanceFactor = 1 / (distance + 1);
    const sizeFactor = screenSize / this.config.screenHeight;
    const levelFactor = 1 - level / this.config.maxLevel;

    return distanceFactor * 0.5 + sizeFactor * 0.3 + levelFactor * 0.2;
  }

  /**
   * 应用点预算限制
   *
   * @param nodes - 可见节点列表
   * @returns 预算内的节点列表
   */
  private applyPointBudget(nodes: readonly VisibleNode[]): VisibleNode[] {
    const result: VisibleNode[] = [];
    let totalPoints = 0;

    for (const node of nodes) {
      if (totalPoints + node.node.numPoints <= this.config.pointBudget) {
        result.push(node);
        totalPoints += node.node.numPoints;
      } else {
        // 预算已满，停止添加
        break;
      }
    }

    return result;
  }

  /**
   * 计算节点权重（用于优先级队列排序）
   *
   * 权重越大，优先级越高（越早处理）
   * 计算方式：
   * - 透视相机：基于屏幕像素半径
   * - 正交相机：基于节点对角线长度
   *
   * 参考 Potree 原版实现（Potree_update_visibility.js:352-390）
   *
   * @param node - 八叉树节点
   * @param cameraPosition - 相机位置
   * @returns 节点权重
   */
  private computeWeight(node: IPointCloudOctreeNode, cameraPosition: THREE.Vector3): number {
    if (!this.camera) {
      return 0;
    }

    const boundingSphere = node.boundingBox.getBoundingSphere(new THREE.Sphere());
    const center = boundingSphere.center;
    const radius = boundingSphere.radius;

    // 计算到相机的距离
    const dx = cameraPosition.x - center.x;
    const dy = cameraPosition.y - center.y;
    const dz = cameraPosition.z - center.z;
    const distanceSquared = dx * dx + dy * dy + dz * dz;
    const distance = Math.sqrt(distanceSquared);

    if (this.camera instanceof THREE.PerspectiveCamera) {
      // 透视相机：计算屏幕像素半径
      const fov = (this.camera.fov * Math.PI) / 180;
      const slope = Math.tan(fov / 2);
      const projFactor = (0.5 * this.config.screenHeight) / (slope * distance);
      const screenPixelRadius = radius * projFactor;

      // 如果屏幕像素半径小于最小节点像素大小，权重为 0（不处理）
      if (screenPixelRadius < this.config.minScreenSize) {
        return 0;
      }

      let weight = screenPixelRadius;

      // 如果相机在节点内部（距离小于半径），给予最大权重
      if (distance - radius < 0) {
        weight = Number.MAX_VALUE;
      }

      return weight;
    } else if (this.camera instanceof THREE.OrthographicCamera) {
      // 正交相机：使用节点对角线长度作为权重
      const size = node.boundingBox.getSize(new THREE.Vector3());
      const diagonal = size.length();

      return diagonal;
    }

    // 默认权重
    return 1;
  }

  /**
   * 检查包围盒是否与裁剪框相交
   *
   * 如果没有裁剪框或 clipTask 为 NONE，返回 true（不裁剪）
   * 否则根据 clipTask 和 clipMethod 判断是否应该渲染此节点
   *
   * @param boundingBox - 节点包围盒
   * @returns true 表示节点应该渲染，false 表示应该跳过
   */
  private shouldRenderNodeWithClipping(boundingBox: THREE.Box3): boolean {
    // 如果没有裁剪框或裁剪任务为 NONE，不裁剪
    if (this.config.clipBoxes.length === 0 || this.config.clipTask === ClipTask.NONE) {
      return true;
    }

    // 对于 HIGHLIGHT 模式，不影响 LOD 遍历（所有节点都应该渲染）
    if (this.config.clipTask === ClipTask.HIGHLIGHT) {
      return true;
    }

    // 计算包围盒的 8 个顶点
    const min = boundingBox.min;
    const max = boundingBox.max;
    const vertices = [
      new THREE.Vector3(min.x, min.y, min.z),
      new THREE.Vector3(min.x, min.y, max.z),
      new THREE.Vector3(min.x, max.y, min.z),
      new THREE.Vector3(min.x, max.y, max.z),
      new THREE.Vector3(max.x, min.y, min.z),
      new THREE.Vector3(max.x, min.y, max.z),
      new THREE.Vector3(max.x, max.y, min.z),
      new THREE.Vector3(max.x, max.y, max.z),
    ];

    // 对每个裁剪框检查包围盒是否相交
    let intersectCount = 0;
    const v = new THREE.Vector3();

    for (const clipBox of this.config.clipBoxes) {
      // 检查包围盒的任意顶点是否在裁剪框内
      let anyVertexInside = false;

      for (const vertex of vertices) {
        // 将顶点转换到裁剪框的局部空间
        v.copy(vertex).applyMatrix4(clipBox);

        // 检查是否在单位立方体内（-0.5 到 0.5）
        if (v.x >= -0.5 && v.x <= 0.5 && v.y >= -0.5 && v.y <= 0.5 && v.z >= -0.5 && v.z <= 0.5) {
          anyVertexInside = true;
          break;
        }
      }

      if (anyVertexInside) {
        intersectCount++;
      }
    }

    const intersectsAny = intersectCount > 0;
    const intersectsAll = intersectCount === this.config.clipBoxes.length;

    // 根据 clipMethod 和 clipTask 决定是否渲染
    if (this.config.clipMethod === ClipMethod.INSIDE_ANY) {
      if (this.config.clipTask === ClipTask.SHOW_INSIDE) {
        // 只显示与任意裁剪框相交的节点
        return intersectsAny;
      } else if (this.config.clipTask === ClipTask.SHOW_OUTSIDE) {
        // 只显示不与任何裁剪框相交的节点
        return !intersectsAny;
      }
    } else if (this.config.clipMethod === ClipMethod.INSIDE_ALL) {
      if (this.config.clipTask === ClipTask.SHOW_INSIDE) {
        // 只显示与所有裁剪框相交的节点
        return intersectsAll;
      } else if (this.config.clipTask === ClipTask.SHOW_OUTSIDE) {
        // 只显示不与所有裁剪框相交的节点
        return !intersectsAll;
      }
    }

    return true;
  }
}
