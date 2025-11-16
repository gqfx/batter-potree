/**
 * Worker Pool 类型定义
 *
 * @module workers
 */

/**
 * Worker 任务类型
 */
export interface WorkerTask<T = unknown, R = unknown> {
  /** 任务唯一ID */
  readonly id: string;
  /** 任务数据 */
  readonly data: T;
  /** 完成回调 */
  readonly onComplete: (result: R) => void;
  /** 错误回调 */
  readonly onError: (error: Error) => void;
}

/**
 * Worker 消息格式
 */
export interface WorkerMessage<T = unknown> {
  /** 任务ID */
  readonly taskId: string;
  /** 任务数据 */
  readonly data: T;
}

/**
 * Worker 响应格式
 */
export interface WorkerResponse<R = unknown> {
  /** 任务ID */
  readonly taskId: string;
  /** 结果数据 */
  readonly result?: R;
  /** 错误信息 */
  readonly error?: string;
}
