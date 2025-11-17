/**
 * 类型导入测试
 *
 * 验证新类型可以从模块导入
 */

import { MaterialType_Enum, SystemStage_Enum } from '../exports/core-types.js';
import type {
  Component,
  ComponentConstructor,
  ISystem,
  OctreeMetadata,
  OctreeNodeMetadata,
  RenderCommand,
} from '../types/index.js';

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

// 使用导入的类型来消除未使用警告
const _testMetadata: OctreeNodeMetadata | OctreeMetadata | Component | ComponentConstructor | null =
  null;

console.log('类型导入测试成功', testSystem, testCommand, _testMetadata);
