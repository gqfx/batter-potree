/**
 * Web Worker 对象池
 *
 * 用于管理 Worker 生命周期和任务分配
 *
 * @module workers
 * @example
 * ```ts
 * const pool = new WorkerPool('/worker.js', { maxWorkers: 4 });
 *
 * // 提交任务
 * pool.execute({ id: '1', data: buffer }, (result) => {
 *   console.log('Task completed:', result);
 * });
 *
 * // 清理
 * pool.dispose();
 * ```
 */

import type { WorkerMessage, WorkerResponse, WorkerTask } from './types.js';

/**
 * WorkerPool 配置
 */
export interface WorkerPoolOptions {
  /**
   * 最大 Worker 数量
   * @default navigator.hardwareConcurrency || 4
   */
  readonly maxWorkers?: number;

  /**
   * Worker 脚本路径
   */
  readonly workerUrl: string;
  /**
   * Worker 构造函数选项
   */
  readonly workerOptions?: WorkerOptions;
}

/**
 * Worker 实例包装
 */
interface WorkerInstance {
  /** Worker 对象 */
  readonly worker: Worker;
  /** 是否空闲 */
  busy: boolean;
  /** 当前任务ID */
  currentTaskId?: string;
}

/**
 * Web Worker 对象池
 *
 * 特性：
 * - 自动管理 Worker 生命周期
 * - 任务队列和调度
 * - 错误处理和恢复
 * - 并发控制
 */
export class WorkerPool<T = unknown, R = unknown> {
  private readonly workerUrl: string;
  private readonly maxWorkers: number;
  private readonly workerOptions: WorkerOptions;
  private readonly workers: WorkerInstance[] = [];
  private readonly taskQueue: Array<WorkerTask<T, R>> = [];
  private readonly activeTasks = new Map<string, WorkerTask<T, R>>();
  private disposed = false;

  /**
   * 创建 Worker Pool
   *
   * @param options - 配置选项
   */
  constructor(options: WorkerPoolOptions) {
    this.workerUrl = options.workerUrl;
    this.maxWorkers = options.maxWorkers ?? navigator.hardwareConcurrency ?? 4;
    // 不指定 type，让浏览器自动判断（对于打包后的 Worker，通常不需要 module 类型）
    this.workerOptions = options.workerOptions ?? {};
  }

  /**
   * 执行任务
   *
   * @param data - 任务数据
   * @param transferables - 可转移对象
   * @returns Promise 返回结果
   * @example
   * ```ts
   * const result = await pool.execute({ points: buffer }, [buffer]);
   * ```
   */
  async execute(data: T, transferables?: Transferable[]): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        data,
        onComplete: resolve,
        onError: reject,
      };

      this.submitTask(task, transferables);
    });
  }

  /**
   * 提交任务（回调风格）
   *
   * @param task - 任务对象
   * @param transferables - 可转移对象
   */
  private submitTask(task: WorkerTask<T, R>, transferables?: Transferable[]): void {
    console.log('[WorkerPool] Submitting task:', task.id);

    if (this.disposed) {
      task.onError(new Error('WorkerPool has been disposed'));
      return;
    }

    this.activeTasks.set(task.id, task);

    const worker = this.getAvailableWorker();
    console.log('[WorkerPool] Available worker:', worker ? 'found' : 'not found', 'Total workers:', this.workers.length, 'Queue size:', this.taskQueue.length);

    if (worker) {
      this.assignTask(worker, task, transferables);
    } else {
      console.log('[WorkerPool] No available worker, queueing task');
      this.taskQueue.push(task);
    }
  }

  /**
   * 获取可用 Worker
   */
  private getAvailableWorker(): WorkerInstance | null {
    // 查找空闲 Worker
    for (const worker of this.workers) {
      if (!worker.busy) {
        return worker;
      }
    }

    // 创建新 Worker（如果未达到上限）
    if (this.workers.length < this.maxWorkers) {
      return this.createWorker();
    }

    return null;
  }

  /**
   * 创建 Worker
   */
  private createWorker(): WorkerInstance {
    console.log('[WorkerPool] Creating worker with URL:', this.workerUrl, 'options:', this.workerOptions);

    try {
      const worker = new Worker(this.workerUrl, this.workerOptions);
      console.log('[WorkerPool] Worker created successfully:', worker);

      const instance: WorkerInstance = {
        worker,
        busy: false,
      };

      worker.addEventListener('message', (event: MessageEvent<WorkerResponse<R>>) => {
        console.log('[WorkerPool] Worker message received:', event.data);
        this.handleWorkerMessage(instance, event.data);
      });

      worker.addEventListener('error', (event: ErrorEvent) => {
        console.error('[WorkerPool] Worker error:', event.message, event.filename, event.lineno);
        this.handleWorkerError(instance, event);
      });

      this.workers.push(instance);
      console.log('[WorkerPool] Total workers:', this.workers.length);
      return instance;
    } catch (error) {
      console.error('[WorkerPool] Failed to create worker:', error);
      throw error;
    }
  }

  /**
   * 分配任务给 Worker
   */
  private assignTask(
    worker: WorkerInstance,
    task: WorkerTask<T, R>,
    transferables?: Transferable[],
  ): void {
    console.log('[WorkerPool] Assigning task', task.id, 'to worker');

    worker.busy = true;
    worker.currentTaskId = task.id;

    const message: WorkerMessage<T> = {
      taskId: task.id,
      data: task.data,
    };

    if (transferables && transferables.length > 0) {
      console.log('[WorkerPool] Posting message with', transferables.length, 'transferables');
      worker.worker.postMessage(message, transferables);
    } else {
      console.log('[WorkerPool] Posting message without transferables');
      worker.worker.postMessage(message);
    }
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(worker: WorkerInstance, response: WorkerResponse<R>): void {
    const task = this.activeTasks.get(response.taskId);
    if (!task) {
      return;
    }

    this.activeTasks.delete(response.taskId);

    if (response.error) {
      task.onError(new Error(response.error));
    } else if (response.result !== undefined) {
      task.onComplete(response.result);
    } else {
      task.onError(new Error('Invalid worker response'));
    }

    // 标记 Worker 为空闲
    worker.busy = false;
    delete worker.currentTaskId;

    // 处理队列中的下一个任务
    this.processNextTask(worker);
  }

  /**
   * 处理 Worker 错误
   */
  private handleWorkerError(worker: WorkerInstance, event: ErrorEvent): void {
    const taskId = worker.currentTaskId;

    // 构建详细的错误信息
    const errorDetails = [
      event.message || 'Unknown worker error',
      event.filename ? `File: ${event.filename}` : '',
      event.lineno ? `Line: ${event.lineno}` : '',
      event.colno ? `Column: ${event.colno}` : '',
    ].filter(Boolean).join(' | ');

    if (taskId) {
      const task = this.activeTasks.get(taskId);
      if (task) {
        this.activeTasks.delete(taskId);
        task.onError(new Error(errorDetails || 'Worker error'));
      }
    }

    // 重置 Worker 状态
    worker.busy = false;
    delete worker.currentTaskId;

    // 尝试处理下一个任务
    this.processNextTask(worker);
  }

  /**
   * 处理队列中的下一个任务
   */
  private processNextTask(worker: WorkerInstance): void {
    if (this.taskQueue.length > 0 && !worker.busy) {
      const nextTask = this.taskQueue.shift();
      if (nextTask) {
        this.assignTask(worker, nextTask);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.busy).length,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    // 终止所有 Worker
    for (const { worker } of this.workers) {
      worker.terminate();
    }

    this.workers.length = 0;
    this.taskQueue.length = 0;

    // 拒绝所有待处理任务
    for (const task of this.activeTasks.values()) {
      task.onError(new Error('WorkerPool disposed'));
    }

    this.activeTasks.clear();
  }
}
