/**
 * 配置状态管理模块
 *
 * @description
 * 提供基于 Zustand 的配置状态管理功能。
 * 管理引擎的所有配置状态，包括数据源、材质、渲染参数和相机配置。
 *
 * @module config
 *
 * @example
 * ```typescript
 * import { createConfigStore } from '@better-potree/core/config';
 *
 * const store = createConfigStore({
 *   sources: {
 *     main: { id: 'main', type: 'potree', url: '/meta.json', visible: true }
 *   },
 *   rendering: { pointBudget: 5_000_000 }
 * });
 *
 * // 获取状态
 * const state = store.getState();
 *
 * // 订阅变化
 * const unsubscribe = store.subscribe((state) => {
 *   console.log('Config updated:', state);
 * });
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
// 导出 store 创建函数
export { createConfigStore } from './store.js';
//# sourceMappingURL=index.js.map