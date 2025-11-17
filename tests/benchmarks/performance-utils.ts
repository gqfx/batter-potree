/**
 * 性能测试工具类
 *
 * @module benchmarks
 */

/**
 * 性能测试结果
 */
export interface BenchmarkResult {
  /** 测试名称 */
  readonly name: string;
  /** 平均执行时间（毫秒） */
  readonly avgTime: number;
  /** 最小执行时间（毫秒） */
  readonly minTime: number;
  /** 最大执行时间（毫秒） */
  readonly maxTime: number;
  /** 标准差 */
  readonly stdDev: number;
  /** 每秒操作数 */
  readonly opsPerSecond: number;
  /** 执行次数 */
  readonly iterations: number;
  /** 内存使用（字节） */
  readonly memoryUsed?: number;
}

/**
 * 性能测试配置
 */
export interface BenchmarkConfig {
  /** 测试名称 */
  readonly name: string;
  /** 预热次数 */
  readonly warmupIterations?: number;
  /** 测试次数 */
  readonly iterations?: number;
  /** 是否测量内存 */
  readonly measureMemory?: boolean;
}

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime = 0;
  private endTime = 0;

  /**
   * 开始计时
   */
  start(): void {
    this.startTime = performance.now();
  }

  /**
   * 结束计时
   *
   * @returns 耗时（毫秒）
   */
  end(): number {
    this.endTime = performance.now();
    return this.endTime - this.startTime;
  }

  /**
   * 获取已用时间（不结束计时）
   *
   * @returns 耗时（毫秒）
   */
  elapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * 性能基准测试器
 *
 * @example
 * ```ts
 * const bench = new BenchmarkRunner();
 * const result = await bench.run({
 *   name: 'Array push',
 *   iterations: 1000
 * }, () => {
 *   const arr = [];
 *   for (let i = 0; i < 1000; i++) arr.push(i);
 * });
 * console.log(`Average time: ${result.avgTime}ms`);
 * ```
 */
export class BenchmarkRunner {
  /**
   * 运行性能测试
   *
   * @param config - 测试配置
   * @param fn - 测试函数
   * @returns 测试结果
   */
  async run(
    config: BenchmarkConfig,
    fn: () => void | Promise<void>,
  ): Promise<BenchmarkResult> {
    const warmupIterations = config.warmupIterations ?? 10;
    const iterations = config.iterations ?? 100;

    // 预热
    for (let i = 0; i < warmupIterations; i++) {
      await fn();
    }

    // 正式测试
    const times: number[] = [];
    const timer = new PerformanceTimer();
    let memoryBefore = 0;
    let memoryAfter = 0;

    if (config.measureMemory && (performance as any).memory) {
      memoryBefore = (performance as any).memory.usedJSHeapSize;
    }

    for (let i = 0; i < iterations; i++) {
      timer.start();
      await fn();
      times.push(timer.end());
    }

    if (config.measureMemory && (performance as any).memory) {
      memoryAfter = (performance as any).memory.usedJSHeapSize;
    }

    // 计算统计数据
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const variance =
      times.reduce((sum, time) => sum + (time - avgTime) ** 2, 0) / times.length;
    const stdDev = Math.sqrt(variance);
    const opsPerSecond = 1000 / avgTime;

    return {
      name: config.name,
      avgTime,
      minTime,
      maxTime,
      stdDev,
      opsPerSecond,
      iterations,
      memoryUsed: config.measureMemory ? memoryAfter - memoryBefore : undefined,
    };
  }

  /**
   * 运行多个基准测试并比较
   *
   * @param benchmarks - 测试列表
   * @returns 测试结果列表
   */
  async runAll(
    benchmarks: Array<{ config: BenchmarkConfig; fn: () => void | Promise<void> }>,
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    for (const { config, fn } of benchmarks) {
      results.push(await this.run(config, fn));
    }
    return results;
  }

  /**
   * 格式化输出测试结果
   *
   * @param results - 测试结果
   * @returns 格式化的字符串
   */
  formatResults(results: BenchmarkResult[]): string {
    const lines = [
      '┌─────────────────────────────────────────────────────────────────┐',
      '│ Performance Benchmark Results                                   │',
      '├─────────────────────────────────────────────────────────────────┤',
    ];

    for (const result of results) {
      lines.push(
        `│ ${result.name.padEnd(30)} │ Avg: ${result.avgTime.toFixed(2)}ms │`,
      );
      lines.push(
        `│ ${''.padEnd(30)} │ Ops/s: ${result.opsPerSecond.toFixed(0)} │`,
      );
      if (result.memoryUsed !== undefined) {
        lines.push(
          `│ ${''.padEnd(30)} │ Memory: ${(result.memoryUsed / 1024).toFixed(2)}KB │`,
        );
      }
      lines.push('├─────────────────────────────────────────────────────────────────┤');
    }

    lines.push('└─────────────────────────────────────────────────────────────────┘');
    return lines.join('\n');
  }
}

/**
 * 内存分析器
 */
export class MemoryProfiler {
  private snapshots: Array<{ name: string; size: number }> = [];

  /**
   * 获取当前内存使用
   *
   * @returns 内存使用（字节），如果不支持则返回 0
   */
  getCurrentMemory(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 拍摄内存快照
   *
   * @param name - 快照名称
   */
  snapshot(name: string): void {
    this.snapshots.push({
      name,
      size: this.getCurrentMemory(),
    });
  }

  /**
   * 获取两个快照之间的内存差异
   *
   * @param name1 - 快照1名称
   * @param name2 - 快照2名称
   * @returns 内存差异（字节）
   */
  diff(name1: string, name2: string): number {
    const snap1 = this.snapshots.find((s) => s.name === name1);
    const snap2 = this.snapshots.find((s) => s.name === name2);
    if (!snap1 || !snap2) return 0;
    return snap2.size - snap1.size;
  }

  /**
   * 清除所有快照
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * 获取所有快照
   *
   * @returns 快照列表
   */
  getSnapshots(): ReadonlyArray<{ name: string; size: number }> {
    return this.snapshots;
  }
}
