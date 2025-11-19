/**
 * GPU 遮挡查询管理器
 *
 * 使用 WebGL Occlusion Query API 来判断节点是否被遮挡
 *
 * @module culling
 * @example
 * ```ts
 * const occlusionQuery = new OcclusionQueryManager(gl);
 *
 * // 开始查询
 * occlusionQuery.begin(nodeId);
 * // 渲染包围盒
 * renderBoundingBox(node.boundingBox);
 * occlusionQuery.end(nodeId);
 *
 * // 下一帧检查结果
 * const isVisible = occlusionQuery.isVisible(nodeId);
 * ```
 */

import type * as THREE from 'three';

/**
 * 遮挡查询状态
 */
export enum OcclusionQueryState {
  /** 查询未开始 */
  IDLE = 'idle',
  /** 查询进行中 */
  PENDING = 'pending',
  /** 查询完成，结果可用 */
  READY = 'ready',
  /** 查询失败 */
  FAILED = 'failed',
}

/**
 * 遮挡查询结果
 */
export interface OcclusionQueryResult {
  /** 节点ID */
  nodeId: string;
  /** 查询状态 */
  state: OcclusionQueryState;
  /** 是否可见（通过遮挡测试的像素数 > 0） */
  isVisible: boolean;
  /** 通过遮挡测试的像素数 */
  visiblePixels: number;
  /** 查询创建时间 */
  timestamp: number;
}

/**
 * GPU 遮挡查询管理器配置
 */
export interface OcclusionQueryManagerOptions {
  /**
   * 最大并发查询数
   * @default 100
   */
  readonly maxConcurrentQueries?: number;

  /**
   * 查询结果缓存时间（毫秒）
   * @default 100
   */
  readonly cacheTime?: number;

  /**
   * 是否启用保守测试（假定可见以避免误剔除）
   * @default true
   */
  readonly conservativeTest?: boolean;
}

/**
 * GPU 遮挡查询管理器
 *
 * 管理 WebGL Occlusion Query 对象的创建、执行和结果查询
 */
export class OcclusionQueryManager {
  private readonly gl: WebGL2RenderingContext;
  private readonly maxConcurrentQueries: number;
  private readonly cacheTime: number;
  private readonly conservativeTest: boolean;

  /** 查询对象池 */
  private readonly queryPool: WebGLQuery[] = [];

  /** 活跃查询：nodeId -> WebGLQuery */
  private readonly activeQueries = new Map<string, WebGLQuery>();

  /** 查询结果缓存 */
  private readonly resultCache = new Map<string, OcclusionQueryResult>();

  /** 是否支持 Occlusion Query */
  private readonly isSupported: boolean;

  /**
   * 创建遮挡查询管理器
   *
   * @param renderer - Three.js 渲染器
   * @param options - 配置选项
   */
  constructor(renderer: THREE.WebGLRenderer, options: OcclusionQueryManagerOptions = {}) {
    const context = renderer.getContext();

    // 检查是否为 WebGL2Context
    if (!('createQuery' in context)) {
      this.isSupported = false;
      this.gl = context as WebGL2RenderingContext; // 为了类型兼容，但实际不会使用
      this.maxConcurrentQueries = 0;
      this.cacheTime = 0;
      this.conservativeTest = true;
      return;
    }

    this.gl = context as WebGL2RenderingContext;
    this.isSupported = true;
    this.maxConcurrentQueries = options.maxConcurrentQueries ?? 100;
    this.cacheTime = options.cacheTime ?? 100;
    this.conservativeTest = options.conservativeTest ?? true;

    // 预创建查询对象池
    this.initializeQueryPool();
  }

  /**
   * 初始化查询对象池
   */
  private initializeQueryPool(): void {
    if (!this.isSupported) return;

    for (let i = 0; i < this.maxConcurrentQueries; i++) {
      const query = this.gl.createQuery();
      if (query) {
        this.queryPool.push(query);
      }
    }
  }

  /**
   * 检查是否支持遮挡查询
   *
   * @returns 是否支持
   */
  supported(): boolean {
    return this.isSupported;
  }

  /**
   * 开始遮挡查询
   *
   * @param nodeId - 节点ID
   * @returns 是否成功开始查询
   *
   * @example
   * ```ts
   * if (occlusionQuery.begin(nodeId)) {
   *   renderBoundingBox(node.boundingBox);
   *   occlusionQuery.end(nodeId);
   * }
   * ```
   */
  begin(nodeId: string): boolean {
    if (!this.isSupported) return false;

    // 检查是否已有活跃查询
    if (this.activeQueries.has(nodeId)) {
      return false;
    }

    // 从池中获取查询对象
    const query = this.queryPool.pop();
    if (!query) {
      return false;
    }

    // 开始查询
    this.gl.beginQuery(this.gl.ANY_SAMPLES_PASSED, query);
    this.activeQueries.set(nodeId, query);

    return true;
  }

  /**
   * 结束遮挡查询
   *
   * @param nodeId - 节点ID
   */
  end(nodeId: string): void {
    if (!this.isSupported) return;

    const query = this.activeQueries.get(nodeId);
    if (!query) {
      return;
    }

    // 结束查询
    this.gl.endQuery(this.gl.ANY_SAMPLES_PASSED);

    // 记录查询结果（状态为 PENDING）
    this.resultCache.set(nodeId, {
      nodeId,
      state: OcclusionQueryState.PENDING,
      isVisible: this.conservativeTest, // 保守策略：假定可见
      visiblePixels: 0,
      timestamp: performance.now(),
    });
  }

  /**
   * 更新查询结果
   *
   * 检查所有待处理的查询，如果结果可用则更新缓存
   * 应在每帧调用一次
   */
  update(): void {
    if (!this.isSupported) return;

    const now = performance.now();

    // 检查所有活跃查询
    for (const [nodeId, query] of this.activeQueries.entries()) {
      const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);

      if (available) {
        // 结果可用，读取结果
        const result = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);

        // 更新缓存
        this.resultCache.set(nodeId, {
          nodeId,
          state: OcclusionQueryState.READY,
          isVisible: result > 0,
          visiblePixels: result,
          timestamp: now,
        });

        // 归还查询对象到池中
        this.queryPool.push(query);
        this.activeQueries.delete(nodeId);
      }
    }

    // 清理过期缓存
    this.cleanupCache(now);
  }

  /**
   * 清理过期的查询结果
   *
   * @param now - 当前时间戳
   */
  private cleanupCache(now: number): void {
    for (const [nodeId, result] of this.resultCache.entries()) {
      if (result.state === OcclusionQueryState.READY) {
        // 检查是否过期
        if (now - result.timestamp > this.cacheTime) {
          this.resultCache.delete(nodeId);
        }
      }
    }
  }

  /**
   * 检查节点是否可见
   *
   * @param nodeId - 节点ID
   * @returns 是否可见（如果查询未完成，返回保守值）
   *
   * @example
   * ```ts
   * const isVisible = occlusionQuery.isVisible(nodeId);
   * if (isVisible) {
   *   renderNode(node);
   * }
   * ```
   */
  isVisible(nodeId: string): boolean {
    if (!this.isSupported) {
      // 不支持时，总是返回 true（保守策略）
      return true;
    }

    const result = this.resultCache.get(nodeId);

    if (!result) {
      // 没有查询结果，返回保守值
      return this.conservativeTest;
    }

    if (result.state === OcclusionQueryState.PENDING) {
      // 查询未完成，返回保守值
      return this.conservativeTest;
    }

    return result.isVisible;
  }

  /**
   * 获取查询结果
   *
   * @param nodeId - 节点ID
   * @returns 查询结果或 undefined
   */
  getResult(nodeId: string): OcclusionQueryResult | undefined {
    return this.resultCache.get(nodeId);
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats(): {
    activeQueries: number;
    availableQueries: number;
    cachedResults: number;
    isSupported: boolean;
  } {
    return {
      activeQueries: this.activeQueries.size,
      availableQueries: this.queryPool.length,
      cachedResults: this.resultCache.size,
      isSupported: this.isSupported,
    };
  }

  /**
   * 清空所有查询和缓存
   */
  clear(): void {
    if (!this.isSupported) return;

    // 归还所有活跃查询到池中
    for (const query of this.activeQueries.values()) {
      this.queryPool.push(query);
    }

    this.activeQueries.clear();
    this.resultCache.clear();
  }

  /**
   * 销毁管理器
   */
  dispose(): void {
    if (!this.isSupported) return;

    // 删除所有查询对象
    for (const query of this.queryPool) {
      this.gl.deleteQuery(query);
    }
    for (const query of this.activeQueries.values()) {
      this.gl.deleteQuery(query);
    }

    this.queryPool.length = 0;
    this.activeQueries.clear();
    this.resultCache.clear();
  }
}
