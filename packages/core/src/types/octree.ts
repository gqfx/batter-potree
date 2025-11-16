/**
 * 八叉树空间分区系统类型定义
 *
 * @module types/octree
 */

import type { Box3, Vector3 } from 'three';

/**
 * 八叉树节点元数据
 *
 * 描述八叉树中单个节点的空间信息和数据位置
 *
 * @example
 * ```typescript
 * const metadata: OctreeNodeMetadata = {
 *   id: 'pc1:r0',
 *   sourceId: 'pc1',
 *   name: 'r0',
 *   level: 0,
 *   boundingBox: new Box3(min, max),
 *   center: new Vector3(0, 0, 0),
 *   numPoints: 100000,
 *   url: '/data/r0.bin',
 *   children: [-1, 0, 1, -1, -1, -1, -1, -1],
 *   spacing: 0.01
 * };
 * ```
 */
export interface OctreeNodeMetadata {
  /**
   * 节点唯一标识符
   *
   * 格式为 "sourceId:nodeName"，例如 "pc1:r0"、"pc1:r01234"
   */
  readonly id: string;

  /**
   * 所属数据源 ID
   *
   * 关联到 ConfigState.sources 中的 source
   */
  readonly sourceId: string;

  /**
   * 节点名称
   *
   * 例如 "r0" (根节点)、"r01234" (层级节点)
   * 名称编码了节点在八叉树中的位置
   */
  readonly name: string;

  /**
   * 节点层级
   *
   * 0 表示根节点，数值越大层级越深
   */
  readonly level: number;

  /**
   * 空间包围盒
   *
   * 定义节点在 3D 空间中的范围，用于视锥剔除
   */
  readonly boundingBox: Box3;

  /**
   * 节点中心点
   *
   * 用于距离计算和 LOD 选择
   */
  readonly center: Vector3;

  /**
   * 节点包含的点数
   *
   * 用于点预算管理和优先级排序
   */
  readonly numPoints: number;

  /**
   * 节点数据文件 URL
   *
   * 指向包含点云数据的二进制文件（如 .bin）
   */
  readonly url: string;

  /**
   * 子节点索引数组
   *
   * 长度为 8，对应八叉树的 8 个子节点位置：
   * - 索引 0-7 对应八叉树的 8 个象限
   * - 值为 -1 表示该位置没有子节点
   * - 值为非负整数表示子节点的序号
   *
   * @example
   * ```typescript
   * // 只有第 1、2 个子节点存在
   * children: [-1, 0, 1, -1, -1, -1, -1, -1]
   * ```
   */
  readonly children: readonly number[];

  /**
   * 节点点间距
   *
   * 表示节点内相邻点的平均距离，用于 LOD 计算
   */
  readonly spacing: number;
}

/**
 * 八叉树元数据
 *
 * 描述整个八叉树的全局信息，对应 Potree 2.0 的 meta.json
 *
 * @example
 * ```typescript
 * const metadata: OctreeMetadata = {
 *   sourceId: 'pc1',
 *   version: '2.0',
 *   boundingBox: new Box3(
 *     new Vector3(-10, -10, -10),
 *     new Vector3(10, 10, 10)
 *   ),
 *   spacing: 0.01,
 *   scale: 0.001,
 *   hierarchyStepSize: 5,
 *   pointAttributes: ['POSITION_CARTESIAN', 'COLOR_PACKED', 'NORMAL']
 * };
 * ```
 */
export interface OctreeMetadata {
  /**
   * 数据源 ID
   *
   * 关联到 ConfigState.sources 中的 source
   */
  readonly sourceId: string;

  /**
   * Potree 格式版本
   *
   * 例如 "1.7"、"2.0"
   */
  readonly version: string;

  /**
   * 整个点云的空间包围盒
   *
   * 定义点云数据的总体范围
   */
  readonly boundingBox: Box3;

  /**
   * 根节点点间距
   *
   * 最粗层级的点间距，用于计算每层的点密度
   */
  readonly spacing: number;

  /**
   * 点坐标缩放因子
   *
   * 用于将存储的整数坐标转换为实际坐标
   */
  readonly scale: number;

  /**
   * 层级步长
   *
   * Potree 层级分块策略的参数，影响文件组织方式
   */
  readonly hierarchyStepSize: number;

  /**
   * 点属性列表
   *
   * 描述点云数据中包含的属性，例如：
   * - 'POSITION_CARTESIAN': XYZ 坐标
   * - 'COLOR_PACKED': RGB 颜色
   * - 'NORMAL': 法线
   * - 'INTENSITY': 强度
   * - 'CLASSIFICATION': 分类
   *
   * @example
   * ```typescript
   * pointAttributes: [
   *   'POSITION_CARTESIAN',
   *   'COLOR_PACKED',
   *   'NORMAL',
   *   'INTENSITY'
   * ]
   * ```
   */
  readonly pointAttributes: readonly string[];
}

/**
 * 节点加载状态
 *
 * 描述八叉树节点的加载状态机
 */
export type NodeLoadState = 'unloaded' | 'loading' | 'loaded' | 'failed';
