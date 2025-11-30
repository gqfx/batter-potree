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

import * as THREE from 'three';
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
  /** Worker 池（用于 DEFAULT 编码，可选） */
  readonly workerPool?: WorkerPool;
  /**
   * Brotli Worker 池（用于 BROTLI 编码，可选）
   *
   * Potree 2.0 使用 Brotli 压缩点云数据，需要使用专门的 Brotli 解码 Worker
   */
  readonly brotliWorkerPool?: WorkerPool;
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

  private config: Required<Omit<StreamingSystemConfig, 'workerPool' | 'brotliWorkerPool'>> & {
    workerPool?: WorkerPool;
    brotliWorkerPool?: WorkerPool;
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

    // Build config with optional worker pools
    this.config = { ...baseConfig };

    if (config.workerPool !== undefined) {
      this.config.workerPool = config.workerPool;
    }

    if (config.brotliWorkerPool !== undefined) {
      this.config.brotliWorkerPool = config.brotliWorkerPool;
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
    // 移除每帧日志输出以避免日志爆炸
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
        console.log('[StreamingSystem] processQueue: download budget exceeded');
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
  // 跟踪已警告过的 proxy 节点，避免重复警告
  private warnedProxyNodes = new Set<string>();

  private async startLoad(key: string, request: LoadRequest): Promise<void> {

    // ✅ 检测 proxy 节点 (type = 2)
    // Proxy 节点需要先加载 hierarchy chunk
    if (request.node.nodeType === 2) {
      // 只警告一次
      if (!this.warnedProxyNodes.has(request.node.name)) {
        console.warn(`[StreamingSystem] Loading hierarchy for proxy node ${request.node.name}`);
        this.warnedProxyNodes.add(request.node.name);
      }
      // 加载 hierarchy chunk
      await this.loadHierarchyChunk(key, request);
      return;
    }

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

        // 解码数据（根据 encoding 选择合适的 Worker 池）
        const encoding = request.octree.encoding || 'DEFAULT';
        const hasWorkerPool = encoding === 'BROTLI'
          ? !!this.config.brotliWorkerPool
          : !!this.config.workerPool;

        if (hasWorkerPool) {
          return this.decodeWithWorker(request, arrayBuffer, startTime);
        } else {
          // 直接处理（简化版，仅支持 DEFAULT 编码）
          if (encoding === 'BROTLI') {
            throw new Error('Brotli Worker Pool not configured, cannot decode BROTLI data');
          }
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

        // Load the entire octree.bin and slice the needed portion
        // TODO: Implement more efficient range reading for File System API
        const fullBuffer = await octree.customFileLoader(relativePath);
        return fullBuffer.slice(node.byteOffset, node.byteOffset + node.byteSize);
      }

      return octree.customFileLoader(relativePath);
    }

    // 否则使用标准 fetch
    // For Potree 2.0, use HTTP Range request
    // Potree 2.0: use Range request
    if (node.byteOffset !== undefined && node.byteSize !== undefined) {
      const headers = new Headers();
      headers.set('Range', `bytes=${node.byteOffset}-${node.byteOffset + node.byteSize - 1}`);

      const response = await fetch(url, { signal, headers });
      if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to fetch node data: ${response.statusText}`);
      }
      return response.arrayBuffer();
    }

    throw new Error(`Node ${node.name} has no byteOffset/byteSize - Potree 2.0 format required`);
  }

  /**
   * 使用 Worker 解码数据
   *
   * 根据点云的 encoding 类型选择正确的 Worker Pool:
   * - 'BROTLI': 使用 brotliWorkerPool (Potree 2.0 压缩格式)
   * - 'DEFAULT': 使用 workerPool (未压缩格式)
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
    // 调试日志：记录发送给 Worker 的 buffer 大小
    console.log(`[StreamingSystem] decodeWithWorker: node=${request.node.name}, buffer.byteLength=${buffer.byteLength}, node.byteSize=${request.node.byteSize}, node.numPoints=${request.node.numPoints}`);

    // 根据 encoding 选择正确的 Worker Pool
    const encoding = request.octree.encoding || 'DEFAULT';
    const workerPool = encoding === 'BROTLI'
      ? this.config.brotliWorkerPool
      : this.config.workerPool;

    if (!workerPool) {
      // 没有对应的 Worker Pool，回退到同步解码（仅支持 DEFAULT）
      if (encoding === 'BROTLI') {
        console.warn('[StreamingSystem] Brotli Worker Pool not configured, cannot decode BROTLI data');
        const key = this.getNodeKey(request.octree, request.node);
        this.handleLoadError(key, request, new Error('Brotli Worker Pool not configured'));
        return;
      }
      return this.processLoadComplete(request, buffer, startTime);
    }

    try {
      // 准备 Worker 解码请求
      // ✅ 修复: Potree 2.0 的点坐标是相对于 boundingBox.min 的偏移量
      // 需要传递 boundingBox.min 作为 offset，使解码后的点坐标成为绝对坐标
      const boundingBoxMin = request.octree.boundingBox.min;
      const decodeRequest: IWorkerDecodeRequest = {
        buffer,
        pointAttributes: request.octree.pointAttributes,
        version: request.octree.version,
        offset: [boundingBoxMin.x, boundingBoxMin.y, boundingBoxMin.z],
        scale: request.octree.scale,
        spacing: request.octree.spacing,
        hasChildren: request.node.children.some((c) => c !== null) ? 1 : 0,
        name: request.node.name,
        numPoints: request.node.numPoints, // ✅ Potree 2.0: 传递元数据中的 numPoints
      };

      // 使用 WorkerPool 执行解码
      // 注意：buffer 会被转移到 Worker，之后不能再使用
      const transferables: Transferable[] = [buffer];
      const decodedData = (await workerPool.execute(
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
      // Worker 解码失败，直接抛出错误
      // 不能回退到同步解码，因为 buffer 已经被转移到 Worker
      const key = this.getNodeKey(request.octree, request.node);
      this.handleLoadError(key, request, error as Error);
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
   * 加载 proxy 节点的 hierarchy chunk
   *
   * @param key - 节点键
   * @param request - 加载请求
   */
  private async loadHierarchyChunk(key: string, request: LoadRequest): Promise<void> {
    const node = request.node;
    const octree = request.octree;

    // 标记为加载中
    (node as { loading: boolean }).loading = true;
    this.activeLoads.set(key, request);

    try {
      // 构建 hierarchy.bin URL
      const baseUrl = octree.url.replace(/\/metadata\.json$/, '');
      const hierarchyUrl = `${baseUrl}/hierarchy.bin`;

      // 使用 HTTP Range 请求加载 hierarchy chunk
      if (node.hierarchyByteOffset === undefined || node.hierarchyByteSize === undefined) {
        throw new Error(`Proxy node ${node.name} missing hierarchyByteOffset/Size`);
      }

      const start = Number(node.hierarchyByteOffset);
      const end = start + Number(node.hierarchyByteSize) - 1;

      const response = await fetch(hierarchyUrl, {
        signal: request.abortController.signal,
        headers: {
          'Range': `bytes=${start}-${end}`
        }
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to load hierarchy chunk: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();

      // 解析 hierarchy chunk
      await this.parseHierarchyChunk(node, octree, buffer);

      // 从活动加载中移除
      this.activeLoads.delete(key);
      this.pendingRequests.delete(key);

      // 标记节点为已加载（hierarchy 已加载，但点云数据还未加载）
      (node as { loaded: boolean; loading: boolean }).loaded = true;
      (node as { loading: boolean }).loading = false;

      console.log(`[StreamingSystem] Loaded hierarchy for proxy node ${node.name}, children created`);
    } catch (error) {
      this.handleLoadError(key, request, error);
    }
  }

  /**
   * 解析 hierarchy chunk 并创建子节点
   *
   * @param proxyNode - Proxy 节点
   * @param octree - 点云八叉树
   * @param buffer - Hierarchy 数据
   */
  private async parseHierarchyChunk(
    proxyNode: IPointCloudOctreeNode,
    octree: IPointCloudOctree,
    buffer: ArrayBuffer
  ): Promise<void> {
    const view = new DataView(buffer);
    const bytesPerNode = 22;
    const numNodes = buffer.byteLength / bytesPerNode;

    // 第一个节点是 proxy 节点自己，更新它的信息
    const type = view.getUint8(0);
    const childMask = view.getUint8(1);
    const numPoints = view.getUint32(2, true);
    const byteOffsetLow = view.getUint32(6, true);
    const byteOffsetHigh = view.getUint32(10, true);
    const byteOffset = byteOffsetLow + byteOffsetHigh * 0x100000000;
    const byteSizeLow = view.getUint32(14, true);
    const byteSizeHigh = view.getUint32(18, true);
    const byteSize = byteSizeLow + byteSizeHigh * 0x100000000;

    // 将 proxy 节点转换为普通节点
    (proxyNode as any).nodeType = type;
    (proxyNode as any).numPoints = numPoints;
    if (type !== 2) {
      // 如果不再是 proxy，设置 octree.bin 的偏移
      (proxyNode as any).byteOffset = byteOffset;
      (proxyNode as any).byteSize = byteSize;
      // 清除 hierarchy 偏移
      delete (proxyNode as any).hierarchyByteOffset;
      delete (proxyNode as any).hierarchyByteSize;
    }

    // 处理第一个节点的子节点
    if (type !== 2) {
      this.createChildrenFromMask(proxyNode, octree, childMask, view, 0);
    }

    // 处理剩余的节点（子节点的子节点等）
    const nodeStack: IPointCloudOctreeNode[] = [];
    for (let i = 0; i < 8; i++) {
      if (proxyNode.children[i]) {
        nodeStack.push(proxyNode.children[i]!);
      }
    }

    let nodeIndex = 1;
    while (nodeStack.length > 0 && nodeIndex < numNodes) {
      const currentNode = nodeStack.shift()!;

      const offset = nodeIndex * bytesPerNode;
      const childType = view.getUint8(offset);
      const childChildMask = view.getUint8(offset + 1);
      const childNumPoints = view.getUint32(offset + 2, true);
      const childByteOffsetLow = view.getUint32(offset + 6, true);
      const childByteOffsetHigh = view.getUint32(offset + 10, true);
      const childByteOffset = childByteOffsetLow + childByteOffsetHigh * 0x100000000;
      const childByteSizeLow = view.getUint32(offset + 14, true);
      const childByteSizeHigh = view.getUint32(offset + 18, true);
      const childByteSize = childByteSizeLow + childByteSizeHigh * 0x100000000;

      // 更新子节点信息
      (currentNode as any).nodeType = childType;
      (currentNode as any).numPoints = childNumPoints;

      if (childType === 2) {
        // 子节点是 proxy
        (currentNode as any).hierarchyByteOffset = childByteOffset;
        (currentNode as any).hierarchyByteSize = childByteSize;
      } else {
        // 子节点是普通节点
        (currentNode as any).byteOffset = childByteOffset;
        (currentNode as any).byteSize = childByteSize;
      }

      // 创建子节点的子节点
      if (childType !== 2) {
        this.createChildrenFromMask(currentNode, octree, childChildMask, view, nodeIndex);
        // 将新创建的子节点加入栈
        for (let i = 0; i < 8; i++) {
          if (currentNode.children[i]) {
            nodeStack.push(currentNode.children[i]!);
          }
        }
      }

      nodeIndex++;
    }
  }

  /**
   * 根据 childMask 创建子节点
   */
  private createChildrenFromMask(
    parent: IPointCloudOctreeNode,
    _octree: IPointCloudOctree,
    childMask: number,
    _view: DataView,
    _nodeIndex: number
  ): void {
    const min = parent.boundingBox.min.clone();
    const max = parent.boundingBox.max.clone();
    const center = parent.boundingBox.getCenter(new THREE.Vector3());

    for (let childIndex = 0; childIndex < 8; childIndex++) {
      const childExists = ((1 << childIndex) & childMask) !== 0;
      if (!childExists) {
        continue;
      }

      // 计算子节点的 bounding box
      const childMin = min.clone();
      const childMax = max.clone();

      if ((childIndex & 1) === 0) {
        childMax.x = center.x;
      } else {
        childMin.x = center.x;
      }
      if ((childIndex & 2) === 0) {
        childMax.y = center.y;
      } else {
        childMin.y = center.y;
      }
      if ((childIndex & 4) === 0) {
        childMax.z = center.z;
      } else {
        childMin.z = center.z;
      }

      const childNode: IPointCloudOctreeNode = {
        name: parent.name + childIndex,
        level: parent.level + 1,
        boundingBox: new THREE.Box3(childMin, childMax),
        numPoints: 0, // 将在 parseHierarchyChunk 中设置
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };

      parent.children[childIndex] = childNode;
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
        // Decode position data (Potree 2.0 uses int32)
        const positions = new Float32Array(numPoints * 3);
        // ✅ 修复: 加上 boundingBox.min 得到绝对坐标
        const offsetX = octree.boundingBox.min.x;
        const offsetY = octree.boundingBox.min.y;
        const offsetZ = octree.boundingBox.min.z;

        for (let j = 0; j < numPoints; j++) {
          // Read as int32 for Potree 2.0 compatibility
          const pointOffset = j * pointAttributes.byteSize + inOffset;
          const x = view.getInt32(pointOffset + 0, true) * octree.scale + offsetX;
          const y = view.getInt32(pointOffset + 4, true) * octree.scale + offsetY;
          const z = view.getInt32(pointOffset + 8, true) * octree.scale + offsetZ;

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
          const pointOffset = j * pointAttributes.byteSize + inOffset;
          colors[4 * j + 0] = view.getUint8(pointOffset + 0);
          colors[4 * j + 1] = view.getUint8(pointOffset + 1);
          colors[4 * j + 2] = view.getUint8(pointOffset + 2);
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
          const pointOffset = j * pointAttributes.byteSize + inOffset;
          const r = view.getUint16(pointOffset + 0, true);
          const g = view.getUint16(pointOffset + 2, true);
          const b = view.getUint16(pointOffset + 4, true);

          // Convert from uint16 (0-65535) to uint8 (0-255)
          // Note: Some Potree exports use 0-255 range even in uint16
          colors[4 * j + 0] = r > 255 ? Math.floor(r / 256) : r;
          colors[4 * j + 1] = g > 255 ? Math.floor(g / 256) : g;
          colors[4 * j + 2] = b > 255 ? Math.floor(b / 256) : b;
          colors[4 * j + 3] = 255; // Alpha
        }

        // Store as 'rgba' for compatibility with rendering system
        attributeBuffers.rgba = {
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
    if (node.byteOffset === undefined) {
      throw new Error(`Node ${node.name} has no byteOffset - Potree 2.0 format required`);
    }
    const url = `${octree.url}octree.bin`;
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
