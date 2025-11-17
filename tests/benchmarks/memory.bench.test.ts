/**
 * 内存管理性能基准测试
 *
 * @module benchmarks/memory
 */

import { describe, expect, it } from 'vitest';
import { ResourceManager } from '../../packages/core/src/resources/ResourceManager';
import { BenchmarkRunner, MemoryProfiler } from './performance-utils';

describe('Memory Management Benchmarks', () => {
  it('should benchmark LRU cache operations', async () => {
    const runner = new BenchmarkRunner();

    const result = await runner.run(
      {
        name: 'LRU cache 1000 operations',
        iterations: 100,
        warmupIterations: 10,
      },
      () => {
        const cache = new ResourceManager({
          memoryLimit: 10 * 1024 * 1024, // 10MB
        });

        // 添加资源
        for (let i = 0; i < 100; i++) {
          const buffer = new ArrayBuffer(100 * 1024); // 100KB
          cache.register(`resource_${i}`, {
            id: `resource_${i}`,
            size: 100 * 1024,
            data: buffer,
            dispose: () => {},
          });
        }

        // 访问资源
        for (let i = 0; i < 50; i++) {
          cache.get(`resource_${i}`);
        }

        // 删除资源
        for (let i = 0; i < 20; i++) {
          cache.remove(`resource_${i}`);
        }
      },
    );

    console.log(`\nLRU Cache Operations Benchmark:`);
    console.log(`  Average time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`);

    expect(result.avgTime).toBeLessThan(10);
  });

  it('should benchmark memory allocation patterns', async () => {
    const runner = new BenchmarkRunner();
    const profiler = new MemoryProfiler();

    profiler.snapshot('start');

    const result = await runner.run(
      {
        name: 'Allocate and free 1000 buffers',
        iterations: 10,
        warmupIterations: 2,
        measureMemory: true,
      },
      () => {
        const buffers: ArrayBuffer[] = [];

        // 分配内存
        for (let i = 0; i < 1000; i++) {
          buffers.push(new ArrayBuffer(10 * 1024)); // 10KB each
        }

        // 清空（等待 GC）
        buffers.length = 0;
      },
    );

    profiler.snapshot('end');

    console.log(`\nMemory Allocation Benchmark:`);
    console.log(`  Average time: ${result.avgTime.toFixed(2)}ms`);
    if (result.memoryUsed) {
      console.log(`  Memory delta: ${(result.memoryUsed / 1024).toFixed(2)}KB`);
    }

    const memoryDiff = profiler.diff('start', 'end');
    console.log(`  Total memory diff: ${(memoryDiff / 1024).toFixed(2)}KB`);

    expect(result.avgTime).toBeLessThan(50);
  });

  it('should benchmark typed array operations', async () => {
    const runner = new BenchmarkRunner();

    const result = await runner.run(
      {
        name: 'TypedArray operations (100k elements)',
        iterations: 100,
        warmupIterations: 10,
      },
      () => {
        const float32 = new Float32Array(100000);
        const uint8 = new Uint8Array(100000);

        // 填充数据
        for (let i = 0; i < 100000; i++) {
          float32[i] = Math.random();
          uint8[i] = i % 256;
        }

        // 读取数据
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
          sum += float32[i] + uint8[i];
        }
      },
    );

    console.log(`\nTypedArray Operations Benchmark:`);
    console.log(`  Average time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`);

    expect(result.avgTime).toBeLessThan(5);
  });
});
