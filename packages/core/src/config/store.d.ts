/**
 * 配置状态管理 - Zustand Store 实现
 *
 * @module config/store
 */
import type { ConfigStore, EngineConfig } from './types.js';
/**
 * 创建配置 Store
 *
 * @description
 * 创建基于 Zustand vanilla 的配置状态管理 store。
 * 该 store 管理引擎的所有配置状态，包括数据源、材质、渲染参数和相机配置。
 *
 * @param initial - 可选的初始配置
 * @returns Zustand store 实例
 *
 * @remarks
 * - 使用 Zustand vanilla (非 React 版本)
 * - 所有状态更新遵循不可变原则
 * - 所有配置必须可序列化
 * - 由 StateCoordinator 订阅并同步到 Runtime
 *
 * @example
 * ```typescript
 * // 创建默认配置的 store
 * const store = createConfigStore();
 *
 * // 创建带初始配置的 store
 * const store = createConfigStore({
 *   sources: {
 *     main: { id: 'main', type: 'potree', url: '/meta.json', visible: true }
 *   },
 *   rendering: { pointBudget: 5_000_000 }
 * });
 *
 * // 订阅状态变化
 * const unsubscribe = store.subscribe((state) => {
 *   console.log('Config changed:', state);
 * });
 *
 * // 获取当前状态
 * const state = store.getState();
 *
 * // 添加数据源
 * state.addSource({
 *   id: 'new-source',
 *   type: 'potree',
 *   url: '/data/meta.json',
 *   visible: true
 * });
 * ```
 */
export declare function createConfigStore(initial?: EngineConfig): import("zustand/vanilla").StoreApi<ConfigStore>;
/**
 * 导出类型以便外部使用
 */
export type { ConfigState, ConfigStore, EngineConfig } from './types.js';
//# sourceMappingURL=store.d.ts.map