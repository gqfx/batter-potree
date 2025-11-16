/**
 * Runtime 状态管理 - 单元测试
 *
 * @module runtime/__tests__/Runtime.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerspectiveCamera } from 'three';
import { Runtime } from '../Runtime.js';
import type { NodeData, LoadTask } from '../types.js';

describe('Runtime', () => {
  let runtime: Runtime;

  beforeEach(() => {
    runtime = new Runtime();
  });

  describe('构造函数', () => {
    it('应该创建默认 Runtime 实例', () => {
      expect(runtime.camera).toBeInstanceOf(PerspectiveCamera);
      expect(runtime.rendering.pointBudget).toBe(2_000_000);
      expect(runtime.rendering.minNodeSize).toBe(100);
      expect(runtime.rendering.fov).toBe(60);
      expect(runtime.rendering.pointSize).toBe(1.0);
    });

    it('应该使用自定义相机', () => {
      const camera = new PerspectiveCamera(90, 16 / 9, 0.1, 2000);
      const customRuntime = new Runtime(camera);
      expect(customRuntime.camera).toBe(camera);
    });

    it('应该使用自定义内存预算', () => {
      const customRuntime = new Runtime(undefined, {
        gpuMemory: 4 * 1024 * 1024 * 1024, // 4GB
        cpuMemory: 2 * 1024 * 1024 * 1024, // 2GB
      });

      expect(customRuntime.budgets.gpuMemory).toBe(4 * 1024 * 1024 * 1024);
      expect(customRuntime.budgets.cpuMemory).toBe(2 * 1024 * 1024 * 1024);
    });

    it('应该初始化所有可变集合', () => {
      expect(runtime.visibleNodes).toBeInstanceOf(Set);
      expect(runtime.visibleNodes.size).toBe(0);
      expect(runtime.visibleNodesList).toEqual([]);
      expect(runtime.loadingTasks).toBeInstanceOf(Map);
      expect(runtime.loadedNodes).toBeInstanceOf(Map);
      expect(runtime.sources).toBeInstanceOf(Map);
      expect(runtime.gpuResources).toBeInstanceOf(Map);
    });

    it('应该初始化性能统计', () => {
      expect(runtime.stats.frameTime).toBe(0);
      expect(runtime.stats.systemTimes).toBeInstanceOf(Map);
      expect(runtime.stats.drawCalls).toBe(0);
      expect(runtime.stats.pointsRendered).toBe(0);
      expect(runtime.stats.nodesLoaded).toBe(0);
      expect(runtime.stats.memoryUsed.gpu).toBe(0);
      expect(runtime.stats.memoryUsed.cpu).toBe(0);
    });
  });

  describe('可变性测试', () => {
    it('应该支持直接修改 visibleNodes', () => {
      runtime.visibleNodes.add('node-1');
      runtime.visibleNodes.add('node-2');

      expect(runtime.visibleNodes.size).toBe(2);
      expect(runtime.visibleNodes.has('node-1')).toBe(true);
      expect(runtime.visibleNodes.has('node-2')).toBe(true);
    });

    it('应该支持直接修改 rendering 配置', () => {
      runtime.rendering.pointBudget = 5_000_000;
      runtime.rendering.minNodeSize = 150;

      expect(runtime.rendering.pointBudget).toBe(5_000_000);
      expect(runtime.rendering.minNodeSize).toBe(150);
    });

    it('应该支持直接修改 stats', () => {
      runtime.stats.frameTime = 16.7;
      runtime.stats.pointsRendered = 1_500_000;
      runtime.stats.drawCalls = 50;

      expect(runtime.stats.frameTime).toBe(16.7);
      expect(runtime.stats.pointsRendered).toBe(1_500_000);
      expect(runtime.stats.drawCalls).toBe(50);
    });

    it('应该支持 Map 和 Set 的可变操作', () => {
      // 添加加载任务
      const task: LoadTask = {
        nodeId: 'node-1',
        sourceId: 'source-1',
        url: '/data/node-1.bin',
        priority: 1.0,
        status: 'loading',
        retryCount: 0,
      };
      runtime.loadingTasks.set('node-1', task);
      expect(runtime.loadingTasks.size).toBe(1);

      // 添加已加载节点
      const nodeData: NodeData = {
        positions: new Float32Array([0, 0, 0]),
        colors: new Uint8Array([255, 0, 0]),
        numPoints: 1,
      };
      runtime.loadedNodes.set('node-1', nodeData);
      expect(runtime.loadedNodes.size).toBe(1);
    });
  });

  describe('checkGPUMemoryBudget', () => {
    it('应该在预算内返回 true', () => {
      runtime.stats.memoryUsed.gpu = 1 * 1024 * 1024 * 1024; // 1GB
      const canAllocate = runtime.checkGPUMemoryBudget(500 * 1024 * 1024); // 500MB

      expect(canAllocate).toBe(true);
    });

    it('应该在超出预算时返回 false', () => {
      runtime.stats.memoryUsed.gpu = 1.9 * 1024 * 1024 * 1024; // 1.9GB
      const canAllocate = runtime.checkGPUMemoryBudget(200 * 1024 * 1024); // 200MB

      expect(canAllocate).toBe(false);
    });

    it('应该在刚好到达预算时返回 false', () => {
      runtime.stats.memoryUsed.gpu = 2 * 1024 * 1024 * 1024; // 2GB (预算上限)
      const canAllocate = runtime.checkGPUMemoryBudget(1); // 1 字节

      expect(canAllocate).toBe(false);
    });
  });

  describe('cleanupInvisibleNodes', () => {
    it('应该取消不可见节点的加载任务', () => {
      // 添加可见节点
      runtime.visibleNodes.add('node-1');

      // 添加两个加载任务
      const abortController1 = new AbortController();
      const abortController2 = new AbortController();

      runtime.loadingTasks.set('node-1', {
        nodeId: 'node-1',
        sourceId: 'source-1',
        url: '/data/node-1.bin',
        priority: 1.0,
        status: 'loading',
        retryCount: 0,
        abortController: abortController1,
      });

      runtime.loadingTasks.set('node-2', {
        nodeId: 'node-2',
        sourceId: 'source-1',
        url: '/data/node-2.bin',
        priority: 1.0,
        status: 'loading',
        retryCount: 0,
        abortController: abortController2,
      });

      // 监听 abort 事件
      const abortSpy = vi.fn();
      abortController2.signal.addEventListener('abort', abortSpy);

      // 清理不可见节点
      runtime.cleanupInvisibleNodes();

      // 验证: node-1 (可见) 应该保留
      expect(runtime.loadingTasks.has('node-1')).toBe(true);

      // 验证: node-2 (不可见) 应该被取消并删除
      expect(runtime.loadingTasks.has('node-2')).toBe(false);
      expect(abortSpy).toHaveBeenCalled();
    });

    it('不应该取消非 loading 状态的任务', () => {
      // 添加 pending 状态的任务
      runtime.loadingTasks.set('node-1', {
        nodeId: 'node-1',
        sourceId: 'source-1',
        url: '/data/node-1.bin',
        priority: 1.0,
        status: 'pending',
        retryCount: 0,
      });

      runtime.cleanupInvisibleNodes();

      // pending 任务不应该被删除
      expect(runtime.loadingTasks.has('node-1')).toBe(true);
    });
  });

  describe('evictInvisibleLoadedNodes', () => {
    it('应该释放不可见节点的 GPU 资源', () => {
      // Mock ResourceManager
      const mockResourceManager = {
        releaseById: vi.fn(),
      };

      // 添加可见节点
      runtime.visibleNodes.add('node-1');

      // 添加已加载节点
      runtime.loadedNodes.set('node-1', {
        positions: new Float32Array([0, 0, 0]),
        colors: new Uint8Array([255, 0, 0]),
        numPoints: 1,
        gpuResourceId: 'gpu-buffer-1',
      });

      runtime.loadedNodes.set('node-2', {
        positions: new Float32Array([1, 1, 1]),
        colors: new Uint8Array([0, 255, 0]),
        numPoints: 1,
        gpuResourceId: 'gpu-buffer-2',
      });

      // 驱逐不可见节点
      runtime.evictInvisibleLoadedNodes(mockResourceManager);

      // 验证: node-1 (可见) 应该保留
      expect(runtime.loadedNodes.has('node-1')).toBe(true);

      // 验证: node-2 (不可见) 应该被驱逐
      expect(runtime.loadedNodes.has('node-2')).toBe(false);
      expect(mockResourceManager.releaseById).toHaveBeenCalledWith('gpu-buffer-2');
    });

    it('应该处理没有 GPU 资源 ID 的节点', () => {
      const mockResourceManager = {
        releaseById: vi.fn(),
      };

      // 添加没有 GPU 资源的节点
      runtime.loadedNodes.set('node-1', {
        positions: new Float32Array([0, 0, 0]),
        colors: new Uint8Array([255, 0, 0]),
        numPoints: 1,
        // 没有 gpuResourceId
      });

      runtime.evictInvisibleLoadedNodes(mockResourceManager);

      // 应该删除节点，但不调用 releaseById
      expect(runtime.loadedNodes.has('node-1')).toBe(false);
      expect(mockResourceManager.releaseById).not.toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('10000 次可变更新应该 < 10ms', () => {
      const start = performance.now();

      for (let i = 0; i < 10_000; i++) {
        runtime.visibleNodes.add(`node-${i}`);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
      console.log(`✓ 10000 次可变更新耗时: ${duration.toFixed(2)}ms`);
    });

    it('多次修改渲染配置应该零 GC 压力', () => {
      const start = performance.now();

      for (let i = 0; i < 10_000; i++) {
        runtime.rendering.pointBudget = 2_000_000 + i;
        runtime.rendering.minNodeSize = 100 + i;
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5);
      console.log(`✓ 10000 次修改渲染配置耗时: ${duration.toFixed(2)}ms`);
    });

    it('Map 操作性能测试', () => {
      const start = performance.now();

      for (let i = 0; i < 1_000; i++) {
        const nodeData: NodeData = {
          positions: new Float32Array([i, i, i]),
          colors: new Uint8Array([i, i, i]),
          numPoints: 1,
        };
        runtime.loadedNodes.set(`node-${i}`, nodeData);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
      console.log(`✓ 1000 次 Map 插入耗时: ${duration.toFixed(2)}ms`);
    });
  });

  describe('内存预算', () => {
    it('budgets 应该初始化正确', () => {
      // 验证默认预算
      expect(runtime.budgets.gpuMemory).toBe(2 * 1024 * 1024 * 1024);
      expect(runtime.budgets.cpuMemory).toBe(1 * 1024 * 1024 * 1024);
    });

    it('budgets 在 TypeScript 中是只读的', () => {
      // 注意: readonly 只是 TypeScript 编译时检查
      // 在 JavaScript 运行时无法阻止修改
      // 但 TypeScript 会在编译时报错

      // @ts-expect-error - 验证 TypeScript 会报错
      runtime.budgets.gpuMemory = 999;

      // 在运行时实际上可以修改 (这是 JS 的限制)
      // 但开发者不应该这样做，因为 TypeScript 会阻止
      expect(runtime.budgets.gpuMemory).toBe(999);

      // 恢复原值
      // @ts-expect-error
      runtime.budgets.gpuMemory = 2 * 1024 * 1024 * 1024;
    });
  });

  describe('与架构文档的一致性', () => {
    it('应该符合架构文档第 4.2 节的定义', () => {
      // 验证必需的可变字段
      expect(runtime.camera).toBeDefined();
      expect(runtime.rendering).toBeDefined();
      expect(runtime.visibleNodes).toBeInstanceOf(Set);
      expect(runtime.visibleNodesList).toBeInstanceOf(Array);
      expect(runtime.loadingTasks).toBeInstanceOf(Map);
      expect(runtime.loadedNodes).toBeInstanceOf(Map);
      expect(runtime.sources).toBeInstanceOf(Map);
      expect(runtime.gpuResources).toBeInstanceOf(Map);
      expect(runtime.stats).toBeDefined();
      expect(runtime.budgets).toBeDefined();
    });

    it('应该提供辅助方法', () => {
      expect(typeof runtime.checkGPUMemoryBudget).toBe('function');
      expect(typeof runtime.cleanupInvisibleNodes).toBe('function');
      expect(typeof runtime.evictInvisibleLoadedNodes).toBe('function');
    });
  });

  describe('边界情况', () => {
    it('应该处理空的 visibleNodes', () => {
      runtime.cleanupInvisibleNodes();
      runtime.evictInvisibleLoadedNodes({ releaseById: vi.fn() });

      // 不应该抛出错误
      expect(runtime.visibleNodes.size).toBe(0);
    });

    it('应该处理大量节点', () => {
      // 添加 10000 个节点
      for (let i = 0; i < 10_000; i++) {
        runtime.visibleNodes.add(`node-${i}`);
      }

      expect(runtime.visibleNodes.size).toBe(10_000);

      // 清空
      runtime.visibleNodes.clear();
      expect(runtime.visibleNodes.size).toBe(0);
    });

    it('应该处理重复添加同一节点', () => {
      runtime.visibleNodes.add('node-1');
      runtime.visibleNodes.add('node-1');
      runtime.visibleNodes.add('node-1');

      // Set 自动去重
      expect(runtime.visibleNodes.size).toBe(1);
    });
  });
});
