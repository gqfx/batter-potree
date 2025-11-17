/**
 * 消息队列模块
 *
 * @module messaging
 */

export type { MessageQueueOptions } from './MessageQueue.js';
export { MessageQueue } from './MessageQueue.js';
export type {
  BaseMessage,
  Message,
  MessageFilter,
  MessageHandler,
  NodeFailedMessage,
  NodeLoadedMessage,
  ResourceFreedMessage,
} from './types.js';
