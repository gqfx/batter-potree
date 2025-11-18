/**
 * 点云节点资源管理器
 *
 * 专门用于管理点云节点 Geometry 的 LRU 缓存，自动卸载不可见节点
 *
 * @module resources
 * @example
 * ```ts
 * const manager = new NodeResourceManager({
 *   memoryLimit: 500 * 1024 * 1024, // 500MB
 *   cleanupThreshold: 0.9
 * });
 *
 * // 注册节点
 * manager.register('cloud1:r0', node, geometry);
 *
 * // 标记为可见（更新 LRU）
 * manager.touch('cloud1:r0');
 *
 * // 释放内存
 * const freed = manager.freeMemory();
 * ```
 */

import * as THREE from 'three';
import type { IPointCloudOctreeNode } from '../types/potree.js';

/**
 * 节点资源管理器配置
 */
export interface NodeResourceManagerOptions {
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

  /**
   * 节点被卸载时的回调
   */
  readonly onNodeEvicted?: (nodeId: string, node: IPointCloudOctreeNode) => void;
}

/**
 * 节点资源条目
 */
interface NodeEntry {
  /** 节点引用 */
  readonly node: IPointCloudOctreeNode;
  /** Geometry 引用 */
  readonly geometry: THREE.BufferGeometry;
  /** 内存大小（字节） */
  readonly size: number;
  /** 上次访问时间 */
  lastAccess: number;
}

/**
 * LRU 链表节点
 */
class LRUListNode {
  constructor(
    public readonly id: string,
    public prev: LRUListNode | null = null,
    public next: LRUListNode | null = null
  ) {}
}

/**
 * 节点资源统计信息
 */
export interface NodeResourceStats {
  /** 节点总数 */
  readonly totalNodes: number;
  /** 总内存使用（字节） */
  readonly totalMemory: number;
  /** 内存限制（字节） */
  readonly memoryLimit: number;
  /** 总点数 */
  readonly totalPoints: number;
  /** 命中次数 */
  readonly hits: number;
  /** 未命中次数 */
  readonly misses: number;
  /** 淘汰次数 */
  readonly evictions: number;
}

/**
 * 点云节点资源管理器
 *
 * 特性：
 * - 基于内存大小的 LRU 缓存策略
 * - 自动卸载最久未使用的节点
 * - 正确释放 Three.js Geometry 资源
 * - 支持可见节点标记（touch）
 */
export class NodeResourceManager {
  private readonly memoryLimit: number;
  private readonly cleanupThreshold: number;
  private readonly onNodeEvicted?: (nodeId: string, node: IPointCloudOctreeNode) => void;

  /** 节点映射表 */
  private readonly entries = new Map<string, NodeEntry>();

  /** LRU 链表头（最近使用） */
  private head: LRUListNode | null = null;

  /** LRU 链表尾（最久未使用） */
  private tail: LRUListNode | null = null;

  /** ID 到链表节点的映射 */
  private readonly lruNodes = new Map<string, LRUListNode>();

  /** 统计数据 */
  private totalMemory = 0;
  private totalPoints = 0;
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  /**
   * 创建节点资源管理器
   *
   * @param options - 配置选项
   *
   * @example
   * ```ts
   * const manager = new NodeResourceManager({
   *   memoryLimit: 1024 * 1024 * 1024, // 1GB
   *   onNodeEvicted: (id, node) => {
   *     console.log(`Node ${id} evicted`);
   *   }
   * });
   * ```
   */
  constructor(options: NodeResourceManagerOptions = {}) {
    this.memoryLimit = options.memoryLimit ?? 500 * 1024 * 1024;
    this.cleanupThreshold = options.cleanupThreshold ?? 0.9;
    this.onNodeEvicted = options.onNodeEvicted;
  }

  /**
   * 注册节点资源
   *
   * @param id - 唯一标识符（建议格式：cloudName:nodeName）
   * @param node - 八叉树节点
   * @param geometry - BufferGeometry
   *
   * @example
   * ```ts
   * // 计算 geometry 大小
   * const size = calculateGeometrySize(geometry);
   * manager.register('myCloud:r0', node, geometry);
   * ```
   */
  register(
    id: string,
    node: IPointCloudOctreeNode,
    geometry: THREE.BufferGeometry
  ): void {
    // 如果已存在，先移除
    if (this.entries.has(id)) {
      this.remove(id);
    }

    // 计算 geometry 大小
    const size = this.calculateGeometrySize(geometry);

    // 创建条目
    const entry: NodeEntry = {
      node,
      geometry,
      size,
      lastAccess: performance.now(),
    };

    this.entries.set(id, entry);
    this.totalMemory += size;
    this.totalPoints += node.numPoints ?? 0;

    // 添加到 LRU 链表头部
    this.addToHead(id);

    // 检查是否需要清理
    if (this.totalMemory > this.memoryLimit * this.cleanupThreshold) {
      this.freeMemory();
    }
  }

  /**
   * 标记节点为已使用（更新 LRU 位置）
   *
   * @param id - 节点 ID
   *
   * @example
   * ```ts
   * // 在遍历时标记可见节点
   * for (const visible of visibleNodes) {
   *   manager.touch(visible.id);
   * }
   * ```
   */
  touch(id: string): void {
    const entry = this.entries.get(id);
    if (!entry) {
      this.misses++;
      return;
    }

    this.hits++;
    entry.lastAccess = performance.now();

    // 移动到链表头部
    this.moveToHead(id);
  }

  /**
   * 检查节点是否存在
   *
   * @param id - 节点 ID
   * @returns 是否存在
   */
  has(id: string): boolean {
    return this.entries.has(id);
  }

  /**
   * 获取节点条目
   *
   * @param id - 节点 ID
   * @returns 节点条目或 undefined
   */
  get(id: string): NodeEntry | undefined {
    const entry = this.entries.get(id);
    if (entry) {
      this.touch(id);
      return entry;
    }
    this.misses++;
    return undefined;
  }

  /**
   * 移除节点并释放资源
   *
   * @param id - 节点 ID
   * @returns 是否移除成功
   */
  remove(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    // 释放 geometry
    entry.geometry.dispose();

    // 重置节点状态
    entry.node.loaded = false;
    entry.node.geometry = undefined;

    // 更新统计
    this.totalMemory -= entry.size;
    this.totalPoints -= entry.node.numPoints ?? 0;

    // 从集合中移除
    this.entries.delete(id);
    this.removeFromList(id);

    return true;
  }

  /**
   * 释放内存至目标限制
   *
   * 从最久未使用的节点开始卸载，直到内存使用低于限制
   *
   * @param targetMemory - 目标内存（字节），默认为 memoryLimit
   * @returns 释放的节点数量
   *
   * @example
   * ```ts
   * // 在每帧结束时调用
   * const freed = manager.freeMemory();
   * if (freed > 0) {
   *   console.log(`Freed ${freed} nodes`);
   * }
   * ```
   */
  freeMemory(targetMemory?: number): number {
    const target = targetMemory ?? this.memoryLimit;
    let freed = 0;

    while (this.totalMemory > target && this.tail) {
      const lruId = this.tail.id;
      const entry = this.entries.get(lruId);

      if (entry) {
        // 通知回调
        this.onNodeEvicted?.(lruId, entry.node);

        // 移除节点
        this.remove(lruId);
        freed++;
        this.evictions++;
      } else {
        // 清理孤立的链表节点
        this.removeFromList(lruId);
      }
    }

    return freed;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats(): NodeResourceStats {
    return {
      totalNodes: this.entries.size,
      totalMemory: this.totalMemory,
      memoryLimit: this.memoryLimit,
      totalPoints: this.totalPoints,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
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
   * 获取内存使用率
   *
   * @returns 使用率（0-1）
   */
  getMemoryUsage(): number {
    return this.totalMemory / this.memoryLimit;
  }

  /**
   * 清空所有资源
   */
  clear(): void {
    for (const [id, entry] of this.entries) {
      entry.geometry.dispose();
      entry.node.loaded = false;
      entry.node.geometry = undefined;
    }

    this.entries.clear();
    this.lruNodes.clear();
    this.head = null;
    this.tail = null;
    this.totalMemory = 0;
    this.totalPoints = 0;
  }

  /**
   * 销毁资源管理器
   */
  dispose(): void {
    this.clear();
  }

  /**
   * 获取所有节点 ID（从最近到最久）
   */
  getNodeIds(): string[] {
    const ids: string[] = [];
    let current = this.head;
    while (current) {
      ids.push(current.id);
      current = current.next;
    }
    return ids;
  }

  /**
   * 计算 BufferGeometry 的内存大小
   */
  private calculateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;

    for (const name in geometry.attributes) {
      const attr = geometry.attributes[name];
      if (attr?.array) {
        size += attr.array.byteLength;
      }
    }

    if (geometry.index?.array) {
      size += geometry.index.array.byteLength;
    }

    return size;
  }

  /**
   * 添加 ID 到链表头部
   */
  private addToHead(id: string): void {
    const node = new LRUListNode(id);
    this.lruNodes.set(id, node);

    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
  }

  /**
   * 移动 ID 到链表头部
   */
  private moveToHead(id: string): void {
    const node = this.lruNodes.get(id);
    if (!node || node === this.head) return;

    // 从当前位置移除
    this.removeNodeFromList(node);

    // 添加到头部
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * 从链表中移除 ID
   */
  private removeFromList(id: string): void {
    const node = this.lruNodes.get(id);
    if (!node) return;

    this.removeNodeFromList(node);
    this.lruNodes.delete(id);
  }

  /**
   * 从链表中移除节点
   */
  private removeNodeFromList(node: LRUListNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }
}
