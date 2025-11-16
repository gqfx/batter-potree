/**
 * Runtime 状态管理 - 类型定义
 *
 * @module runtime/types
 *
 * @remarks
 * Runtime 层是高频更新的可变状态层，与 Config 层的不可变状态形成对比。
 * - Config: 低频、不可变、可序列化、描述"用户想要什么"
 * - Runtime: 高频、可变、不可序列化、描述"引擎当前在做什么"
 */

import type { SourceConfig } from '../config/types.js';

/**
 * 加载任务状态
 *
 * @description 节点数据加载的生命周期状态
 */
export type LoadTaskStatus = 'pending' | 'loading' | 'loaded' | 'failed';

/**
 * 节点加载任务
 *
 * @description 描述一个点云节点的异步加载任务
 *
 * @example
 * ```typescript
 * const task: LoadTask = {
 *   nodeId: 'main/r0123',
 *   sourceId: 'main',
 *   url: 'https://example.com/data/r0123.bin',
 *   priority: 1.0,
 *   status: 'loading',
 *   retryCount: 0,
 *   startTime: performance.now(),
 *   abortController: new AbortController()
 * };
 * ```
 */
export interface LoadTask {
  /** 节点唯一标识符 (格式: sourceId/nodeName) */
  nodeId: string;

  /** 所属数据源 ID */
  sourceId: string;

  /** 节点数据 URL */
  url: string;

  /** 加载优先级 (越高越优先，基于距离相机的远近) */
  priority: number;

  /** 当前状态 */
  status: LoadTaskStatus;

  /** 取消控制器 (用于中止加载) */
  abortController?: AbortController;

  /** 已解码的节点数据 (加载成功后填充) */
  data?: NodeData;

  /** 错误信息 (加载失败后填充) */
  error?: string;

  /** 重试次数 */
  retryCount: number;

  /** 开始加载时间戳 (用于超时检测) */
  startTime?: number;
}

/**
 * 节点数据
 *
 * @description 已加载的点云节点数据
 *
 * @remarks
 * - positions: Float32Array，每3个元素表示一个点的坐标 (x, y, z)
 * - colors: Uint8Array，每3个元素表示一个点的颜色 (r, g, b)
 * - numPoints: 点的数量
 * - gpuResourceId: GPU 资源 ID (上传到 GPU 后填充)
 *
 * @example
 * ```typescript
 * const nodeData: NodeData = {
 *   positions: new Float32Array([0, 0, 0, 1, 1, 1]),
 *   colors: new Uint8Array([255, 0, 0, 0, 255, 0]),
 *   numPoints: 2,
 *   gpuResourceId: 'gpu-buffer-123'
 * };
 * ```
 */
export interface NodeData {
  /** 点位置数据 (x, y, z 交错存储) */
  positions: Float32Array;

  /** 点颜色数据 (r, g, b 交错存储，0-255) */
  colors: Uint8Array;

  /** 点的数量 */
  numPoints: number;

  /** GPU 资源 ID (如果已上传到 GPU) */
  gpuResourceId?: string;
}

/**
 * 数据源运行时状态
 *
 * @description 单个数据源在运行时的动态状态
 *
 * @remarks
 * - config: 数据源配置的副本 (避免直接引用 Config 层)
 * - loadedNodes: 该数据源已加载的节点集合
 * - visibleNodes: 该数据源当前可见的节点集合
 * - loadState: 八叉树元数据的加载状态
 *
 * @example
 * ```typescript
 * const sourceState: SourceRuntimeState = {
 *   config: { id: 'main', type: 'potree', url: '/meta.json', visible: true },
 *   loadedNodes: new Map(),
 *   visibleNodes: new Set(),
 *   loadState: 'loaded'
 * };
 * ```
 */
export interface SourceRuntimeState {
  /** 数据源配置 (副本) */
  config: SourceConfig;

  /** 已加载的节点 (key: nodeId) */
  loadedNodes: Map<string, NodeData>;

  /** 当前可见的节点 ID 集合 */
  visibleNodes: Set<string>;

  /** 八叉树元数据加载状态 */
  loadState: 'loading' | 'loaded' | 'failed';
}

/**
 * GPU 资源类型
 *
 * @description GPU 资源的分类
 */
export type GPUResourceType = 'buffer' | 'texture';

/**
 * GPU 资源
 *
 * @description 描述一个 GPU 资源 (缓冲区或纹理)
 *
 * @remarks
 * - id: 资源唯一标识符
 * - type: 资源类型 (buffer 或 texture)
 * - size: 字节大小，用于内存预算计算
 * - handle: WebGL/WebGPU 资源句柄 (any 类型，由渲染层管理)
 * - lastUsed: 最后使用时间戳，用于 LRU 缓存驱逐
 *
 * @example
 * ```typescript
 * const gpuResource: GPUResource = {
 *   id: 'buffer-node-123',
 *   type: 'buffer',
 *   size: 1024 * 1024, // 1MB
 *   handle: webglBuffer,
 *   lastUsed: performance.now()
 * };
 * ```
 */
export interface GPUResource {
  /** 资源唯一标识符 */
  id: string;

  /** 资源类型 */
  type: GPUResourceType;

  /** 资源大小 (字节) */
  size: number;

  /** WebGL/WebGPU 资源句柄 */
  handle: unknown;

  /** 最后使用时间戳 (用于 LRU) */
  lastUsed: number;
}

/**
 * 性能统计
 *
 * @description 引擎运行时的性能统计数据
 *
 * @remarks
 * 所有字段都是可变的，由各系统在运行时更新
 *
 * @example
 * ```typescript
 * const stats: PerformanceStats = {
 *   frameTime: 16.7,
 *   systemTimes: new Map([['bp:traversal', 2.3], ['bp:render', 12.1]]),
 *   drawCalls: 50,
 *   pointsRendered: 1_500_000,
 *   nodesLoaded: 150,
 *   memoryUsed: { gpu: 512 * 1024 * 1024, cpu: 128 * 1024 * 1024 }
 * };
 * ```
 */
export interface PerformanceStats {
  /** 总帧时间 (ms) */
  frameTime: number;

  /** 各系统耗时 (key: systemName, value: duration in ms) */
  systemTimes: Map<string, number>;

  /** Draw Calls 数量 */
  drawCalls: number;

  /** 渲染的点数 */
  pointsRendered: number;

  /** 已加载的节点数 */
  nodesLoaded: number;

  /** 内存使用情况 */
  memoryUsed: {
    /** GPU 内存使用量 (字节) */
    gpu: number;
    /** CPU 内存使用量 (字节) */
    cpu: number;
  };
}

/**
 * 渲染运行时配置
 *
 * @description 从 Config 同步而来的渲染参数
 *
 * @remarks
 * 这些值由 StateCoordinator 从 ConfigStore 同步到 Runtime
 */
export interface RenderingRuntimeConfig {
  /** 点预算 (每帧最大渲染点数) */
  pointBudget: number;

  /** 最小节点屏幕大小 (像素) */
  minNodeSize: number;

  /** 视场角 (度) */
  fov: number;

  /** 默认点大小 */
  pointSize: number;
}

/**
 * 内存预算配置
 *
 * @description 运行时的内存使用限制
 *
 * @remarks
 * 这些值是只读的，在 Runtime 创建时设置
 */
export interface MemoryBudgets {
  /** GPU 内存预算 (字节) */
  readonly gpuMemory: number;

  /** CPU 内存预算 (字节) */
  readonly cpuMemory: number;
}
