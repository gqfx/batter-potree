/**
 * BinaryHeap 单元测试
 */

import { describe, it, expect } from 'vitest';
import { BinaryHeap } from '../BinaryHeap.js';

describe('BinaryHeap', () => {
  describe('基本操作', () => {
    it('应该正确创建空堆', () => {
      const heap = new BinaryHeap<number>((x) => x);
      expect(heap.size()).toBe(0);
      expect(heap.isEmpty()).toBe(true);
    });

    it('应该正确添加和移除元素', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(5);
      heap.push(3);
      heap.push(7);

      expect(heap.size()).toBe(3);
      expect(heap.peek()).toBe(3);
      expect(heap.pop()).toBe(3);
      expect(heap.pop()).toBe(5);
      expect(heap.pop()).toBe(7);
      expect(heap.pop()).toBe(undefined);
    });

    it('应该正确处理大量元素', () => {
      const heap = new BinaryHeap<number>((x) => x);
      const values = [50, 30, 70, 20, 40, 60, 80, 10, 90];

      for (const value of values) {
        heap.push(value);
      }

      const sorted: number[] = [];
      while (!heap.isEmpty()) {
        sorted.push(heap.pop()!);
      }

      expect(sorted).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
    });
  });

  describe('peek 操作', () => {
    it('应该返回最小元素但不移除', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(5);
      heap.push(3);
      heap.push(7);

      expect(heap.peek()).toBe(3);
      expect(heap.size()).toBe(3);
      expect(heap.peek()).toBe(3);
    });

    it('空堆应该返回 undefined', () => {
      const heap = new BinaryHeap<number>((x) => x);
      expect(heap.peek()).toBe(undefined);
    });
  });

  describe('自定义权重函数', () => {
    interface Node {
      id: number;
      priority: number;
    }

    it('应该根据自定义权重排序', () => {
      const heap = new BinaryHeap<Node>((node) => node.priority);

      heap.push({ id: 1, priority: 5 });
      heap.push({ id: 2, priority: 3 });
      heap.push({ id: 3, priority: 7 });

      expect(heap.pop()?.id).toBe(2); // priority: 3
      expect(heap.pop()?.id).toBe(1); // priority: 5
      expect(heap.pop()?.id).toBe(3); // priority: 7
    });

    it('应该支持反向排序（最大堆）', () => {
      const heap = new BinaryHeap<number>((x) => -x); // 取反实现最大堆

      heap.push(5);
      heap.push(3);
      heap.push(7);

      expect(heap.pop()).toBe(7);
      expect(heap.pop()).toBe(5);
      expect(heap.pop()).toBe(3);
    });
  });

  describe('remove 操作', () => {
    it('应该正确移除指定元素', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(5);
      heap.push(3);
      heap.push(7);

      expect(heap.remove(3)).toBe(true);
      expect(heap.size()).toBe(2);
      expect(heap.pop()).toBe(5);
      expect(heap.pop()).toBe(7);
    });

    it('移除不存在的元素应该返回 false', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(5);
      heap.push(3);

      expect(heap.remove(7)).toBe(false);
      expect(heap.size()).toBe(2);
    });

    it('应该正确移除堆顶元素', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(5);
      heap.push(3);
      heap.push(7);

      expect(heap.remove(3)).toBe(true);
      expect(heap.peek()).toBe(5);
    });

    it('应该正确移除最后一个元素', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(5);
      heap.push(3);
      heap.push(7);

      expect(heap.remove(7)).toBe(true);
      expect(heap.size()).toBe(2);
      expect(heap.pop()).toBe(3);
      expect(heap.pop()).toBe(5);
    });
  });

  describe('clear 操作', () => {
    it('应该清空堆', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(5);
      heap.push(3);
      heap.push(7);

      heap.clear();

      expect(heap.size()).toBe(0);
      expect(heap.isEmpty()).toBe(true);
      expect(heap.peek()).toBe(undefined);
    });
  });

  describe('边界情况', () => {
    it('应该处理单个元素', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(42);

      expect(heap.size()).toBe(1);
      expect(heap.peek()).toBe(42);
      expect(heap.pop()).toBe(42);
      expect(heap.isEmpty()).toBe(true);
    });

    it('应该处理相同值的元素', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(5);
      heap.push(5);
      heap.push(5);

      expect(heap.pop()).toBe(5);
      expect(heap.pop()).toBe(5);
      expect(heap.pop()).toBe(5);
    });

    it('应该处理负数', () => {
      const heap = new BinaryHeap<number>((x) => x);
      heap.push(-5);
      heap.push(-3);
      heap.push(-7);

      expect(heap.pop()).toBe(-7);
      expect(heap.pop()).toBe(-5);
      expect(heap.pop()).toBe(-3);
    });
  });

  describe('性能测试', () => {
    it('应该高效处理大量元素', () => {
      const heap = new BinaryHeap<number>((x) => x);
      const count = 10000;

      // 添加元素
      for (let i = 0; i < count; i++) {
        heap.push(Math.random());
      }

      expect(heap.size()).toBe(count);

      // 移除所有元素并验证顺序
      let prev = -Infinity;
      while (!heap.isEmpty()) {
        const current = heap.pop()!;
        expect(current).toBeGreaterThanOrEqual(prev);
        prev = current;
      }
    });
  });

  describe('优先级队列场景', () => {
    interface Task {
      name: string;
      weight: number;
    }

    it('应该模拟优先级队列（权重小的先出）', () => {
      const heap = new BinaryHeap<Task>((task) => task.weight);

      heap.push({ name: 'task1', weight: 10 });
      heap.push({ name: 'task2', weight: 5 });
      heap.push({ name: 'task3', weight: 15 });

      expect(heap.pop()?.name).toBe('task2'); // weight: 5
      expect(heap.pop()?.name).toBe('task1'); // weight: 10
      expect(heap.pop()?.name).toBe('task3'); // weight: 15
    });

    it('应该模拟反向优先级队列（权重大的先出）', () => {
      const heap = new BinaryHeap<Task>((task) => 1 / task.weight); // 使用倒数

      heap.push({ name: 'task1', weight: 10 });
      heap.push({ name: 'task2', weight: 5 });
      heap.push({ name: 'task3', weight: 15 });

      expect(heap.pop()?.name).toBe('task3'); // weight: 15
      expect(heap.pop()?.name).toBe('task1'); // weight: 10
      expect(heap.pop()?.name).toBe('task2'); // weight: 5
    });
  });
});
