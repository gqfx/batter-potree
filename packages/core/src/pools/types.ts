/**
 * 对象池类型定义
 *
 * @module pools
 */

/**
 * 可池化对象接口
 */
export interface Poolable {
  /**
   * 重置对象状态（从池中获取时调用）
   */
  reset?(): void;

  /**
   * 清理对象（归还到池时调用）
   */
  clear?(): void;
}

/**
 * 对象池统计信息
 */
export interface ObjectPoolStats {
  /** 池中可用对象数量 */
  available: number;
  /** 已使用对象数量 */
  inUse: number;
  /** 总创建对象数量 */
  totalCreated: number;
  /** 命中次数（从池中获取） */
  hits: number;
  /** 未命中次数（创建新对象） */
  misses: number;
}

/**
 * 对象工厂函数
 */
export type ObjectFactory<T> = () => T;

/**
 * 对象重置函数
 */
export type ObjectResetter<T> = (obj: T) => void;

/**
 * 对象清理函数
 */
export type ObjectCleaner<T> = (obj: T) => void;
