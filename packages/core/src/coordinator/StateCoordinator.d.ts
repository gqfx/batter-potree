/**
 * State Coordinator - 连接 Config 和 Runtime 的唯一桥梁
 *
 * @module coordinator/StateCoordinator
 *
 * @remarks
 * StateCoordinator 负责单向同步: Config → Runtime
 *
 * ## 核心职责
 *
 * 1. **配置同步**: 监听 ConfigStore 变更，同步到 Runtime
 * 2. **资源管理**: 添加/删除/更新数据源时，管理资源生命周期
 * 3. **状态清理**: 删除数据源时，彻底清理 GPU、ECS、Octree、Runtime 状态
 *
 * ## 设计原则
 *
 * - **单向数据流**: Config → Runtime，永不反向
 * - **彻底清理**: 资源删除时必须清理所有相关状态
 * - **错误处理**: 加载失败时更新 loadState 为 'failed'
 * - **异步加载**: 八叉树元数据异步加载，不阻塞主线程
 *
 * @example
 * ```typescript
 * // 创建 StateCoordinator
 * const coordinator = new StateCoordinator(
 *   configStore,
 *   runtime,
 *   octreeManager,
 *   resourceManager,
 *   ecs
 * );
 *
 * // 初始同步
 * coordinator.initialSync();
 *
 * // 自动订阅配置变更
 * configStore.getState().addSource({
 *   id: 'new-source',
 *   type: 'potree',
 *   url: '/data/meta.json',
 *   visible: true
 * });
 * // → StateCoordinator 自动同步到 Runtime
 *
 * // 销毁时清理订阅
 * coordinator.dispose();
 * ```
 */
import type { StoreApi } from 'zustand/vanilla';
import type { ConfigStore } from '../config/types.js';
import type { Runtime } from '../runtime/Runtime.js';
/**
 * OctreeManager 接口 (简化版本，避免循环依赖)
 *
 * @description 用于类型标注，完整实现在 octree 模块
 */
interface IOctreeManager {
  /**
   * 加载八叉树元数据
   *
   * @param sourceId - 数据源 ID
   * @param url - 元数据 URL
   * @param type - 数据源类型
   * @returns 加载完成的 Promise
   */
  loadOctree(sourceId: string, url: string, type: string): Promise<void>;
  /**
   * 移除八叉树
   *
   * @param sourceId - 数据源 ID
   */
  removeOctree(sourceId: string): void;
}
/**
 * ResourceManager 接口 (简化版本，避免循环依赖)
 *
 * @description 用于类型标注，完整实现在 resources 模块
 */
interface IResourceManager {
  /**
   * 释放资源
   *
   * @param id - 资源 ID
   */
  releaseById(id: string): void;
}
/**
 * ECS World 接口 (简化版本，避免循环依赖)
 *
 * @description 用于类型标注，完整实现在 ecs 模块
 */
interface IECSWorld {
  /**
   * 创建实体
   *
   * @returns 实体 ID
   */
  createEntity(): number;
  /**
   * 添加组件
   *
   * @param entity - 实体 ID
   * @param ComponentClass - 组件类
   * @param instance - 组件实例
   */
  addComponent<T>(entity: number, ComponentClass: new (...args: unknown[]) => T, instance: T): void;
  /**
   * 查询实体
   *
   * @param ComponentClass - 组件类
   * @returns 实体 ID 数组
   */
  query<T>(ComponentClass: new (...args: unknown[]) => T): number[];
  /**
   * 获取组件
   *
   * @param entity - 实体 ID
   * @param ComponentClass - 组件类
   * @returns 组件实例或 undefined
   */
  getComponent<T>(entity: number, ComponentClass: new (...args: unknown[]) => T): T | undefined;
  /**
   * 移除实体
   *
   * @param entity - 实体 ID
   */
  removeEntity(entity: number): void;
}
/**
 * StateCoordinator 类
 *
 * @description
 * 连接 Config 和 Runtime 的唯一桥梁，负责单向同步配置到运行时状态。
 *
 * ## 工作流程
 *
 * 1. **初始化**: 构造函数调用 `setupSubscriptions()` 订阅配置变更
 * 2. **初始同步**: 调用 `initialSync()` 将当前配置同步到 Runtime
 * 3. **自动同步**: 配置变更时自动触发同步逻辑
 * 4. **清理**: 调用 `dispose()` 取消订阅
 *
 * ## 同步逻辑
 *
 * ### sources 同步
 * - **新增**: `addSource()` → Runtime.sources + ECS + OctreeManager
 * - **删除**: `removeSource()` → 清理 GPU + ECS + Octree + Runtime
 * - **更新**: `updateSource()` → 更新 Runtime.sources
 *
 * ### rendering 同步
 * - 直接修改 `Runtime.rendering` 的可变字段
 * - 同步 FOV 到相机 (如果是透视相机)
 *
 * ### camera 同步
 * - 直接修改 `Runtime.camera.position` 和 `Runtime.camera.lookAt`
 *
 * @example
 * ```typescript
 * // 创建 StateCoordinator
 * const coordinator = new StateCoordinator(
 *   configStore,
 *   runtime,
 *   octreeManager,
 *   resourceManager,
 *   ecs
 * );
 *
 * // 初始同步
 * coordinator.initialSync();
 *
 * // 配置变更会自动同步
 * configStore.getState().addSource({
 *   id: 'source1',
 *   type: 'potree',
 *   url: '/data/meta.json',
 *   visible: true
 * });
 *
 * // 验证同步结果
 * console.log(runtime.sources.has('source1')); // true
 * console.log(runtime.sources.get('source1')?.loadState); // 'loading'
 *
 * // 销毁时清理
 * coordinator.dispose();
 * ```
 */
export declare class StateCoordinator {
  private readonly configStore;
  private readonly runtime;
  private readonly octreeManager;
  private readonly resourceManager;
  private readonly ecs;
  /**
   * Zustand 订阅取消函数数组
   *
   * @description 存储所有订阅的取消函数，在 dispose 时调用
   */
  private unsubscribers;
  /**
   * 构造函数
   *
   * @param configStore - Zustand 配置 Store
   * @param runtime - Runtime 实例
   * @param octreeManager - OctreeManager 实例
   * @param resourceManager - ResourceManager 实例
   * @param ecs - ECS World 实例
   *
   * @remarks
   * 构造函数会自动调用 `setupSubscriptions()` 建立订阅，
   * 但不会自动调用 `initialSync()`，需要手动调用。
   *
   * @example
   * ```typescript
   * const coordinator = new StateCoordinator(
   *   configStore,
   *   runtime,
   *   octreeManager,
   *   resourceManager,
   *   ecs
   * );
   *
   * // 必须手动调用初始同步
   * coordinator.initialSync();
   * ```
   */
  constructor(
    configStore: StoreApi<ConfigStore>,
    runtime: Runtime,
    octreeManager: IOctreeManager,
    resourceManager: IResourceManager,
    ecs: IECSWorld,
  );
  /**
   * 初始同步：将配置同步到运行时
   *
   * @description
   * 将 ConfigStore 中的所有配置同步到 Runtime，包括:
   * - sources: 数据源配置
   * - rendering: 渲染配置
   * - camera: 相机配置
   *
   * @remarks
   * 此方法应该在 Engine 初始化时调用一次，通常在构造函数之后。
   *
   * @example
   * ```typescript
   * const coordinator = new StateCoordinator(...);
   * coordinator.initialSync(); // 同步初始配置
   * ```
   */
  initialSync(): void;
  /**
   * 设置配置变更订阅
   *
   * @description
   * 订阅 ConfigStore 的变更，并在变更时触发同步逻辑。
   *
   * @remarks
   * - 订阅 sources: 调用 `syncSources()`
   * - 订阅 rendering: 调用 `syncRenderingConfig()`
   * - 订阅 camera: 调用 `syncCamera()`
   *
   * 所有订阅的取消函数存储在 `unsubscribers` 中，在 `dispose()` 时调用。
   *
   * 注意: Zustand vanilla 的 subscribe 不支持选择器，需要手动检测变化
   *
   * @private
   */
  private setupSubscriptions;
  /**
   * 同步数据源配置
   *
   * @param sources - 数据源配置对象 (key: sourceId)
   *
   * @description
   * 对比 ConfigStore 和 Runtime 中的数据源，执行增量同步:
   * - 新增的 source → 调用 `addSource()`
   * - 已存在的 source → 调用 `updateSource()`
   * - 删除的 source → 调用 `removeSource()`
   *
   * @remarks
   * 使用 Set 差集算法实现高效的增量同步:
   * ```typescript
   * const added = newIds - oldIds;      // 新增
   * const removed = oldIds - newIds;    // 删除
   * const common = oldIds ∩ newIds;     // 更新
   * ```
   *
   * @example
   * ```typescript
   * // ConfigStore 变更触发此方法
   * configStore.getState().addSource({
   *   id: 'new-source',
   *   type: 'potree',
   *   url: '/data/meta.json',
   *   visible: true
   * });
   * // → syncSources() 被自动调用
   * // → addSource() 被调用
   * ```
   *
   * @private
   */
  private syncSources;
  /**
   * 添加新的 source
   *
   * @param config - 数据源配置
   *
   * @description
   * 添加新数据源的完整流程:
   * 1. 在 Runtime 中初始化状态 (存储配置副本，避免直接引用)
   * 2. 在 ECS 中创建实体和组件 (目前 mock，未来实现)
   * 3. 异步加载八叉树元数据，更新 loadState
   *
   * @remarks
   * - 配置副本: `{ ...config }` 避免直接引用 Config 层
   * - 初始状态: `loadState = 'loading'`
   * - 异步加载: 不阻塞主线程
   * - 错误处理: 加载失败时 `loadState = 'failed'`
   *
   * @example
   * ```typescript
   * addSource({
   *   id: 'main',
   *   type: 'potree',
   *   url: '/data/meta.json',
   *   visible: true
   * });
   *
   * // Runtime 状态:
   * // runtime.sources.get('main') = {
   * //   config: { ... },
   * //   loadedNodes: Map {},
   * //   visibleNodes: Set {},
   * //   loadState: 'loading'
   * // }
   * ```
   *
   * @private
   */
  private addSource;
  /**
   * 删除 source 并清理资源
   *
   * @param sourceId - 数据源 ID
   *
   * @description
   * 删除数据源的完整清理流程:
   * 1. 取消所有进行中的加载任务
   * 2. 释放 GPU 资源
   * 3. 从 ECS 中删除相关实体 (目前 mock)
   * 4. 从八叉树管理器中移除
   * 5. 从 Runtime 中删除
   * 6. 清理运行时状态 (visibleNodes, loadedNodes)
   *
   * @remarks
   * 必须彻底清理所有相关状态，避免内存泄漏:
   * - GPU 资源: 调用 `ResourceManager.releaseById()`
   * - ECS 实体: 调用 `ECSWorld.removeEntity()`
   * - Octree: 调用 `OctreeManager.removeOctree()`
   * - Runtime: 删除 Map/Set 中的条目
   *
   * @example
   * ```typescript
   * // 删除数据源
   * configStore.getState().removeSource('main');
   * // → removeSource('main') 被调用
   * // → 清理所有相关资源
   * ```
   *
   * @private
   */
  private removeSource;
  /**
   * 更新 source 配置
   *
   * @param config - 数据源配置
   *
   * @description
   * 更新已存在数据源的配置。
   *
   * @remarks
   * 检查哪些属性发生了变化:
   * - `visible` 变化: 清空 `visibleNodes` 集合
   * - `transform` 变化: 触发重新计算可见性 (由 TraversalSystem 处理)
   * - 其他变化: 直接更新配置
   *
   * @example
   * ```typescript
   * // 更新可见性
   * configStore.getState().updateSource('main', { visible: false });
   * // → updateSource() 被调用
   * // → sourceState.visibleNodes.clear()
   * ```
   *
   * @private
   */
  private updateSource;
  /**
   * 同步渲染配置
   *
   * @param config - 渲染配置
   *
   * @description
   * 将渲染配置同步到 Runtime.rendering，并同步 FOV 到相机。
   *
   * @remarks
   * - 直接修改 Runtime.rendering 的可变字段
   * - 如果相机是 PerspectiveCamera，同步 FOV 并更新投影矩阵
   *
   * @example
   * ```typescript
   * syncRenderingConfig({
   *   pointBudget: 5_000_000,
   *   minNodeSize: 150,
   *   fov: 75,
   *   pointSize: 1.5
   * });
   *
   * // Runtime 状态:
   * // runtime.rendering.pointBudget = 5_000_000
   * // runtime.camera.fov = 75
   * ```
   *
   * @private
   */
  private syncRenderingConfig;
  /**
   * 同步相机配置
   *
   * @param camera - 相机配置
   *
   * @description
   * 将相机配置同步到 Runtime.camera。
   *
   * @remarks
   * - 直接修改 Runtime.camera.position
   * - 使用 `fromArray()` 方法避免创建新对象
   *
   * @example
   * ```typescript
   * syncCamera({
   *   position: [10, 10, 10],
   *   target: [0, 0, 0]
   * });
   *
   * // Runtime 状态:
   * // runtime.camera.position = Vector3(10, 10, 10)
   * ```
   *
   * @private
   */
  private syncCamera;
  /**
   * 清理运行时状态
   *
   * @param sourceId - 数据源 ID
   *
   * @description
   * 从 Runtime 的全局集合中移除与指定数据源相关的节点。
   *
   * @remarks
   * 清理以下集合:
   * - `runtime.visibleNodes`: 移除以 `sourceId/` 开头的节点 ID
   * - `runtime.loadedNodes`: 移除以 `sourceId/` 开头的节点 ID
   *
   * @example
   * ```typescript
   * cleanupRuntimeState('main');
   * // → runtime.visibleNodes 中 'main/r0', 'main/r01' 等被移除
   * // → runtime.loadedNodes 中 'main/r0', 'main/r01' 等被移除
   * ```
   *
   * @private
   */
  private cleanupRuntimeState;
  /**
   * 销毁 StateCoordinator
   *
   * @description
   * 取消所有 Zustand 订阅，释放资源。
   *
   * @remarks
   * 必须在 Engine 销毁时调用，避免内存泄漏。
   *
   * @example
   * ```typescript
   * // Engine 销毁时
   * coordinator.dispose();
   * // → 所有订阅被取消
   * ```
   */
  dispose(): void;
}
//# sourceMappingURL=StateCoordinator.d.ts.map
