# 内存管理优化建议

**任务**: TASK-305
**状态**: 优化建议已记录
**日期**: 2025-11-17

## 内存管理目标

- **CPU 内存**: < 200MB
- **GPU 内存**: < 512MB
- **LRU 效率**: 命中率 > 80%
- **GC 暂停**: < 5ms
- **内存泄漏**: 零泄漏

## 当前实现

基于 `ResourceManager` 的 LRU 缓存系统，已具备：
- LRU 淘汰策略
- 内存限制
- 自动清理

## 优化方案

### 1. 完善 LRU 资源管理

**增强 ResourceManager**:
```typescript
class EnhancedResourceManager<T extends Resource = Resource> {
  private readonly memoryLimit: number;
  private readonly cache: LRUCache<string, T>;
  private totalMemory = 0;

  // 新增：内存压力等级
  private memoryPressure: 'low' | 'medium' | 'high' = 'low';

  // 新增：自适应清理阈值
  private getCleanupThreshold(): number {
    switch (this.memoryPressure) {
      case 'low': return 0.9;
      case 'medium': return 0.7;
      case 'high': return 0.5;
    }
  }

  // 新增：主动内存管理
  private monitorMemoryPressure(): void {
    const usage = this.totalMemory / this.memoryLimit;

    if (usage > 0.9) {
      this.memoryPressure = 'high';
      this.freeMemory(this.memoryLimit * 0.6); // 激进清理
    } else if (usage > 0.7) {
      this.memoryPressure = 'medium';
      this.freeMemory(this.memoryLimit * 0.8);
    } else {
      this.memoryPressure = 'low';
    }
  }

  // 新增：分代管理
  private generations = {
    young: new Set<string>(),  // 最近创建
    old: new Set<string>()     // 长期存在
  };

  promote(id: string): void {
    if (this.generations.young.has(id)) {
      this.generations.young.delete(id);
      this.generations.old.add(id);
    }
  }

  // 优先清理年轻代
  freeMemoryGenerational(): void {
    // 先清理年轻代
    for (const id of this.generations.young) {
      if (this.totalMemory < this.memoryLimit) break;
      this.remove(id);
    }

    // 必要时清理老年代
    if (this.totalMemory > this.memoryLimit) {
      for (const id of this.generations.old) {
        if (this.totalMemory < this.memoryLimit) break;
        this.remove(id);
      }
    }
  }
}
```

### 2. 自动内存回收

**实现后台 GC**:
```typescript
class MemoryGarbageCollector {
  private gcInterval = 5000; // 5 秒
  private lastGC = 0;

  constructor(private resourceManager: ResourceManager) {
    this.startGC();
  }

  private startGC(): void {
    setInterval(() => this.collect(), this.gcInterval);
  }

  private collect(): void {
    const now = performance.now();
    const timeSinceLastGC = now - this.lastGC;

    // 统计信息
    const stats = this.resourceManager.getStats();

    console.log('[MemoryGC] Stats:', {
      totalResources: stats.totalResources,
      totalMemory: `${(stats.totalMemory / 1024 / 1024).toFixed(2)}MB`,
      hitRate: `${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(1)}%`,
      timeSinceLastGC: `${timeSinceLastGC.toFixed(0)}ms`
    });

    // 检测内存压力
    if (stats.totalMemory > stats.memoryLimit * 0.8) {
      console.warn('[MemoryGC] High memory usage, triggering cleanup');
      this.resourceManager.freeMemory();
    }

    this.lastGC = now;
  }

  // 手动触发全面清理
  forceGC(): void {
    console.log('[MemoryGC] Forcing full GC');

    // 清理未使用的资源
    this.resourceManager.freeMemory(
      this.resourceManager.getStats().memoryLimit * 0.5
    );

    // 提示浏览器 GC (非标准 API)
    if (typeof gc === 'function') {
      gc();
    }
  }
}
```

### 3. 内存泄漏检测

**实现泄漏检测器**:
```typescript
class MemoryLeakDetector {
  private snapshots: Array<{
    timestamp: number;
    memory: number;
    resourceCount: number;
  }> = [];

  takeSnapshot(resourceManager: ResourceManager): void {
    const stats = resourceManager.getStats();

    this.snapshots.push({
      timestamp: Date.now(),
      memory: stats.totalMemory,
      resourceCount: stats.totalResources
    });

    // 保持最近 10 个快照
    if (this.snapshots.length > 10) {
      this.snapshots.shift();
    }
  }

  detectLeak(): boolean {
    if (this.snapshots.length < 3) return false;

    // 检查内存是否持续增长
    const recent = this.snapshots.slice(-3);
    const isGrowing = recent.every((snap, i) => {
      if (i === 0) return true;
      return snap.memory > recent[i - 1].memory;
    });

    if (isGrowing) {
      const growth = recent[2].memory - recent[0].memory;
      const growthRate = growth / (recent[2].timestamp - recent[0].timestamp);

      console.warn('[LeakDetector] Potential memory leak detected:', {
        growth: `${(growth / 1024 / 1024).toFixed(2)}MB`,
        rate: `${(growthRate * 1000).toFixed(2)}KB/s`
      });

      return true;
    }

    return false;
  }

  // 生成内存报告
  generateReport(): string {
    if (this.snapshots.length === 0) {
      return 'No snapshots available';
    }

    const lines = ['Memory Usage Report', '=================='];

    for (const snap of this.snapshots) {
      const date = new Date(snap.timestamp).toISOString();
      const mem = (snap.memory / 1024 / 1024).toFixed(2);
      lines.push(`${date} - ${mem}MB (${snap.resourceCount} resources)`);
    }

    return lines.join('\n');
  }
}
```

### 4. GPU 内存管理

**WebGL 资源追踪**:
```typescript
class GPUMemoryManager {
  private textures = new Map<WebGLTexture, {
    size: number;
    lastUsed: number;
  }>();

  private buffers = new Map<WebGLBuffer, {
    size: number;
    lastUsed: number;
  }>();

  private totalGPUMemory = 0;
  private readonly maxGPUMemory = 512 * 1024 * 1024; // 512MB

  trackTexture(texture: WebGLTexture, width: number, height: number, format: number): void {
    const bytesPerPixel = this.getBytesPerPixel(format);
    const size = width * height * bytesPerPixel;

    this.textures.set(texture, {
      size,
      lastUsed: performance.now()
    });

    this.totalGPUMemory += size;
    this.checkGPUMemory();
  }

  trackBuffer(buffer: WebGLBuffer, size: number): void {
    this.buffers.set(buffer, {
      size,
      lastUsed: performance.now()
    });

    this.totalGPUMemory += size;
    this.checkGPUMemory();
  }

  private checkGPUMemory(): void {
    if (this.totalGPUMemory > this.maxGPUMemory * 0.9) {
      console.warn('[GPUMemory] High GPU memory usage, freeing resources');
      this.freeOldestResources();
    }
  }

  private freeOldestResources(): void {
    // 按最后使用时间排序
    const sorted = [...this.textures.entries()].sort(
      (a, b) => a[1].lastUsed - b[1].lastUsed
    );

    // 释放最旧的 20%
    const toFree = Math.ceil(sorted.length * 0.2);
    for (let i = 0; i < toFree; i++) {
      const [texture, info] = sorted[i];
      gl.deleteTexture(texture);
      this.textures.delete(texture);
      this.totalGPUMemory -= info.size;
    }
  }

  getStats(): {
    totalGPU: number;
    textures: number;
    buffers: number;
  } {
    return {
      totalGPU: this.totalGPUMemory,
      textures: this.textures.size,
      buffers: this.buffers.size
    };
  }
}
```

### 5. 对象池优化

**增强现有 ObjectPool**:
```typescript
class EnhancedObjectPool<T> {
  // 新增：自动收缩
  private autoShrink = true;
  private shrinkInterval = 30000; // 30 秒

  constructor() {
    if (this.autoShrink) {
      setInterval(() => this.maybeShrink(), this.shrinkInterval);
    }
  }

  private maybeShrink(): void {
    const stats = this.getStats();

    // 如果命中率低，减小池大小
    if (stats.hitRate < 0.5 && this.pool.length > 10) {
      const toRemove = Math.floor(this.pool.length * 0.3);
      for (let i = 0; i < toRemove; i++) {
        this.pool.pop();
      }
      console.log(`[ObjectPool] Shrunk pool by ${toRemove} objects`);
    }
  }

  // 新增：预热优化
  warmup(count: number): void {
    console.log(`[ObjectPool] Warming up ${count} objects`);

    // 使用 requestIdleCallback 在空闲时预热
    requestIdleCallback(() => {
      for (let i = 0; i < count; i++) {
        const obj = this.factory();
        this.pool.push(obj);
      }
    });
  }
}
```

## 内存监控仪表板

```typescript
class MemoryDashboard {
  private updateInterval = 1000;

  start(): void {
    setInterval(() => this.update(), this.updateInterval);
  }

  private update(): void {
    const cpuMem = this.getCPUMemory();
    const gpuMem = this.getGPUMemory();

    console.table({
      'CPU Memory': `${(cpuMem / 1024 / 1024).toFixed(2)}MB`,
      'GPU Memory': `${(gpuMem / 1024 / 1024).toFixed(2)}MB`,
      'Total': `${((cpuMem + gpuMem) / 1024 / 1024).toFixed(2)}MB`
    });
  }

  private getCPUMemory(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getGPUMemory(): number {
    // 从 GPUMemoryManager 获取
    return gpuMemoryManager.getStats().totalGPU;
  }
}
```

## 性能验证清单

- [ ] CPU 内存 < 200MB
- [ ] GPU 内存 < 512MB
- [ ] LRU 命中率 > 80%
- [ ] GC 暂停 < 5ms
- [ ] 无内存泄漏（24 小时测试）

## 实施步骤

1. 增强 ResourceManager 的分代管理
2. 实现 MemoryGarbageCollector
3. 添加 MemoryLeakDetector
4. 实现 GPUMemoryManager
5. 优化 ObjectPool 自动收缩
6. 创建内存监控仪表板
7. 运行长时间测试验证

## 内存优化技巧

### 1. 避免闭包陷阱

```typescript
// 不好：闭包捕获大对象
class Bad {
  setup(largeData: BigData) {
    this.callback = () => {
      console.log(largeData); // 捕获整个 largeData
    };
  }
}

// 好：只捕获需要的部分
class Good {
  setup(largeData: BigData) {
    const id = largeData.id;
    this.callback = () => {
      console.log(id); // 只捕获 id
    };
  }
}
```

### 2. 及时清理事件监听器

```typescript
class Component {
  dispose(): void {
    // 移除所有事件监听器
    this.eventEmitter.off('update', this.onUpdate);
    this.eventEmitter.off('render', this.onRender);

    // 清空引用
    this.eventEmitter = null;
    this.data = null;
  }
}
```

### 3. 使用 WeakMap 避免泄漏

```typescript
// 自动清理的缓存
class Cache {
  private cache = new WeakMap<object, CachedData>();

  set(key: object, data: CachedData): void {
    this.cache.set(key, data);
    // 当 key 被 GC 时，缓存自动清除
  }
}
```

## 参考资源

- Chrome DevTools Memory Profiler
- Performance.memory API
- WeakMap/WeakSet for automatic cleanup
- RequestIdleCallback for background tasks
