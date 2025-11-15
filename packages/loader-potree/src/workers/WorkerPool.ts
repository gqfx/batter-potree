/**
 * Worker Pool Manager
 * Manages a pool of BinaryDecoderWorker instances for parallel point cloud decoding
 */

import type { IWorkerDecodeRequest, IWorkerDecodeResponse } from '@better-potree/types';

/**
 * Worker task in the queue
 */
interface WorkerTask {
  request: IWorkerDecodeRequest;
  resolve: (result: IWorkerDecodeResponse) => void;
  reject: (error: Error) => void;
}

/**
 * Worker instance wrapper
 */
interface WorkerInstance {
  worker: Worker;
  busy: boolean;
  currentTask: WorkerTask | null;
}

/**
 * Worker Pool for parallel point cloud decoding
 */
export class WorkerPool {
  private workers: WorkerInstance[] = [];
  private taskQueue: WorkerTask[] = [];
  private workerCount: number;
  private disposed = false;

  /**
   * Create a new worker pool
   * @param workerCount Number of workers (defaults to navigator.hardwareConcurrency or 4)
   */
  constructor(workerCount?: number) {
    this.workerCount = workerCount ?? (navigator.hardwareConcurrency || 4);
    this.initializeWorkers();
  }

  /**
   * Initialize worker instances
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.workerCount; i++) {
      // Worker will be created using ?worker suffix import
      // This is a placeholder - actual worker creation will be done in the loader
      const worker = this.createWorker();
      const instance: WorkerInstance = {
        worker,
        busy: false,
        currentTask: null,
      };

      worker.onmessage = (event: MessageEvent<IWorkerDecodeResponse>) => {
        this.handleWorkerMessage(instance, event);
      };

      worker.onerror = (error: ErrorEvent) => {
        this.handleWorkerError(instance, error);
      };

      this.workers.push(instance);
    }
  }

  /**
   * Create a worker instance
   * This method should be overridden or the worker should be injected
   */
  protected createWorker(): Worker {
    // This will be replaced with actual worker import in the implementation
    // For now, we create a URL-based worker as a fallback
    throw new Error('Worker creation must be implemented by subclass or via injection');
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(
    instance: WorkerInstance,
    event: MessageEvent<IWorkerDecodeResponse>
  ): void {
    if (!instance.currentTask) {
      console.warn('Received message from worker without current task');
      return;
    }

    const { resolve } = instance.currentTask;

    // Check for error response
    if ('error' in event.data) {
      instance.currentTask.reject(new Error(event.data.error as string));
    } else {
      resolve(event.data);
    }

    // Mark worker as available and process next task
    instance.busy = false;
    instance.currentTask = null;
    this.processNextTask();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(instance: WorkerInstance, error: ErrorEvent): void {
    console.error('Worker error:', error);

    if (instance.currentTask) {
      instance.currentTask.reject(
        new Error(`Worker error: ${error.message || 'Unknown error'}`)
      );
      instance.currentTask = null;
    }

    instance.busy = false;
    this.processNextTask();
  }

  /**
   * Find an available worker
   */
  private findAvailableWorker(): WorkerInstance | null {
    return this.workers.find((w) => !w.busy) || null;
  }

  /**
   * Process the next task in the queue
   */
  private processNextTask(): void {
    if (this.disposed) return;

    const worker = this.findAvailableWorker();
    if (!worker) return;

    const task = this.taskQueue.shift();
    if (!task) return;

    this.assignTaskToWorker(worker, task);
  }

  /**
   * Assign a task to a worker
   */
  private assignTaskToWorker(worker: WorkerInstance, task: WorkerTask): void {
    worker.busy = true;
    worker.currentTask = task;

    // Collect transferable objects
    const transferables: ArrayBuffer[] = [task.request.buffer];

    // Post message with transferables
    worker.worker.postMessage(task.request, transferables);
  }

  /**
   * Decode point cloud data
   * @param request Decode request
   * @returns Promise that resolves with decoded data
   */
  decode(request: IWorkerDecodeRequest): Promise<IWorkerDecodeResponse> {
    if (this.disposed) {
      return Promise.reject(new Error('WorkerPool has been disposed'));
    }

    return new Promise<IWorkerDecodeResponse>((resolve, reject) => {
      const task: WorkerTask = { request, resolve, reject };

      // Try to assign immediately to an available worker
      const worker = this.findAvailableWorker();
      if (worker) {
        this.assignTaskToWorker(worker, task);
      } else {
        // Queue the task
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Get the number of workers in the pool
   */
  getWorkerCount(): number {
    return this.workerCount;
  }

  /**
   * Get the number of busy workers
   */
  getBusyWorkerCount(): number {
    return this.workers.filter((w) => w.busy).length;
  }

  /**
   * Get the number of queued tasks
   */
  getQueuedTaskCount(): number {
    return this.taskQueue.length;
  }

  /**
   * Check if the pool is busy
   */
  isBusy(): boolean {
    return this.workers.some((w) => w.busy) || this.taskQueue.length > 0;
  }

  /**
   * Dispose of all workers and clear the queue
   */
  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;

    // Reject all queued tasks
    for (const task of this.taskQueue) {
      task.reject(new Error('WorkerPool disposed'));
    }
    this.taskQueue = [];

    // Terminate all workers
    for (const instance of this.workers) {
      if (instance.currentTask) {
        instance.currentTask.reject(new Error('WorkerPool disposed'));
      }
      instance.worker.terminate();
    }
    this.workers = [];
  }
}

/**
 * Factory function to create a WorkerPool with a worker constructor
 */
export function createWorkerPool(
  workerFactory: () => Worker,
  workerCount?: number
): WorkerPool {
  class CustomWorkerPool extends WorkerPool {
    protected createWorker(): Worker {
      return workerFactory();
    }
  }

  return new CustomWorkerPool(workerCount);
}
