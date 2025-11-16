/**
 * 系统调度器
 *
 * @module scheduler/SystemScheduler
 */

import type { ISystem, SystemStage } from '../types/system';
import type { SchedulerOptions, SystemStats } from './types';

/**
 * 系统调度器
 *
 * 负责管理和调度所有系统的执行，按照 SystemStage 的顺序（INPUT → UPDATE → RENDER → CLEANUP）
 * 在每个阶段内按照优先级排序执行。支持错误隔离、性能分析和系统生命周期管理。
 *
 * @example
 * ```typescript
 * const scheduler = new SystemScheduler();
 *
 * // 添加系统
 * scheduler.addSystem(new TraversalSystem());
 * scheduler.addSystem(new StreamingSystem());
 *
 * // 启动调度器
 * scheduler.start();
 *
 * // 在渲染循环中调用
 * function animate(time: number) {
 *   const deltaTime = (time - lastTime) / 1000;
 *   scheduler.update(deltaTime);
 *   lastTime = time;
 *   requestAnimationFrame(animate);
 * }
 * ```
 */
export class SystemScheduler {
  /**
   * 所有注册的系统列表
   */
  private readonly systems: ISystem[] = [];

  /**
   * 按阶段分组的系统
   *
   * Key: SystemStage, Value: 该阶段的所有系统（已按优先级排序）
   */
  private readonly systemsByStage: Map<SystemStage, ISystem[]> = new Map();

  /**
   * 系统名称到实例的映射，用于快速查找
   */
  private readonly systemsByName: Map<string, ISystem> = new Map();

  /**
   * 调度器运行状态
   */
  private running: boolean = false;

  /**
   * 性能统计信息
   */
  public readonly stats: SystemStats = {
    frameTime: 0,
    systemTimes: new Map(),
  };

  /**
   * 调度器配置选项
   */
  private readonly options: Required<SchedulerOptions>;

  /**
   * 创建系统调度器实例
   *
   * @param options - 调度器配置选项
   *
   * @example
   * ```typescript
   * const scheduler = new SystemScheduler({
   *   enableProfiling: true,
   *   errorHandler: (error, systemName) => {
   *     logger.error(`System ${systemName} failed:`, error);
   *   }
   * });
   * ```
   */
  constructor(options: SchedulerOptions = {}) {
    // 初始化每个 stage 的系统数组
    this.systemsByStage.set(0, []); // SystemStage.INPUT
    this.systemsByStage.set(100, []); // SystemStage.UPDATE
    this.systemsByStage.set(200, []); // SystemStage.RENDER
    this.systemsByStage.set(300, []); // SystemStage.CLEANUP

    // 设置默认选项
    this.options = {
      enableProfiling: options.enableProfiling ?? true,
      errorHandler:
        options.errorHandler ??
        ((error: unknown, systemName: string) => {
          console.error(`[SystemScheduler] Error in system "${systemName}":`, error);
        }),
    };
  }

  /**
   * 添加系统到调度器
   *
   * 系统会被添加到对应的 stage，并按照 priority 排序。
   * 如果系统名称已存在，会抛出错误。
   *
   * @param system - 要添加的系统实例
   * @throws {Error} 如果系统名称已存在
   * @throws {Error} 如果系统的 stage 无效
   *
   * @example
   * ```typescript
   * const traversalSystem = new TraversalSystem();
   * scheduler.addSystem(traversalSystem);
   * ```
   */
  addSystem(system: ISystem): void {
    // 检查系统名称是否重复
    if (this.systemsByName.has(system.name)) {
      throw new Error(`System with name "${system.name}" already exists`);
    }

    // 检查 stage 是否有效
    const stageSystems = this.systemsByStage.get(system.stage);
    if (!stageSystems) {
      throw new Error(`Invalid system stage: ${system.stage}`);
    }

    // 添加到全局列表
    this.systems.push(system);
    this.systemsByName.set(system.name, system);

    // 添加到对应的 stage 并排序
    stageSystems.push(system);
    this.sortSystemsByPriority(stageSystems);
  }

  /**
   * 移除系统
   *
   * 会调用系统的 dispose 方法（如果存在）进行清理。
   *
   * @param name - 要移除的系统名称
   * @returns 是否成功移除（false 表示系统不存在）
   *
   * @example
   * ```typescript
   * scheduler.removeSystem('bp:traversal');
   * ```
   */
  removeSystem(name: string): boolean {
    const system = this.systemsByName.get(name);
    if (!system) {
      return false;
    }

    // 从全局列表中移除
    const globalIndex = this.systems.indexOf(system);
    if (globalIndex !== -1) {
      this.systems.splice(globalIndex, 1);
    }
    this.systemsByName.delete(name);

    // 从 stage 列表中移除
    const stageSystems = this.systemsByStage.get(system.stage);
    if (stageSystems) {
      const stageIndex = stageSystems.indexOf(system);
      if (stageIndex !== -1) {
        stageSystems.splice(stageIndex, 1);
      }
    }

    // 调用 dispose 方法
    if (system.dispose) {
      try {
        system.dispose();
      } catch (error) {
        this.options.errorHandler(error, system.name);
      }
    }

    return true;
  }

  /**
   * 执行一帧更新
   *
   * 按照 INPUT → UPDATE → RENDER → CLEANUP 的顺序执行所有系统。
   * 单个系统的错误不会影响其他系统的执行。
   *
   * @param deltaTime - 距离上一帧的时间间隔（秒）
   *
   * @example
   * ```typescript
   * function animate(time: number) {
   *   const deltaTime = (time - lastTime) / 1000;
   *   scheduler.update(deltaTime);
   *   lastTime = time;
   *   requestAnimationFrame(animate);
   * }
   * ```
   */
  update(deltaTime: number): void {
    if (!this.running) {
      return;
    }

    const frameStartTime = this.options.enableProfiling ? performance.now() : 0;

    // 按照固定的 stage 顺序执行
    // INPUT (0) → UPDATE (100) → RENDER (200) → CLEANUP (300)
    this.executeStage(0, deltaTime); // SystemStage.INPUT
    this.executeStage(100, deltaTime); // SystemStage.UPDATE
    this.executeStage(200, deltaTime); // SystemStage.RENDER
    this.executeStage(300, deltaTime); // SystemStage.CLEANUP

    // 记录总帧时间
    if (this.options.enableProfiling) {
      this.stats.frameTime = performance.now() - frameStartTime;
    }
  }

  /**
   * 启动调度器
   *
   * 启动后，update 方法才会执行系统。
   *
   * @example
   * ```typescript
   * scheduler.start();
   * ```
   */
  start(): void {
    this.running = true;
  }

  /**
   * 停止调度器
   *
   * 停止后，update 方法不会执行任何系统。
   *
   * @example
   * ```typescript
   * scheduler.stop();
   * ```
   */
  stop(): void {
    this.running = false;
  }

  /**
   * 销毁调度器
   *
   * 会调用所有系统的 dispose 方法并清空所有系统。
   *
   * @example
   * ```typescript
   * scheduler.dispose();
   * ```
   */
  dispose(): void {
    this.stop();

    // 调用所有系统的 dispose 方法
    for (const system of this.systems) {
      if (system.dispose) {
        try {
          system.dispose();
        } catch (error) {
          this.options.errorHandler(error, system.name);
        }
      }
    }

    // 清空所有集合
    this.systems.length = 0;
    this.systemsByName.clear();
    for (const stageSystems of this.systemsByStage.values()) {
      stageSystems.length = 0;
    }
    this.stats.systemTimes.clear();
  }

  /**
   * 获取系统实例
   *
   * @param name - 系统名称
   * @returns 系统实例，如果不存在则返回 undefined
   *
   * @example
   * ```typescript
   * const traversalSystem = scheduler.getSystem('bp:traversal');
   * if (traversalSystem) {
   *   console.log('Traversal system found');
   * }
   * ```
   */
  getSystem(name: string): ISystem | undefined {
    return this.systemsByName.get(name);
  }

  /**
   * 检查系统是否存在
   *
   * @param name - 系统名称
   * @returns 系统是否已注册
   *
   * @example
   * ```typescript
   * if (scheduler.hasSystem('bp:traversal')) {
   *   console.log('Traversal system exists');
   * }
   * ```
   */
  hasSystem(name: string): boolean {
    return this.systemsByName.has(name);
  }

  /**
   * 获取所有系统
   *
   * @returns 只读的系统数组
   *
   * @example
   * ```typescript
   * const allSystems = scheduler.getSystems();
   * console.log(`Total systems: ${allSystems.length}`);
   * ```
   */
  getSystems(): ReadonlyArray<ISystem> {
    return this.systems;
  }

  /**
   * 获取调度器运行状态
   *
   * @returns 是否正在运行
   *
   * @example
   * ```typescript
   * if (scheduler.isRunning()) {
   *   console.log('Scheduler is running');
   * }
   * ```
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * 执行指定阶段的所有系统
   *
   * @param stage - 系统阶段
   * @param deltaTime - 时间间隔
   */
  private executeStage(stage: SystemStage, deltaTime: number): void {
    const systems = this.systemsByStage.get(stage);
    if (!systems || systems.length === 0) {
      return;
    }

    for (const system of systems) {
      const startTime = this.options.enableProfiling ? performance.now() : 0;

      try {
        system.update(deltaTime);
      } catch (error) {
        this.options.errorHandler(error, system.name);
      }

      // 记录系统耗时
      if (this.options.enableProfiling) {
        const duration = performance.now() - startTime;
        this.stats.systemTimes.set(system.name, duration);
      }
    }
  }

  /**
   * 按优先级对系统数组进行排序
   *
   * 优先级数值越小，执行顺序越靠前。
   *
   * @param systems - 要排序的系统数组
   */
  private sortSystemsByPriority(systems: ISystem[]): void {
    systems.sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      return priorityA - priorityB;
    });
  }
}
