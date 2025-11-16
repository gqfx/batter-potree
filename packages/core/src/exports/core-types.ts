/**
 * 类型导入测试文件
 *
 * 验证新的核心类型可以被正确导入和使用
 */

// 从 types 模块导入所有新类型
import type { SystemStage, ISystem } from '../types/system.js';
import type {
  OctreeNodeMetadata,
  OctreeMetadata,
  NodeLoadState,
} from '../types/octree.js';
import type {
  MaterialType,
  BufferDescriptor,
  RenderCommand,
  RenderStats,
  FrustumCullResult,
} from '../types/rendering.js';
import type {
  Component,
  EntityId,
  ComponentConstructor,
  ComponentQuery,
} from '../types/component.js';

// 重新导出以确保类型被使用
export type {
  SystemStage,
  ISystem,
  OctreeNodeMetadata,
  OctreeMetadata,
  NodeLoadState,
  MaterialType,
  BufferDescriptor,
  RenderCommand,
  RenderStats,
  FrustumCullResult,
  Component,
  EntityId,
  ComponentConstructor,
  ComponentQuery,
};

// 导入实际的枚举值（为了确保它们被导出）
import { SystemStage as SS } from '../types/system.js';
import { MaterialType as MT } from '../types/rendering.js';

export { SS as SystemStage_Enum, MT as MaterialType_Enum };
