/**
 * 类型导入测试文件
 *
 * 验证新的核心类型可以被正确导入和使用
 */

import type {
  Component,
  ComponentConstructor,
  ComponentQuery,
  EntityId,
} from '../types/component.js';
import type { NodeLoadState, OctreeMetadata, OctreeNodeMetadata } from '../types/octree.js';
import type {
  BufferDescriptor,
  FrustumCullResult,
  MaterialType,
  RenderCommand,
  RenderStats,
} from '../types/rendering.js';
// 从 types 模块导入所有新类型
import type { ISystem, SystemStage } from '../types/system.js';

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

import { MaterialType as MT } from '../types/rendering.js';
// 导入实际的枚举值（为了确保它们被导出）
import { SystemStage as SS } from '../types/system.js';

export { SS as SystemStage_Enum, MT as MaterialType_Enum };
