/**
 * POC 性能测试文件
 *
 * @description
 * 验证分层状态管理的性能优势：
 * - 10000 次可变更新 < 10ms
 * - 对比不可变更新的耗时
 * - 验证可变更新至少快 10 倍
 *
 * @remarks
 * 这些测试验证了架构设计的核心假设：可变状态管理的性能远超不可变状态管理。
 */

import { Runtime } from '@better-potree/core/runtime';
import { describe, expect, it } from 'vitest';

/**
 * 不可变状态更新的模拟实现
 *
 * @description 模拟 Zustand 等不可变状态管理库的行为
 */
interface ImmutableState {
  visibleNodes: Set<string>;
  loadedNodes: Map<string, { positions: Float32Array; colors: Uint8Array; numPoints: number }>;
}

/**
 * 不可变更新辅助函数
 */
function immutableAddNode(state: ImmutableState, nodeId: string): ImmutableState {
  return {
    ...state,
    visibleNodes: new Set([...state.visibleNodes, nodeId]),
  };
}

function immutableAddLoadedNode(
  state: ImmutableState,
  nodeId: string,
  data: { positions: Float32Array; colors: Uint8Array; numPoints: number },
): ImmutableState {
  const newMap = new Map(state.loadedNodes);
  newMap.set(nodeId, data);
  return {
    ...state,
    loadedNodes: newMap,
  };
}

describe('POC - 性能验证', () => {
  describe('测试 1: 可变更新性能', () => {
    it('10000 次可变 visibleNodes 更新 < 10ms', () => {
      const runtime = new Runtime();
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        runtime.visibleNodes.add(`node-${i}`);
      }

      const duration = performance.now() - start;

      // 验证所有节点都添加成功
      expect(runtime.visibleNodes.size).toBe(10000);

      // 验证性能 (应该 < 10ms)
      expect(duration).toBeLessThan(10);
    });

    it('10000 次可变 loadedNodes 更新 < 50ms', () => {
      const runtime = new Runtime();
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        runtime.loadedNodes.set(`node-${i}`, {
          positions: new Float32Array([i, i + 1, i + 2]),
          colors: new Uint8Array([255, 128, 0]),
          numPoints: 1,
        });
      }

      const duration = performance.now() - start;

      // 验证所有节点都添加成功
      expect(runtime.loadedNodes.size).toBe(10000);

      // 验证性能 (应该 < 50ms，因为涉及 TypedArray 创建)
      expect(duration).toBeLessThan(50);
    });

    it('混合更新: 10000 次 visibleNodes + 10000 次 loadedNodes < 100ms', () => {
      const runtime = new Runtime();
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        runtime.visibleNodes.add(`node-${i}`);
        runtime.loadedNodes.set(`node-${i}`, {
          positions: new Float32Array([i, i + 1, i + 2]),
          colors: new Uint8Array([255, 128, 0]),
          numPoints: 1,
        });
      }

      const duration = performance.now() - start;

      // 验证所有节点都添加成功
      expect(runtime.visibleNodes.size).toBe(10000);
      expect(runtime.loadedNodes.size).toBe(10000);

      // 验证性能 (应该 < 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('测试 2: 不可变更新性能 (对比)', () => {
    it('10000 次不可变 visibleNodes 更新 (预期: 远慢于可变)', { timeout: 10000 }, () => {
      let state: ImmutableState = {
        visibleNodes: new Set<string>(),
        loadedNodes: new Map(),
      };

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        state = immutableAddNode(state, `node-${i}`);
      }

      const duration = performance.now() - start;

      // 验证所有节点都添加成功
      expect(state.visibleNodes.size).toBe(10000);

      // 验证性能 (应该远慢于可变更新，预期 > 100ms)
      expect(duration).toBeGreaterThan(100);
    });

    it('10000 次不可变 loadedNodes 更新 (预期: 远慢于可变)', { timeout: 10000 }, () => {
      let state: ImmutableState = {
        visibleNodes: new Set<string>(),
        loadedNodes: new Map(),
      };

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        state = immutableAddLoadedNode(state, `node-${i}`, {
          positions: new Float32Array([i, i + 1, i + 2]),
          colors: new Uint8Array([255, 128, 0]),
          numPoints: 1,
        });
      }

      const duration = performance.now() - start;

      // 验证所有节点都添加成功
      expect(state.loadedNodes.size).toBe(10000);

      // 验证性能 (应该远慢于可变更新，预期 > 500ms)
      expect(duration).toBeGreaterThan(500);
    });
  });

  describe('测试 3: 性能倍数验证', () => {
    it('可变更新应至少快 10 倍于不可变更新', { timeout: 10000 }, () => {
      // 1. 测试可变更新
      const runtime = new Runtime();
      const mutableStart = performance.now();

      for (let i = 0; i < 10000; i++) {
        runtime.visibleNodes.add(`node-${i}`);
      }

      const mutableDuration = performance.now() - mutableStart;

      // 2. 测试不可变更新
      let state: ImmutableState = {
        visibleNodes: new Set<string>(),
        loadedNodes: new Map(),
      };

      const immutableStart = performance.now();

      for (let i = 0; i < 10000; i++) {
        state = immutableAddNode(state, `node-${i}`);
      }

      const immutableDuration = performance.now() - immutableStart;

      // 3. 计算性能倍数
      const speedup = immutableDuration / mutableDuration;

      // 4. 验证性能提升至少 10 倍
      expect(speedup).toBeGreaterThan(10);
    });
  });

  describe('测试 4: 内存使用验证', () => {
    it('可变更新不应创建大量临时对象', () => {
      const runtime = new Runtime();

      // 记录初始引用
      const originalSet = runtime.visibleNodes;
      const originalMap = runtime.loadedNodes;

      // 大量更新
      for (let i = 0; i < 10000; i++) {
        runtime.visibleNodes.add(`node-${i}`);
        runtime.loadedNodes.set(`node-${i}`, {
          positions: new Float32Array([i, i + 1, i + 2]),
          colors: new Uint8Array([255, 128, 0]),
          numPoints: 1,
        });
      }

      // 验证引用不变 (没有创建新的 Set/Map 对象)
      expect(runtime.visibleNodes).toBe(originalSet);
      expect(runtime.loadedNodes).toBe(originalMap);

      // 验证数据正确
      expect(runtime.visibleNodes.size).toBe(10000);
      expect(runtime.loadedNodes.size).toBe(10000);
    });

    it('不可变更新会创建大量临时对象', () => {
      let state: ImmutableState = {
        visibleNodes: new Set<string>(),
        loadedNodes: new Map(),
      };

      // 记录初始引用
      const originalSet = state.visibleNodes;

      // 更新 10 次
      for (let i = 0; i < 10; i++) {
        state = immutableAddNode(state, `node-${i}`);
      }

      // 验证引用已变 (创建了新的 Set 对象)
      expect(state.visibleNodes).not.toBe(originalSet);

      // 验证创建了 10 个不同的 Set 对象
      const sets: Set<string>[] = [];
      let tempState: ImmutableState = {
        visibleNodes: new Set<string>(),
        loadedNodes: new Map(),
      };

      for (let i = 0; i < 10; i++) {
        tempState = immutableAddNode(tempState, `node-${i}`);
        sets.push(tempState.visibleNodes);
      }

      // 每个 Set 都是不同的对象
      const uniqueSets = new Set(sets);
      expect(uniqueSets.size).toBe(10);
    });
  });

  describe('测试 5: 极端场景性能', () => {
    it('100000 次可变更新应保持稳定性能', () => {
      const runtime = new Runtime();
      const iterations = 100000;

      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        runtime.visibleNodes.add(`node-${i}`);
      }

      const duration = performance.now() - start;

      // 验证所有节点都添加成功
      expect(runtime.visibleNodes.size).toBe(iterations);

      // 验证性能 (应该保持线性增长，< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('频繁清空和重新填充 (模拟每帧更新)', () => {
      const runtime = new Runtime();
      const frames = 1000;
      const nodesPerFrame = 100;

      const start = performance.now();

      for (let frame = 0; frame < frames; frame++) {
        // 清空可见节点 (模拟 TraversalSystem)
        runtime.visibleNodes.clear();

        // 重新填充 (模拟遍历结果)
        for (let i = 0; i < nodesPerFrame; i++) {
          runtime.visibleNodes.add(`node-${frame}-${i}`);
        }
      }

      const duration = performance.now() - start;
      const avgFrameTime = duration / frames;

      // 验证平均每帧耗时 < 1ms (远低于 16.7ms 的帧预算)
      expect(avgFrameTime).toBeLessThan(1);

      // 验证最后一帧的节点数正确
      expect(runtime.visibleNodes.size).toBe(nodesPerFrame);
    });
  });

  describe('测试 6: 真实场景模拟', () => {
    it('模拟 60fps 场景下的状态更新', () => {
      const runtime = new Runtime();
      const _fps = 60;
      const frames = 600; // 10 秒
      const frameBudget = 16.7; // 每帧预算 16.7ms (60fps)

      const slowFrames: number[] = [];

      for (let frame = 0; frame < frames; frame++) {
        const frameStart = performance.now();

        // 模拟 TraversalSystem 更新可见节点
        runtime.visibleNodes.clear();
        for (let i = 0; i < 50; i++) {
          runtime.visibleNodes.add(`node-${frame}-${i}`);
        }

        // 模拟 StreamingSystem 更新加载节点
        if (frame % 10 === 0) {
          // 每 10 帧加载一些节点
          for (let i = 0; i < 10; i++) {
            runtime.loadedNodes.set(`node-${frame}-${i}`, {
              positions: new Float32Array([i, i + 1, i + 2]),
              colors: new Uint8Array([255, 128, 0]),
              numPoints: 1,
            });
          }
        }

        // 模拟 RenderSystem 更新统计
        runtime.stats.frameTime = performance.now() - frameStart;
        runtime.stats.pointsRendered = runtime.visibleNodes.size * 1000;
        runtime.stats.systemTimes.set('bp:traversal', Math.random() * 2);
        runtime.stats.systemTimes.set('bp:streaming', Math.random() * 1);
        runtime.stats.systemTimes.set('bp:render', Math.random() * 10);

        const frameDuration = performance.now() - frameStart;

        if (frameDuration > frameBudget) {
          slowFrames.push(frame);
        }
      }

      // 验证超出预算的帧数 < 5%
      expect(slowFrames.length / frames).toBeLessThan(0.05);

      // 验证最终状态
      expect(runtime.visibleNodes.size).toBe(50);
      expect(runtime.loadedNodes.size).toBeGreaterThan(0);
    });
  });
});
