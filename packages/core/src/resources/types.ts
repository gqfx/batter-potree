/**
 * 资源管理器类型定义
 *
 * @module resources
 */

/**
 * 资源接口
 */
export interface Resource {
  /** 资源唯一ID */
  readonly id: string;
  /** 资源大小（字节） */
  readonly size: number;
  /** 释放资源 */
  dispose(): void;
}

/**
 * 资源统计信息
 */
export interface ResourceStats {
  /** 资源总数 */
  readonly totalResources: number;
  /** 总内存使用（字节） */
  readonly totalMemory: number;
  /** 内存限制（字节） */
  readonly memoryLimit: number;
  /** 缓存命中次数 */
  readonly hits: number;
  /** 缓存未命中次数 */
  readonly misses: number;
}
