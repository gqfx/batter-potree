/**
 * 流式加载系统
 *
 * 负责异步加载八叉树节点数据，实现优先级调度、并发控制、错误重试
 *
 * @module systems
 * @example
 * ```ts
 * const streamingSystem = new StreamingSystem({
 *   maxConcurrentLoads: 8,
 *   maxRetries: 3,
 *   workerPool: pool
 * });
 *
 * scheduler.addSystem(streamingSystem);
 *
 * // 请求加载节点
 * streamingSystem.requestLoad(octree, node, priority);
 * ```
 */

import type {
  IPointCloudOctree,
  IPointCloudOctreeNode,
  IWorkerDecodeRequest,
  IWorkerDecodeResponse,
} from '../types/potree.js';
import type { ISystem, SystemStage } from '../types/system.js';
import type { WorkerPool } from '../workers/WorkerPool.js';

/**
 * 流式加载系统配置
 */
export interface StreamingSystemConfig {
  /** 最大并发加载数 */
  readonly maxConcurrentLoads?: number;
  /** 最大重试次数 */
  readonly maxRetries?: number;
  /** Worker 池（可选） */
  readonly workerPool?: WorkerPool;
  /** 每帧最大处理请求数 */
  readonly maxRequestsPerFrame?: number;
  /** 每秒最大下载量 (MB)，0 表示不限制 */
  readonly downloadBudgetMB?: number;
}

/**
 * 加载请求
 */
export interface LoadRequest {
  /** 所属点云 */
  readonly octree: IPointCloudOctree;
  /** 要加载的节点 */
  readonly node: IPointCloudOctreeNode;
  /** 优先级 */
  priority: number;
  /** 重试次数 */
  retries: number;
  /** 请求创建时间 */
  readonly timestamp: number;
  /** 取消控制器 */
  abortController: AbortController;
}

/**
 * 加载完成事件
 */
export interface LoadCompleteEvent {
  readonly octree: IPointCloudOctree;
  readonly node: IPointCloudOctreeNode;
  readonly data: IWorkerDecodeResponse;
  readonly loadTime: number;
}

/**
 * 加载失败事件
 */
export interface LoadFailedEvent {
  readonly octree: IPointCloudOctree;
  readonly node: IPointCloudOctreeNode;
  readonly error: Error;
  readonly retries: number;
}

/**
 * 流式加载系统统计
 */
export interface StreamingStats {
  /** 待处理请求数 */
  readonly pendingRequests: number;
  /** 正在加载数 */
  readonly activeLoads: number;
  /** 已完成加载数 */
  readonly completedLoads: number;
  /** 失败加载数 */
  readonly failedLoads: number;
  /** 总加载字节数 */
  readonly totalBytesLoaded: number;
  /** 平均加载时间（毫秒） */
  readonly avgLoadTime: number;
}

/**
 * 流式加载系统
 *
 * 实现异步数据加载，支持优先级调度、并发控制、错误重试、可取消加载
 */
export class StreamingSystem implements ISystem {
  readonly name = 'bp:streaming';
  readonly stage: SystemStage = 100; // UPDATE stage
  readonly priority = 10; // 在遍历系统之后执行

  private config: Required<Omit<StreamingSystemConfig, 'workerPool'>> & {
    workerPool?: WorkerPool;
  };

  // 请求队列
  private pendingRequests: Map<string, LoadRequest> = new Map();
  private activeLoads: Map<string, LoadRequest> = new Map();

  // 速率限制
  private downloadedBytesThisSecond = 0;
  private lastRateLimitReset = Date.now();

  // 统计信息
  private stats: {
    completedLoads: number;
    failedLoads: number;
    totalBytesLoaded: number;
    loadTimes: number[];
  } = {
    completedLoads: 0,
    failedLoads: 0,
    totalBytesLoaded: 0,
    loadTimes: [],
  };

  // 事件回调
  private onLoadComplete?: (event: LoadCompleteEvent) => void;
  private onLoadFailed?: (event: LoadFailedEvent) => void;

  /**
   * 创建流式加载系统
   *
   * @param config - 系统配置
   */
  constructor(config: StreamingSystemConfig = {}) {
    const baseConfig = {
      maxConcurrentLoads: config.maxConcurrentLoads ?? 8,
      maxRetries: config.maxRetries ?? 3,
      maxRequestsPerFrame: config.maxRequestsPerFrame ?? 10,
      downloadBudgetMB: config.downloadBudgetMB ?? 0, // 0 = 不限制
    };

    if (config.workerPool !== undefined) {
      this.config = { ...baseConfig, workerPool: config.workerPool };
    } else {
      this.config = baseConfig;
    }
  }

  /**
   * 设置加载完成回调
   *
   * @param callback - 回调函数
   */
  setOnLoadComplete(callback: (event: LoadCompleteEvent) => void): void {
    this.onLoadComplete = callback;
  }

  /**
   * 设置加载失败回调
   *
   * @param callback - 回调函数
   */
  setOnLoadFailed(callback: (event: LoadFailedEvent) => void): void {
    this.onLoadFailed = callback;
  }

  /**
   * 设置每秒最大下载量
   *
   * @param budgetMB - 每秒最大下载量 (MB)，0 表示不限制
   */
  setDownloadBudget(budgetMB: number): void {
    this.config = { ...this.config, downloadBudgetMB: budgetMB };
  }

  /**
   * 请求加载节点
   *
   * @param octree - 所属点云
   * @param node - 要加载的节点
   * @param priority - 优先级（越高越优先）
   */
  requestLoad(octree: IPointCloudOctree, node: IPointCloudOctreeNode, priority: number): void {
    const key = this.getNodeKey(octree, node);

    // 如果已经在加载中，更新优先级
    if (this.activeLoads.has(key)) {
      return; // 不重复加载
    }

    // 如果已经在队列中，更新优先级
    const existing = this.pendingRequests.get(key);
    if (existing) {
      existing.priority = Math.max(existing.priority, priority);
      return;
    }

    // 如果节点已加载，跳过
    if (node.loaded) {
      return;
    }

    // 添加到待处理队列
    const request: LoadRequest = {
      octree,
      node,
      priority,
      retries: 0,
      timestamp: Date.now(),
      abortController: new AbortController(),
    };

    this.pendingRequests.set(key, request);
  }

  /**
   * 取消加载节点
   *
   * @param octree - 所属点云
   * @param node - 要取消的节点
   */
  cancelLoad(octree: IPointCloudOctree, node: IPointCloudOctreeNode): void {
    const key = this.getNodeKey(octree, node);

    // 从待处理队列移除
    const pending = this.pendingRequests.get(key);
    if (pending) {
      pending.abortController.abort();
      this.pendingRequests.delete(key);
    }

    // 从活动加载中移除
    const active = this.activeLoads.get(key);
    if (active) {
      active.abortController.abort();
      this.activeLoads.delete(key);
    }
  }

  /**
   * 取消所有加载
   */
  cancelAllLoads(): void {
    // 取消所有待处理请求
    for (const request of this.pendingRequests.values()) {
      request.abortController.abort();
    }
    this.pendingRequests.clear();

    // 取消所有活动加载
    for (const request of this.activeLoads.values()) {
      request.abortController.abort();
    }
    this.activeLoads.clear();
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats(): StreamingStats {
    const avgLoadTime =
      this.stats.loadTimes.length > 0
        ? this.stats.loadTimes.reduce((a, b) => a + b, 0) / this.stats.loadTimes.length
        : 0;

    return {
      pendingRequests: this.pendingRequests.size,
      activeLoads: this.activeLoads.size,
      completedLoads: this.stats.completedLoads,
      failedLoads: this.stats.failedLoads,
      totalBytesLoaded: this.stats.totalBytesLoaded,
      avgLoadTime,
    };
  }

  /**
   * 系统更新
   *
   * @param _deltaTime - 帧间隔时间（秒）
   */
  update(_deltaTime: number): void {
    // 处理待处理请求
    this.processQueue();
  }

  /**
   * 销毁系统
   */
  dispose(): void {
    this.cancelAllLoads();
    this.stats = {
      completedLoads: 0,
      failedLoads: 0,
      totalBytesLoaded: 0,
      loadTimes: [],
    };
  }

  /**
   * 处理请求队列
   */
  private processQueue(): void {
    // 重置速率限制计数器（每秒）
    const now = Date.now();
    if (now - this.lastRateLimitReset >= 1000) {
      this.downloadedBytesThisSecond = 0;
      this.lastRateLimitReset = now;
    }

    // 检查是否超出下载预算
    if (this.config.downloadBudgetMB > 0) {
      const budgetBytes = this.config.downloadBudgetMB * 1024 * 1024;
      if (this.downloadedBytesThisSecond >= budgetBytes) {
        // 超出预算，暂停本秒内的加载
        return;
      }
    }

    // 检查是否有空闲槽位
    const availableSlots = this.config.maxConcurrentLoads - this.activeLoads.size;
    if (availableSlots <= 0 || this.pendingRequests.size === 0) {
      return;
    }

    // 按优先级排序待处理请求
    const sortedRequests = Array.from(this.pendingRequests.entries()).sort(
      ([, a], [, b]) => b.priority - a.priority,
    );

    // 启动加载（限制每帧处理数量）
    const toProcess = Math.min(
      availableSlots,
      sortedRequests.length,
      this.config.maxRequestsPerFrame,
    );

    for (let i = 0; i < toProcess; i++) {
      const entry = sortedRequests[i];
      if (entry) {
        const [key, request] = entry;
        this.pendingRequests.delete(key);
        this.startLoad(key, request);
      }
    }
  }

  /**
   * 开始加载节点
   *
   * @param key - 节点键
   * @param request - 加载请求
   */
  private startLoad(key: string, request: LoadRequest): void {
    // 标记节点为加载中
    (request.node as { loading: boolean }).loading = true;
    this.activeLoads.set(key, request);

    // 构建节点数据 URL
    const nodeUrl = this.buildNodeUrl(request.octree, request.node);

    const startTime = performance.now();

    // 异步加载数据
    this.fetchNodeData(request.octree, request.node, nodeUrl, request.abortController.signal)
      .then((arrayBuffer) => {
        if (request.abortController.signal.aborted) {
          return;
        }

        // 解码数据（如果有 Worker 池）
        if (this.config.workerPool) {
          return this.decodeWithWorker(request, arrayBuffer, startTime);
        } else {
          // 直接处理（简化版）
          return this.processLoadComplete(request, arrayBuffer, startTime);
        }
      })
      .catch((error) => {
        if (request.abortController.signal.aborted) {
          return;
        }
        this.handleLoadError(key, request, error);
      });
  }

  /**
   * 获取节点数据
   *
   * @param octree - 点云八叉树（可能包含自定义加载器）
   * @param node - 节点（包含 byte offset 信息）
   * @param url - 节点数据 URL
   * @param signal - 取消信号
   * @returns ArrayBuffer
   */
  private async fetchNodeData(
    octree: IPointCloudOctree,
    node: IPointCloudOctreeNode,
    url: string,
    signal: AbortSignal,
  ): Promise<ArrayBuffer> {
    // 如果 octree 提供了自定义文件加载器，使用它
    if (octree.customFileLoader) {
      // 检查是否被取消
      if (signal.aborted) {
        throw new Error('Fetch aborted');
      }

      // 移除 URL 的开头部分，只保留相对路径
      const relativePath = url.replace(/^\/?/, '');

      // For Potree 2.0, we need to read a byte range from octree.bin
      if (node.byteOffset !== undefined && node.byteSize !== undefined) {
        console.log('[StreamingSystem] Loading Potree 2.0 node with byte range:', {
          path: relativePath,
          byteOffset: node.byteOffset,
          byteSize: node.byteSize,
        });

        // Load the entire octree.bin and slice the needed portion
        // TODO: Implement more efficient range reading for File System API
        const fullBuffer = await octree.customFileLoader(relativePath);
        return fullBuffer.slice(node.byteOffset, node.byteOffset + node.byteSize);
      }

      return octree.customFileLoader(relativePath);
    }

    // 否则使用标准 fetch
    // For Potree 2.0, use HTTP Range request
    if (node.byteOffset !== undefined && node.byteSize !== undefined) {
      const headers = new Headers();
      headers.set('Range', `bytes=${node.byteOffset}-${node.byteOffset + node.byteSize - 1}`);

      console.log('[StreamingSystem] Fetching Potree 2.0 node with Range header:', {
        url,
        range: `bytes=${node.byteOffset}-${node.byteOffset + node.byteSize - 1}`,
      });

      const response = await fetch(url, { signal, headers });
      if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to fetch node data: ${response.statusText}`);
      }
      return response.arrayBuffer();
    }

    // Potree 1.x: fetch entire file
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`Failed to fetch node data: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  /**
   * 使用 Worker 解码数据
   *
   * @param request - 加载请求
   * @param buffer - 原始数据
   * @param startTime - 开始时间
   */
  private async decodeWithWorker(
    request: LoadRequest,
    buffer: ArrayBuffer,
    startTime: number,
  ): Promise<void> {
    if (!this.config.workerPool) {
      // Fallback to synchronous decode if no worker pool
      return this.processLoadComplete(request, buffer, startTime);
    }

    try {
      // 准备 Worker 解码请求
      const decodeRequest: IWorkerDecodeRequest = {
        buffer,
        pointAttributes: request.octree.pointAttributes,
        version: request.octree.version,
        offset: [0, 0, 0], // Potree 2.0 不需要 offset
        scale: request.octree.scale,
        spacing: request.octree.spacing,
        hasChildren: request.node.children.some((c) => c !== null) ? 1 : 0,
        name: request.node.name,
      };

      // 使用 WorkerPool 执行解码
      const transferables: Transferable[] = [buffer];
      const decodedData = (await this.config.workerPool.execute(
        decodeRequest,
        transferables,
      )) as IWorkerDecodeResponse;

      // 检查是否被取消
      if (request.abortController.signal.aborted) {
        return;
      }

      // 处理解码后的数据
      await this.processDecodedData(request, decodedData, startTime);
    } catch (error) {
      console.error('[StreamingSystem] Worker decode error:', error);
      // Worker 解码失败，回退到同步解码
      return this.processLoadComplete(request, buffer, startTime);
    }
  }

  /**
   * 处理 Worker 解码后的数据
   *
   * @param request - 加载请求
   * @param decodedData - 解码后的数据
   * @param startTime - 开始时间
   */
  private async processDecodedData(
    request: LoadRequest,
    decodedData: IWorkerDecodeResponse,
    startTime: number,
  ): Promise<void> {
    console.log('[StreamingSystem] Worker 解码完成:', {
      节点: request.node.name,
      点数: decodedData.numPoints,
      属性数: Object.keys(decodedData.attributeBuffers).length,
      耗时: `${(performance.now() - startTime).toFixed(2)}ms`,
    });

    // 从活动加载中移除
    const key = this.getNodeKey(request.octree, request.node);
    this.activeLoads.delete(key);

    // 更新统计和速率限制计数器
    const loadTime = performance.now() - startTime;
    const bytesLoaded = decodedData.buffer.byteLength;

    this.stats.completedLoads++;
    this.stats.totalBytesLoaded += bytesLoaded;
    this.stats.loadTimes.push(loadTime);

    // 更新速率限制计数器
    this.downloadedBytesThisSecond += bytesLoaded;

    // 保持统计数组大小合理
    if (this.stats.loadTimes.length > 100) {
      this.stats.loadTimes.shift();
    }

    // 标记节点为已加载
    (request.node as { loaded: boolean; loading: boolean }).loaded = true;
    (request.node as { loading: boolean }).loading = false;

    // 触发完成事件
    if (this.onLoadComplete) {
      this.onLoadComplete({
        octree: request.octree,
        node: request.node,
        data: decodedData,
        loadTime,
      });
    }
  }

  /**
   * 处理加载完成
   *
   * @param request - 加载请求
   * @param buffer - 数据缓冲区
   * @param startTime - 开始时间
   */
  private async processLoadComplete(
    request: LoadRequest,
    buffer: ArrayBuffer,
    startTime: number,
  ): Promise<void> {
    const key = this.getNodeKey(request.octree, request.node);

    console.log('[StreamingSystem] 节点数据加载完成:', {
      节点: request.node.name,
      数据大小: buffer.byteLength,
      耗时: `${(performance.now() - startTime).toFixed(2)}ms`,
    });

    // 从活动加载中移除
    this.activeLoads.delete(key);

    // 更新统计和速率限制计数器
    const loadTime = performance.now() - startTime;
    const bytesLoaded = buffer.byteLength;

    this.stats.completedLoads++;
    this.stats.totalBytesLoaded += bytesLoaded;
    this.stats.loadTimes.push(loadTime);

    // 更新速率限制计数器
    this.downloadedBytesThisSecond += bytesLoaded;

    // 保持统计数组大小合理
    if (this.stats.loadTimes.length > 100) {
      this.stats.loadTimes.shift();
    }

    // 解码二进制数据
    const decodedData = this.decodeNodeData(buffer, request.octree, request.node);

    // 标记节点为已加载
    (request.node as { loaded: boolean; loading: boolean }).loaded = true;
    (request.node as { loading: boolean }).loading = false;

    console.log('[StreamingSystem] 节点数据解码完成:', {
      节点: request.node.name,
      点数: decodedData.numPoints,
      属性数: Object.keys(decodedData.attributeBuffers).length,
    });

    // 触发完成事件
    if (this.onLoadComplete) {
      this.onLoadComplete({
        octree: request.octree,
        node: request.node,
        data: decodedData,
        loadTime,
      });
    }
  }

  /**
   * 解码节点二进制数据
   *
   * @param buffer - 原始二进制数据
   * @param octree - 点云八叉树
   * @param _node - 节点（暂未使用）
   * @returns 解码后的数据
   */
  private decodeNodeData(
    buffer: ArrayBuffer,
    octree: IPointCloudOctree,
    _node: IPointCloudOctreeNode,
  ): IWorkerDecodeResponse {
    const pointAttributes = octree.pointAttributes;
    const numPoints = Math.floor(buffer.byteLength / pointAttributes.byteSize);
    const view = new DataView(buffer);

    const tightBoxMin: [number, number, number] = [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
    ];
    const tightBoxMax: [number, number, number] = [
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    const mean: [number, number, number] = [0, 0, 0];

    const attributeBuffers: IWorkerDecodeResponse['attributeBuffers'] = {};
    let inOffset = 0;

    // Process each attribute
    for (const pointAttribute of pointAttributes.attributes) {
      if (pointAttribute.name === 'POSITION_CARTESIAN') {
        // Decode position data
        // Potree 2.0 uses int32, Potree 1.x uses uint32
        const positions = new Float32Array(numPoints * 3);

        for (let j = 0; j < numPoints; j++) {
          // Read as int32 for Potree 2.0 compatibility
          const x = view.getInt32(inOffset + j * pointAttributes.byteSize + 0, true) * octree.scale;
          const y = view.getInt32(inOffset + j * pointAttributes.byteSize + 4, true) * octree.scale;
          const z = view.getInt32(inOffset + j * pointAttributes.byteSize + 8, true) * octree.scale;

          positions[3 * j + 0] = x;
          positions[3 * j + 1] = y;
          positions[3 * j + 2] = z;

          mean[0] += x / numPoints;
          mean[1] += y / numPoints;
          mean[2] += z / numPoints;

          tightBoxMin[0] = Math.min(tightBoxMin[0], x);
          tightBoxMin[1] = Math.min(tightBoxMin[1], y);
          tightBoxMin[2] = Math.min(tightBoxMin[2], z);

          tightBoxMax[0] = Math.max(tightBoxMax[0], x);
          tightBoxMax[1] = Math.max(tightBoxMax[1], y);
          tightBoxMax[2] = Math.max(tightBoxMax[2], z);
        }

        attributeBuffers[pointAttribute.name] = {
          buffer: positions.buffer,
          attribute: pointAttribute,
        };
      } else if (pointAttribute.name === 'rgba') {
        // Decode RGBA color data (uint8)
        const colors = new Uint8Array(numPoints * 4);

        for (let j = 0; j < numPoints; j++) {
          colors[4 * j + 0] = view.getUint8(inOffset + j * pointAttributes.byteSize + 0);
          colors[4 * j + 1] = view.getUint8(inOffset + j * pointAttributes.byteSize + 1);
          colors[4 * j + 2] = view.getUint8(inOffset + j * pointAttributes.byteSize + 2);
          colors[4 * j + 3] = 255; // Alpha
        }

        attributeBuffers[pointAttribute.name] = {
          buffer: colors.buffer,
          attribute: pointAttribute,
        };
      } else if (pointAttribute.name === 'rgb') {
        // Decode RGB color data (uint16 - Potree 2.0 format)
        // Convert uint16 to uint8 for rendering
        const colors = new Uint8Array(numPoints * 4);

        for (let j = 0; j < numPoints; j++) {
          // Potree 2.0 stores RGB as 3 x uint16
          const r = view.getUint16(inOffset + j * pointAttributes.byteSize + 0, true);
          const g = view.getUint16(inOffset + j * pointAttributes.byteSize + 2, true);
          const b = view.getUint16(inOffset + j * pointAttributes.byteSize + 4, true);

          // Convert from uint16 (0-65535) to uint8 (0-255)
          // Note: Some Potree exports use 0-255 range even in uint16
          colors[4 * j + 0] = r > 255 ? Math.floor(r / 256) : r;
          colors[4 * j + 1] = g > 255 ? Math.floor(g / 256) : g;
          colors[4 * j + 2] = b > 255 ? Math.floor(b / 256) : b;
          colors[4 * j + 3] = 255; // Alpha
        }

        // Store as 'rgba' for compatibility with rendering system
        attributeBuffers['rgba'] = {
          buffer: colors.buffer,
          attribute: pointAttribute,
        };
      }
      // TODO: Add support for other attributes (normals, intensity, etc.)

      inOffset += pointAttribute.byteSize;
    }

    return {
      buffer,
      mean,
      attributeBuffers,
      tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
      numPoints,
    };
  }

  /**
   * 处理加载错误
   *
   * @param key - 节点键
   * @param request - 加载请求
   * @param error - 错误
   */
  private handleLoadError(key: string, request: LoadRequest, error: unknown): void {
    // 从活动加载中移除
    this.activeLoads.delete(key);

    // 重置节点状态
    (request.node as { loading: boolean }).loading = false;

    // 检查是否需要重试
    if (request.retries < this.config.maxRetries) {
      // 重新加入队列
      request.retries++;
      request.abortController = new AbortController(); // 重置控制器
      this.pendingRequests.set(key, request);
    } else {
      // 达到最大重试次数，标记失败
      this.stats.failedLoads++;

      if (this.onLoadFailed) {
        this.onLoadFailed({
          octree: request.octree,
          node: request.node,
          error: error instanceof Error ? error : new Error(String(error)),
          retries: request.retries,
        });
      }
    }
  }

  /**
   * 构建节点数据 URL
   *
   * @param octree - 点云
   * @param node - 节点
   * @returns URL 字符串
   */
  private buildNodeUrl(octree: IPointCloudOctree, node: IPointCloudOctreeNode): string {
    // Potree 2.0 格式：所有数据在 octree.bin 文件中，使用 byte offset
    // Potree 1.x 格式：octree.url + node.name + .bin

    // Check if this is Potree 2.0 (node has byteOffset)
    if (node.byteOffset !== undefined) {
      // Potree 2.0: return path to octree.bin
      // octree.url 对于 Potree 2.0 是空字符串或 '/'
      // 需要从基础 URL 构建 octree.bin 路径
      const url = `${octree.url}octree.bin`;
      console.log('[StreamingSystem] buildNodeUrl (Potree 2.0):', {
        octreeUrl: octree.url,
        nodeName: node.name,
        byteOffset: node.byteOffset,
        byteSize: node.byteSize,
        resultUrl: url
      });
      return url;
    }

    // Potree 1.x format
    const url = `${octree.url}${node.name}.bin`;
    console.log('[StreamingSystem] buildNodeUrl (Potree 1.x):', { octreeUrl: octree.url, nodeName: node.name, resultUrl: url });
    return url;
  }

  /**
   * 获取节点唯一键
   *
   * @param octree - 点云
   * @param node - 节点
   * @returns 唯一键字符串
   */
  private getNodeKey(octree: IPointCloudOctree, node: IPointCloudOctreeNode): string {
    return `${octree.url}:${node.name}`;
  }
}
