/**
 * ECS 性能基准测试
 *
 * @module benchmarks/ecs
 */

import { describe, expect, it } from 'vitest';
import { TransformComponent, VisibilityComponent } from '../../packages/core/src/ecs/components';
import { ECSWorld } from '../../packages/core/src/ecs/ECSWorld';
import { BenchmarkRunner } from './performance-utils';

describe('ECS Performance Benchmarks', () => {
  it('should benchmark entity creation', async () => {
    const runner = new BenchmarkRunner();

    const result = await runner.run(
      {
        name: 'Create 10000 entities',
        iterations: 10,
        warmupIterations: 2,
        measureMemory: true,
      },
      () => {
        const world = new ECSWorld();
        for (let i = 0; i < 10000; i++) {
          world.createEntity();
        }
      },
    );
    if (result.memoryUsed) {
    }

    // 验证性能要求：10000 实体创建应该 < 100ms
    expect(result.avgTime).toBeLessThan(100);
  });

  it('should benchmark component addition', async () => {
    const runner = new BenchmarkRunner();

    const result = await runner.run(
      {
        name: 'Add components to 10000 entities',
        iterations: 10,
        warmupIterations: 2,
      },
      () => {
        const world = new ECSWorld();
        const entities = Array.from({ length: 10000 }, () => world.createEntity());

        for (const entity of entities) {
          world.addComponent(entity, TransformComponent, {
            position: [0, 0, 0],
            rotation: [0, 0, 0, 1],
            scale: [1, 1, 1],
          });
        }
      },
    );

    expect(result.avgTime).toBeLessThan(200);
  });

  it('should benchmark entity queries', async () => {
    const runner = new BenchmarkRunner();

    // 准备数据
    const world = new ECSWorld();
    for (let i = 0; i < 10000; i++) {
      const entity = world.createEntity();
      world.addComponent(entity, TransformComponent, {
        position: [i, i, i],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      });
      if (i % 2 === 0) {
        world.addComponent(entity, VisibilityComponent, { visible: true });
      }
    }

    const result = await runner.run(
      {
        name: 'Query 10000 entities',
        iterations: 100,
        warmupIterations: 10,
      },
      () => {
        world.query([TransformComponent]);
      },
    );

    // 验证性能要求：10000 实体查询应该 < 10ms
    expect(result.avgTime).toBeLessThan(10);
  });

  it('should benchmark component access', async () => {
    const runner = new BenchmarkRunner();

    // 准备数据
    const world = new ECSWorld();
    const entities = Array.from({ length: 10000 }, () => {
      const entity = world.createEntity();
      world.addComponent(entity, TransformComponent, {
        position: [0, 0, 0],
        rotation: [0, 0, 0, 1],
        scale: [1, 1, 1],
      });
      return entity;
    });

    const result = await runner.run(
      {
        name: 'Access 10000 components',
        iterations: 100,
        warmupIterations: 10,
      },
      () => {
        for (const entity of entities) {
          const component = world.getComponent(entity, TransformComponent);
          if (component) {
            // 模拟访问
            const _pos = component.position;
          }
        }
      },
    );

    expect(result.avgTime).toBeLessThan(5);
  });
});
