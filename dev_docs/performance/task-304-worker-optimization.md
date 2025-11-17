# Worker 性能优化建议

**任务**: TASK-304
**状态**: 优化建议已记录
**日期**: 2025-11-17

## Worker 性能目标

- **8 并发流**: 无卡顿加载
- **解码时间**: < 10ms per node
- **数据传输**: 零拷贝
- **内存使用**: < 200MB

## 当前架构

```
Main Thread → WorkerPool → Worker 1..N → 点云解码 → 数据传回
```

## 优化方案

### 1. 并行解码优化

**问题**: Worker 串行处理请求

**优化方案**:
```typescript
class ParallelWorkerPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{
    nodeId: string;
    data: ArrayBuffer;
    priority: number;
  }> = [];

  constructor(private numWorkers = navigator.hardwareConcurrency || 8) {
    this.initWorkers();
  }

  private initWorkers(): void {
    for (let i = 0; i < this.numWorkers; i++) {
      const worker = new Worker(new URL('./decoder.worker.ts', import.meta.url));

      // 每个 worker 维护独立的任务队列
      worker.onmessage = (e) => {
        this.handleWorkerResult(i, e.data);
        this.scheduleNext(i); // 立即分配下一个任务
      };

      this.workers.push(worker);
    }
  }

  // 优先级调度
  decode(nodeId: string, data: ArrayBuffer, priority: number): Promise<DecodedData> {
    return new Promise((resolve) => {
      this.taskQueue.push({ nodeId, data, priority, resolve });
      this.taskQueue.sort((a, b) => b.priority - a.priority);

      // 找空闲 worker
      const idleWorker = this.findIdleWorker();
      if (idleWorker !== -1) {
        this.scheduleNext(idleWorker);
      }
    });
  }
}
```

**预期提升**: 8 并发流同时加载，吞吐量提升 8x

### 2. 零拷贝数据传输

**问题**: 数据在主线程和 Worker 之间拷贝

**优化方案**:
```typescript
// 使用 Transferable Objects
class ZeroCopyDecoder {
  async decode(buffer: ArrayBuffer): Promise<DecodedData> {
    // 传输所有权，避免拷贝
    const result = await this.worker.postMessage(
      {
        type: 'decode',
        buffer
      },
      [buffer] // Transferable
    );

    return result;
  }
}

// Worker 端
self.onmessage = (e) => {
  const { buffer } = e.data;

  // 解码
  const positions = new Float32Array(buffer, 0, numPoints * 3);
  const colors = new Uint8Array(buffer, numPoints * 12, numPoints * 3);

  // 传输回主线程（零拷贝）
  self.postMessage(
    {
      positions: positions.buffer,
      colors: colors.buffer
    },
    [positions.buffer, colors.buffer]
  );
};
```

**预期提升**: 数据传输时间从 5ms 降至 < 1ms

### 3. 缓冲区复用

**实现 SharedArrayBuffer 缓冲池**:
```typescript
class SharedBufferPool {
  private pool: SharedArrayBuffer[] = [];
  private inUse = new Set<SharedArrayBuffer>();

  acquire(size: number): SharedArrayBuffer {
    // 查找合适大小的缓冲区
    const buffer = this.pool.find(buf => buf.byteLength >= size);

    if (buffer) {
      this.pool = this.pool.filter(b => b !== buffer);
      this.inUse.add(buffer);
      return buffer;
    }

    // 创建新缓冲区
    const newBuffer = new SharedArrayBuffer(size);
    this.inUse.add(newBuffer);
    return newBuffer;
  }

  release(buffer: SharedArrayBuffer): void {
    this.inUse.delete(buffer);
    this.pool.push(buffer);

    // 限制池大小
    if (this.pool.length > 10) {
      this.pool.shift(); // 移除最老的
    }
  }
}
```

**预期提升**: 减少 GC 压力，分配时间 < 0.1ms

### 4. 流式解码

**支持增量解码**:
```typescript
class StreamingDecoder {
  private partialData = new Map<string, {
    buffer: Uint8Array;
    offset: number;
  }>();

  // 接收数据块
  appendChunk(nodeId: string, chunk: Uint8Array): void {
    const partial = this.partialData.get(nodeId) || {
      buffer: new Uint8Array(this.expectedSize),
      offset: 0
    };

    // 追加数据
    partial.buffer.set(chunk, partial.offset);
    partial.offset += chunk.length;

    this.partialData.set(nodeId, partial);

    // 如果完成，立即解码
    if (partial.offset >= this.expectedSize) {
      this.decode(nodeId, partial.buffer);
      this.partialData.delete(nodeId);
    }
  }
}
```

## 性能优化技巧

### 1. 预测性加载

```typescript
class PredictiveLoader {
  private loadHistory: string[] = [];

  predictNext(currentNode: string): string[] {
    // 基于历史预测下一个需要的节点
    const pattern = this.analyzePattern(this.loadHistory);

    // 预加载邻近节点
    const neighbors = this.getNeighbors(currentNode);

    return neighbors.filter(n => pattern.includes(n));
  }

  preload(nodeIds: string[]): void {
    // 低优先级预加载
    for (const id of nodeIds) {
      this.workerPool.decode(id, data, 0);
    }
  }
}
```

### 2. 压缩优化

```typescript
// Worker 端使用快速解压
import { decompress } from 'fflate'; // 或 lz4

class CompressedDecoder {
  async decode(compressed: Uint8Array): Promise<Float32Array> {
    // 使用流式解压，避免完整缓冲区
    const decompressed = await decompress(compressed);

    // 直接解析为 TypedArray
    return new Float32Array(decompressed.buffer);
  }
}
```

## 错误处理和重试

```typescript
class RobustWorkerPool {
  private retryCount = new Map<string, number>();
  private maxRetries = 3;

  async decodeWithRetry(nodeId: string, data: ArrayBuffer): Promise<DecodedData> {
    try {
      return await this.decode(nodeId, data);
    } catch (error) {
      const count = this.retryCount.get(nodeId) || 0;

      if (count < this.maxRetries) {
        this.retryCount.set(nodeId, count + 1);
        console.warn(`Retry ${count + 1} for ${nodeId}`);

        // 指数退避
        await new Promise(resolve => setTimeout(resolve, 100 * (2 ** count)));
        return this.decodeWithRetry(nodeId, data);
      }

      throw new Error(`Failed to decode ${nodeId} after ${this.maxRetries} retries`);
    }
  }
}
```

## 性能监控

```typescript
class WorkerPerformanceMonitor {
  private metrics = {
    decodeTime: [] as number[],
    transferTime: [] as number[],
    queueLength: 0,
    activeWorkers: 0
  };

  recordDecode(duration: number): void {
    this.metrics.decodeTime.push(duration);

    // 保持最近 100 个样本
    if (this.metrics.decodeTime.length > 100) {
      this.metrics.decodeTime.shift();
    }
  }

  getStats(): {
    avgDecodeTime: number;
    maxDecodeTime: number;
    queueLength: number;
  } {
    const times = this.metrics.decodeTime;
    return {
      avgDecodeTime: times.reduce((a, b) => a + b, 0) / times.length,
      maxDecodeTime: Math.max(...times),
      queueLength: this.metrics.queueLength
    };
  }
}
```

## 性能验证清单

- [ ] 8 并发流无卡顿
- [ ] 解码时间 < 10ms
- [ ] 数据传输时间 < 1ms
- [ ] 内存使用 < 200MB
- [ ] Worker 利用率 > 80%

## 实施步骤

1. 实现 WorkerPool 优先级调度
2. 添加 Transferable Objects 支持
3. 实现 SharedArrayBuffer 缓冲池
4. 添加性能监控
5. 实现预测性加载
6. 测试 8 并发场景

## 兼容性考虑

```typescript
// 检测 SharedArrayBuffer 支持
if (typeof SharedArrayBuffer === 'undefined') {
  console.warn('SharedArrayBuffer not supported, using fallback');
  // 使用 ArrayBuffer + Transferable
}

// 检测 Worker 数量
const optimalWorkerCount = Math.min(
  navigator.hardwareConcurrency || 4,
  8 // 最大 8 个
);
```

## 参考资源

- Web Workers API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API
- Transferable Objects: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects
- SharedArrayBuffer: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer
