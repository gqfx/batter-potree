/**
 * POC 功能测试文件
 *
 * @description
 * 验证分层状态管理的核心架构：
 * - Config → Runtime 同步正确
 * - 高频更新不触发 Config 订阅
 * - Runtime 状态是完全可变的
 *
 * @remarks
 * 这些测试验证了 TASK-002、TASK-003、TASK-004 的实现是否满足架构设计要求。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createConfigStore } from '@better-potree/core/config';
import { Runtime } from '@better-potree/core/runtime';
import { StateCoordinator } from '@better-potree/core/coordinator';
import type { SourceConfig } from '@better-potree/core/config';

/**
 * Mock OctreeManager
 *
 * @description 简单的 mock 实现，避免依赖完整的 OctreeManager
 */
class MockOctreeManager {
  private octrees = new Map<string, unknown>();

  async loadOctree(sourceId: string, _url: string, _type: string): Promise<void> {
    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 10));
    this.octrees.set(sourceId, { loaded: true });
  }

  removeOctree(sourceId: string): void {
    this.octrees.delete(sourceId);
  }

  hasOctree(sourceId: string): boolean {
    return this.octrees.has(sourceId);
  }
}

/**
 * Mock ResourceManager
 *
 * @description 简单的 mock 实现，跟踪释放的资源
 */
class MockResourceManager {
  releasedIds: string[] = [];

  releaseById(id: string): void {
    this.releasedIds.push(id);
  }
}

/**
 * Mock ECSWorld
 *
 * @description 简单的 mock 实现
 */
class MockECSWorld {
  private nextEntityId = 0;
  private entities = new Map<number, unknown>();

  createEntity(): number {
    const id = this.nextEntityId++;
    this.entities.set(id, {});
    return id;
  }

  addComponent<T>(
    _entity: number,
    _ComponentClass: new (...args: unknown[]) => T,
    _instance: T
  ): void {
    // Mock implementation
  }

  query<T>(_ComponentClass: new (...args: unknown[]) => T): number[] {
    return Array.from(this.entities.keys());
  }

  getComponent<T>(
    _entity: number,
    _ComponentClass: new (...args: unknown[]) => T
  ): T | undefined {
    return undefined;
  }

  removeEntity(entity: number): void {
    this.entities.delete(entity);
  }
}

describe('POC - 分层状态管理', () => {
  let configStore: ReturnType<typeof createConfigStore>;
  let runtime: Runtime;
  let octreeManager: MockOctreeManager;
  let resourceManager: MockResourceManager;
  let ecs: MockECSWorld;
  let coordinator: StateCoordinator;

  beforeEach(() => {
    // 重置所有实例
    configStore = createConfigStore();
    runtime = new Runtime();
    octreeManager = new MockOctreeManager();
    resourceManager = new MockResourceManager();
    ecs = new MockECSWorld();
    coordinator = new StateCoordinator(
      configStore,
      runtime,
      octreeManager as any,
      resourceManager as any,
      ecs as any
    );
  });

  describe('测试 1: Config 变更能正确同步到 Runtime', () => {
    it('添加 source 后 Runtime 应有对应状态', async () => {
      // 1. 初始同步
      coordinator.initialSync();

      // 2. 添加数据源
      const sourceConfig: SourceConfig = {
        id: 'test-source-1',
        type: 'potree',
        url: '/data/meta.json',
        visible: true,
      };

      configStore.getState().addSource(sourceConfig);

      // 3. 验证 Runtime 状态
      expect(runtime.sources.has('test-source-1')).toBe(true);

      const sourceState = runtime.sources.get('test-source-1');
      expect(sourceState).toBeDefined();
      expect(sourceState?.config.id).toBe('test-source-1');
      expect(sourceState?.config.type).toBe('potree');
      expect(sourceState?.config.url).toBe('/data/meta.json');
      expect(sourceState?.loadState).toBe('loading');
      expect(sourceState?.visibleNodes).toBeInstanceOf(Set);
      expect(sourceState?.loadedNodes).toBeInstanceOf(Map);

      // 4. 等待异步加载完成
      await new Promise(resolve => setTimeout(resolve, 20));

      // 5. 验证加载状态更新
      expect(runtime.sources.get('test-source-1')?.loadState).toBe('loaded');
      expect(octreeManager.hasOctree('test-source-1')).toBe(true);
    });

    it('删除 source 后 Runtime 应清理状态', () => {
      // 1. 添加数据源
      coordinator.initialSync();
      const sourceConfig: SourceConfig = {
        id: 'test-source-2',
        type: 'potree',
        url: '/data/meta.json',
        visible: true,
      };
      configStore.getState().addSource(sourceConfig);

      // 2. 模拟一些运行时状态
      runtime.visibleNodes.add('test-source-2/r0');
      runtime.visibleNodes.add('test-source-2/r01');
      runtime.loadedNodes.set('test-source-2/r0', {
        positions: new Float32Array([1, 2, 3]),
        colors: new Uint8Array([255, 0, 0]),
        numPoints: 1,
      });

      // 3. 删除数据源
      configStore.getState().removeSource('test-source-2');

      // 4. 验证清理结果
      expect(runtime.sources.has('test-source-2')).toBe(false);
      expect(runtime.visibleNodes.has('test-source-2/r0')).toBe(false);
      expect(runtime.visibleNodes.has('test-source-2/r01')).toBe(false);
      expect(runtime.loadedNodes.has('test-source-2/r0')).toBe(false);
      expect(octreeManager.hasOctree('test-source-2')).toBe(false);
    });

    it('更新 source 后 Runtime 应反映变化', () => {
      // 1. 添加数据源
      coordinator.initialSync();
      const sourceConfig: SourceConfig = {
        id: 'test-source-3',
        type: 'potree',
        url: '/data/meta.json',
        visible: true,
      };
      configStore.getState().addSource(sourceConfig);

      // 2. 模拟一些可见节点
      const sourceState = runtime.sources.get('test-source-3');
      sourceState?.visibleNodes.add('test-source-3/r0');
      expect(sourceState?.visibleNodes.size).toBe(1);

      // 3. 更新 visible 为 false
      configStore.getState().updateSource('test-source-3', { visible: false });

      // 4. 验证可见节点被清空
      const updatedState = runtime.sources.get('test-source-3');
      expect(updatedState?.config.visible).toBe(false);
      expect(updatedState?.visibleNodes.size).toBe(0);
    });

    it('更新渲染配置应同步到 Runtime', () => {
      coordinator.initialSync();

      // 更新渲染配置
      configStore.getState().setRenderingConfig({
        pointBudget: 5_000_000,
        minNodeSize: 150,
        fov: 75,
        pointSize: 1.5,
      });

      // 验证同步结果
      expect(runtime.rendering.pointBudget).toBe(5_000_000);
      expect(runtime.rendering.minNodeSize).toBe(150);
      expect(runtime.rendering.fov).toBe(75);
      expect(runtime.rendering.pointSize).toBe(1.5);

      // 验证 FOV 同步到相机
      if ('fov' in runtime.camera) {
        expect((runtime.camera as any).fov).toBe(75);
      }
    });
  });

  describe('测试 2: 高频更新不触发 Config 订阅', () => {
    it('模拟 1000 次 Runtime.visibleNodes 更新', () => {
      coordinator.initialSync();

      // 创建 Config 订阅监听
      const subscribeSpy = vi.fn();
      configStore.subscribe(subscribeSpy);

      // 模拟 1000 次高频更新
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        runtime.visibleNodes.add(`node-${i}`);
      }

      const duration = performance.now() - startTime;

      // 验证 Config 订阅未被触发
      expect(subscribeSpy).not.toHaveBeenCalled();

      // 验证更新成功
      expect(runtime.visibleNodes.size).toBe(1000);

      // 验证性能 (应该非常快，远小于 100ms)
      expect(duration).toBeLessThan(100);

      console.log(`[POC] 1000 次高频更新耗时: ${duration.toFixed(2)}ms`);
    });

    it('模拟 10000 次 Runtime.loadedNodes 更新', () => {
      coordinator.initialSync();

      // 创建 Config 订阅监听
      const subscribeSpy = vi.fn();
      configStore.subscribe(subscribeSpy);

      // 模拟 10000 次高频更新
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        runtime.loadedNodes.set(`node-${i}`, {
          positions: new Float32Array([i, i + 1, i + 2]),
          colors: new Uint8Array([255, 128, 0]),
          numPoints: 1,
        });
      }

      const duration = performance.now() - startTime;

      // 验证 Config 订阅未被触发
      expect(subscribeSpy).not.toHaveBeenCalled();

      // 验证更新成功
      expect(runtime.loadedNodes.size).toBe(10000);

      // 验证性能
      expect(duration).toBeLessThan(500);

      console.log(`[POC] 10000 次 loadedNodes 更新耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('测试 3: Runtime 状态是完全可变的', () => {
    it('直接修改 Set 不创建新对象', () => {
      coordinator.initialSync();

      // 记录初始引用
      const originalSet = runtime.visibleNodes;

      // 多次修改
      runtime.visibleNodes.add('node-1');
      runtime.visibleNodes.add('node-2');
      runtime.visibleNodes.delete('node-1');

      // 验证引用不变
      expect(runtime.visibleNodes).toBe(originalSet);
      expect(runtime.visibleNodes.size).toBe(1);
      expect(runtime.visibleNodes.has('node-2')).toBe(true);
    });

    it('直接修改 Map 不创建新对象', () => {
      coordinator.initialSync();

      // 记录初始引用
      const originalMap = runtime.loadedNodes;

      // 多次修改
      runtime.loadedNodes.set('node-1', {
        positions: new Float32Array([1, 2, 3]),
        colors: new Uint8Array([255, 0, 0]),
        numPoints: 1,
      });
      runtime.loadedNodes.set('node-2', {
        positions: new Float32Array([4, 5, 6]),
        colors: new Uint8Array([0, 255, 0]),
        numPoints: 1,
      });
      runtime.loadedNodes.delete('node-1');

      // 验证引用不变
      expect(runtime.loadedNodes).toBe(originalMap);
      expect(runtime.loadedNodes.size).toBe(1);
      expect(runtime.loadedNodes.has('node-2')).toBe(true);
    });

    it('直接修改 rendering 配置不创建新对象', () => {
      coordinator.initialSync();

      // 记录初始引用
      const originalRendering = runtime.rendering;

      // 多次修改
      runtime.rendering.pointBudget = 3_000_000;
      runtime.rendering.minNodeSize = 120;
      runtime.rendering.fov = 70;
      runtime.rendering.pointSize = 1.2;

      // 验证引用不变
      expect(runtime.rendering).toBe(originalRendering);
      expect(runtime.rendering.pointBudget).toBe(3_000_000);
      expect(runtime.rendering.minNodeSize).toBe(120);
    });

    it('验证 Stats 是可变的', () => {
      coordinator.initialSync();

      // 记录初始引用
      const originalStats = runtime.stats;

      // 模拟系统更新统计
      runtime.stats.frameTime = 16.7;
      runtime.stats.systemTimes.set('bp:traversal', 2.3);
      runtime.stats.systemTimes.set('bp:streaming', 0.8);
      runtime.stats.drawCalls = 50;
      runtime.stats.pointsRendered = 1_500_000;
      runtime.stats.nodesLoaded = 100;
      runtime.stats.memoryUsed.gpu = 512 * 1024 * 1024;
      runtime.stats.memoryUsed.cpu = 128 * 1024 * 1024;

      // 验证引用不变
      expect(runtime.stats).toBe(originalStats);
      expect(runtime.stats.frameTime).toBe(16.7);
      expect(runtime.stats.systemTimes.get('bp:traversal')).toBe(2.3);
      expect(runtime.stats.pointsRendered).toBe(1_500_000);
    });
  });

  describe('测试 4: StateCoordinator 清理逻辑', () => {
    it('删除 source 时应释放 GPU 资源', () => {
      coordinator.initialSync();

      // 添加数据源
      const sourceConfig: SourceConfig = {
        id: 'test-source-gpu',
        type: 'potree',
        url: '/data/meta.json',
        visible: true,
      };
      configStore.getState().addSource(sourceConfig);

      // 模拟 GPU 资源
      runtime.gpuResources.set('test-source-gpu-buffer-1', {
        id: 'test-source-gpu-buffer-1',
        type: 'buffer',
        size: 1024 * 1024,
        handle: {},
        lastUsed: performance.now(),
      });
      runtime.gpuResources.set('test-source-gpu-buffer-2', {
        id: 'test-source-gpu-buffer-2',
        type: 'buffer',
        size: 2048 * 1024,
        handle: {},
        lastUsed: performance.now(),
      });

      // 删除数据源
      configStore.getState().removeSource('test-source-gpu');

      // 验证 GPU 资源被释放
      expect(resourceManager.releasedIds).toContain('test-source-gpu-buffer-1');
      expect(resourceManager.releasedIds).toContain('test-source-gpu-buffer-2');
      expect(runtime.gpuResources.has('test-source-gpu-buffer-1')).toBe(false);
      expect(runtime.gpuResources.has('test-source-gpu-buffer-2')).toBe(false);
    });

    it('删除 source 时应取消加载任务', () => {
      coordinator.initialSync();

      // 添加数据源
      const sourceConfig: SourceConfig = {
        id: 'test-source-loading',
        type: 'potree',
        url: '/data/meta.json',
        visible: true,
      };
      configStore.getState().addSource(sourceConfig);

      // 模拟加载任务
      const abortController = new AbortController();
      const abortSpy = vi.spyOn(abortController, 'abort');

      runtime.loadingTasks.set('test-source-loading/r0', {
        nodeId: 'test-source-loading/r0',
        sourceId: 'test-source-loading',
        url: '/data/r0.bin',
        priority: 1.0,
        status: 'loading',
        retryCount: 0,
        abortController,
      });

      // 删除数据源
      configStore.getState().removeSource('test-source-loading');

      // 验证加载任务被取消
      expect(abortSpy).toHaveBeenCalled();
      expect(runtime.loadingTasks.has('test-source-loading/r0')).toBe(false);
    });
  });

  describe('测试 5: 边界情况', () => {
    it('多次添加同一 source 应抛出错误', () => {
      coordinator.initialSync();

      const sourceConfig: SourceConfig = {
        id: 'duplicate-source',
        type: 'potree',
        url: '/data/meta.json',
        visible: true,
      };

      // 第一次添加成功
      configStore.getState().addSource(sourceConfig);

      // 第二次添加应抛出错误
      expect(() => {
        configStore.getState().addSource(sourceConfig);
      }).toThrow('Source with id "duplicate-source" already exists');
    });

    it('更新不存在的 source 应安全处理', () => {
      coordinator.initialSync();

      // 更新不存在的 source 不应抛出错误
      expect(() => {
        configStore.getState().updateSource('non-existent', { visible: false });
      }).not.toThrow();

      // Runtime 应该没有变化
      expect(runtime.sources.has('non-existent')).toBe(false);
    });

    it('删除不存在的 source 应安全处理', () => {
      coordinator.initialSync();

      // 删除不存在的 source 不应抛出错误
      expect(() => {
        configStore.getState().removeSource('non-existent');
      }).not.toThrow();
    });

    it('dispose 后不应再响应配置变更', () => {
      coordinator.initialSync();

      // 销毁 coordinator
      coordinator.dispose();

      // 添加数据源
      const sourceConfig: SourceConfig = {
        id: 'after-dispose',
        type: 'potree',
        url: '/data/meta.json',
        visible: true,
      };
      configStore.getState().addSource(sourceConfig);

      // Runtime 不应有变化
      expect(runtime.sources.has('after-dispose')).toBe(false);
    });
  });
});
