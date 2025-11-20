/**
 * 创建点云解码 Worker Pool
 *
 * @module workers
 */

import type { WorkerPoolOptions } from './WorkerPool.js';
import { WorkerPool } from './WorkerPool.js';

/**
 * 创建点云解码 Worker Pool
 *
 * @param workerUrl - Worker 脚本 URL
 * @param maxWorkers - 最大 Worker 数量
 * @returns WorkerPool 实例
 * @example
 * ```ts
 * const workerUrl = new URL('./BinaryDecoderWorker.js', import.meta.url);
 * const pool = createDecoderWorkerPool(workerUrl.href, 4);
 * ```
 */
export function createDecoderWorkerPool(
  workerUrl: string,
  maxWorkers?: number,
): WorkerPool {
  const options: WorkerPoolOptions = {
    workerUrl,
    maxWorkers: maxWorkers ?? Math.max(1, (navigator.hardwareConcurrency || 4) - 1),
    workerOptions: { type: 'module' },
  };

  return new WorkerPool(options);
}
