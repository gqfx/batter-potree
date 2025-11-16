/**
 * 缓冲区接口
 *
 * 定义了几何数据的存储和管理，支持顶点、索引、法线、颜色等属性。
 *
 * @example
 * ```ts
 * const buffer = renderer.createBuffer({
 *   vertexCount: 1000,
 *   attributes: {
 *     position: { data: positions, itemSize: 3, type: DataType.FLOAT },
 *     color: { data: colors, itemSize: 4, type: DataType.UNSIGNED_BYTE },
 *   },
 *   usage: BufferUsage.STATIC,
 * });
 *
 * // 更新部分数据
 * buffer.updateAttribute('position', newPositions, 0, 100);
 * ```
 *
 * @packageDocumentation
 */

import type { BufferUsage, DataType, RenderMode } from '../types/common';
import type { BoundingBox } from '../types/common';

/**
 * 顶点属性数据
 */
export interface AttributeData {
  /** 数据数组 */
  readonly data: ArrayBufferView;
  /** 每个顶点的分量数（如位置是 3，颜色可能是 4） */
  readonly itemSize: number;
  /** 数据类型 */
  readonly type: DataType;
  /** 是否归一化（仅用于整数类型） */
  readonly normalized?: boolean;
}

/**
 * 缓冲区配置选项
 */
export interface BufferOptions {
  /** 顶点数量 */
  readonly vertexCount: number;
  /** 顶点属性 */
  readonly attributes: Record<string, AttributeData>;
  /** 索引数据（可选，用于索引绘制） */
  readonly indices?: Uint16Array | Uint32Array;
  /** 使用提示 */
  readonly usage?: BufferUsage;
  /** 渲染模式 */
  readonly mode?: RenderMode;
  /** 包围盒（可选，用于视锥体剔除） */
  readonly boundingBox?: BoundingBox;
}

/**
 * 缓冲区接口
 *
 * 提供几何数据的运行时管理，包括：
 * - 顶点属性的增删改查
 * - 索引数据管理
 * - 数据更新（支持部分更新）
 * - 资源管理
 */
export interface IBuffer {
  /**
   * 缓冲区唯一 ID
   */
  readonly id: string;

  /**
   * 获取顶点数量
   *
   * @returns 顶点数量
   */
  getVertexCount(): number;

  /**
   * 设置顶点数量
   *
   * @param count - 新的顶点数量
   */
  setVertexCount(count: number): void;

  /**
   * 获取索引数量
   *
   * @returns 索引数量，如果无索引则返回 0
   */
  getIndexCount(): number;

  /**
   * 添加或更新顶点属性
   *
   * @param name - 属性名称（如 'position', 'color', 'normal'）
   * @param data - 属性数据
   */
  setAttribute(name: string, data: AttributeData): void;

  /**
   * 获取顶点属性
   *
   * @param name - 属性名称
   * @returns 属性数据，如果不存在则返回 undefined
   */
  getAttribute(name: string): AttributeData | undefined;

  /**
   * 检查是否存在属性
   *
   * @param name - 属性名称
   * @returns 是否存在
   */
  hasAttribute(name: string): boolean;

  /**
   * 移除顶点属性
   *
   * @param name - 属性名称
   */
  removeAttribute(name: string): void;

  /**
   * 获取所有属性名称
   *
   * @returns 属性名称列表
   */
  getAttributeNames(): readonly string[];

  /**
   * 更新顶点属性的部分数据
   *
   * @param name - 属性名称
   * @param data - 新数据
   * @param offset - 起始顶点索引
   * @param count - 更新的顶点数量（可选，默认为 data 的长度）
   */
  updateAttribute(
    name: string,
    data: ArrayBufferView,
    offset: number,
    count?: number
  ): void;

  /**
   * 设置索引数据
   *
   * @param indices - 索引数组
   */
  setIndices(indices: Uint16Array | Uint32Array): void;

  /**
   * 获取索引数据
   *
   * @returns 索引数组，如果无索引则返回 undefined
   */
  getIndices(): Uint16Array | Uint32Array | undefined;

  /**
   * 设置渲染模式
   *
   * @param mode - 渲染模式
   */
  setRenderMode(mode: RenderMode): void;

  /**
   * 获取渲染模式
   *
   * @returns 渲染模式
   */
  getRenderMode(): RenderMode;

  /**
   * 设置包围盒
   *
   * @param boundingBox - 包围盒
   */
  setBoundingBox(boundingBox: BoundingBox): void;

  /**
   * 获取包围盒
   *
   * @returns 包围盒，如果未设置则返回 undefined
   */
  getBoundingBox(): BoundingBox | undefined;

  /**
   * 计算包围盒（基于 position 属性）
   *
   * @returns 计算得到的包围盒
   * @throws {Error} 如果没有 position 属性
   */
  computeBoundingBox(): BoundingBox;

  /**
   * 克隆缓冲区
   *
   * @returns 缓冲区副本
   */
  clone(): IBuffer;

  /**
   * 释放缓冲区资源
   */
  dispose(): void;
}
