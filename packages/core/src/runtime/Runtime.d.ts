/**
 * Runtime 状态管理 - 运行时状态类
 *
 * @module runtime/Runtime
 *
 * @remarks
 * Runtime 是引擎的可变运行时状态层，用于高频更新。
 * 与 Config 层的不可变状态形成对比:
 * - Config: 低频、不可变、可序列化、描述"用户想要什么"
 * - Runtime: 高频、可变、不可序列化、描述"引擎当前在做什么"
 *
 * 设计原则:
 * - 完全可变：所有属性都可以直接修改，不创建新对象
 * - 性能优先：针对每帧更新优化，零 GC 压力
 * - 不可序列化：包含 Camera、Map、Set 等不可序列化对象
 * - 单向数据流：只被 StateCoordinator 和 Systems 修改，不反向影响 Config
 */
import type { Camera } from 'three';
import type {
  GPUResource,
  LoadTask,
  MemoryBudgets,
  NodeData,
  PerformanceStats,
  RenderingRuntimeConfig,
  SourceRuntimeState,
} from './types.js';
/**
 * ResourceManager 接口 (简化版本，避免循环依赖)
 *
 * @description 用于类型标注，完整实现在 resources 模块
 */
interface IResourceManager {
  /** 通过 ID 释放资源 */
  releaseById(id: string): void;
}
/**
 * Runtime 运行时状态类
 *
 * @description
 * 管理引擎的可变运行时状态，包括相机、可见节点、加载任务、性能统计等。
 * 所有字段都是可变的，可以直接修改，不创建新对象。
 *
 * @remarks
 * ## 设计特点
 *
 * ### 1. 完全可变
 * ```typescript
 * // ✅ 直接修改，不创建新对象
 * runtime.visibleNodes.add('node-123');
 * runtime.rendering.pointBudget = 5_000_000;
 *
 * // ❌ 不要这样做 (不可变更新)
 * runtime.visibleNodes = new Set([...runtime.visibleNodes, 'node-123']);
 * ```
 *
 * ### 2. 与 Config 的关系
 * - Runtime 的 `rendering` 由 StateCoordinator 从 Config.rendering 同步
 * - Runtime 的 `sources` 由 StateCoordinator 从 Config.sources 同步
 * - Runtime 永远不反向修改 Config
 *
 * ### 3. 内存管理
 * - `budgets`: 只读预算配置
 * - `stats.memoryUsed`: 当前内存使用情况
 * - 配合 ResourceManager 的 LRU 策略自动管理 GPU 内存
 *
 * @example
 * ```typescript
 * // 创建默认 Runtime
 * const runtime = new Runtime();
 *
 * // 创建自定义 Runtime
 * const camera = new PerspectiveCamera(60, 16/9, 0.1, 1000);
 * const runtime = new Runtime(camera, {
 *   gpuMemory: 4 * 1024 * 1024 * 1024, // 4GB
 *   cpuMemory: 2 * 1024 * 1024 * 1024  // 2GB
 * });
 *
 * // 使用 Runtime
 * runtime.visibleNodes.add('main/r0');
 * runtime.rendering.pointBudget = 10_000_000;
 * runtime.stats.frameTime = 16.7;
 *
 * // 检查内存预算
 * if (runtime.checkGPUMemoryBudget(1024 * 1024)) {
 *   // 可以分配 1MB GPU 内存
 * }
 *
 * // 清理不可见节点
 * runtime.cleanupInvisibleNodes();
 * ```
 */
export declare class Runtime {
  /**
   * 相机实例
   *
   * @description
   * Three.js Camera 实例，由 InputSystem 每帧更新。
   * TraversalSystem 使用相机进行视锥剔除和 LOD 计算。
   *
   * @remarks
   * 通常是 PerspectiveCamera，但也可以是其他 Camera 子类
   */
  camera: Camera;
  /**
   * 渲染运行时配置
   *
   * @description
   * 从 Config 层同步而来的渲染参数，由 StateCoordinator 更新。
   * Systems 直接读取这些值进行渲染决策。
   *
   * @remarks
   * 可变对象，可以直接修改属性:
   * ```typescript
   * runtime.rendering.pointBudget = 5_000_000;
   * runtime.rendering.minNodeSize = 150;
   * ```
   */
  rendering: RenderingRuntimeConfig;
  /**
   * 当前可见的节点 ID 集合
   *
   * @description
   * TraversalSystem 每帧更新此集合，表示当前应该渲染的节点。
   * StreamingSystem 根据此集合决定加载哪些节点。
   *
   * @remarks
   * - 使用 Set 保证唯一性和 O(1) 查找性能
   * - 每帧清空并重新填充
   * - 与 visibleNodesList 配合使用
   *
   * @example
   * ```typescript
   * // TraversalSystem 更新可见节点
   * runtime.visibleNodes.clear();
   * runtime.visibleNodes.add('main/r0');
   * runtime.visibleNodes.add('main/r01');
   * ```
   */
  visibleNodes: Set<string>;
  /**
   * 可见节点列表 (数组形式)
   *
   * @description
   * visibleNodes 的数组形式，用于稳定迭代。
   * 由 TraversalSystem 在每帧末尾从 visibleNodes 生成。
   *
   * @remarks
   * 为什么需要这个数组?
   * - Set 迭代顺序不稳定
   * - 数组便于排序和批处理
   * - 避免在渲染循环中重复转换
   *
   * @example
   * ```typescript
   * // TraversalSystem
   * runtime.visibleNodesList = Array.from(runtime.visibleNodes);
   *
   * // RenderSystem
   * for (const nodeId of runtime.visibleNodesList) {
   *   // 渲染节点
   * }
   * ```
   */
  visibleNodesList: string[];
  /**
   * 加载任务集合
   *
   * @description
   * StreamingSystem 管理的所有加载任务。
   * key: nodeId, value: LoadTask
   *
   * @remarks
   * - 任务生命周期: pending → loading → loaded/failed
   * - 可以被 AbortController 取消
   * - 支持重试 (最多 3 次)
   *
   * @example
   * ```typescript
   * // 创建加载任务
   * runtime.loadingTasks.set('main/r0', {
   *   nodeId: 'main/r0',
   *   sourceId: 'main',
   *   url: '/data/r0.bin',
   *   priority: 1.0,
   *   status: 'loading',
   *   retryCount: 0,
   *   abortController: new AbortController()
   * });
   *
   * // 取消任务
   * const task = runtime.loadingTasks.get('main/r0');
   * task?.abortController?.abort();
   * runtime.loadingTasks.delete('main/r0');
   * ```
   */
  loadingTasks: Map<string, LoadTask>;
  /**
   * 已加载的节点数据
   *
   * @description
   * StreamingSystem 加载完成后存储节点数据。
   * key: nodeId, value: NodeData
   *
   * @remarks
   * - 包含点位置、颜色等 CPU 侧数据
   * - 上传到 GPU 后，gpuResourceId 字段会被填充
   * - 不可见的已加载节点会被 LRU 驱逐
   *
   * @example
   * ```typescript
   * // 存储已加载节点
   * runtime.loadedNodes.set('main/r0', {
   *   positions: new Float32Array([...]),
   *   colors: new Uint8Array([...]),
   *   numPoints: 1000,
   *   gpuResourceId: 'gpu-buffer-123'
   * });
   *
   * // 获取节点数据
   * const data = runtime.loadedNodes.get('main/r0');
   * ```
   */
  loadedNodes: Map<string, NodeData>;
  /**
   * 数据源运行时状态集合
   *
   * @description
   * 每个数据源的动态状态，由 StateCoordinator 管理。
   * key: sourceId, value: SourceRuntimeState
   *
   * @remarks
   * - 包含数据源配置的副本 (避免直接引用 Config)
   * - 跟踪每个数据源的加载状态
   * - 跟踪每个数据源的可见/已加载节点
   *
   * @example
   * ```typescript
   * // StateCoordinator 添加数据源
   * runtime.sources.set('main', {
   *   config: { id: 'main', type: 'potree', url: '/meta.json', visible: true },
   *   loadedNodes: new Map(),
   *   visibleNodes: new Set(),
   *   loadState: 'loading'
   * });
   *
   * // 更新加载状态
   * const sourceState = runtime.sources.get('main');
   * if (sourceState) {
   *   sourceState.loadState = 'loaded';
   * }
   * ```
   */
  sources: Map<string, SourceRuntimeState>;
  /**
   * GPU 资源集合
   *
   * @description
   * 所有上传到 GPU 的资源 (缓冲区、纹理等)。
   * key: resourceId, value: GPUResource
   *
   * @remarks
   * - 由 ResourceManager 管理
   * - 包含资源大小，用于内存预算计算
   * - 包含 lastUsed 时间戳，用于 LRU 驱逐
   *
   * @example
   * ```typescript
   * // ResourceManager 分配资源
   * runtime.gpuResources.set('buffer-node-123', {
   *   id: 'buffer-node-123',
   *   type: 'buffer',
   *   size: 1024 * 1024,
   *   handle: webglBuffer,
   *   lastUsed: performance.now()
   * });
   * ```
   */
  gpuResources: Map<string, GPUResource>;
  /**
   * 性能统计
   *
   * @description
   * 引擎运行时的性能指标，由各系统更新。
   *
   * @remarks
   * - SystemScheduler 自动记录每个系统的耗时
   * - RenderSystem 更新渲染统计
   * - ResourceManager 更新内存使用
   *
   * @example
   * ```typescript
   * // SystemScheduler 记录系统耗时
   * runtime.stats.systemTimes.set('bp:traversal', 2.3);
   *
   * // RenderSystem 更新渲染统计
   * runtime.stats.pointsRendered = 1_500_000;
   * runtime.stats.drawCalls = 50;
   *
   * // ResourceManager 更新内存使用
   * runtime.stats.memoryUsed.gpu = 512 * 1024 * 1024;
   * ```
   */
  stats: PerformanceStats;
  /**
   * 内存预算配置
   *
   * @description
   * 运行时的内存使用限制，只读。
   *
   * @remarks
   * - 在构造函数中设置
   * - ResourceManager 使用这些值进行 LRU 驱逐
   * - 建议将 budgets.gpuMemory 传递给 ResourceManager
   *
   * @example
   * ```typescript
   * // 创建 ResourceManager 时传入预算
   * const resourceManager = new ResourceManager(runtime.budgets.gpuMemory);
   *
   * // 检查是否超出预算
   * if (runtime.stats.memoryUsed.gpu > runtime.budgets.gpuMemory) {
   *   // 触发驱逐
   * }
   * ```
   */
  readonly budgets: MemoryBudgets;
  /**
   * 构造函数
   *
   * @param camera - Three.js Camera 实例 (默认: PerspectiveCamera)
   * @param budgets - 可选的内存预算配置
   *
   * @example
   * ```typescript
   * // 使用默认配置
   * const runtime = new Runtime();
   *
   * // 使用自定义相机和预算
   * const camera = new PerspectiveCamera(60, 16/9, 0.1, 1000);
   * const runtime = new Runtime(camera, {
   *   gpuMemory: 4 * 1024 * 1024 * 1024, // 4GB
   *   cpuMemory: 2 * 1024 * 1024 * 1024  // 2GB
   * });
   * ```
   */
  constructor(camera?: Camera, budgets?: Partial<MemoryBudgets>);
  /**
   * 检查 GPU 内存预算
   *
   * @param requiredBytes - 需要分配的字节数
   * @returns 如果可以分配返回 true，否则返回 false
   *
   * @remarks
   * 用于在分配 GPU 资源前检查是否会超出预算。
   * ResourceManager 应该在分配前调用此方法。
   *
   * @example
   * ```typescript
   * // 在分配 GPU 缓冲区前检查
   * const bufferSize = 1024 * 1024; // 1MB
   * if (runtime.checkGPUMemoryBudget(bufferSize)) {
   *   // 可以安全分配
   *   const buffer = gl.createBuffer();
   *   runtime.stats.memoryUsed.gpu += bufferSize;
   * } else {
   *   // 需要先驱逐一些资源
   *   resourceManager.evictIfOverBudget();
   * }
   * ```
   */
  checkGPUMemoryBudget(requiredBytes: number): boolean;
  /**
   * 清理不可见的加载任务
   *
   * @description
   * 取消所有不在 visibleNodes 中的进行中加载任务，释放资源。
   *
   * @remarks
   * - 遍历所有 loadingTasks
   * - 如果节点不可见且正在加载，则取消任务
   * - 通常在 CLEANUP 阶段调用
   *
   * @example
   * ```typescript
   * // CleanupSystem
   * class CleanupSystem implements ISystem {
   *   update(deltaTime: number): void {
   *     // 清理不可见的加载任务
   *     this.runtime.cleanupInvisibleNodes();
   *   }
   * }
   * ```
   */
  cleanupInvisibleNodes(): void;
  /**
   * 驱逐不可见的已加载节点
   *
   * @param resourceManager - ResourceManager 实例
   *
   * @description
   * 释放所有不在 visibleNodes 中的已加载节点，包括 CPU 和 GPU 资源。
   *
   * @remarks
   * - 遍历所有 loadedNodes
   * - 如果节点不可见，释放其 GPU 资源并从 loadedNodes 中移除
   * - 通常在 CLEANUP 阶段调用
   * - 配合 ResourceManager.evictIfOverBudget() 使用
   *
   * @example
   * ```typescript
   * // CleanupSystem
   * class CleanupSystem implements ISystem {
   *   update(deltaTime: number): void {
   *     // 清理不可见的已加载节点
   *     this.runtime.evictInvisibleLoadedNodes(this.resourceManager);
   *
   *     // 如果仍超出预算，使用 LRU 驱逐
   *     this.resourceManager.evictIfOverBudget(this.runtime.budgets.gpuMemory);
   *   }
   * }
   * ```
   */
  evictInvisibleLoadedNodes(resourceManager: IResourceManager): void;
}
//# sourceMappingURL=Runtime.d.ts.map
