/**
 * 渲染相关的基础类型定义
 *
 * @packageDocumentation
 */

/**
 * 颜色表示（RGBA 格式，范围 0-1）
 */
export interface Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * 3D 向量
 */
export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * 4x4 变换矩阵（行优先，16 个元素）
 */
export type Matrix4 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * 包围盒
 */
export interface BoundingBox {
  readonly min: Vector3;
  readonly max: Vector3;
}

/**
 * 视锥体
 */
export interface Frustum {
  readonly planes: readonly [Plane, Plane, Plane, Plane, Plane, Plane]; // left, right, top, bottom, near, far
}

/**
 * 平面（法向量 + 距离）
 */
export interface Plane {
  readonly normal: Vector3;
  readonly distance: number;
}

/**
 * 纹理数据格式
 */
export enum TextureFormat {
  RGB = 'RGB',
  RGBA = 'RGBA',
  R = 'R',
  RG = 'RG',
}

/**
 * 纹理数据类型
 */
export enum TextureDataType {
  UNSIGNED_BYTE = 'UNSIGNED_BYTE',
  FLOAT = 'FLOAT',
  HALF_FLOAT = 'HALF_FLOAT',
}

/**
 * 缓冲区使用提示
 */
export enum BufferUsage {
  /** 静态数据，很少修改 */
  STATIC = 'STATIC',
  /** 动态数据，经常修改 */
  DYNAMIC = 'DYNAMIC',
  /** 流式数据，每帧修改 */
  STREAM = 'STREAM',
}

/**
 * 数据类型
 */
export enum DataType {
  BYTE = 'BYTE',
  UNSIGNED_BYTE = 'UNSIGNED_BYTE',
  SHORT = 'SHORT',
  UNSIGNED_SHORT = 'UNSIGNED_SHORT',
  INT = 'INT',
  UNSIGNED_INT = 'UNSIGNED_INT',
  FLOAT = 'FLOAT',
}

/**
 * 渲染模式
 */
export enum RenderMode {
  POINTS = 'POINTS',
  LINES = 'LINES',
  TRIANGLES = 'TRIANGLES',
}

/**
 * 混合模式
 */
export enum BlendMode {
  NONE = 'NONE',
  NORMAL = 'NORMAL',
  ADDITIVE = 'ADDITIVE',
  MULTIPLY = 'MULTIPLY',
}

/**
 * 深度测试函数
 */
export enum DepthFunc {
  NEVER = 'NEVER',
  LESS = 'LESS',
  EQUAL = 'EQUAL',
  LEQUAL = 'LEQUAL',
  GREATER = 'GREATER',
  NOTEQUAL = 'NOTEQUAL',
  GEQUAL = 'GEQUAL',
  ALWAYS = 'ALWAYS',
}
