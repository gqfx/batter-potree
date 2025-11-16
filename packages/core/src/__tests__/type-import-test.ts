/**
 * 类型导入测试
 *
 * 验证新类型可以从模块导入
 */

import type {
  SystemStage,
  ISystem,
  OctreeNodeMetadata,
  OctreeMetadata,
  MaterialType,
  RenderCommand,
  Component,
  ComponentConstructor,
} from '../types/index.js';

import { SystemStage_Enum, MaterialType_Enum } from '../exports/core-types.js';

// 编译时类型检查
const testSystem: ISystem = {
  name: 'test-system',
  stage: SystemStage_Enum.UPDATE,
  priority: 0,
  update: (deltaTime: number) => {
    console.log('update', deltaTime);
  },
};

const testCommand: RenderCommand = {
  nodeId: 'test-node',
  materialType: MaterialType_Enum.POINT,
  bufferId: 'test-buffer',
  numPoints: 1000,
};

console.log('类型导入测试成功', testSystem, testCommand);
