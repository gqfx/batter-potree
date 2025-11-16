/**
 * StateCoordinator 单元测试
 *
 * @module coordinator/__tests__/StateCoordinator.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createConfigStore } from '../../config/store.js';
import { Runtime } from '../../runtime/Runtime.js';
import { StateCoordinator } from '../StateCoordinator.js';
import type { SourceConfig } from '../../config/types.js';
import type { StoreApi } from 'zustand/vanilla';
import type { ConfigStore } from '../../config/types.js';

/**
 * Mock OctreeManager
 */
class MockOctreeManager {
  public loadedOctrees = new Set<string>();
  public loadOctree = vi.fn((sourceId: string, url: string, type: string) => {
    this.loadedOctrees.add(sourceId);
    return Promise.resolve();
  });
  public removeOctree = vi.fn((sourceId: string) => {
    this.loadedOctrees.delete(sourceId);
  });
}

/**
 * Mock ResourceManager
 */
class MockResourceManager {
  public releasedResources = new Set<string>();
  public releaseById = vi.fn((id: string) => {
    this.releasedResources.add(id);
  });
}

/**
 * Mock ECS World
 */
class MockECSWorld {
  private entityCounter = 0;
  public entities = new Map<number, Map<Function, unknown>>();

  public createEntity = vi.fn(() => {
    const id = ++this.entityCounter;
    this.entities.set(id, new Map());
    return id;
  });

  public addComponent = vi.fn(<T>(
    entity: number,
    ComponentClass: new (...args: unknown[]) => T,
    instance: T
  ) => {
    const components = this.entities.get(entity);
    if (components) {
      components.set(ComponentClass, instance);
    }
  });

  public query = vi.fn(<T>(ComponentClass: new (...args: unknown[]) => T): number[] => {
    const result: number[] = [];
    for (const [entityId, components] of this.entities) {
      if (components.has(ComponentClass)) {
        result.push(entityId);
      }
    }
    return result;
  });

  public getComponent = vi.fn(<T>(
    entity: number,
    ComponentClass: new (...args: unknown[]) => T
  ): T | undefined => {
    const components = this.entities.get(entity);
    return components?.get(ComponentClass) as T | undefined;
  });

  public removeEntity = vi.fn((entity: number) => {
    this.entities.delete(entity);
  });
}

describe('StateCoordinator', () => {
  let configStore: StoreApi<ConfigStore>;
  let runtime: Runtime;
  let octreeManager: MockOctreeManager;
  let resourceManager: MockResourceManager;
  let ecs: MockECSWorld;
  let coordinator: StateCoordinator;

  beforeEach(() => {
    // 创建干净的实例
    configStore = createConfigStore();
    runtime = new Runtime();
    octreeManager = new MockOctreeManager();
    resourceManager = new MockResourceManager();
    ecs = new MockECSWorld();

    // 创建 StateCoordinator
    coordinator = new StateCoordinator(
      configStore,
      runtime,
      octreeManager,
      resourceManager,
      ecs
    );
  });

  describe('初始化', () => {
    it('应该成功创建 StateCoordinator 实例', () => {
      expect(coordinator).toBeInstanceOf(StateCoordinator);
    });

    it('应该自动设置订阅', () => {
      // 验证订阅已建立 (通过触发配置变更并检查是否同步)
      const testSource: SourceConfig = {
        id: 'test',
        type: 'potree',
        url: '/test.json',
        visible: true,
      };

      configStore.getState().addSource(testSource);

      // 订阅是异步的，需要等待一个微任务
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(runtime.sources.has('test')).toBe(true);
          resolve(undefined);
        }, 0);
      });
    });
  });

  describe('initialSync()', () => {
    it('应该同步初始配置到 Runtime', () => {
      // 添加初始配置
      const source1: SourceConfig = {
        id: 'source1',
        type: 'potree',
        url: '/source1.json',
        visible: true,
      };
      configStore.getState().addSource(source1);

      configStore.getState().setRenderingConfig({
        pointBudget: 5_000_000,
        fov: 75,
      });

      // 执行初始同步
      coordinator.initialSync();

      // 验证同步结果
      expect(runtime.sources.has('source1')).toBe(true);
      expect(runtime.rendering.pointBudget).toBe(5_000_000);
      expect(runtime.rendering.fov).toBe(75);
    });

    it('应该同步空配置而不报错', () => {
      expect(() => {
        coordinator.initialSync();
      }).not.toThrow();

      expect(runtime.sources.size).toBe(0);
    });
  });

  describe('同步数据源', () => {
    it('应该正确添加新 source', async () => {
      const testSource: SourceConfig = {
        id: 'test-source',
        type: 'potree',
        url: 'http://example.com/meta.json',
        visible: true,
      };

      configStore.getState().addSource(testSource);

      // 等待订阅触发
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 验证 Runtime 状态
      expect(runtime.sources.has('test-source')).toBe(true);
      const sourceState = runtime.sources.get('test-source');
      expect(sourceState?.config.id).toBe('test-source');
      // 由于 Mock 的 loadOctree 立即 resolve，loadState 可能已经是 'loaded'
      expect(['loading', 'loaded']).toContain(sourceState?.loadState);
      expect(sourceState?.loadedNodes.size).toBe(0);
      expect(sourceState?.visibleNodes.size).toBe(0);

      // 验证 OctreeManager 被调用
      expect(octreeManager.loadOctree).toHaveBeenCalledWith(
        'test-source',
        'http://example.com/meta.json',
        'potree'
      );
    });

    it('应该在八叉树加载成功后更新 loadState', async () => {
      const testSource: SourceConfig = {
        id: 'success-source',
        type: 'potree',
        url: '/success.json',
        visible: true,
      };

      configStore.getState().addSource(testSource);

      // 等待订阅和异步加载
      await new Promise((resolve) => setTimeout(resolve, 0));
      await octreeManager.loadOctree('success-source', '/success.json', 'potree');

      // 验证 loadState 更新为 'loaded'
      const sourceState = runtime.sources.get('success-source');
      expect(sourceState?.loadState).toBe('loaded');
    });

    it('应该在八叉树加载失败后更新 loadState', async () => {
      // Mock 加载失败
      octreeManager.loadOctree = vi
        .fn()
        .mockRejectedValue(new Error('Load failed'));

      const testSource: SourceConfig = {
        id: 'failed-source',
        type: 'potree',
        url: '/failed.json',
        visible: true,
      };

      configStore.getState().addSource(testSource);

      // 等待订阅和异步加载失败
      await new Promise((resolve) => setTimeout(resolve, 0));

      try {
        await octreeManager.loadOctree('failed-source', '/failed.json', 'potree');
      } catch {
        // 预期的错误
      }

      // 验证 loadState 更新为 'failed'
      const sourceState = runtime.sources.get('failed-source');
      expect(sourceState?.loadState).toBe('failed');
    });

    it('应该正确删除 source 并清理资源', async () => {
      // 1. 添加数据源
      const testSource: SourceConfig = {
        id: 'to-remove',
        type: 'potree',
        url: '/to-remove.json',
        visible: true,
      };
      configStore.getState().addSource(testSource);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 2. 模拟一些运行时状态
      runtime.visibleNodes.add('to-remove/r0');
      runtime.loadedNodes.set('to-remove/r0', {
        positions: new Float32Array(),
        colors: new Uint8Array(),
        numPoints: 0,
        gpuResourceId: 'gpu-to-remove-r0',
      });
      runtime.loadingTasks.set('to-remove/r01', {
        nodeId: 'to-remove/r01',
        sourceId: 'to-remove',
        url: '/r01.bin',
        priority: 1.0,
        status: 'loading',
        retryCount: 0,
        abortController: new AbortController(),
      });
      runtime.gpuResources.set('to-remove/r0', {
        id: 'to-remove/r0',
        type: 'buffer',
        size: 1024,
        handle: {},
        lastUsed: Date.now(),
      });

      // 3. 删除数据源
      configStore.getState().removeSource('to-remove');
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 4. 验证清理结果
      expect(runtime.sources.has('to-remove')).toBe(false);
      expect(runtime.visibleNodes.has('to-remove/r0')).toBe(false);
      expect(runtime.loadedNodes.has('to-remove/r0')).toBe(false);
      expect(runtime.loadingTasks.has('to-remove/r01')).toBe(false);
      expect(runtime.gpuResources.has('to-remove/r0')).toBe(false);

      // 验证 ResourceManager 释放资源
      expect(resourceManager.releaseById).toHaveBeenCalledWith('to-remove/r0');

      // 验证 OctreeManager 移除八叉树
      expect(octreeManager.removeOctree).toHaveBeenCalledWith('to-remove');
    });

    it('应该正确更新 source 配置', async () => {
      // 1. 添加数据源
      const testSource: SourceConfig = {
        id: 'update-test',
        type: 'potree',
        url: '/update.json',
        visible: true,
      };
      configStore.getState().addSource(testSource);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 添加可见节点
      const sourceState = runtime.sources.get('update-test');
      sourceState?.visibleNodes.add('update-test/r0');

      // 2. 更新可见性
      configStore.getState().updateSource('update-test', { visible: false });
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 3. 验证配置更新
      const updatedState = runtime.sources.get('update-test');
      expect(updatedState?.config.visible).toBe(false);
      // 可见性变化应该清空 visibleNodes
      expect(updatedState?.visibleNodes.size).toBe(0);
    });

    it('应该正确处理同时添加、更新、删除的情况', async () => {
      // 1. 添加初始数据源
      configStore.getState().addSource({
        id: 'source1',
        type: 'potree',
        url: '/s1.json',
        visible: true,
      });
      configStore.getState().addSource({
        id: 'source2',
        type: 'potree',
        url: '/s2.json',
        visible: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(runtime.sources.size).toBe(2);

      // 2. 同时操作: 删除 source1, 更新 source2, 添加 source3
      configStore.getState().removeSource('source1');
      configStore.getState().updateSource('source2', { visible: false });
      configStore.getState().addSource({
        id: 'source3',
        type: 'potree',
        url: '/s3.json',
        visible: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 3. 验证结果
      expect(runtime.sources.has('source1')).toBe(false);
      expect(runtime.sources.has('source2')).toBe(true);
      expect(runtime.sources.get('source2')?.config.visible).toBe(false);
      expect(runtime.sources.has('source3')).toBe(true);
      expect(runtime.sources.size).toBe(2);
    });
  });

  describe('同步渲染配置', () => {
    it('应该正确同步渲染参数到 Runtime', async () => {
      configStore.getState().setRenderingConfig({
        pointBudget: 10_000_000,
        minNodeSize: 200,
        fov: 90,
        pointSize: 2.0,
      });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(runtime.rendering.pointBudget).toBe(10_000_000);
      expect(runtime.rendering.minNodeSize).toBe(200);
      expect(runtime.rendering.fov).toBe(90);
      expect(runtime.rendering.pointSize).toBe(2.0);
    });

    it('应该同步 FOV 到相机', async () => {
      configStore.getState().setRenderingConfig({ fov: 75 });

      await new Promise((resolve) => setTimeout(resolve, 0));

      if ('fov' in runtime.camera) {
        expect((runtime.camera as { fov: number }).fov).toBe(75);
      }
    });

    it('应该支持部分更新', async () => {
      const initialBudget = runtime.rendering.pointBudget;
      const initialMinNodeSize = runtime.rendering.minNodeSize;

      configStore.getState().setRenderingConfig({ fov: 80 });

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(runtime.rendering.fov).toBe(80);
      // 其他参数不变
      expect(runtime.rendering.pointBudget).toBe(initialBudget);
      expect(runtime.rendering.minNodeSize).toBe(initialMinNodeSize);
    });
  });

  describe('同步相机配置', () => {
    it('应该正确同步相机位置', async () => {
      // 注意: ConfigStore 目前没有 updateCamera 方法
      // 这里我们手动触发同步来测试
      coordinator.initialSync();

      const config = configStore.getState();
      expect(runtime.camera.position.toArray()).toEqual(config.camera.position);
    });
  });

  describe('资源清理', () => {
    it('应该清理指定数据源的所有运行时状态', async () => {
      // 1. 添加数据源
      configStore.getState().addSource({
        id: 'cleanup-test',
        type: 'potree',
        url: '/cleanup.json',
        visible: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 2. 模拟运行时状态
      runtime.visibleNodes.add('cleanup-test/r0');
      runtime.visibleNodes.add('cleanup-test/r01');
      runtime.visibleNodes.add('other-source/r0'); // 其他数据源的节点
      runtime.loadedNodes.set('cleanup-test/r0', {
        positions: new Float32Array(),
        colors: new Uint8Array(),
        numPoints: 0,
      });
      runtime.loadedNodes.set('other-source/r0', {
        positions: new Float32Array(),
        colors: new Uint8Array(),
        numPoints: 0,
      });

      // 3. 删除数据源
      configStore.getState().removeSource('cleanup-test');
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 4. 验证只清理了指定数据源的状态
      expect(runtime.visibleNodes.has('cleanup-test/r0')).toBe(false);
      expect(runtime.visibleNodes.has('cleanup-test/r01')).toBe(false);
      expect(runtime.visibleNodes.has('other-source/r0')).toBe(true); // 不受影响

      expect(runtime.loadedNodes.has('cleanup-test/r0')).toBe(false);
      expect(runtime.loadedNodes.has('other-source/r0')).toBe(true); // 不受影响
    });

    it('应该取消进行中的加载任务', async () => {
      // 1. 添加数据源
      configStore.getState().addSource({
        id: 'abort-test',
        type: 'potree',
        url: '/abort.json',
        visible: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 2. 模拟加载任务
      const abortController = new AbortController();
      const abortSpy = vi.spyOn(abortController, 'abort');

      runtime.loadingTasks.set('abort-test/r0', {
        nodeId: 'abort-test/r0',
        sourceId: 'abort-test',
        url: '/r0.bin',
        priority: 1.0,
        status: 'loading',
        retryCount: 0,
        abortController,
      });

      // 3. 删除数据源
      configStore.getState().removeSource('abort-test');
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 4. 验证取消了加载任务
      expect(abortSpy).toHaveBeenCalled();
      expect(runtime.loadingTasks.has('abort-test/r0')).toBe(false);
    });

    it('应该释放所有 GPU 资源', async () => {
      // 1. 添加数据源
      configStore.getState().addSource({
        id: 'gpu-test',
        type: 'potree',
        url: '/gpu.json',
        visible: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 2. 模拟 GPU 资源
      runtime.gpuResources.set('gpu-test/r0', {
        id: 'gpu-test/r0',
        type: 'buffer',
        size: 1024,
        handle: {},
        lastUsed: Date.now(),
      });
      runtime.gpuResources.set('gpu-test/r01', {
        id: 'gpu-test/r01',
        type: 'buffer',
        size: 2048,
        handle: {},
        lastUsed: Date.now(),
      });
      runtime.gpuResources.set('other-source/r0', {
        id: 'other-source/r0',
        type: 'buffer',
        size: 512,
        handle: {},
        lastUsed: Date.now(),
      });

      // 3. 删除数据源
      configStore.getState().removeSource('gpu-test');
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 4. 验证释放了指定数据源的 GPU 资源
      expect(resourceManager.releaseById).toHaveBeenCalledWith('gpu-test/r0');
      expect(resourceManager.releaseById).toHaveBeenCalledWith('gpu-test/r01');
      expect(resourceManager.releaseById).not.toHaveBeenCalledWith('other-source/r0');

      expect(runtime.gpuResources.has('gpu-test/r0')).toBe(false);
      expect(runtime.gpuResources.has('gpu-test/r01')).toBe(false);
      expect(runtime.gpuResources.has('other-source/r0')).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('应该取消所有订阅', async () => {
      // 1. 验证订阅有效
      configStore.getState().addSource({
        id: 'test',
        type: 'potree',
        url: '/test.json',
        visible: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(runtime.sources.has('test')).toBe(true);

      // 2. 销毁 coordinator
      coordinator.dispose();

      // 3. 验证订阅已取消 (配置变更不再同步)
      configStore.getState().addSource({
        id: 'after-dispose',
        type: 'potree',
        url: '/after.json',
        visible: true,
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      // 新的 source 不应该被同步
      expect(runtime.sources.has('after-dispose')).toBe(false);
    });

    it('应该支持多次调用 dispose()', () => {
      expect(() => {
        coordinator.dispose();
        coordinator.dispose();
        coordinator.dispose();
      }).not.toThrow();
    });
  });

  describe('边界情况', () => {
    it('应该正确处理删除不存在的 source', async () => {
      expect(() => {
        configStore.getState().removeSource('non-existent');
      }).not.toThrow();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(runtime.sources.size).toBe(0);
    });

    it('应该正确处理更新不存在的 source', async () => {
      // ConfigStore 的 updateSource 会打印警告但不会抛出错误
      expect(() => {
        configStore.getState().updateSource('non-existent', { visible: false });
      }).not.toThrow();
    });

    it('应该正确处理配置副本 (避免直接引用)', async () => {
      const originalConfig: SourceConfig = {
        id: 'copy-test',
        type: 'potree',
        url: '/copy.json',
        visible: true,
      };

      configStore.getState().addSource(originalConfig);
      await new Promise((resolve) => setTimeout(resolve, 0));

      const runtimeConfig = runtime.sources.get('copy-test')?.config;

      // 验证是副本而不是引用
      expect(runtimeConfig).not.toBe(originalConfig);
      expect(runtimeConfig).toEqual(originalConfig);
    });
  });
});
