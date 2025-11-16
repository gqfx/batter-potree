/**
 * MessageQueue 测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageQueue } from '../MessageQueue.js';
import type { BaseMessage } from '../types.js';

interface TestMessage extends BaseMessage {
  type: 'TEST';
  value: number;
}

interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  error: Error;
}

type TestMessages = TestMessage | ErrorMessage;

describe('MessageQueue', () => {
  let queue: MessageQueue<TestMessages>;

  beforeEach(() => {
    queue = new MessageQueue<TestMessages>();
  });

  afterEach(() => {
    queue.dispose();
  });

  describe('基本功能', () => {
    it('应该能够推送和处理消息', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      queue.push({ type: 'TEST', value: 42 });
      queue.process();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'TEST', value: 42 }),
      );
    });

    it('应该支持批量推送', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      const messages: TestMessage[] = [
        { type: 'TEST', value: 1 },
        { type: 'TEST', value: 2 },
        { type: 'TEST', value: 3 },
      ];

      queue.pushBatch(messages);
      queue.process();

      expect(handler).toHaveBeenCalledTimes(3);
    });

    it('应该正确返回队列大小', () => {
      expect(queue.size).toBe(0);

      queue.push({ type: 'TEST', value: 1 });
      expect(queue.size).toBe(1);

      queue.push({ type: 'TEST', value: 2 });
      expect(queue.size).toBe(2);

      queue.process(1);
      expect(queue.size).toBe(1);

      queue.process();
      expect(queue.size).toBe(0);
    });

    it('应该支持清空队列', () => {
      queue.push({ type: 'TEST', value: 1 });
      queue.push({ type: 'TEST', value: 2 });
      expect(queue.size).toBe(2);

      queue.clear();
      expect(queue.size).toBe(0);
    });
  });

  describe('处理器管理', () => {
    it('应该支持多个处理器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      queue.on('TEST', handler1);
      queue.on('TEST', handler2);

      queue.push({ type: 'TEST', value: 42 });
      queue.process();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('应该支持取消注册', () => {
      const handler = vi.fn();
      const unsubscribe = queue.on('TEST', handler);

      queue.push({ type: 'TEST', value: 1 });
      queue.process();
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      queue.push({ type: 'TEST', value: 2 });
      queue.process();
      expect(handler).toHaveBeenCalledTimes(1); // 仍然是1次
    });

    it('应该支持一次性处理器', () => {
      const handler = vi.fn();
      queue.once('TEST', handler);

      queue.push({ type: 'TEST', value: 1 });
      queue.process();
      expect(handler).toHaveBeenCalledTimes(1);

      queue.push({ type: 'TEST', value: 2 });
      queue.process();
      expect(handler).toHaveBeenCalledTimes(1); // 仍然是1次
    });

    it('应该支持不同类型的消息', () => {
      const testHandler = vi.fn();
      const errorHandler = vi.fn();

      queue.on('TEST', testHandler);
      queue.on('ERROR', errorHandler);

      queue.push({ type: 'TEST', value: 42 });
      queue.push({ type: 'ERROR', error: new Error('test') });
      queue.process();

      expect(testHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('批量处理', () => {
    it('应该限制单帧处理数量', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      // 推送10条消息
      for (let i = 0; i < 10; i++) {
        queue.push({ type: 'TEST', value: i });
      }

      // 处理最多5条
      const processed = queue.process(5);
      expect(processed).toBe(5);
      expect(handler).toHaveBeenCalledTimes(5);
      expect(queue.size).toBe(5);
    });

    it('应该使用默认配置限制', () => {
      const queueWithLimit = new MessageQueue<TestMessages>({
        maxMessagesPerFrame: 3,
      });

      const handler = vi.fn();
      queueWithLimit.on('TEST', handler);

      for (let i = 0; i < 10; i++) {
        queueWithLimit.push({ type: 'TEST', value: i });
      }

      queueWithLimit.process();
      expect(handler).toHaveBeenCalledTimes(3);
      expect(queueWithLimit.size).toBe(7);

      queueWithLimit.dispose();
    });

    it('应该支持处理所有消息', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      for (let i = 0; i < 100; i++) {
        queue.push({ type: 'TEST', value: i });
      }

      const processed = queue.processAll();
      expect(processed).toBe(100);
      expect(handler).toHaveBeenCalledTimes(100);
      expect(queue.size).toBe(0);
    });
  });

  describe('过滤器', () => {
    it('应该支持消息过滤', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      // 只处理偶数值
      queue.addFilter('TEST', (msg) => {
        if ('value' in msg) {
          return msg.value % 2 === 0;
        }
        return true;
      });

      queue.push({ type: 'TEST', value: 1 });
      queue.push({ type: 'TEST', value: 2 });
      queue.push({ type: 'TEST', value: 3 });
      queue.push({ type: 'TEST', value: 4 });
      queue.process();

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ value: 2 }),
      );
      expect(handler).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ value: 4 }),
      );
    });

    it('应该支持移除过滤器', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      const removeFilter = queue.addFilter('TEST', (msg) => {
        if ('value' in msg) {
          return msg.value > 5;
        }
        return true;
      });

      queue.push({ type: 'TEST', value: 3 });
      queue.push({ type: 'TEST', value: 7 });
      queue.process();
      expect(handler).toHaveBeenCalledTimes(1);

      removeFilter();

      queue.push({ type: 'TEST', value: 3 });
      queue.process();
      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('错误处理', () => {
    it('应该隔离单个处理器的错误', () => {
      const handler1 = vi.fn(() => {
        throw new Error('Handler 1 error');
      });
      const handler2 = vi.fn();

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      queue.on('TEST', handler1);
      queue.on('TEST', handler2);

      queue.push({ type: 'TEST', value: 42 });
      queue.process();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1); // 仍然被调用
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('时间戳', () => {
    it('应该自动添加时间戳', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      queue.push({ type: 'TEST', value: 42 });
      queue.process();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Number),
        }),
      );
    });

    it('应该支持禁用时间戳', () => {
      const queueNoTimestamp = new MessageQueue<TestMessages>({
        addTimestamp: false,
      });

      const handler = vi.fn();
      queueNoTimestamp.on('TEST', handler);

      queueNoTimestamp.push({ type: 'TEST', value: 42 });
      queueNoTimestamp.process();

      const callArg = handler.mock.calls[0][0];
      expect(callArg.timestamp).toBeUndefined();

      queueNoTimestamp.dispose();
    });

    it('应该保留已有的时间戳', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      const customTimestamp = 12345;
      queue.push({ type: 'TEST', value: 42, timestamp: customTimestamp });
      queue.process();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: customTimestamp,
        }),
      );
    });
  });

  describe('统计信息', () => {
    it('应该提供正确的统计信息', () => {
      queue.on('TEST', () => {});
      queue.on('TEST', () => {});
      queue.on('ERROR', () => {});

      queue.addFilter('TEST', () => true);

      queue.push({ type: 'TEST', value: 1 });
      queue.push({ type: 'TEST', value: 2 });

      const stats = queue.getStats();

      expect(stats.queueSize).toBe(2);
      expect(stats.handlerCount).toBe(2);
      expect(stats.filterCount).toBe(1);
      expect(stats.totalHandlers).toBe(3);
    });
  });

  describe('性能测试', () => {
    it('10000条消息入队/出队应该小于20ms', () => {
      const handler = vi.fn();
      queue.on('TEST', handler);

      // 入队
      const startEnqueue = performance.now();
      for (let i = 0; i < 10000; i++) {
        queue.push({ type: 'TEST', value: i });
      }
      const enqueueTime = performance.now() - startEnqueue;

      // 出队
      const startDequeue = performance.now();
      queue.processAll();
      const dequeueTime = performance.now() - startDequeue;

      expect(handler).toHaveBeenCalledTimes(10000);
      expect(enqueueTime + dequeueTime).toBeLessThan(20);
    });
  });
});
