/**
 * 消息队列类型定义
 *
 * @module messaging
 */

/**
 * 基础消息类型
 */
export interface BaseMessage {
  /** 消息类型 */
  readonly type: string;
  /** 消息时间戳 */
  readonly timestamp?: number;
}

/**
 * 节点加载成功消息
 */
export interface NodeLoadedMessage extends BaseMessage {
  readonly type: 'NODE_LOADED';
  readonly nodeId: string;
  // biome-ignore lint/suspicious/noExplicitAny: Node data can be of any format
  readonly data: any;
}

/**
 * 节点加载失败消息
 */
export interface NodeFailedMessage extends BaseMessage {
  readonly type: 'NODE_FAILED';
  readonly nodeId: string;
  readonly error: Error;
}

/**
 * 资源释放消息
 */
export interface ResourceFreedMessage extends BaseMessage {
  readonly type: 'RESOURCE_FREED';
  readonly resourceId: string;
}

/**
 * 系统消息联合类型
 */
export type Message = NodeLoadedMessage | NodeFailedMessage | ResourceFreedMessage;

/**
 * 消息处理器函数
 */
export type MessageHandler<T extends BaseMessage = BaseMessage> = (message: T) => void;

/**
 * 消息过滤器函数
 */
export type MessageFilter<T extends BaseMessage = BaseMessage> = (message: T) => boolean;
