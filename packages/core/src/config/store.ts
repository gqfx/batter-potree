/**
 * 配置状态管理 - Zustand Store 实现
 *
 * @module config/store
 */

import { createStore } from 'zustand/vanilla';
import type {
  ConfigStore,
  EngineConfig,
  MaterialConfig,
  RenderingConfig,
  SourceConfig,
} from './types.js';

/**
 * 默认渲染配置
 *
 * @internal
 */
const DEFAULT_RENDERING_CONFIG: RenderingConfig = {
  pointBudget: 2_000_000,
  fov: 60,
  minNodeSize: 100,
  pointSize: 1.0,
};

/**
 * 默认相机配置
 *
 * @internal
 */
const DEFAULT_CAMERA_CONFIG = {
  position: [0, 0, 10] as const,
  target: [0, 0, 0] as const,
};

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
export function createConfigStore(initial?: EngineConfig) {
  return createStore<ConfigStore>((set) => ({
    // ========== 初始状态 ==========
    sources: initial?.sources ?? {},
    materials: initial?.materials ?? {},
    rendering: {
      ...DEFAULT_RENDERING_CONFIG,
      ...(initial?.rendering ?? {}),
    },
    camera: {
      ...DEFAULT_CAMERA_CONFIG,
      ...(initial?.camera ?? {}),
    },

    // ========== Actions ==========

    /**
     * 添加数据源
     *
     * @param config - 数据源配置
     * @throws {Error} 如果数据源 ID 已存在
     */
    addSource: (config: SourceConfig) =>
      set((state) => {
        // 检查 ID 是否已存在
        if (state.sources[config.id]) {
          throw new Error(`Source with id "${config.id}" already exists`);
        }

        return {
          sources: { ...state.sources, [config.id]: config },
        };
      }),

    /**
     * 删除数据源
     *
     * @param id - 数据源 ID
     */
    removeSource: (id: string) =>
      set((state) => {
        // 使用解构赋值删除指定 key
        const { [id]: removed, ...rest } = state.sources;
        return { sources: rest };
      }),

    /**
     * 更新数据源配置
     *
     * @param id - 数据源 ID
     * @param partial - 部分配置更新
     */
    updateSource: (id: string, partial: Partial<SourceConfig>) =>
      set((state) => {
        // 如果数据源不存在，直接返回当前状态
        if (!state.sources[id]) {
          // biome-ignore lint/suspicious/noConsole: Development warning for debugging
          console.warn(`Source with id "${id}" does not exist`);
          return state;
        }

        return {
          sources: {
            ...state.sources,
            [id]: { ...state.sources[id], ...partial },
          },
        };
      }),

    /**
     * 添加材质
     *
     * @param config - 材质配置
     * @throws {Error} 如果材质 ID 已存在
     */
    addMaterial: (config: MaterialConfig) =>
      set((state) => {
        // 检查 ID 是否已存在
        if (state.materials[config.id]) {
          throw new Error(`Material with id "${config.id}" already exists`);
        }

        return {
          materials: { ...state.materials, [config.id]: config },
        };
      }),

    /**
     * 删除材质
     *
     * @param id - 材质 ID
     */
    removeMaterial: (id: string) =>
      set((state) => {
        // 使用解构赋值删除指定 key
        const { [id]: removed, ...rest } = state.materials;
        return { materials: rest };
      }),

    /**
     * 更新材质配置
     *
     * @param id - 材质 ID
     * @param partial - 部分配置更新
     */
    updateMaterial: (id: string, partial: Partial<MaterialConfig>) =>
      set((state) => {
        // 如果材质不存在，直接返回当前状态
        if (!state.materials[id]) {
          // biome-ignore lint/suspicious/noConsole: Development warning for debugging
          console.warn(`Material with id "${id}" does not exist`);
          return state;
        }

        return {
          materials: {
            ...state.materials,
            [id]: { ...state.materials[id], ...partial },
          },
        };
      }),

    /**
     * 更新渲染配置
     *
     * @param config - 部分渲染配置更新
     */
    setRenderingConfig: (config: Partial<RenderingConfig>) =>
      set((state) => ({
        rendering: { ...state.rendering, ...config },
      })),
  }));
}

/**
 * 导出类型以便外部使用
 */
export type { ConfigState, ConfigStore, EngineConfig } from './types.js';
