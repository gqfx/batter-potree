/**
 * 增强的视锥剔除优化器
 *
 * 提供高效的视锥剔除功能，支持批量测试和早期退出优化
 * 在现有 FrustumCuller 基础上添加统计功能
 *
 * @module culling
 * @example
 * ```ts
 * const culler = new EnhancedFrustumCuller(camera);
 *
 * // 更新视锥体
 * culler.update();
 *
 * // 测试节点
 * const isVisible = culler.testBox(node.boundingBox);
 * ```
 */

import * as THREE from 'three';

/**
 * 视锥剔除统计信息
 */
export interface FrustumCullingStats {
  /** 测试的节点数 */
  testedNodes: number;
  /** 通过测试的节点数 */
  visibleNodes: number;
  /** 被剔除的节点数 */
  culledNodes: number;
  /** 剔除率 */
  cullRate: number;
}

/**
 * 增强的视锥剔除器
 *
 * 提供优化的视锥剔除功能和性能统计
 */
export class EnhancedFrustumCuller {
  private readonly camera: THREE.Camera;
  private readonly frustum = new THREE.Frustum();
  private readonly projScreenMatrix = new THREE.Matrix4();

  /** 统计信息 */
  private stats: FrustumCullingStats = {
    testedNodes: 0,
    visibleNodes: 0,
    culledNodes: 0,
    cullRate: 0,
  };

  /**
   * 创建增强的视锥剔除器
   *
   * @param camera - 相机对象
   */
  constructor(camera: THREE.Camera) {
    this.camera = camera;
  }

  /**
   * 更新视锥体
   *
   * 应在相机变换后调用
   */
  update(): void {
    this.camera.updateMatrixWorld();

    // 计算投影矩阵
    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );

    // 更新视锥体
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    // 重置统计
    this.stats.testedNodes = 0;
    this.stats.visibleNodes = 0;
    this.stats.culledNodes = 0;
  }

  /**
   * 测试包围盒是否在视锥体内
   *
   * @param box - 包围盒
   * @returns 是否可见
   */
  testBox(box: THREE.Box3): boolean {
    this.stats.testedNodes++;

    const isVisible = this.frustum.intersectsBox(box);

    if (isVisible) {
      this.stats.visibleNodes++;
    } else {
      this.stats.culledNodes++;
    }

    return isVisible;
  }

  /**
   * 测试球体是否在视锥体内
   *
   * @param sphere - 包围球
   * @returns 是否可见
   */
  testSphere(sphere: THREE.Sphere): boolean {
    this.stats.testedNodes++;

    const isVisible = this.frustum.intersectsSphere(sphere);

    if (isVisible) {
      this.stats.visibleNodes++;
    } else {
      this.stats.culledNodes++;
    }

    return isVisible;
  }

  /**
   * 批量测试包围盒
   *
   * @param boxes - 包围盒数组
   * @returns 可见性数组
   */
  testBoxes(boxes: THREE.Box3[]): boolean[] {
    const results: boolean[] = [];

    for (const box of boxes) {
      results.push(this.testBox(box));
    }

    return results;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats(): FrustumCullingStats {
    // 计算剔除率
    this.stats.cullRate =
      this.stats.testedNodes > 0 ? this.stats.culledNodes / this.stats.testedNodes : 0;

    return { ...this.stats };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.testedNodes = 0;
    this.stats.visibleNodes = 0;
    this.stats.culledNodes = 0;
    this.stats.cullRate = 0;
  }

  /**
   * 获取视锥体
   *
   * @returns 视锥体对象
   */
  getFrustum(): THREE.Frustum {
    return this.frustum;
  }
}
