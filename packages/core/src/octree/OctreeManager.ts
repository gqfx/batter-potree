/**
 * 八叉树管理器
 *
 * 管理多个八叉树的生命周期和访问
 *
 * @module octree
 * @example
 * ```ts
 * const manager = new OctreeManager();
 *
 * // 加载八叉树
 * const metadata = await manager.loadOctree('pc1', 'http://example.com/metadata.json');
 *
 * // 获取八叉树
 * const octree = manager.getOctree('pc1');
 *
 * // 查找节点
 * const node = manager.getNode('pc1', 'r0');
 * ```
 */

import * as THREE from 'three';
import type { PointAttributes } from '../attributes/PointAttributes.js';
import { OctreeNode } from './OctreeNode.js';
import { PointCloudOctree } from './PointCloudOctree.js';
import type { OctreeMetadata, OctreeStats } from './types.js';
import { makeGlobalNodeId } from './utils.js';

/**
 * 八叉树管理器
 *
 * 特性：
 * - 多数据源管理
 * - 全局节点索引
 * - 元数据缓存
 */
export class OctreeManager {
  /** 八叉树映射：sourceId -> PointCloudOctree */
  private readonly octrees = new Map<string, PointCloudOctree>();

  /** 全局节点索引：globalNodeId -> OctreeNode */
  private readonly nodeIndex = new Map<string, OctreeNode>();

  /** 元数据映射：sourceId -> OctreeMetadata */
  private readonly metadataMap = new Map<string, OctreeMetadata>();

  /**
   * 加载八叉树元数据并创建八叉树实例
   *
   * @param sourceId - 数据源ID
   * @param url - 元数据 URL
   * @param fetchFn - 可选的 fetch 函数
   * @returns 元数据
   * @example
   * ```ts
   * const metadata = await manager.loadOctree('pc1', '/data/metadata.json');
   * console.log('Loaded:', metadata.points, 'points');
   * ```
   */
  async loadOctree(
    sourceId: string,
    url: string,
    fetchFn: typeof fetch = fetch,
  ): Promise<OctreeMetadata> {
    // 检查是否已加载
    if (this.octrees.has(sourceId)) {
      throw new Error(`Octree already loaded: ${sourceId}`);
    }

    // 获取元数据
    const response = await fetchFn(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const rawMetadata = await response.json();

    // 解析元数据
    const metadata = this.parseMetadata(rawMetadata, sourceId, url);

    // 创建八叉树
    const octree = this.createOctreeFromMetadata(metadata);

    // 存储
    this.octrees.set(sourceId, octree);
    this.metadataMap.set(sourceId, metadata);

    // 索引根节点
    const globalId = makeGlobalNodeId(sourceId, 'r');
    this.nodeIndex.set(globalId, octree.root);

    return metadata;
  }

  /**
   * 获取八叉树
   *
   * @param sourceId - 数据源ID
   * @returns 八叉树实例或 undefined
   */
  getOctree(sourceId: string): PointCloudOctree | undefined {
    return this.octrees.get(sourceId);
  }

  /**
   * 获取元数据
   *
   * @param sourceId - 数据源ID
   * @returns 元数据或 undefined
   */
  getMetadata(sourceId: string): OctreeMetadata | undefined {
    return this.metadataMap.get(sourceId);
  }

  /**
   * 获取节点
   *
   * @param sourceId - 数据源ID
   * @param nodeName - 节点名称
   * @returns 节点或 undefined
   */
  getNode(sourceId: string, nodeName: string): OctreeNode | undefined {
    const globalId = makeGlobalNodeId(sourceId, nodeName);
    return this.nodeIndex.get(globalId);
  }

  /**
   * 通过全局ID获取节点
   *
   * @param globalId - 全局节点ID
   * @returns 节点或 undefined
   */
  getNodeByGlobalId(globalId: string): OctreeNode | undefined {
    return this.nodeIndex.get(globalId);
  }

  /**
   * 注册节点到全局索引
   *
   * @param sourceId - 数据源ID
   * @param node - 节点实例
   */
  registerNode(sourceId: string, node: OctreeNode): void {
    const globalId = makeGlobalNodeId(sourceId, node.name);
    this.nodeIndex.set(globalId, node);
  }

  /**
   * 从全局索引移除节点
   *
   * @param sourceId - 数据源ID
   * @param nodeName - 节点名称
   */
  unregisterNode(sourceId: string, nodeName: string): void {
    const globalId = makeGlobalNodeId(sourceId, nodeName);
    this.nodeIndex.delete(globalId);
  }

  /**
   * 移除八叉树
   *
   * @param sourceId - 数据源ID
   * @returns 是否移除成功
   */
  removeOctree(sourceId: string): boolean {
    const octree = this.octrees.get(sourceId);
    if (!octree) return false;

    // 从索引中移除所有节点
    octree.traverse((node) => {
      const globalId = makeGlobalNodeId(sourceId, node.name);
      this.nodeIndex.delete(globalId);
    });

    // 销毁八叉树
    octree.dispose();

    // 移除存储
    this.octrees.delete(sourceId);
    this.metadataMap.delete(sourceId);

    return true;
  }

  /**
   * 获取所有数据源ID
   *
   * @returns 数据源ID数组
   */
  getSourceIds(): string[] {
    return Array.from(this.octrees.keys());
  }

  /**
   * 检查数据源是否已加载
   *
   * @param sourceId - 数据源ID
   * @returns 是否已加载
   */
  hasOctree(sourceId: string): boolean {
    return this.octrees.has(sourceId);
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats(): OctreeStats {
    let totalNodes = 0;
    let loadedNodes = 0;
    let totalPoints = 0;

    for (const octree of this.octrees.values()) {
      octree.traverse((node) => {
        totalNodes++;
        if (node.isLoaded()) {
          loadedNodes++;
        }
        totalPoints += node.numPoints;
      });
    }

    return {
      octreeCount: this.octrees.size,
      totalNodes,
      loadedNodes,
      totalPoints,
    };
  }

  /**
   * 清空所有八叉树
   */
  clear(): void {
    for (const sourceId of this.octrees.keys()) {
      this.removeOctree(sourceId);
    }
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    this.clear();
  }

  /**
   * 解析原始元数据
   *
   * @param raw - 原始 JSON 数据
   * @param sourceId - 数据源ID
   * @param url - URL
   * @returns 解析后的元数据
   */
  private parseMetadata(raw: unknown, sourceId: string, url: string): OctreeMetadata {
    // biome-ignore lint/suspicious/noExplicitAny: Raw JSON parsing requires any
    const data = raw as any;

    // 基本验证
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid metadata format');
    }

    // 解析边界盒
    const boundingBox = data.boundingBox || data.tightBoundingBox;
    if (!boundingBox) {
      throw new Error('Missing bounding box in metadata');
    }

    const metadata: OctreeMetadata = {
      sourceId, // 重要：填充 sourceId
      url,
      name: data.name || sourceId,
      boundingBox: {
        min: boundingBox.min || [0, 0, 0],
        max: boundingBox.max || [1, 1, 1],
      },
      spacing: data.spacing || 1.0,
      attributes: data.pointAttributes || data.attributes || {},
      points: data.points || 0,
    };

    // 可选字段
    if (data.hierarchy) {
      metadata.hierarchy = data.hierarchy;
    }

    if (data.offset) {
      metadata.offset = data.offset;
    }

    if (data.scale) {
      metadata.scale = data.scale;
    }

    return metadata;
  }

  /**
   * 从元数据创建八叉树
   *
   * @param metadata - 元数据
   * @returns 八叉树实例
   */
  private createOctreeFromMetadata(metadata: OctreeMetadata): PointCloudOctree {
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(...metadata.boundingBox.min),
      new THREE.Vector3(...metadata.boundingBox.max),
    );

    const offset = metadata.offset
      ? new THREE.Vector3(...metadata.offset)
      : new THREE.Vector3();

    const octree = new PointCloudOctree(
      boundingBox,
      metadata.spacing,
      metadata.attributes,
      offset,
    );

    octree.setName(metadata.name);
    octree.root.numPoints = metadata.points;

    return octree;
  }
}
