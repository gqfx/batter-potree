/**
 * 八叉树类型定义
 *
 * @module octree
 */

import type { PointAttributes } from '../attributes/PointAttributes.js';

/**
 * 八叉树元数据
 */
export interface OctreeMetadata {
  /** 数据源ID */
  sourceId: string;
  /** 数据源 URL */
  url: string;
  /** 点云名称 */
  name: string;
  /** 包围盒 */
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  /** 点间距 */
  spacing: number;
  /** 点属性 */
  attributes: PointAttributes;
  /** 总点数 */
  points: number;
  /** 层级结构信息 */
  hierarchy?: {
    firstChunkSize: number;
    stepSize: number;
    depth: number;
  };
  /** 偏移量 */
  offset?: [number, number, number];
  /** 缩放 */
  scale?: [number, number, number];
}

/**
 * 八叉树统计信息
 */
export interface OctreeStats {
  /** 八叉树数量 */
  octreeCount: number;
  /** 总节点数 */
  totalNodes: number;
  /** 已加载节点数 */
  loadedNodes: number;
  /** 总点数 */
  totalPoints: number;
}
