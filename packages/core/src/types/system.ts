/**
 * 系统调度相关类型定义
 *
 * @module types/system
 */

/**
 * 系统执行阶段枚举
 *
 * 定义系统在每帧中的执行顺序：
 * - INPUT: 输入处理阶段（如相机控制、用户交互）
 * - UPDATE: 主要更新阶段（如遍历、流式加载）
 * - RENDER: 渲染阶段（生成渲染命令）
 * - CLEANUP: 清理阶段（资源回收）
 *
 * @example
 * ```typescript
 * class MySystem implements ISystem {
 *   readonly stage = SystemStage.UPDATE;
 * }
 * ```
 */
export enum SystemStage {
  /** 输入处理阶段，优先级值: 0 */
  INPUT = 0,

  /** 主要更新阶段，优先级值: 100 */
  UPDATE = 100,

  /** 渲染阶段，优先级值: 200 */
  RENDER = 200,

  /** 清理阶段，优先级值: 300 */
  CLEANUP = 300,
}

/**
 * 系统接口
 *
 * 所有系统必须实现此接口以参与调度。系统按照 stage 和 priority 排序执行。
 *
 * @example
 * ```typescript
 * export class TraversalSystem implements ISystem {
 *   readonly name = 'bp:traversal';
 *   readonly stage = SystemStage.UPDATE;
 *   readonly priority = 0;
 *
 *   update(deltaTime: number): void {
 *     // 执行视锥剔除和 LOD 选择
 *   }
 *
 *   dispose(): void {
 *     // 清理资源
 *   }
 * }
 * ```
 */
export interface ISystem {
  /**
   * 系统唯一名称
   *
   * 建议使用命名空间格式，如 "bp:traversal"、"bp:streaming"
   */
  readonly name: string;

  /**
   * 系统执行阶段
   *
   * 决定系统在哪个阶段执行（INPUT/UPDATE/RENDER/CLEANUP）
   */
  readonly stage: SystemStage;

  /**
   * 系统优先级（可选）
   *
   * 同一阶段内的排序依据，数值越小优先级越高，默认为 0。
   * 例如，TraversalSystem 优先级为 0，StreamingSystem 优先级为 10。
   */
  readonly priority?: number;

  /**
   * 系统更新方法
   *
   * 每帧调用一次，执行系统的主要逻辑。
   *
   * @param deltaTime - 距离上一帧的时间间隔（秒）
   *
   * @example
   * ```typescript
   * update(deltaTime: number): void {
   *   // 处理视锥剔除
   *   this.updateFrustum();
   *   // 遍历八叉树节点
   *   this.traverseNodes();
   * }
   * ```
   */
  update(deltaTime: number): void;

  /**
   * 系统销毁方法（可选）
   *
   * 在系统被移除时调用，用于清理资源和取消订阅。
   *
   * @example
   * ```typescript
   * dispose(): void {
   *   this.unsubscribers.forEach(unsub => unsub());
   *   this.frustum = null;
   * }
   * ```
   */
  dispose?(): void;
}
