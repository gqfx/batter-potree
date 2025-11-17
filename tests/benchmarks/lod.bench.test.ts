/**
 * LOD 算法性能基准测试
 *
 * @module benchmarks/lod
 */

import { describe, it, expect } from 'vitest';
import { LODSelector } from '../../packages/core/src/lod/LODSelector';
import { FrustumCuller } from '../../packages/core/src/lod/FrustumCuller';
import { PointBudget } from '../../packages/core/src/lod/PointBudget';
import { OctreeNode } from '../../packages/core/src/octree/OctreeNode';
import { BenchmarkRunner } from './performance-utils';

describe('LOD Performance Benchmarks', () => {
  it('should benchmark LOD selection', async () => {
    const runner = new BenchmarkRunner();

    // 创建测试数据 - 模拟八叉树节点
    const nodes: OctreeNode[] = [];
    for (let i = 0; i < 1000; i++) {
      nodes.push(
        new OctreeNode({
          name: `node_${i}`,
          level: i % 10,
          boundingBox: {
            min: [i * 10, i * 10, i * 10],
            max: [i * 10 + 10, i * 10 + 10, i * 10 + 10],
          },
          numPoints: Math.floor(Math.random() * 100000),
          spacing: 1.0 / (i % 10 + 1),
        }),
      );
    }

    const lodSelector = new LODSelector({
      pointBudget: 2_000_000,
      minNodeSize: 100,
    });

    const camera = {
      position: [0, 0, 0] as [number, number, number],
      fov: 60,
      aspect: 16 / 9,
      near: 0.1,
      far: 1000,
    };

    const result = await runner.run(
      {
        name: 'LOD selection for 1000 nodes',
        iterations: 100,
        warmupIterations: 10,
      },
      () => {
        lodSelector.selectNodes(nodes, camera);
      },
    );

    console.log(`\nLOD Selection Benchmark:`);
    console.log(`  Average time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`);

    // 验证性能要求：LOD 选择应该 < 5ms
    expect(result.avgTime).toBeLessThan(5);
  });

  it('should benchmark frustum culling', async () => {
    const runner = new BenchmarkRunner();

    const culler = new FrustumCuller();

    // 创建视锥体
    const frustum = {
      planes: [
        { normal: [1, 0, 0], distance: 0 },
        { normal: [-1, 0, 0], distance: 100 },
        { normal: [0, 1, 0], distance: 0 },
        { normal: [0, -1, 0], distance: 100 },
        { normal: [0, 0, 1], distance: 0 },
        { normal: [0, 0, -1], distance: 100 },
      ] as Array<{ normal: [number, number, number]; distance: number }>,
    };

    // 创建测试包围盒
    const boxes: Array<{ min: [number, number, number]; max: [number, number, number] }> =
      [];
    for (let i = 0; i < 1000; i++) {
      boxes.push({
        min: [i * 5, i * 5, i * 5],
        max: [i * 5 + 5, i * 5 + 5, i * 5 + 5],
      });
    }

    const result = await runner.run(
      {
        name: 'Frustum culling 1000 boxes',
        iterations: 100,
        warmupIterations: 10,
      },
      () => {
        for (const box of boxes) {
          culler.isBoxInFrustum(box, frustum);
        }
      },
    );

    console.log(`\nFrustum Culling Benchmark:`);
    console.log(`  Average time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`);

    expect(result.avgTime).toBeLessThan(2);
  });

  it('should benchmark point budget calculation', async () => {
    const runner = new BenchmarkRunner();

    const pointBudget = new PointBudget(2_000_000);

    // 创建测试节点
    const nodes: OctreeNode[] = [];
    for (let i = 0; i < 500; i++) {
      nodes.push(
        new OctreeNode({
          name: `node_${i}`,
          level: i % 8,
          boundingBox: {
            min: [i, i, i],
            max: [i + 1, i + 1, i + 1],
          },
          numPoints: Math.floor(Math.random() * 50000),
          spacing: 1.0,
        }),
      );
    }

    const result = await runner.run(
      {
        name: 'Point budget allocation for 500 nodes',
        iterations: 100,
        warmupIterations: 10,
      },
      () => {
        pointBudget.allocate(nodes);
      },
    );

    console.log(`\nPoint Budget Allocation Benchmark:`);
    console.log(`  Average time: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  Ops/sec: ${result.opsPerSecond.toFixed(0)}`);

    expect(result.avgTime).toBeLessThan(3);
  });
});
