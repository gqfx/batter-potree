/**
 * ECS 组件定义
 *
 * @module ecs
 */

import type { Component } from './ECSWorld';
import type { Vector3, Matrix4 } from 'three';

/**
 * 数据源组件
 */
export class SourceComponent implements Component {
  __componentType = 'SourceComponent';
  public id: string;
  public type: string;
  public url: string;
  public visible: boolean;

  constructor(config: { id: string; type: string; url: string; visible?: boolean }) {
    this.id = config.id;
    this.type = config.type;
    this.url = config.url;
    this.visible = config.visible ?? true;
  }
}

/**
 * 变换组件
 */
export class Transform implements Component {
  __componentType = 'Transform';

  constructor(
    public position: Vector3,
    public rotation: Vector3,
    public scale: Vector3,
    public matrix: Matrix4
  ) {}
}

/**
 * 可见性组件
 */
export class Visibility implements Component {
  __componentType = 'Visibility';

  constructor(public visible: boolean = true) {}
}

/**
 * 点云节点数据组件
 */
export class PotreeNodeData implements Component {
  __componentType = 'PotreeNodeData';

  constructor(
    public nodeId: string,
    public sourceId: string,
    public numPoints: number,
    public gpuBufferId?: string
  ) {}
}

/**
 * 高斯球数据组件
 */
export class GaussianSplatData implements Component {
  __componentType = 'GaussianSplatData';

  constructor(
    public splatId: string,
    public numSplats: number,
    public gpuBufferId?: string
  ) {}
}

/**
 * 包围盒组件
 */
export class BoundingBox implements Component {
  __componentType = 'BoundingBox';

  constructor(
    public min: Vector3,
    public max: Vector3
  ) {}
}
