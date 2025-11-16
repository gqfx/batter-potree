/**
 * 跨帧消息队列
 *
 * 用于异步任务通信，支持延迟处理和批量处理
 *
 * @module messaging
 * @example
 * ```ts
 * const queue = new MessageQueue();
 *
 * // 注册处理器
 * queue.on('NODE_LOADED', (msg) => {
 *   console.log('Node loaded:', msg.nodeId);
 * });
 *
 * // 发送消息
 * queue.push({ type: 'NODE_LOADED', nodeId: 'r', data: {} });
 *
 * // 处理消息
 * queue.process();
 * ```
 */

import type { BaseMessage, MessageFilter, MessageHandler } from './types.js';

/**
 * 消息队列配置
 */
export interface MessageQueueOptions {
  /**
   * 单帧最大处理消息数
   * @default 100
   */
  readonly maxMessagesPerFrame?: number;

  /**
   * 是否自动添加时间戳
   * @default true
   */
  readonly addTimestamp?: boolean;
}

/**
 * 消息队列
 *
 * 特性：
 * - 跨帧消息传递
 * - 类型安全的消息处理
 * - 批量处理限制
 * - 错误隔离
 */
export class MessageQueue<T extends BaseMessage = BaseMessage> {
  private readonly queue: T[] = [];
  private readonly handlers = new Map<string, Set<MessageHandler<T>>>();
  private readonly filters = new Map<string, Set<MessageFilter<T>>>();
  private readonly options: Required<MessageQueueOptions>;

  /**
   * 创建消息队列
   *
   * @param options - 配置选项
   */
  constructor(options: MessageQueueOptions = {}) {
    this.options = {
      maxMessagesPerFrame: options.maxMessagesPerFrame ?? 100,
      addTimestamp: options.addTimestamp ?? true,
    };
  }

  /**
   * 推送消息到队列
   *
   * @param message - 消息对象
   * @example
   * ```ts
   * queue.push({ type: 'NODE_LOADED', nodeId: 'r', data: {} });
   * ```
   */
  push(message: T): void {
    const msg = this.options.addTimestamp && !message.timestamp
      ? { ...message, timestamp: performance.now() }
      : message;

    this.queue.push(msg as T);
  }

  /**
   * 批量推送消息
   *
   * @param messages - 消息数组
   */
  pushBatch(messages: readonly T[]): void {
    for (const message of messages) {
      this.push(message);
    }
  }

  /**
   * 注册消息处理器
   *
   * @param type - 消息类型
   * @param handler - 处理函数
   * @returns 取消注册函数
   * @example
   * ```ts
   * const unsubscribe = queue.on('NODE_LOADED', (msg) => {
   *   console.log(msg.nodeId);
   * });
   *
   * // 取消注册
   * unsubscribe();
   * ```
   */
  on(type: string, handler: MessageHandler<T>): () => void {
    let handlerSet = this.handlers.get(type);
    if (!handlerSet) {
      handlerSet = new Set();
      this.handlers.set(type, handlerSet);
    }
    handlerSet.add(handler);

    return () => {
      handlerSet?.delete(handler);
      if (handlerSet?.size === 0) {
        this.handlers.delete(type);
      }
    };
  }

  /**
   * 注册一次性处理器
   *
   * @param type - 消息类型
   * @param handler - 处理函数
   * @returns 取消注册函数
   */
  once(type: string, handler: MessageHandler<T>): () => void {
    const wrappedHandler = (message: T) => {
      handler(message);
      unsubscribe();
    };
    const unsubscribe = this.on(type, wrappedHandler);
    return unsubscribe;
  }

  /**
   * 添加消息过滤器
   *
   * @param type - 消息类型
   * @param filter - 过滤函数
   * @returns 移除过滤器函数
   */
  addFilter(type: string, filter: MessageFilter<T>): () => void {
    let filterSet = this.filters.get(type);
    if (!filterSet) {
      filterSet = new Set();
      this.filters.set(type, filterSet);
    }
    filterSet.add(filter);

    return () => {
      filterSet?.delete(filter);
      if (filterSet?.size === 0) {
        this.filters.delete(type);
      }
    };
  }

  /**
   * 处理队列中的消息
   *
   * @param maxMessages - 最大处理数量，默认使用配置值
   * @returns 处理的消息数量
   * @example
   * ```ts
   * // 在每帧调用
   * const processed = queue.process();
   * console.log(`Processed ${processed} messages`);
   * ```
   */
  process(maxMessages?: number): number {
    const limit = maxMessages ?? this.options.maxMessagesPerFrame;
    const toProcess = Math.min(this.queue.length, limit);
    let processed = 0;

    for (let i = 0; i < toProcess; i++) {
      const message = this.queue.shift();
      if (!message) break;

      try {
        // 检查过滤器
        const filters = this.filters.get(message.type);
        if (filters) {
          let filtered = false;
          for (const filter of filters) {
            if (!filter(message)) {
              filtered = true;
              break;
            }
          }
          if (filtered) continue;
        }

        // 调用处理器
        const handlers = this.handlers.get(message.type);
        if (handlers) {
          for (const handler of handlers) {
            try {
              handler(message);
            } catch (error) {
              // 错误隔离：单个处理器失败不影响其他处理器
              console.error(`MessageQueue: Handler error for type "${message.type}":`, error);
            }
          }
        }

        processed++;
      } catch (error) {
        console.error('MessageQueue: Process error:', error);
      }
    }

    return processed;
  }

  /**
   * 处理所有消息
   *
   * @returns 处理的消息数量
   */
  processAll(): number {
    return this.process(Number.POSITIVE_INFINITY);
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue.length = 0;
  }

  /**
   * 获取队列大小
   *
   * @returns 队列中的消息数量
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      handlerCount: this.handlers.size,
      filterCount: this.filters.size,
      totalHandlers: Array.from(this.handlers.values()).reduce((sum, set) => sum + set.size, 0),
    };
  }

  /**
   * 移除所有处理器
   */
  dispose(): void {
    this.handlers.clear();
    this.filters.clear();
    this.queue.length = 0;
  }
}
