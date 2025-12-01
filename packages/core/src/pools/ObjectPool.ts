/**
 * 通用对象池
 *
 * 减少高频对象的 GC 压力
 *
 * @module pools
 * @example
 * ```ts
 * const vectorPool = new ObjectPool(
 *   () => new THREE.Vector3(),
 *   (v) => v.set(0, 0, 0),
 *   100
 * );
 *
 * // 获取对象
 * const vec = vectorPool.acquire();
 * vec.set(1, 2, 3);
 *
 * // 使用完毕后归还
 * vectorPool.release(vec);
 * ```
 */

import type {
  ObjectCleaner,
  ObjectFactory,
  ObjectPoolStats,
  ObjectResetter,
  Poolable,
} from './types.js';

/**
 * 对象池配置
 */
export interface ObjectPoolOptions<T> {
  /**
   * 初始池大小
   * @default 0
   */
  readonly initialSize?: number;

  /**
   * 最大池大小
   * @default 1000
   */
  readonly maxSize?: number;

  /**
   * 对象重置函数（获取时调用）
   */
  readonly reset?: ObjectResetter<T>;

  /**
   * 对象清理函数（归还时调用）
   */
  readonly clear?: ObjectCleaner<T>;
}

/**
 * 通用对象池
 *
 * 特性：
 * - 零分配对象复用
 * - 自动扩展
 * - 统计跟踪
 * - 自定义重置/清理
 */
export class ObjectPool<T> {
  private readonly pool: T[] = [];
  private readonly factory: ObjectFactory<T>;
  private readonly resetFn?: ObjectResetter<T>;
  private readonly clearFn?: ObjectCleaner<T>;
  private readonly maxSize: number;

  private inUseCount = 0;
  private totalCreated = 0;
  private hits = 0;
  private misses = 0;

  /**
   * 创建对象池
   *
   * @param factory - 对象工厂函数
   * @param options - 配置选项
   */
  constructor(factory: ObjectFactory<T>, options: ObjectPoolOptions<T> = {}) {
    this.factory = factory;
    // 使用条件赋值避免 exactOptionalPropertyTypes 错误
    if (options.reset !== undefined) {
      this.resetFn = options.reset;
    }
    if (options.clear !== undefined) {
      this.clearFn = options.clear;
    }
    this.maxSize = options.maxSize ?? 1000;

    // 预填充池
    const initialSize = options.initialSize ?? 0;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createObject());
    }
  }

  /**
   * 从池中获取对象
   *
   * @returns 对象实例
   * @example
   * ```ts
   * const obj = pool.acquire();
   * // 使用对象...
   * pool.release(obj);
   * ```
   */
  acquire(): T {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
      this.hits++;
    } else {
      obj = this.createObject();
      this.misses++;
    }

    this.inUseCount++;

    // 重置对象
    if (this.resetFn) {
      this.resetFn(obj);
    } else if (this.isPoolable(obj) && obj.reset) {
      obj.reset();
    }

    return obj;
  }

  /**
   * 归还对象到池
   *
   * @param obj - 对象实例
   * @example
   * ```ts
   * pool.release(obj);
   * ```
   */
  release(obj: T): void {
    if (this.inUseCount <= 0) {
      return;
    }

    this.inUseCount--;

    // 清理对象
    if (this.clearFn) {
      this.clearFn(obj);
    } else if (this.isPoolable(obj) && obj.clear) {
      obj.clear();
    }

    // 只有在未达到最大容量时才放回池中
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * 批量获取对象
   *
   * @param count - 数量
   * @returns 对象数组
   */
  acquireBatch(count: number): T[] {
    const objects: T[] = [];
    for (let i = 0; i < count; i++) {
      objects.push(this.acquire());
    }
    return objects;
  }

  /**
   * 批量归还对象
   *
   * @param objects - 对象数组
   */
  releaseBatch(objects: readonly T[]): void {
    for (const obj of objects) {
      this.release(obj);
    }
  }

  /**
   * 预热池（预创建对象）
   *
   * @param count - 预创建数量
   */
  warmup(count: number): void {
    const toCreate = Math.min(count, this.maxSize - this.pool.length);
    for (let i = 0; i < toCreate; i++) {
      this.pool.push(this.createObject());
    }
  }

  /**
   * 收缩池到指定大小
   *
   * @param size - 目标大小
   */
  shrink(size: number): void {
    while (this.pool.length > size) {
      this.pool.pop();
    }
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool.length = 0;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats(): ObjectPoolStats {
    return {
      available: this.pool.length,
      inUse: this.inUseCount,
      totalCreated: this.totalCreated,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * 获取命中率
   *
   * @returns 命中率（0-1）
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * 获取池中可用对象数量
   */
  get available(): number {
    return this.pool.length;
  }

  /**
   * 获取正在使用的对象数量
   */
  get inUse(): number {
    return this.inUseCount;
  }

  /**
   * 创建新对象
   */
  private createObject(): T {
    this.totalCreated++;
    return this.factory();
  }

  /**
   * 检查对象是否实现了 Poolable 接口
   */
  private isPoolable(obj: T): obj is T & Poolable {
    return obj !== null && typeof obj === 'object' && ('reset' in obj || 'clear' in obj);
  }
}
