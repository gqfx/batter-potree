/**
 * 渲染系统类型定义
 *
 * @module types/rendering
 */

/**
 * 材质类型枚举
 *
 * 定义支持的材质渲染类型
 */
export enum MaterialType {
  /** 点云材质 */
  POINT = 'point',

  /** 3D Gaussian Splatting 材质 */
  GAUSSIAN = 'gaussian',

  /** 自定义材质 */
  CUSTOM = 'custom',
}

/**
 * 裁剪任务类型
 *
 * 定义裁剪框的行为模式
 */
export enum ClipTask {
  /** 不裁剪 */
  NONE = 0,

  /** 高亮显示裁剪框内的点 */
  HIGHLIGHT = 1,

  /** 只显示裁剪框内的点 */
  SHOW_INSIDE = 2,

  /** 只显示裁剪框外的点 */
  SHOW_OUTSIDE = 3,
}

/**
 * 裁剪方法
 *
 * 定义多个裁剪框的组合逻辑
 */
export enum ClipMethod {
  /** 点在任意裁剪框内即满足条件（OR 逻辑） */
  INSIDE_ANY = 0,

  /** 点在所有裁剪框内才满足条件（AND 逻辑） */
  INSIDE_ALL = 1,
}

/**
 * GPU 缓冲区描述符
 *
 * 描述如何创建和使用 GPU 缓冲区
 *
 * @example
 * ```typescript
 * const descriptor: BufferDescriptor = {
 *   id: 'positions-buffer-1',
 *   data: new Float32Array([0, 0, 0, 1, 1, 1]),
 *   itemSize: 3,
 *   usage: 'STATIC_DRAW',
 *   type: 'ARRAY_BUFFER'
 * };
 * ```
 */
export interface BufferDescriptor {
  /**
   * 缓冲区唯一标识符
   */
  readonly id: string;

  /**
   * 缓冲区数据
   *
   * 支持所有 TypedArray 类型
   */
  readonly data:
    | Float32Array
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array;

  /**
   * 每个数据项的大小
   *
   * 例如，3D 坐标的 itemSize 为 3，颜色的 itemSize 可能为 3 或 4
   */
  readonly itemSize: number;

  /**
   * 缓冲区使用模式
   *
   * - STATIC_DRAW: 数据不会改变，常用于点云数据
   * - DYNAMIC_DRAW: 数据会频繁改变，常用于动画
   * - STREAM_DRAW: 数据每帧都会改变，常用于粒子系统
   */
  readonly usage?: 'STATIC_DRAW' | 'DYNAMIC_DRAW' | 'STREAM_DRAW';

  /**
   * 缓冲区类型
   *
   * - ARRAY_BUFFER: 顶点属性数据
   * - ELEMENT_ARRAY_BUFFER: 索引数据
   */
  readonly type?: 'ARRAY_BUFFER' | 'ELEMENT_ARRAY_BUFFER';
}

/**
 * 渲染命令
 *
 * 描述单次渲染调用的所有参数，用于批量提交到 GPU
 *
 * @example
 * ```typescript
 * const command: RenderCommand = {
 *   nodeId: 'pc1:r0',
 *   materialType: MaterialType.POINT,
 *   bufferId: 'positions-buffer-1',
 *   numPoints: 100000,
 *   transform: [
 *     1, 0, 0, 0,
 *     0, 1, 0, 0,
 *     0, 0, 1, 0,
 *     0, 0, 0, 1
 *   ],
 *   visible: true
 * };
 * ```
 */
export interface RenderCommand {
  /**
   * 渲染对象 ID
   *
   * 通常是节点 ID（如 "pc1:r0"）或 Gaussian Splat ID
   */
  readonly nodeId: string;

  /**
   * 材质类型
   */
  readonly materialType: MaterialType;

  /**
   * GPU 缓冲区 ID
   *
   * 引用已上传到 GPU 的缓冲区
   */
  readonly bufferId: string;

  /**
   * 点数或图元数量
   *
   * 对于点云是点数，对于 Gaussian Splatting 是 splat 数量
   */
  readonly numPoints: number;

  /**
   * 变换矩阵
   *
   * 4x4 矩阵，以行优先数组形式存储（16 个元素）
   */
  readonly transform?: readonly number[];

  /**
   * 可见性标志
   *
   * false 时跳过渲染
   */
  readonly visible?: boolean;

  /**
   * 渲染优先级
   *
   * 用于排序渲染命令，数值越小越先渲染
   */
  readonly priority?: number;

  /**
   * 自定义材质参数
   *
   * 传递给 shader 的额外参数
   */
  readonly materialParams?: Record<string, unknown>;
}

/**
 * 渲染统计信息
 *
 * 记录每帧的渲染性能数据
 */
export interface RenderStats {
  /**
   * 渲染的节点数量
   */
  readonly nodesRendered: number;

  /**
   * 渲染的总点数
   */
  readonly pointsRendered: number;

  /**
   * Draw call 数量
   */
  readonly drawCalls: number;

  /**
   * GPU 内存使用量（字节）
   */
  readonly gpuMemoryUsed: number;

  /**
   * 渲染耗时（毫秒）
   */
  readonly renderTime: number;
}

/**
 * 视锥体裁剪结果
 *
 * 描述视锥体裁剪后的可见性信息
 */
export interface FrustumCullResult {
  /**
   * 可见节点 ID 列表
   */
  readonly visibleNodes: readonly string[];

  /**
   * 被裁剪掉的节点数量
   */
  readonly culledCount: number;

  /**
   * 视锥体裁剪耗时（毫秒）
   */
  readonly cullTime: number;
}
