/**
 * ConfigStore 单元测试
 *
 * @module config/__tests__/store.test
 */

import { describe, expect, it, vi } from 'vitest';
import { createConfigStore } from '../store.js';
import type { SourceConfig } from '../types.js';

describe('ConfigStore', () => {
  describe('初始化', () => {
    it('应该使用默认配置创建 store', () => {
      const store = createConfigStore();
      const state = store.getState();

      expect(state.sources).toEqual({});
      expect(state.materials).toEqual({});
      expect(state.rendering).toEqual({
        pointBudget: 2_000_000,
        fov: 60,
        minNodeSize: 100,
        pointSize: 1.0,
      });
      expect(state.camera).toEqual({
        position: [0, 0, 10],
        target: [0, 0, 0],
      });
    });

    it('应该使用提供的初始配置创建 store', () => {
      const initialConfig = {
        sources: {
          main: {
            id: 'main',
            type: 'potree' as const,
            url: '/meta.json',
            visible: true,
          },
        },
        rendering: {
          pointBudget: 5_000_000,
          fov: 75,
          minNodeSize: 150,
          pointSize: 1.5,
        },
      };

      const store = createConfigStore(initialConfig);
      const state = store.getState();

      expect(state.sources).toEqual(initialConfig.sources);
      expect(state.rendering).toEqual(initialConfig.rendering);
    });

    it('应该合并部分初始配置与默认配置', () => {
      const store = createConfigStore({
        rendering: { pointBudget: 5_000_000 },
      });

      const state = store.getState();

      expect(state.rendering.pointBudget).toBe(5_000_000);
      expect(state.rendering.fov).toBe(60); // 默认值
      expect(state.rendering.minNodeSize).toBe(100); // 默认值
      expect(state.rendering.pointSize).toBe(1.0); // 默认值
    });
  });

  describe('addSource', () => {
    it('应该正确添加新数据源', () => {
      const store = createConfigStore();
      const state = store.getState();

      const sourceConfig: SourceConfig = {
        id: 'test-source',
        type: 'potree',
        url: '/test/meta.json',
        visible: true,
      };

      state.addSource(sourceConfig);

      const newState = store.getState();
      expect(newState.sources['test-source']).toEqual(sourceConfig);
    });

    it('应该抛出错误当 ID 已存在', () => {
      const store = createConfigStore({
        sources: {
          existing: {
            id: 'existing',
            type: 'potree',
            url: '/existing.json',
            visible: true,
          },
        },
      });

      const state = store.getState();

      expect(() => {
        state.addSource({
          id: 'existing',
          type: 'potree',
          url: '/duplicate.json',
          visible: true,
        });
      }).toThrow('Source with id "existing" already exists');
    });

    it('应该保持状态不可变性', () => {
      const store = createConfigStore();
      const oldState = store.getState();
      const oldSources = oldState.sources;

      oldState.addSource({
        id: 'new-source',
        type: 'potree',
        url: '/new.json',
        visible: true,
      });

      const newState = store.getState();

      // 引用应该不同
      expect(newState.sources).not.toBe(oldSources);
      // 旧对象不应该被修改
      expect(oldSources).toEqual({});
    });
  });

  describe('removeSource', () => {
    it('应该正确删除数据源', () => {
      const store = createConfigStore({
        sources: {
          toRemove: {
            id: 'toRemove',
            type: 'potree',
            url: '/remove.json',
            visible: true,
          },
          toKeep: {
            id: 'toKeep',
            type: 'potree',
            url: '/keep.json',
            visible: true,
          },
        },
      });

      const state = store.getState();
      state.removeSource('toRemove');

      const newState = store.getState();
      expect(newState.sources['toRemove']).toBeUndefined();
      expect(newState.sources['toKeep']).toBeDefined();
    });

    it('删除不存在的数据源不应报错', () => {
      const store = createConfigStore();
      const state = store.getState();

      expect(() => {
        state.removeSource('non-existent');
      }).not.toThrow();
    });

    it('应该保持状态不可变性', () => {
      const store = createConfigStore({
        sources: {
          existing: {
            id: 'existing',
            type: 'potree',
            url: '/existing.json',
            visible: true,
          },
        },
      });

      const oldState = store.getState();
      const oldSources = oldState.sources;

      oldState.removeSource('existing');

      const newState = store.getState();

      // 引用应该不同
      expect(newState.sources).not.toBe(oldSources);
      // 旧对象不应该被修改
      expect(oldSources).toHaveProperty('existing');
    });
  });

  describe('updateSource', () => {
    it('应该正确更新数据源配置', () => {
      const store = createConfigStore({
        sources: {
          test: {
            id: 'test',
            type: 'potree',
            url: '/test.json',
            visible: true,
          },
        },
      });

      const state = store.getState();
      state.updateSource('test', { visible: false });

      const newState = store.getState();
      expect(newState.sources['test'].visible).toBe(false);
      expect(newState.sources['test'].url).toBe('/test.json'); // 其他属性不变
    });

    it('更新不存在的数据源应该打印警告', () => {
      const store = createConfigStore();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const state = store.getState();
      state.updateSource('non-existent', { visible: false });

      expect(consoleSpy).toHaveBeenCalledWith('Source with id "non-existent" does not exist');
      consoleSpy.mockRestore();
    });

    it('应该保持状态不可变性', () => {
      const store = createConfigStore({
        sources: {
          test: {
            id: 'test',
            type: 'potree',
            url: '/test.json',
            visible: true,
          },
        },
      });

      const oldState = store.getState();
      const oldSources = oldState.sources;
      const oldSource = oldSources['test'];

      oldState.updateSource('test', { visible: false });

      const newState = store.getState();

      // sources 引用应该不同
      expect(newState.sources).not.toBe(oldSources);
      // source 引用应该不同
      expect(newState.sources['test']).not.toBe(oldSource);
      // 旧对象不应该被修改
      expect(oldSource.visible).toBe(true);
    });

    it('应该支持更新多个属性', () => {
      const store = createConfigStore({
        sources: {
          test: {
            id: 'test',
            type: 'potree',
            url: '/test.json',
            visible: true,
          },
        },
      });

      const state = store.getState();
      state.updateSource('test', {
        visible: false,
        materialId: 'custom-material',
      });

      const newState = store.getState();
      expect(newState.sources['test'].visible).toBe(false);
      expect(newState.sources['test'].materialId).toBe('custom-material');
    });
  });

  describe('setRenderingConfig', () => {
    it('应该正确更新渲染配置', () => {
      const store = createConfigStore();
      const state = store.getState();

      state.setRenderingConfig({
        pointBudget: 5_000_000,
        pointSize: 2.0,
      });

      const newState = store.getState();
      expect(newState.rendering.pointBudget).toBe(5_000_000);
      expect(newState.rendering.pointSize).toBe(2.0);
      expect(newState.rendering.fov).toBe(60); // 其他属性不变
    });

    it('应该保持状态不可变性', () => {
      const store = createConfigStore();
      const oldState = store.getState();
      const oldRendering = oldState.rendering;

      oldState.setRenderingConfig({ pointBudget: 5_000_000 });

      const newState = store.getState();

      // rendering 引用应该不同
      expect(newState.rendering).not.toBe(oldRendering);
      // 旧对象不应该被修改
      expect(oldRendering.pointBudget).toBe(2_000_000);
    });
  });

  describe('订阅机制', () => {
    it('应该在状态变化时触发订阅', () => {
      const store = createConfigStore();
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      listener.mockClear(); // Zustand subscribe 不会立即触发，清除初始调用记录

      // 修改状态
      const state = store.getState();
      state.addSource({
        id: 'test',
        type: 'potree',
        url: '/test.json',
        visible: true,
      });

      // 应该触发订阅
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
    });

    it('应该支持取消订阅', () => {
      const store = createConfigStore();
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      listener.mockClear(); // 清除初始调用

      // 取消订阅
      unsubscribe();

      // 修改状态
      const state = store.getState();
      state.setRenderingConfig({ pointBudget: 5_000_000 });

      // 不应该触发
      expect(listener).not.toHaveBeenCalled();
    });

    it('应该支持多个订阅者', () => {
      const store = createConfigStore();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = store.subscribe(listener1);
      const unsubscribe2 = store.subscribe(listener2);

      listener1.mockClear();
      listener2.mockClear();

      // 修改状态
      const state = store.getState();
      state.setRenderingConfig({ pointBudget: 5_000_000 });

      // 两个监听器都应该被触发
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('状态序列化', () => {
    it('所有配置应该可以序列化为 JSON', () => {
      const store = createConfigStore({
        sources: {
          main: {
            id: 'main',
            type: 'potree',
            url: '/meta.json',
            visible: true,
            transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
            materialId: 'default',
          },
        },
        materials: {
          default: {
            id: 'default',
            type: 'point',
            size: 1.0,
            colorEncoding: 'RGB',
          },
        },
        rendering: {
          pointBudget: 2_000_000,
          fov: 60,
          minNodeSize: 100,
          pointSize: 1.0,
        },
        camera: {
          position: [0, 0, 10],
          target: [0, 0, 0],
        },
      });

      const state = store.getState();

      // 应该能够序列化
      expect(() => JSON.stringify(state)).not.toThrow();

      // 序列化后应该能够反序列化
      const json = JSON.stringify(state);
      const parsed = JSON.parse(json);

      expect(parsed.sources).toEqual(state.sources);
      expect(parsed.materials).toEqual(state.materials);
      expect(parsed.rendering).toEqual(state.rendering);
      expect(parsed.camera).toEqual(state.camera);
    });
  });
});
