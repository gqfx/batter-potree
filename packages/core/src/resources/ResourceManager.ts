/**
 * 资源管理器
 *
 * 基于 LRU 的资源管理，自动管理内存限制
 *
 * @module resources
 * @example
 * ```ts
 * const manager = new ResourceManager({
 *   memoryLimit: 500 * 1024 * 1024 // 500MB
 * });
 *
 * // 注册资源
 * manager.register('node1', {
 *   id: 'node1',
 *   size: 1024 * 1024,
 *   dispose: () => console.log('disposed')
 * });
 *
 * // 访问资源（更新 LRU）
 * const resource = manager.get('node1');
 *
 * // 自动释放超限资源
 * manager.freeMemory();
 * ```
 */

import { LRUCache } from './LRUCache.js';
import type { Resource, ResourceStats } from './types.js';

/**
 * 资源管理器配置
 */
export interface ResourceManagerOptions {
  /**
   * 内存限制（字节）
   * @default 500 * 1024 * 1024 (500MB)
   */
  readonly memoryLimit?: number;

  /**
   * 触发清理的阈值（占内存限制的百分比）
   * @default 0.9 (90%)
   */
  readonly cleanupThreshold?: number;
}

/**
 * 资源管理器
 *
 * 特性：
 * - LRU 缓存策略
 * - 自动内存管理
 * - 资源生命周期追踪
 */
export class ResourceManager<T extends Resource = Resource> {
  private readonly memoryLimit: number;
  private readonly cleanupThreshold: number;
  private readonly cache: LRUCache<string, T>;
  private totalMemory = 0;
  private hits = 0;
  private misses = 0;

  /**
   * 创建资源管理器
   *
   * @param options - 配置选项
   */
  constructor(options: ResourceManagerOptions = {}) {
    this.memoryLimit = options.memoryLimit ?? 500 * 1024 * 1024;
    this.cleanupThreshold = options.cleanupThreshold ?? 0.9;
    this.cache = new LRUCache<string, T>(Number.MAX_SAFE_INTEGER); // 由内存限制控制
  }

  /**
   * 注册资源
   *
   * @param id - 资源ID
   * @param resource - 资源对象
   * @example
   * ```ts
   * manager.register('node1', {
   *   id: 'node1',
   *   size: 1024,
   *   dispose: () => {}
   * });
   * ```
   */
  register(id: string, resource: T): void {
    const existing = this.cache.get(id);
    if (existing) {
      // 释放旧资源
      this.totalMemory -= existing.size;
      existing.dispose();
    }

    const evicted = this.cache.set(id, resource);
    this.totalMemory += resource.size;

    // 处理被淘汰的资源
    if (evicted) {
      this.totalMemory -= evicted.value.size;
      evicted.value.dispose();
    }

    // 检查是否需要清理
    if (this.totalMemory > this.memoryLimit * this.cleanupThreshold) {
      this.freeMemory();
    }
  }

  /**
   * 获取资源
   *
   * @param id - 资源ID
   * @returns 资源对象或 undefined
   */
  get(id: string): T | undefined {
    const resource = this.cache.get(id);
    if (resource) {
      this.hits++;
      return resource;
    }
    this.misses++;
    return undefined;
  }

  /**
   * 检查资源是否存在
   *
   * @param id - 资源ID
   * @returns 是否存在
   */
  has(id: string): boolean {
    return this.cache.has(id);
  }

  /**
   * 移除资源
   *
   * @param id - 资源ID
   * @returns 是否移除成功
   */
  remove(id: string): boolean {
    const resource = this.cache.get(id);
    if (!resource) return false;

    this.cache.delete(id);
    this.totalMemory -= resource.size;
    resource.dispose();

    return true;
  }

  /**
   * 释放内存至目标限制
   *
   * @param targetMemory - 目标内存（字节），默认为 memoryLimit
   * @returns 释放的资源数量
   */
  freeMemory(targetMemory?: number): number {
    const target = targetMemory ?? this.memoryLimit;
    let freed = 0;

    while (this.totalMemory > target && this.cache.size > 0) {
      const lruKey = this.cache.getLRUKey();
      if (!lruKey) break;

      const success = this.remove(lruKey);
      if (success) freed++;
    }

    return freed;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats(): ResourceStats {
    return {
      totalResources: this.cache.size,
      totalMemory: this.totalMemory,
      memoryLimit: this.memoryLimit,
      hits: this.hits,
      misses: this.misses,
    };
  }

  /**
   * 获取缓存命中率
   *
   * @returns 命中率（0-1）
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? this.hits / total : 0;
  }

  /**
   * 清空所有资源
   */
  clear(): void {
    const keys = this.cache.keys();
    for (const key of keys) {
      this.remove(key);
    }
  }

  /**
   * 销毁资源管理器
   */
  dispose(): void {
    this.clear();
  }
}
