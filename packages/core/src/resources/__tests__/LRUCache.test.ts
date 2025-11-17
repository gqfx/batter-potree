/**
 * LRUCache 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { LRUCache } from '../LRUCache.js';

describe('LRUCache', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3);
  });

  describe('基本功能', () => {
    it('应该能够设置和获取值', () => {
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('应该在键不存在时返回 undefined', () => {
      expect(cache.get('notfound')).toBeUndefined();
    });

    it('应该能够更新现有键的值', () => {
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.get('a')).toBe(2);
      expect(cache.size).toBe(1);
    });

    it('应该能够删除键', () => {
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    it('应该在删除不存在的键时返回 false', () => {
      expect(cache.delete('notfound')).toBe(false);
    });

    it('应该能够检查键是否存在', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('应该能够清空缓存', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('容量限制', () => {
    it('应该遵守容量限制', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size).toBe(3);

      cache.set('d', 4);
      expect(cache.size).toBe(3); // 仍然是3
    });

    it('应该淘汰最久未使用的元素', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // 'a' 应该被淘汰

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(true);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('应该返回被淘汰的条目', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      const evicted = cache.set('d', 4);

      expect(evicted).toEqual({ key: 'a', value: 1 });
    });

    it('应该在未淘汰时返回 null', () => {
      const evicted = cache.set('a', 1);
      expect(evicted).toBeNull();
    });
  });

  describe('LRU 行为', () => {
    it('访问元素应该更新其位置', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a'); // 'a' 变为最近使用

      cache.set('d', 4); // 'b' 应该被淘汰（而不是 'a'）

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
      expect(cache.has('c')).toBe(true);
      expect(cache.has('d')).toBe(true);
    });

    it('更新元素应该更新其位置', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.set('a', 10); // 'a' 变为最近使用

      cache.set('d', 4); // 'b' 应该被淘汰

      expect(cache.get('a')).toBe(10);
      expect(cache.has('b')).toBe(false);
    });

    it('应该正确维护访问顺序', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a'); // a 最近
      cache.get('b'); // b 最近

      const keys = cache.keys();
      expect(keys).toEqual(['b', 'a', 'c']); // 从最近到最久
    });
  });

  describe('getLRUKey', () => {
    it('应该返回最久未使用的键', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.getLRUKey()).toBe('a');

      cache.get('a'); // 访问 a
      expect(cache.getLRUKey()).toBe('b');
    });

    it('应该在缓存为空时返回 undefined', () => {
      expect(cache.getLRUKey()).toBeUndefined();
    });
  });

  describe('keys', () => {
    it('应该返回所有键（从最近到最久）', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.keys()).toEqual(['c', 'b', 'a']);
    });

    it('应该在缓存为空时返回空数组', () => {
      expect(cache.keys()).toEqual([]);
    });
  });

  describe('边界情况', () => {
    it('应该处理容量为 1 的情况', () => {
      const smallCache = new LRUCache<string, number>(1);
      smallCache.set('a', 1);
      expect(smallCache.size).toBe(1);

      smallCache.set('b', 2);
      expect(smallCache.size).toBe(1);
      expect(smallCache.has('a')).toBe(false);
      expect(smallCache.has('b')).toBe(true);
    });

    it('应该拒绝非正容量', () => {
      expect(() => new LRUCache(0)).toThrow('Capacity must be positive');
      expect(() => new LRUCache(-1)).toThrow('Capacity must be positive');
    });

    it('应该处理单个元素的删除', () => {
      cache.set('a', 1);
      cache.delete('a');
      expect(cache.size).toBe(0);
      expect(cache.keys()).toEqual([]);
    });
  });

  describe('性能测试', () => {
    it('10000次 LRU 操作应该小于 50ms', () => {
      const perfCache = new LRUCache<number, number>(1000);

      const start = performance.now();

      // 插入
      for (let i = 0; i < 5000; i++) {
        perfCache.set(i, i * 2);
      }

      // 访问
      for (let i = 0; i < 2500; i++) {
        perfCache.get(i);
      }

      // 更新
      for (let i = 0; i < 2500; i++) {
        perfCache.set(i, i * 3);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });
});
