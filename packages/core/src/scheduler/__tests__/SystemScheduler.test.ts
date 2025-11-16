/**
 * SystemScheduler 测试套件
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SystemScheduler } from '../SystemScheduler';
import { SystemStage, type ISystem } from '../../types/system';

/**
 * 创建一个测试系统
 */
function createTestSystem(
  name: string,
  stage: SystemStage,
  priority?: number,
  options: {
    shouldThrow?: boolean;
    updateCallback?: (deltaTime: number) => void;
    disposeCallback?: () => void;
  } = {}
): ISystem {
  return {
    name,
    stage,
    priority,
    update: vi.fn((deltaTime: number) => {
      if (options.shouldThrow) {
        throw new Error(`Error in ${name}`);
      }
      if (options.updateCallback) {
        options.updateCallback(deltaTime);
      }
    }),
    dispose: options.disposeCallback ? vi.fn(options.disposeCallback) : undefined,
  };
}

describe('SystemScheduler', () => {
  let scheduler: SystemScheduler;

  beforeEach(() => {
    scheduler = new SystemScheduler();
  });

  afterEach(() => {
    scheduler.dispose();
  });

  describe('基础功能', () => {
    it('应该正确创建调度器实例', () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.isRunning()).toBe(false);
      expect(scheduler.getSystems()).toHaveLength(0);
    });

    it('应该正确添加系统', () => {
      const system = createTestSystem('test-system', SystemStage.UPDATE);
      scheduler.addSystem(system);

      expect(scheduler.getSystems()).toHaveLength(1);
      expect(scheduler.hasSystem('test-system')).toBe(true);
      expect(scheduler.getSystem('test-system')).toBe(system);
    });

    it('应该拒绝添加重复名称的系统', () => {
      const system1 = createTestSystem('duplicate', SystemStage.UPDATE);
      const system2 = createTestSystem('duplicate', SystemStage.RENDER);

      scheduler.addSystem(system1);

      expect(() => {
        scheduler.addSystem(system2);
      }).toThrow('System with name "duplicate" already exists');
    });

    it('应该拒绝添加无效 stage 的系统', () => {
      const system = createTestSystem('invalid', 999 as SystemStage);

      expect(() => {
        scheduler.addSystem(system);
      }).toThrow('Invalid system stage: 999');
    });

    it('应该正确移除系统', () => {
      const system = createTestSystem('removable', SystemStage.UPDATE);
      scheduler.addSystem(system);

      const removed = scheduler.removeSystem('removable');

      expect(removed).toBe(true);
      expect(scheduler.hasSystem('removable')).toBe(false);
      expect(scheduler.getSystems()).toHaveLength(0);
    });

    it('移除不存在的系统应返回 false', () => {
      const removed = scheduler.removeSystem('non-existent');
      expect(removed).toBe(false);
    });

    it('移除系统时应调用 dispose 方法', () => {
      const disposeCallback = vi.fn();
      const system = createTestSystem('disposable', SystemStage.UPDATE, undefined, {
        disposeCallback,
      });

      scheduler.addSystem(system);
      scheduler.removeSystem('disposable');

      expect(disposeCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('系统执行顺序', () => {
    it('应该按照 stage 顺序执行系统', () => {
      const executionOrder: string[] = [];

      const inputSystem = createTestSystem('input', SystemStage.INPUT, undefined, {
        updateCallback: () => executionOrder.push('INPUT'),
      });
      const updateSystem = createTestSystem('update', SystemStage.UPDATE, undefined, {
        updateCallback: () => executionOrder.push('UPDATE'),
      });
      const renderSystem = createTestSystem('render', SystemStage.RENDER, undefined, {
        updateCallback: () => executionOrder.push('RENDER'),
      });
      const cleanupSystem = createTestSystem('cleanup', SystemStage.CLEANUP, undefined, {
        updateCallback: () => executionOrder.push('CLEANUP'),
      });

      // 以随机顺序添加系统
      scheduler.addSystem(renderSystem);
      scheduler.addSystem(inputSystem);
      scheduler.addSystem(cleanupSystem);
      scheduler.addSystem(updateSystem);

      scheduler.start();
      scheduler.update(0.016);

      expect(executionOrder).toEqual(['INPUT', 'UPDATE', 'RENDER', 'CLEANUP']);
    });

    it('应该在同一 stage 内按照 priority 排序', () => {
      const executionOrder: string[] = [];

      const system1 = createTestSystem('priority-10', SystemStage.UPDATE, 10, {
        updateCallback: () => executionOrder.push('priority-10'),
      });
      const system2 = createTestSystem('priority-0', SystemStage.UPDATE, 0, {
        updateCallback: () => executionOrder.push('priority-0'),
      });
      const system3 = createTestSystem('priority-5', SystemStage.UPDATE, 5, {
        updateCallback: () => executionOrder.push('priority-5'),
      });
      const system4 = createTestSystem('no-priority', SystemStage.UPDATE, undefined, {
        updateCallback: () => executionOrder.push('no-priority'),
      });

      // 以随机顺序添加
      scheduler.addSystem(system1);
      scheduler.addSystem(system2);
      scheduler.addSystem(system3);
      scheduler.addSystem(system4);

      scheduler.start();
      scheduler.update(0.016);

      // no-priority 默认为 0，应该和 priority-0 一起在最前面
      // 相同优先级的系统按添加顺序执行
      expect(executionOrder).toEqual([
        'priority-0',
        'no-priority',
        'priority-5',
        'priority-10',
      ]);
    });
  });

  describe('错误处理', () => {
    it('单个系统抛错不应影响其他系统', () => {
      const executionOrder: string[] = [];

      const system1 = createTestSystem('system-1', SystemStage.UPDATE, 0, {
        updateCallback: () => executionOrder.push('system-1'),
      });
      const system2 = createTestSystem('system-2', SystemStage.UPDATE, 1, {
        shouldThrow: true,
      });
      const system3 = createTestSystem('system-3', SystemStage.UPDATE, 2, {
        updateCallback: () => executionOrder.push('system-3'),
      });

      scheduler.addSystem(system1);
      scheduler.addSystem(system2);
      scheduler.addSystem(system3);

      scheduler.start();
      scheduler.update(0.016);

      expect(executionOrder).toEqual(['system-1', 'system-3']);
    });

    it('应该调用自定义错误处理器', () => {
      const errorHandler = vi.fn();
      scheduler = new SystemScheduler({ errorHandler });

      const system = createTestSystem('error-system', SystemStage.UPDATE, undefined, {
        shouldThrow: true,
      });

      scheduler.addSystem(system);
      scheduler.start();
      scheduler.update(0.016);

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'error-system'
      );
    });

    it('移除系统时的 dispose 错误应该被处理', () => {
      const errorHandler = vi.fn();
      scheduler = new SystemScheduler({ errorHandler });

      const system = createTestSystem('dispose-error', SystemStage.UPDATE, undefined, {
        disposeCallback: () => {
          throw new Error('Dispose error');
        },
      });

      scheduler.addSystem(system);
      scheduler.removeSystem('dispose-error');

      expect(errorHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('启动和停止', () => {
    it('未启动时不应执行系统', () => {
      const system = createTestSystem('test', SystemStage.UPDATE);
      scheduler.addSystem(system);

      scheduler.update(0.016);

      expect(system.update).not.toHaveBeenCalled();
    });

    it('启动后应执行系统', () => {
      const system = createTestSystem('test', SystemStage.UPDATE);
      scheduler.addSystem(system);

      scheduler.start();
      scheduler.update(0.016);

      expect(system.update).toHaveBeenCalledTimes(1);
      expect(system.update).toHaveBeenCalledWith(0.016);
    });

    it('停止后不应执行系统', () => {
      const system = createTestSystem('test', SystemStage.UPDATE);
      scheduler.addSystem(system);

      scheduler.start();
      scheduler.update(0.016);
      scheduler.stop();
      scheduler.update(0.016);

      expect(system.update).toHaveBeenCalledTimes(1);
    });

    it('可以多次启动和停止', () => {
      const system = createTestSystem('test', SystemStage.UPDATE);
      scheduler.addSystem(system);

      scheduler.start();
      scheduler.update(0.016);
      scheduler.stop();
      scheduler.start();
      scheduler.update(0.016);
      scheduler.stop();

      expect(system.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('性能分析', () => {
    it('应该记录帧时间', () => {
      scheduler.start();
      scheduler.update(0.016);

      expect(scheduler.stats.frameTime).toBeGreaterThanOrEqual(0);
    });

    it('应该记录每个系统的执行时间', () => {
      const system1 = createTestSystem('system-1', SystemStage.UPDATE);
      const system2 = createTestSystem('system-2', SystemStage.RENDER);

      scheduler.addSystem(system1);
      scheduler.addSystem(system2);

      scheduler.start();
      scheduler.update(0.016);

      expect(scheduler.stats.systemTimes.has('system-1')).toBe(true);
      expect(scheduler.stats.systemTimes.has('system-2')).toBe(true);
      expect(scheduler.stats.systemTimes.get('system-1')).toBeGreaterThanOrEqual(0);
      expect(scheduler.stats.systemTimes.get('system-2')).toBeGreaterThanOrEqual(0);
    });

    it('禁用性能分析时不应记录时间', () => {
      scheduler = new SystemScheduler({ enableProfiling: false });
      const system = createTestSystem('test', SystemStage.UPDATE);

      scheduler.addSystem(system);
      scheduler.start();
      scheduler.update(0.016);

      expect(scheduler.stats.frameTime).toBe(0);
      expect(scheduler.stats.systemTimes.size).toBe(0);
    });
  });

  describe('销毁', () => {
    it('应该调用所有系统的 dispose 方法', () => {
      const disposeCallback1 = vi.fn();
      const disposeCallback2 = vi.fn();

      const system1 = createTestSystem('system-1', SystemStage.UPDATE, undefined, {
        disposeCallback: disposeCallback1,
      });
      const system2 = createTestSystem('system-2', SystemStage.RENDER, undefined, {
        disposeCallback: disposeCallback2,
      });

      scheduler.addSystem(system1);
      scheduler.addSystem(system2);
      scheduler.dispose();

      expect(disposeCallback1).toHaveBeenCalledTimes(1);
      expect(disposeCallback2).toHaveBeenCalledTimes(1);
    });

    it('销毁后应清空所有系统', () => {
      const system = createTestSystem('test', SystemStage.UPDATE);
      scheduler.addSystem(system);

      scheduler.dispose();

      expect(scheduler.getSystems()).toHaveLength(0);
      expect(scheduler.hasSystem('test')).toBe(false);
    });

    it('销毁后应停止运行', () => {
      scheduler.start();
      scheduler.dispose();

      expect(scheduler.isRunning()).toBe(false);
    });

    it('销毁时的 dispose 错误不应中断清理过程', () => {
      const errorHandler = vi.fn();
      scheduler = new SystemScheduler({ errorHandler });

      const system1 = createTestSystem('system-1', SystemStage.UPDATE, undefined, {
        disposeCallback: () => {
          throw new Error('Error 1');
        },
      });
      const system2 = createTestSystem('system-2', SystemStage.UPDATE, undefined, {
        disposeCallback: () => {
          throw new Error('Error 2');
        },
      });

      scheduler.addSystem(system1);
      scheduler.addSystem(system2);
      scheduler.dispose();

      expect(errorHandler).toHaveBeenCalledTimes(2);
      expect(scheduler.getSystems()).toHaveLength(0);
    });
  });

  describe('性能测试', () => {
    it('100 个系统 × 1000 次更新应在合理时间内完成', () => {
      // 添加 100 个系统
      for (let i = 0; i < 100; i++) {
        const stage = [
          SystemStage.INPUT,
          SystemStage.UPDATE,
          SystemStage.RENDER,
          SystemStage.CLEANUP,
        ][i % 4];
        const system = createTestSystem(`system-${i}`, stage, i);
        scheduler.addSystem(system);
      }

      scheduler.start();

      const startTime = performance.now();

      // 执行 1000 次更新
      for (let i = 0; i < 1000; i++) {
        scheduler.update(0.016);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // 期望总时间 < 150ms（考虑性能波动）
      expect(totalTime).toBeLessThan(150);

      console.log(
        `性能测试: 100 系统 × 1000 次更新 = ${totalTime.toFixed(2)}ms`
      );
    });

    it('单次调度 100 个系统应在 1ms 内完成', () => {
      // 添加 100 个系统
      for (let i = 0; i < 100; i++) {
        const stage = [
          SystemStage.INPUT,
          SystemStage.UPDATE,
          SystemStage.RENDER,
          SystemStage.CLEANUP,
        ][i % 4];
        const system = createTestSystem(`system-${i}`, stage, i);
        scheduler.addSystem(system);
      }

      scheduler.start();

      const startTime = performance.now();
      scheduler.update(0.016);
      const endTime = performance.now();

      const singleFrameTime = endTime - startTime;

      // 期望单帧时间 < 1ms
      expect(singleFrameTime).toBeLessThan(1);

      console.log(
        `性能测试: 单次调度 100 系统 = ${singleFrameTime.toFixed(3)}ms`
      );
    });
  });

  describe('边界情况', () => {
    it('没有系统时 update 应正常工作', () => {
      scheduler.start();
      expect(() => {
        scheduler.update(0.016);
      }).not.toThrow();
    });

    it('某个 stage 没有系统时应正常工作', () => {
      const system = createTestSystem('test', SystemStage.UPDATE);
      scheduler.addSystem(system);

      scheduler.start();
      expect(() => {
        scheduler.update(0.016);
      }).not.toThrow();

      expect(system.update).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理没有 dispose 方法的系统', () => {
      const system: ISystem = {
        name: 'no-dispose',
        stage: SystemStage.UPDATE,
        update: vi.fn(),
      };

      scheduler.addSystem(system);
      expect(() => {
        scheduler.removeSystem('no-dispose');
      }).not.toThrow();
      expect(() => {
        scheduler.dispose();
      }).not.toThrow();
    });
  });
});
