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
   * 添加点云
   *
   * @param id - 点云 ID
   * @param octree - 点云八叉树
   */
  addPointCloud(id: string, octree: IPointCloudOctree): void {
    this.pointClouds.set(id, octree);
  }

  /**
   * 移除点云
   *
   * @param id - 点云 ID
   */
  removePointCloud(id: string): void {
    this.pointClouds.delete(id);
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
  }

  /**
   * 销毁系统
   */
  dispose(): void {
    this.pointClouds.clear();
    this.camera = null;
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

    // 使用栈进行深度优先遍历
    const stack: IPointCloudOctreeNode[] = [octree.root];

    while (stack.length > 0) {
      const node = stack.pop()!;
      traversedCount++;

      // 视锥剔除
      if (!this.frustum.intersectsBox(node.boundingBox)) {
        continue;
      }

      // 计算到相机的距离
      const center = node.boundingBox.getCenter(new THREE.Vector3());
      const distance = center.distanceTo(cameraPosition);

      // 计算屏幕大小
      const screenSize = this.calculateScreenSize(node, distance);

      // 检查 LOD 条件
      if (node.level >= this.config.maxLevel || screenSize < this.config.minScreenSize) {
        // 添加当前节点但不继续遍历子节点
        const priority = this.calculatePriority(distance, screenSize, node.level);
        visibleNodes.push({
          node,
          octree,
          distance,
          screenSize,
          priority,
        });
        continue;
      }

      // 检查是否有子节点
      const hasChildren = node.children.some((child) => child !== null);

      if (!hasChildren) {
        // 叶子节点，添加到可见列表
        const priority = this.calculatePriority(distance, screenSize, node.level);
        visibleNodes.push({
          node,
          octree,
          distance,
          screenSize,
          priority,
        });
      } else {
        // 有子节点，添加当前节点并继续遍历
        const priority = this.calculatePriority(distance, screenSize, node.level);
        visibleNodes.push({
          node,
          octree,
          distance,
          screenSize,
          priority,
        });

        // 添加子节点到栈（按距离排序，远的先入栈）
        const childrenWithDistance: Array<{
          node: IPointCloudOctreeNode;
          distance: number;
        }> = [];

        for (const child of node.children) {
          if (child) {
            const childCenter = child.boundingBox.getCenter(new THREE.Vector3());
            const childDistance = childCenter.distanceTo(cameraPosition);
            childrenWithDistance.push({ node: child, distance: childDistance });
          }
        }

        // 按距离降序排序，使近的子节点最后出栈（优先处理）
        childrenWithDistance.sort((a, b) => b.distance - a.distance);

        for (const { node: child } of childrenWithDistance) {
          stack.push(child);
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
}
