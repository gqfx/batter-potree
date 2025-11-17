/**
 * ResourceManager 测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceManager } from '../ResourceManager.js';
import type { Resource } from '../types.js';

class TestResource implements Resource {
  public disposed = false;

  constructor(
    public readonly id: string,
    public readonly size: number,
  ) {}

  dispose(): void {
    this.disposed = true;
  }
}

describe('ResourceManager', () => {
  let manager: ResourceManager<TestResource>;

  beforeEach(() => {
    manager = new ResourceManager({
      memoryLimit: 1000,
      cleanupThreshold: 0.9,
    });
  });

  describe('基本功能', () => {
    it('应该能够注册资源', () => {
      const resource = new TestResource('r1', 100);
      manager.register('r1', resource);

      const retrieved = manager.get('r1');
      expect(retrieved).toBe(resource);
    });

    it('应该能够检查资源是否存在', () => {
      const resource = new TestResource('r1', 100);
      manager.register('r1', resource);

      expect(manager.has('r1')).toBe(true);
      expect(manager.has('r2')).toBe(false);
    });

    it('应该能够移除资源', () => {
      const resource = new TestResource('r1', 100);
      manager.register('r1', resource);

      const removed = manager.remove('r1');
      expect(removed).toBe(true);
      expect(manager.has('r1')).toBe(false);
      expect(resource.disposed).toBe(true);
    });

    it('应该在移除不存在的资源时返回 false', () => {
      const removed = manager.remove('notfound');
      expect(removed).toBe(false);
    });
  });

  describe('资源替换', () => {
    it('应该在注册同ID资源时释放旧资源', () => {
      const resource1 = new TestResource('r1', 100);
      const resource2 = new TestResource('r1', 200);

      manager.register('r1', resource1);
      manager.register('r1', resource2);

      expect(resource1.disposed).toBe(true);
      expect(manager.get('r1')).toBe(resource2);
    });
  });

  describe('内存管理', () => {
    it('应该正确计算总内存', () => {
      manager.register('r1', new TestResource('r1', 100));
      manager.register('r2', new TestResource('r2', 200));
      manager.register('r3', new TestResource('r3', 300));

      const stats = manager.getStats();
      expect(stats.totalMemory).toBe(600);
    });

    it('应该在超过阈值时自动清理', () => {
      // 阈值 = 1000 * 0.9 = 900
      const r1 = new TestResource('r1', 300);
      const r2 = new TestResource('r2', 300);
      const r3 = new TestResource('r3', 300);
      const r4 = new TestResource('r4', 300);

      manager.register('r1', r1);
      manager.register('r2', r2);
      manager.register('r3', r3); // 总计 900，未超阈值

      manager.register('r4', r4); // 总计 1200，触发清理

      // r1 应该被清理（最久未使用）
      expect(r1.disposed).toBe(true);
      expect(manager.has('r1')).toBe(false);
    });

    it('应该支持手动释放内存', () => {
      const r1 = new TestResource('r1', 400);
      const r2 = new TestResource('r2', 400);
      const r3 = new TestResource('r3', 400);

      manager.register('r1', r1);
      manager.register('r2', r2);
      manager.register('r3', r3);

      const freed = manager.freeMemory(500); // 释放至 500 以下

      expect(freed).toBeGreaterThan(0);
      const stats = manager.getStats();
      expect(stats.totalMemory).toBeLessThanOrEqual(500);
    });
  });

  describe('LRU 行为', () => {
    it('访问资源应该更新其位置', () => {
      // 使用更小的资源避免自动清理
      const r1 = new TestResource('r1', 200);
      const r2 = new TestResource('r2', 200);
      const r3 = new TestResource('r3', 200);

      manager.register('r1', r1);
      manager.register('r2', r2);
      manager.register('r3', r3);

      manager.get('r1'); // r1 变为最近使用

      manager.freeMemory(400); // 释放内存至 400

      // r2 应该被释放（r1 被访问过，变为最近）
      expect(r2.disposed).toBe(true);
      expect(manager.has('r1')).toBe(true);
      expect(manager.has('r3')).toBe(true);
    });
  });

  describe('统计信息', () => {
    it('应该正确跟踪命中和未命中', () => {
      manager.register('r1', new TestResource('r1', 100));

      manager.get('r1'); // 命中
      manager.get('r2'); // 未命中
      manager.get('r1'); // 命中
      manager.get('r3'); // 未命中

      const stats = manager.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
    });

    it('应该正确计算命中率', () => {
      manager.register('r1', new TestResource('r1', 100));

      manager.get('r1'); // 命中
      manager.get('r2'); // 未命中
      manager.get('r1'); // 命中
      manager.get('r3'); // 未命中

      const hitRate = manager.getHitRate();
      expect(hitRate).toBe(0.5);
    });

    it('应该在没有访问时返回 0 命中率', () => {
      const hitRate = manager.getHitRate();
      expect(hitRate).toBe(0);
    });

    it('应该提供完整的统计信息', () => {
      manager.register('r1', new TestResource('r1', 100));
      manager.register('r2', new TestResource('r2', 200));

      const stats = manager.getStats();
      expect(stats.totalResources).toBe(2);
      expect(stats.totalMemory).toBe(300);
      expect(stats.memoryLimit).toBe(1000);
    });
  });

  describe('清空和销毁', () => {
    it('应该能够清空所有资源', () => {
      const r1 = new TestResource('r1', 100);
      const r2 = new TestResource('r2', 200);

      manager.register('r1', r1);
      manager.register('r2', r2);

      manager.clear();

      expect(r1.disposed).toBe(true);
      expect(r2.disposed).toBe(true);
      expect(manager.getStats().totalResources).toBe(0);
      expect(manager.getStats().totalMemory).toBe(0);
    });

    it('应该能够销毁管理器', () => {
      const r1 = new TestResource('r1', 100);
      manager.register('r1', r1);

      manager.dispose();

      expect(r1.disposed).toBe(true);
      expect(manager.getStats().totalResources).toBe(0);
    });
  });

  describe('默认配置', () => {
    it('应该使用默认内存限制', () => {
      const defaultManager = new ResourceManager();
      const stats = defaultManager.getStats();

      expect(stats.memoryLimit).toBe(500 * 1024 * 1024); // 500MB
    });
  });

  describe('资源生命周期', () => {
    it('应该在资源被淘汰时调用 dispose', () => {
      const disposeSpy = vi.fn();

      class SpyResource extends TestResource {
        dispose(): void {
          super.dispose();
          disposeSpy();
        }
      }

      const smallManager = new ResourceManager({ memoryLimit: 200 });

      smallManager.register('r1', new SpyResource('r1', 100));
      smallManager.register('r2', new SpyResource('r2', 100));
      smallManager.register('r3', new SpyResource('r3', 100)); // 应该触发 r1 的 dispose

      expect(disposeSpy).toHaveBeenCalled();
    });
  });
});
