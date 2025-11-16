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
export class StateCoordinator {
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
  constructor(configStore, runtime, octreeManager, resourceManager, ecs) {
    this.configStore = configStore;
    this.runtime = runtime;
    this.octreeManager = octreeManager;
    this.resourceManager = resourceManager;
    this.ecs = ecs;
    /**
     * Zustand 订阅取消函数数组
     *
     * @description 存储所有订阅的取消函数，在 dispose 时调用
     */
    this.unsubscribers = [];
    this.setupSubscriptions();
  }
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
  initialSync() {
    const state = this.configStore.getState();
    this.syncSources(state.sources);
    this.syncRenderingConfig(state.rendering);
    this.syncCamera(state.camera);
  }
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
  setupSubscriptions() {
    let prevSources = this.configStore.getState().sources;
    let prevRendering = this.configStore.getState().rendering;
    let prevCamera = this.configStore.getState().camera;
    // 订阅整个 store 的变化
    const unsubscribe = this.configStore.subscribe((state) => {
      // 检测 sources 变化
      if (state.sources !== prevSources) {
        prevSources = state.sources;
        this.syncSources(state.sources);
      }
      // 检测 rendering 变化
      if (state.rendering !== prevRendering) {
        prevRendering = state.rendering;
        this.syncRenderingConfig(state.rendering);
      }
      // 检测 camera 变化
      if (state.camera !== prevCamera) {
        prevCamera = state.camera;
        this.syncCamera(state.camera);
      }
    });
    this.unsubscribers.push(unsubscribe);
  }
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
  syncSources(sources) {
    const oldIds = new Set(this.runtime.sources.keys());
    const newIds = new Set(Object.keys(sources));
    // 处理新增和更新的 source
    for (const id of newIds) {
      if (!oldIds.has(id)) {
        // 新增
        this.addSource(sources[id]);
      } else {
        // 更新
        this.updateSource(sources[id]);
      }
    }
    // 处理删除的 source
    for (const id of oldIds) {
      if (!newIds.has(id)) {
        this.removeSource(id);
      }
    }
  }
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
  addSource(config) {
    // 1. 在 Runtime 中初始化状态 (存储配置副本，避免直接引用)
    this.runtime.sources.set(config.id, {
      config: { ...config },
      loadedNodes: new Map(),
      visibleNodes: new Set(),
      loadState: 'loading',
    });
    // 2. 在 ECS 中创建实体 (目前 mock，未来实现)
    // const entity = this.ecs.createEntity();
    // this.ecs.addComponent(entity, SourceComponent, new SourceComponent(config));
    // 3. 异步加载八叉树元数据
    this.octreeManager
      .loadOctree(config.id, config.url, config.type)
      .then(() => {
        const sourceState = this.runtime.sources.get(config.id);
        if (sourceState) {
          sourceState.loadState = 'loaded';
        }
        console.log(`[StateCoordinator] Octree loaded for source: ${config.id}`);
      })
      .catch((error) => {
        console.error(`[StateCoordinator] Failed to load octree for ${config.id}:`, error);
        const sourceState = this.runtime.sources.get(config.id);
        if (sourceState) {
          sourceState.loadState = 'failed';
        }
        // 可选: 自动移除加载失败的 source
        // this.removeSource(config.id);
      });
  }
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
  removeSource(sourceId) {
    const sourceState = this.runtime.sources.get(sourceId);
    if (!sourceState) {
      return;
    }
    // 1. 取消所有进行中的加载任务
    for (const [nodeId, task] of this.runtime.loadingTasks) {
      if (task.sourceId === sourceId) {
        task.abortController?.abort();
        this.runtime.loadingTasks.delete(nodeId);
      }
    }
    // 2. 释放 GPU 资源
    for (const [nodeId] of this.runtime.gpuResources) {
      if (nodeId.startsWith(sourceId)) {
        this.resourceManager.releaseById(nodeId);
        this.runtime.gpuResources.delete(nodeId);
      }
    }
    // 3. 从 ECS 中删除相关实体 (目前 mock)
    // const entities = this.ecs.query(SourceComponent);
    // for (const entity of entities) {
    //   const comp = this.ecs.getComponent(entity, SourceComponent);
    //   if (comp?.id === sourceId) {
    //     this.ecs.removeEntity(entity);
    //   }
    // }
    // 4. 从八叉树管理器中移除
    this.octreeManager.removeOctree(sourceId);
    // 5. 从 Runtime 中删除
    this.runtime.sources.delete(sourceId);
    // 6. 清理运行时状态
    this.cleanupRuntimeState(sourceId);
  }
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
  updateSource(config) {
    const sourceState = this.runtime.sources.get(config.id);
    if (!sourceState) {
      return;
    }
    // 检查哪些属性发生了变化
    const oldConfig = sourceState.config;
    if (oldConfig.visible !== config.visible) {
      // 可见性变化，清空可见节点集合
      sourceState.visibleNodes.clear();
    }
    if (oldConfig.transform !== config.transform) {
      // 变换矩阵变化，需要重新计算可见性
      // (由 TraversalSystem 在下一帧处理)
    }
    // 更新配置 (存储副本)
    sourceState.config = { ...config };
  }
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
  syncRenderingConfig(config) {
    // 同步渲染配置到 Runtime
    this.runtime.rendering.pointBudget = config.pointBudget;
    this.runtime.rendering.minNodeSize = config.minNodeSize;
    this.runtime.rendering.fov = config.fov;
    this.runtime.rendering.pointSize = config.pointSize;
    // 同步 FOV 到相机 (如果是透视相机)
    if ('fov' in this.runtime.camera) {
      this.runtime.camera.fov = config.fov;
      this.runtime.camera.updateProjectionMatrix();
    }
  }
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
  syncCamera(camera) {
    // 同步相机位置
    this.runtime.camera.position.fromArray(camera.position);
    // TODO: 同步 lookAt (需要 OrbitControls 或其他相机控制器)
    // this.runtime.camera.lookAt(...camera.target);
  }
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
  cleanupRuntimeState(sourceId) {
    // 从可见节点集合中移除
    for (const nodeId of this.runtime.visibleNodes) {
      if (nodeId.startsWith(sourceId)) {
        this.runtime.visibleNodes.delete(nodeId);
      }
    }
    // 清理已加载节点
    for (const nodeId of this.runtime.loadedNodes.keys()) {
      if (nodeId.startsWith(sourceId)) {
        this.runtime.loadedNodes.delete(nodeId);
      }
    }
  }
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
  dispose() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }
}
//# sourceMappingURL=StateCoordinator.js.map
