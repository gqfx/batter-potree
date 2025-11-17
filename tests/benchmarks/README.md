# Performance Benchmarks

This directory contains performance benchmark tests for the Better-Potree project.

## Overview

Performance benchmarks are critical for ensuring the project meets its performance goals:
- 10M points @ 60fps
- GPU memory < 512MB
- CPU memory < 200MB
- LOD selection < 5ms
- 8 concurrent streams without stuttering

## Benchmark Categories

### ECS Benchmarks (`ecs.bench.test.ts`)
- Entity creation (10,000 entities)
- Component addition
- Entity queries
- Component access

**Performance Targets:**
- Entity creation: < 100ms for 10,000 entities
- Entity queries: < 10ms for 10,000 entities
- Component access: < 5ms for 10,000 components

### LOD Benchmarks (`lod.bench.test.ts`)
- LOD selection
- Frustum culling
- Point budget allocation

**Performance Targets:**
- LOD selection: < 5ms for 1,000 nodes
- Frustum culling: < 2ms for 1,000 boxes
- Point budget: < 3ms for 500 nodes

### Memory Benchmarks (`memory.bench.test.ts`)
- LRU cache operations
- Memory allocation patterns
- TypedArray operations

**Performance Targets:**
- LRU operations: < 10ms for 1,000 ops
- Memory allocation: < 50ms for 1,000 buffers
- TypedArray ops: < 5ms for 100k elements

## Running Benchmarks

```bash
# Run all benchmarks
pnpm test -- benchmarks

# Run specific benchmark
pnpm test -- benchmarks/ecs.bench.test.ts

# Run with verbose output
pnpm test -- benchmarks --reporter=verbose
```

## Utilities

### BenchmarkRunner
A utility class for running performance tests with warmup, iterations, and statistical analysis.

```typescript
const runner = new BenchmarkRunner();
const result = await runner.run({
  name: 'My Test',
  iterations: 100,
  warmupIterations: 10,
  measureMemory: true
}, () => {
  // Your test code
});
```

### MemoryProfiler
A utility for tracking memory usage patterns.

```typescript
const profiler = new MemoryProfiler();
profiler.snapshot('start');
// ... code to profile
profiler.snapshot('end');
const diff = profiler.diff('start', 'end');
```

## Performance Monitoring

Benchmark results should be tracked over time to detect regressions. Key metrics:
- Average execution time
- Standard deviation
- Operations per second
- Memory usage

## Contributing

When adding new features:
1. Add corresponding benchmarks
2. Ensure they meet performance targets
3. Document expected performance characteristics
