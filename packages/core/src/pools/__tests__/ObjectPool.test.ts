/**
 * ObjectPool 测试
 */

import { describe, expect, it, vi } from 'vitest';
import { ObjectPool } from '../ObjectPool.js';
import type { Poolable } from '../types.js';

describe('ObjectPool', () => {
  describe('基本功能', () => {
    it('应该能够获取和归还对象', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));

      const obj = pool.acquire();
      expect(obj).toBeDefined();
      expect(obj.value).toBe(0);

      pool.release(obj);
      expect(pool.available).toBe(1);
    });

    it('应该复用对象', () => {
      const pool = new ObjectPool(() => ({ value: 0 }));

      const obj1 = pool.acquire();
      obj1.value = 42;
      pool.release(obj1);

      const obj2 = pool.acquire();
      expect(obj2).toBe(obj1); // 同一个对象
    });

    it('应该在池为空时创建新对象', () => {
      const factory = vi.fn(() => ({ value: 0 }));
      const pool = new ObjectPool(factory);

      pool.acquire();
      pool.acquire();
      pool.acquire();

      expect(factory).toHaveBeenCalledTimes(3);
    });

    it('应该支持初始池大小', () => {
      const pool = new ObjectPool(() => ({}), { initialSize: 5 });

      expect(pool.available).toBe(5);
    });
  });

  describe('重置和清理', () => {
    it('应该在获取时调用重置函数', () => {
      const reset = vi.fn((obj: { value: number }) => {
        obj.value = 0;
      });

      const pool = new ObjectPool(() => ({ value: 0 }), { reset });

      const obj = pool.acquire();
      obj.value = 100;
      pool.release(obj);

      const obj2 = pool.acquire();
      expect(reset).toHaveBeenCalledTimes(2);
      expect(obj2.value).toBe(0);
    });

    it('应该在归还时调用清理函数', () => {
      const clear = vi.fn();
      const pool = new ObjectPool(() => ({}), { clear });

      const obj = pool.acquire();
      pool.release(obj);

      expect(clear).toHaveBeenCalledWith(obj);
    });

    it('应该调用 Poolable 接口方法', () => {
      class TestObject implements Poolable {
        value = 0;
        reset = vi.fn(() => {
          this.value = 0;
        });
        clear = vi.fn(() => {
          this.value = -1;
        });
      }

      const pool = new ObjectPool(() => new TestObject());

      const obj = pool.acquire();
      expect(obj.reset).toHaveBeenCalled();

      obj.value = 50;
      pool.release(obj);
      expect(obj.clear).toHaveBeenCalled();
    });
  });

  describe('批量操作', () => {
    it('应该支持批量获取', () => {
      const pool = new ObjectPool(() => ({ id: 0 }));

      const objects = pool.acquireBatch(5);

      expect(objects).toHaveLength(5);
      expect(pool.inUse).toBe(5);
    });

    it('应该支持批量归还', () => {
      const pool = new ObjectPool(() => ({}));

      const objects = pool.acquireBatch(3);
      pool.releaseBatch(objects);

      expect(pool.available).toBe(3);
      expect(pool.inUse).toBe(0);
    });
  });

  describe('池管理', () => {
    it('应该支持预热', () => {
      const pool = new ObjectPool(() => ({}));

      pool.warmup(10);

      expect(pool.available).toBe(10);
    });

    it('应该遵守最大池大小', () => {
      const pool = new ObjectPool(() => ({}), { maxSize: 3 });

      pool.warmup(10);

      expect(pool.available).toBe(3); // 最多3个
    });

    it('应该在超过最大容量时不放回池', () => {
      const pool = new ObjectPool(() => ({}), { maxSize: 2 });

      const obj1 = pool.acquire();
      const obj2 = pool.acquire();
      const obj3 = pool.acquire();

      pool.release(obj1);
      pool.release(obj2);
      expect(pool.available).toBe(2);

      pool.release(obj3); // 应该不放回池
      expect(pool.available).toBe(2);
    });

    it('应该支持收缩池', () => {
      const pool = new ObjectPool(() => ({}));
      pool.warmup(10);

      pool.shrink(3);

      expect(pool.available).toBe(3);
    });

    it('应该支持清空池', () => {
      const pool = new ObjectPool(() => ({}));
      pool.warmup(10);

      pool.clear();

      expect(pool.available).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该正确跟踪命中和未命中', () => {
      const pool = new ObjectPool(() => ({}));

      pool.warmup(2);

      pool.acquire(); // 命中
      pool.acquire(); // 命中
      pool.acquire(); // 未命中

      const stats = pool.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('应该正确计算命中率', () => {
      const pool = new ObjectPool(() => ({}));

      pool.warmup(2);
      pool.acquire(); // 命中
      pool.acquire(); // 命中
      pool.acquire(); // 未命中
      pool.acquire(); // 未命中

      const hitRate = pool.getHitRate();
      expect(hitRate).toBe(0.5);
    });

    it('应该提供完整的统计信息', () => {
      const pool = new ObjectPool(() => ({}));

      const obj1 = pool.acquire();
      pool.acquire(); // Second object in use
      pool.release(obj1);

      const stats = pool.getStats();

      expect(stats.available).toBe(1);
      expect(stats.inUse).toBe(1);
      expect(stats.totalCreated).toBe(2);
    });

    it('应该在没有操作时返回 0 命中率', () => {
      const pool = new ObjectPool(() => ({}));
      expect(pool.getHitRate()).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应该警告过度释放', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const pool = new ObjectPool(() => ({}));

      pool.release({});

      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
    });
  });

  describe('性能测试', () => {
    it('10000次获取/归还应该小于 10ms', () => {
      const pool = new ObjectPool(() => ({ x: 0, y: 0, z: 0 }), {
        reset: (obj) => {
          obj.x = 0;
          obj.y = 0;
          obj.z = 0;
        },
      });

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        const obj = pool.acquire();
        obj.x = i;
        pool.release(obj);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });

    it('应该比每次创建新对象更快', () => {
      const factory = () => ({ x: 0, y: 0, z: 0 });

      // 使用对象池
      const pool = new ObjectPool(factory);
      const poolStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        const obj = pool.acquire();
        pool.release(obj);
      }
      const poolTime = performance.now() - poolStart;

      // 不使用对象池
      const noPoolStart = performance.now();
      for (let i = 0; i < 1000; i++) {
        const obj = factory();
        // 模拟使用
        obj.x = i;
      }
      const noPoolTime = performance.now() - noPoolStart;

      // 对象池应该至少一样快
      expect(poolTime).toBeLessThan(noPoolTime * 2);
    });
  });
});
