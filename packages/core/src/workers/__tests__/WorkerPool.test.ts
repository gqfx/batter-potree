/**
 * WorkerPool 测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkerPool } from '../WorkerPool.js';

// Mock Worker
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(public url: string) {}

  postMessage(data: unknown, _transfer?: Transferable[]) {
    // 模拟异步响应
    setTimeout(() => {
      const message = data as { taskId: string; data: unknown };
      const response = {
        taskId: message.taskId,
        result: { processed: true, input: message.data },
      };

      this.dispatchEvent(new MessageEvent('message', { data: response }));
    }, 0);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
    return true;
  }

  terminate() {
    this.listeners.clear();
  }
}

// Mock global Worker
global.Worker = MockWorker as unknown as typeof Worker;

// Mock navigator.hardwareConcurrency
Object.defineProperty(global.navigator, 'hardwareConcurrency', {
  writable: true,
  value: 4,
});

describe('WorkerPool', () => {
  let pool: WorkerPool<{ value: number }, { processed: boolean; input: unknown }>;

  beforeEach(() => {
    pool = new WorkerPool({
      workerUrl: '/test-worker.js',
      maxWorkers: 4,
    });
  });

  afterEach(() => {
    pool.dispose();
  });

  describe('基本功能', () => {
    it('应该能够执行任务', async () => {
      const result = await pool.execute({ value: 42 });

      expect(result).toEqual({
        processed: true,
        input: { value: 42 },
      });
    });

    it('应该支持多个任务', async () => {
      const results = await Promise.all([
        pool.execute({ value: 1 }),
        pool.execute({ value: 2 }),
        pool.execute({ value: 3 }),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].input).toEqual({ value: 1 });
      expect(results[1].input).toEqual({ value: 2 });
      expect(results[2].input).toEqual({ value: 3 });
    });
  });

  describe('Worker 管理', () => {
    it('应该复用 Worker', async () => {
      const stats1 = pool.getStats();
      expect(stats1.totalWorkers).toBe(0);

      await pool.execute({ value: 1 });
      const stats2 = pool.getStats();
      expect(stats2.totalWorkers).toBe(1);

      await pool.execute({ value: 2 });
      const stats3 = pool.getStats();
      expect(stats3.totalWorkers).toBe(1); // 复用同一个 Worker
    });

    it('应该限制最大 Worker 数量', async () => {
      // 提交10个任务
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(pool.execute({ value: i }));
      }

      // 等待一些任务开始执行
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = pool.getStats();
      expect(stats.totalWorkers).toBeLessThanOrEqual(4);

      await Promise.all(promises);
    });

    it('应该正确报告统计信息', async () => {
      const promise = pool.execute({ value: 1 });

      // 任务进行中
      await new Promise((resolve) => setTimeout(resolve, 0));
      const stats1 = pool.getStats();
      expect(stats1.totalWorkers).toBeGreaterThan(0);

      await promise;

      // 任务完成后
      const stats2 = pool.getStats();
      expect(stats2.activeTasks).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该在 Worker 错误时拒绝 Promise', async () => {
      const errorPool = new WorkerPool({
        workerUrl: '/error-worker.js',
        maxWorkers: 1,
      });

      // Mock Worker 发送错误响应
      const originalWorker = global.Worker;
      global.Worker = class extends MockWorker {
        postMessage(data: unknown) {
          setTimeout(() => {
            const message = data as { taskId: string };
            this.dispatchEvent(
              new MessageEvent('message', {
                data: {
                  taskId: message.taskId,
                  error: 'Worker processing error',
                },
              }),
            );
          }, 0);
        }
      } as unknown as typeof Worker;

      await expect(errorPool.execute({ value: 1 })).rejects.toThrow('Worker processing error');

      global.Worker = originalWorker;
      errorPool.dispose();
    });

    it('应该在 Pool 已销毁时拒绝任务', async () => {
      pool.dispose();

      await expect(pool.execute({ value: 1 })).rejects.toThrow('WorkerPool has been disposed');
    });
  });

  describe('任务队列', () => {
    it('应该排队等待空闲 Worker', async () => {
      const singlePool = new WorkerPool({
        workerUrl: '/test-worker.js',
        maxWorkers: 1,
      });

      // 提交3个任务
      const promises = [
        singlePool.execute({ value: 1 }),
        singlePool.execute({ value: 2 }),
        singlePool.execute({ value: 3 }),
      ];

      // 等待任务开始
      await new Promise((resolve) => setTimeout(resolve, 10));

      const stats = singlePool.getStats();
      expect(stats.totalWorkers).toBe(1);

      const results = await Promise.all(promises);
      expect(results).toHaveLength(3);

      singlePool.dispose();
    });
  });

  describe('资源清理', () => {
    it('应该正确销毁所有 Worker', async () => {
      const terminateSpy = vi.spyOn(MockWorker.prototype, 'terminate');

      const testPool = new WorkerPool({
        workerUrl: '/test-worker.js',
        maxWorkers: 2,
      });

      // 创建一些 Worker
      const promise1 = testPool.execute({ value: 1 });
      const promise2 = testPool.execute({ value: 2 });

      // 等待 Worker 创建
      await new Promise((resolve) => setTimeout(resolve, 10));

      testPool.dispose();
      expect(terminateSpy).toHaveBeenCalled();

      terminateSpy.mockRestore();

      // 清理 promises
      await Promise.allSettled([promise1, promise2]);
    });

    it('应该拒绝所有待处理任务', async () => {
      const testPool = new WorkerPool({
        workerUrl: '/test-worker.js',
        maxWorkers: 1,
      });

      const promise1 = testPool.execute({ value: 1 });
      const promise2 = testPool.execute({ value: 2 });

      // 立即销毁
      testPool.dispose();

      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
    });
  });

  describe('并发控制', () => {
    it('应该并发执行任务', async () => {
      const startTime = Date.now();

      // 提交4个任务（maxWorkers = 4）
      await Promise.all([
        pool.execute({ value: 1 }),
        pool.execute({ value: 2 }),
        pool.execute({ value: 3 }),
        pool.execute({ value: 4 }),
      ]);

      const duration = Date.now() - startTime;

      // 并发执行应该很快（< 50ms）
      expect(duration).toBeLessThan(50);
    });
  });
});
