/**
 * Worker Pool 管理器
 *
 * 全局管理多个 Worker Pool,支持按 URL 复用 Worker
 * 类似原版 Potree 的 WorkerPool 实现
 *
 * @module workers
 * @example
 * ```ts
 * const manager = WorkerPoolManager.getInstance();
 *
 * // 获取 Worker(会自动从池中复用或创建新的)
 * const worker = manager.getWorker('/decoder.worker.js');
 *
 * // 使用 Worker
 * worker.postMessage(data);
 * worker.onmessage = (e) => {
 *   // 处理结果后归还 Worker
 *   manager.returnWorker('/decoder.worker.js', worker);
 * };
 *
 * // 或使用 Promise 风格
 * const result = await manager.execute('/decoder.worker.js', data, [buffer]);
 * ```
 */

/**
 * Worker 任务
 */
interface PooledWorkerTask<T = unknown, R = unknown> {
  /** 任务 ID */
  readonly id: string;
  /** 任务数据 */
  readonly data: T;
  /** 可转移对象 */
  readonly transferables?: Transferable[];
  /** 完成回调 */
  readonly resolve: (result: R) => void;
  /** 错误回调 */
  readonly reject: (error: Error) => void;
}

/**
 * Worker Pool 管理器配置
 */
export interface WorkerPoolManagerOptions {
  /**
   * 每个 URL 的最大 Worker 数量
   * @default navigator.hardwareConcurrency || 4
   */
  readonly maxWorkersPerUrl?: number;
}

/**
 * Worker Pool 管理器
 *
 * 单例模式,全局管理所有 Worker Pool
 */
export class WorkerPoolManager {
  private static instance: WorkerPoolManager | null = null;

  private readonly maxWorkersPerUrl: number;
  private readonly workers = new Map<string, Worker[]>();
  private readonly busyWorkers = new Map<string, Set<Worker>>();
  private readonly taskQueues = new Map<string, PooledWorkerTask[]>();
  private readonly workerTaskMap = new Map<Worker, PooledWorkerTask>();
  private disposed = false;

  private constructor(options: WorkerPoolManagerOptions = {}) {
    this.maxWorkersPerUrl = options.maxWorkersPerUrl ?? navigator.hardwareConcurrency ?? 4;
  }

  /**
   * 获取单例实例
   *
   * @param options - 配置选项(仅首次调用有效)
   * @returns 管理器实例
   */
  static getInstance(options?: WorkerPoolManagerOptions): WorkerPoolManager {
    if (!WorkerPoolManager.instance) {
      WorkerPoolManager.instance = new WorkerPoolManager(options);
    }
    return WorkerPoolManager.instance;
  }

  /**
   * 重置单例实例(用于测试)
   */
  static resetInstance(): void {
    if (WorkerPoolManager.instance) {
      WorkerPoolManager.instance.dispose();
      WorkerPoolManager.instance = null;
    }
  }

  /**
   * 获取 Worker
   *
   * 从池中获取空闲 Worker,如果没有则创建新的
   *
   * @param url - Worker 脚本 URL
   * @returns Worker 实例
   */
  getWorker(url: string): Worker {
    if (this.disposed) {
      throw new Error('WorkerPoolManager has been disposed');
    }

    // 初始化该 URL 的池
    if (!this.workers.has(url)) {
      this.workers.set(url, []);
      this.busyWorkers.set(url, new Set());
      this.taskQueues.set(url, []);
    }

    const pool = this.workers.get(url)!;
    const busy = this.busyWorkers.get(url)!;

    // 尝试从池中获取空闲 Worker
    if (pool.length > 0) {
      const worker = pool.pop()!;
      busy.add(worker);
      return worker;
    }

    // 创建新 Worker(不超过上限)
    const totalWorkers = pool.length + busy.size;
    if (totalWorkers < this.maxWorkersPerUrl) {
      const worker = new Worker(url);
      busy.add(worker);
      return worker;
    }

    // 无可用 Worker,返回一个繁忙的 Worker(调用者应排队)
    throw new Error(`No available workers for ${url}, please use execute() for automatic queuing`);
  }

  /**
   * 归还 Worker
   *
   * 将 Worker 归还到池中供复用
   *
   * @param url - Worker 脚本 URL
   * @param worker - Worker 实例
   */
  returnWorker(url: string, worker: Worker): void {
    const pool = this.workers.get(url);
    const busy = this.busyWorkers.get(url);
    const queue = this.taskQueues.get(url);

    if (!pool || !busy || !queue) {
      return;
    }

    // 从繁忙列表移除
    busy.delete(worker);

    // 检查是否有排队任务
    if (queue.length > 0) {
      const task = queue.shift()!;
      this.assignTaskToWorker(url, worker, task);
    } else {
      // 归还到池中
      pool.push(worker);
    }
  }

  /**
   * 执行任务(自动管理 Worker 生命周期)
   *
   * @param url - Worker 脚本 URL
   * @param data - 任务数据
   * @param transferables - 可转移对象
   * @returns Promise 返回结果
   */
  async execute<T = unknown, R = unknown>(
    url: string,
    data: T,
    transferables?: Transferable[],
  ): Promise<R> {
    if (this.disposed) {
      throw new Error('WorkerPoolManager has been disposed');
    }

    return new Promise<R>((resolve, reject) => {
      const task: PooledWorkerTask<T, R> = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        data,
        transferables,
        resolve: resolve as (result: unknown) => void,
        reject,
      };

      this.submitTask(url, task);
    });
  }

  /**
   * 提交任务
   */
  private submitTask<T, R>(url: string, task: PooledWorkerTask<T, R>): void {
    // 初始化该 URL 的池
    if (!this.workers.has(url)) {
      this.workers.set(url, []);
      this.busyWorkers.set(url, new Set());
      this.taskQueues.set(url, []);
    }

    const pool = this.workers.get(url)!;
    const busy = this.busyWorkers.get(url)!;
    const queue = this.taskQueues.get(url)!;

    // 尝试获取空闲 Worker
    if (pool.length > 0) {
      const worker = pool.pop()!;
      busy.add(worker);
      this.assignTaskToWorker(url, worker, task as PooledWorkerTask);
      return;
    }

    // 创建新 Worker
    const totalWorkers = pool.length + busy.size;
    if (totalWorkers < this.maxWorkersPerUrl) {
      const worker = new Worker(url);
      busy.add(worker);
      this.assignTaskToWorker(url, worker, task as PooledWorkerTask);
      return;
    }

    // 加入队列
    queue.push(task as PooledWorkerTask);
  }

  /**
   * 分配任务给 Worker
   */
  private assignTaskToWorker(url: string, worker: Worker, task: PooledWorkerTask): void {
    this.workerTaskMap.set(worker, task);

    const handleMessage = (event: MessageEvent): void => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.workerTaskMap.delete(worker);

      const response = event.data;
      if (response.error) {
        task.reject(new Error(response.error));
      } else {
        task.resolve(response.result ?? response);
      }

      this.returnWorker(url, worker);
    };

    const handleError = (event: ErrorEvent): void => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      this.workerTaskMap.delete(worker);

      task.reject(new Error(event.message || 'Worker error'));
      this.returnWorker(url, worker);
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // 发送消息
    const message = {
      taskId: task.id,
      data: task.data,
    };

    if (task.transferables && task.transferables.length > 0) {
      worker.postMessage(message, task.transferables);
    } else {
      worker.postMessage(message);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    urls: string[];
    totalWorkers: number;
    busyWorkers: number;
    idleWorkers: number;
    queuedTasks: number;
    perUrl: Record<string, { total: number; busy: number; idle: number; queued: number }>;
  } {
    let totalWorkers = 0;
    let busyWorkers = 0;
    let idleWorkers = 0;
    let queuedTasks = 0;
    const perUrl: Record<string, { total: number; busy: number; idle: number; queued: number }> = {};

    for (const [url, pool] of this.workers) {
      const busy = this.busyWorkers.get(url)?.size ?? 0;
      const idle = pool.length;
      const queued = this.taskQueues.get(url)?.length ?? 0;
      const total = busy + idle;

      totalWorkers += total;
      busyWorkers += busy;
      idleWorkers += idle;
      queuedTasks += queued;

      perUrl[url] = { total, busy, idle, queued };
    }

    return {
      urls: Array.from(this.workers.keys()),
      totalWorkers,
      busyWorkers,
      idleWorkers,
      queuedTasks,
      perUrl,
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    // 终止所有 Worker
    for (const [url, pool] of this.workers) {
      // 终止空闲 Worker
      for (const worker of pool) {
        worker.terminate();
      }

      // 终止繁忙 Worker
      const busy = this.busyWorkers.get(url);
      if (busy) {
        for (const worker of busy) {
          worker.terminate();
        }
      }

      // 拒绝排队任务
      const queue = this.taskQueues.get(url);
      if (queue) {
        for (const task of queue) {
          task.reject(new Error('WorkerPoolManager disposed'));
        }
      }
    }

    this.workers.clear();
    this.busyWorkers.clear();
    this.taskQueues.clear();
    this.workerTaskMap.clear();
  }
}
