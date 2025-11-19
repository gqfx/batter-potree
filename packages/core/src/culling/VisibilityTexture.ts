/**
 * 可见性纹理管理器
 *
 * 管理用于 GPU LOD 遍历的可见性纹理
 * 每个节点在纹理中占用一个像素，存储可见性信息
 *
 * @module culling
 * @example
 * ```ts
 * const visTexture = new VisibilityTexture(renderer);
 *
 * // 更新可见性
 * visTexture.updateNodeVisibility(nodeId, true);
 *
 * // 获取纹理
 * const texture = visTexture.getTexture();
 * material.uniforms.visibilityTexture.value = texture;
 * ```
 */

import * as THREE from 'three';

/**
 * 可见性纹理配置
 */
export interface VisibilityTextureOptions {
  /**
   * 纹理大小（每边的像素数）
   * 最大支持的节点数 = size * size
   * @default 256
   */
  readonly size?: number;

  /**
   * 是否使用浮点纹理（支持更多信息）
   * @default false
   */
  readonly useFloatTexture?: boolean;
}

/**
 * 可见性纹理管理器
 *
 * 将节点可见性存储在 GPU 纹理中，供 shader 使用
 */
export class VisibilityTextureManager {
  private readonly size: number;
  private readonly useFloatTexture: boolean;

  /** 可见性纹理 */
  private texture: THREE.DataTexture | null = null;

  /** 纹理数据 */
  private data: Uint8Array | Float32Array;

  /** 节点ID到纹理坐标的映射 */
  private readonly nodeIdToIndex = new Map<string, number>();

  /** 下一个可用的纹理索引 */
  private nextIndex = 0;

  /** 是否需要更新纹理 */
  private needsUpdate = false;

  /**
   * 创建可见性纹理管理器
   *
   * @param _renderer - Three.js 渲染器（保留以供未来使用）
   * @param options - 配置选项
   */
  constructor(_renderer: THREE.WebGLRenderer, options: VisibilityTextureOptions = {}) {
    this.size = options.size ?? 256;
    this.useFloatTexture = options.useFloatTexture ?? false;

    // 初始化纹理数据
    const dataSize = this.size * this.size * 4; // RGBA
    this.data = this.useFloatTexture ? new Float32Array(dataSize) : new Uint8Array(dataSize);

    // 创建纹理
    this.createTexture();
  }

  /**
   * 创建纹理
   */
  private createTexture(): void {
    const format = THREE.RGBAFormat;
    const type = this.useFloatTexture ? THREE.FloatType : THREE.UnsignedByteType;

    this.texture = new THREE.DataTexture(this.data, this.size, this.size, format, type);
    this.texture.needsUpdate = true;

    // 设置纹理参数
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  /**
   * 注册节点
   *
   * @param nodeId - 节点ID
   * @returns 纹理索引，如果纹理已满返回 -1
   */
  registerNode(nodeId: string): number {
    // 检查是否已注册
    const existingIndex = this.nodeIdToIndex.get(nodeId);
    if (existingIndex !== undefined) {
      return existingIndex;
    }

    // 检查是否还有空间
    const maxNodes = this.size * this.size;
    if (this.nextIndex >= maxNodes) {
      return -1;
    }

    // 分配新索引
    const index = this.nextIndex++;
    this.nodeIdToIndex.set(nodeId, index);

    return index;
  }

  /**
   * 更新节点可见性
   *
   * @param nodeId - 节点ID
   * @param isVisible - 是否可见
   * @param distance - 到相机的距离（可选）
   * @param screenSize - 屏幕大小（可选）
   *
   * @example
   * ```ts
   * visTexture.updateNodeVisibility('node-123', true, 100.5, 150);
   * ```
   */
  updateNodeVisibility(
    nodeId: string,
    isVisible: boolean,
    distance?: number,
    screenSize?: number,
  ): void {
    const index = this.nodeIdToIndex.get(nodeId);
    if (index === undefined) {
      return;
    }

    // 计算数据索引
    const dataIndex = index * 4; // RGBA

    if (this.useFloatTexture) {
      // Float32Array: 存储精确值
      const data = this.data as Float32Array;
      data[dataIndex] = isVisible ? 1.0 : 0.0; // R: 可见性
      data[dataIndex + 1] = distance ?? 0.0; // G: 距离
      data[dataIndex + 2] = screenSize ?? 0.0; // B: 屏幕大小
      data[dataIndex + 3] = 1.0; // A: 保留
    } else {
      // Uint8Array: 存储归一化值
      const data = this.data as Uint8Array;
      data[dataIndex] = isVisible ? 255 : 0; // R: 可见性
      data[dataIndex + 1] = distance !== undefined ? Math.min(255, distance / 10) : 0; // G: 距离（缩放）
      data[dataIndex + 2] = screenSize !== undefined ? Math.min(255, screenSize) : 0; // B: 屏幕大小
      data[dataIndex + 3] = 255; // A: 保留
    }

    this.needsUpdate = true;
  }

  /**
   * 批量更新节点可见性
   *
   * @param updates - 更新列表
   *
   * @example
   * ```ts
   * visTexture.batchUpdate([
   *   { nodeId: 'node-1', isVisible: true, distance: 100 },
   *   { nodeId: 'node-2', isVisible: false, distance: 200 }
   * ]);
   * ```
   */
  batchUpdate(
    updates: Array<{
      nodeId: string;
      isVisible: boolean;
      distance?: number;
      screenSize?: number;
    }>,
  ): void {
    for (const update of updates) {
      this.updateNodeVisibility(update.nodeId, update.isVisible, update.distance, update.screenSize);
    }
  }

  /**
   * 更新纹理到 GPU
   *
   * 应在所有可见性更新后调用
   */
  update(): void {
    if (!this.needsUpdate || !this.texture) {
      return;
    }

    this.texture.needsUpdate = true;
    this.needsUpdate = false;
  }

  /**
   * 获取纹理对象
   *
   * @returns 可见性纹理
   */
  getTexture(): THREE.DataTexture | null {
    return this.texture;
  }

  /**
   * 获取节点的纹理坐标
   *
   * @param nodeId - 节点ID
   * @returns UV 坐标或 undefined
   *
   * @example
   * ```ts
   * const uv = visTexture.getNodeUV('node-123');
   * if (uv) {
   *   console.log(`Node at (${uv.x}, ${uv.y})`);
   * }
   * ```
   */
  getNodeUV(nodeId: string): THREE.Vector2 | undefined {
    const index = this.nodeIdToIndex.get(nodeId);
    if (index === undefined) {
      return undefined;
    }

    const x = index % this.size;
    const y = Math.floor(index / this.size);

    return new THREE.Vector2(x / this.size, y / this.size);
  }

  /**
   * 获取节点的纹理索引
   *
   * @param nodeId - 节点ID
   * @returns 纹理索引或 undefined
   */
  getNodeIndex(nodeId: string): number | undefined {
    return this.nodeIdToIndex.get(nodeId);
  }

  /**
   * 清空所有节点
   */
  clear(): void {
    // 重置数据
    this.data.fill(0);

    // 清空映射
    this.nodeIdToIndex.clear();
    this.nextIndex = 0;

    this.needsUpdate = true;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats(): {
    registeredNodes: number;
    maxNodes: number;
    usageRate: number;
    textureSize: number;
  } {
    const maxNodes = this.size * this.size;
    return {
      registeredNodes: this.nextIndex,
      maxNodes,
      usageRate: this.nextIndex / maxNodes,
      textureSize: this.size,
    };
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }

    this.nodeIdToIndex.clear();
    this.nextIndex = 0;
  }
}
