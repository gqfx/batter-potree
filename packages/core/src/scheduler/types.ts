/**
 * 系统调度器相关类型定义
 *
 * @module scheduler/types
 */

/**
 * 系统统计信息
 *
 * 记录系统执行的性能指标，用于监控和调试。
 *
 * @example
 * ```typescript
 * const stats: SystemStats = {
 *   frameTime: 16.7,
 *   systemTimes: new Map([
 *     ['bp:traversal', 2.3],
 *     ['bp:streaming', 1.5]
 *   ])
 * };
 * ```
 */
export interface SystemStats {
  /**
   * 总帧时间（毫秒）
   *
   * 从帧开始到所有系统执行完成的总耗时。
   */
  frameTime: number;

  /**
   * 各系统执行耗时（毫秒）
   *
   * Key 为系统名称，Value 为该系统在最近一帧的执行时间。
   */
  systemTimes: Map<string, number>;
}

/**
 * 调度器配置选项
 *
 * @example
 * ```typescript
 * const options: SchedulerOptions = {
 *   enableProfiling: true,
 *   errorHandler: (error, systemName) => {
 *     console.error(`System ${systemName} failed:`, error);
 *   }
 * };
 * ```
 */
export interface SchedulerOptions {
  /**
   * 是否启用性能分析
   *
   * 启用后会记录每个系统的执行时间到 stats.systemTimes。
   * @default true
   */
  enableProfiling?: boolean;

  /**
   * 自定义错误处理器
   *
   * 当系统执行抛出错误时调用。如果未提供，将使用默认的 console.error。
   *
   * @param error - 捕获的错误对象
   * @param systemName - 发生错误的系统名称
   */
  errorHandler?: (error: unknown, systemName: string) => void;
}
