/**
 * ECS World 实现（轻量级）
 *
 * @module ecs
 */

import type { Component } from '../types/component.js';

export type Entity = number;

// Re-export Component for backward compatibility
export type { Component } from '../types/component.js';

/**
 * ECS 世界
 *
 * @example
 * ```ts
 * const world = new ECSWorld();
 * const entity = world.createEntity();
 * world.addComponent(entity, MyComponent, new MyComponent());
 * const entities = world.query(MyComponent);
 * ```
 */
export class ECSWorld {
  private nextEntityId = 0;
  private entities = new Set<Entity>();

  // 组件存储: Map<ComponentClass, Map<Entity, ComponentInstance>>
  // biome-ignore lint/suspicious/noExplicitAny: Generic component system requires any for type flexibility
  private components = new Map<any, Map<Entity, any>>();

  /**
   * 创建实体
   *
   * @returns 实体ID
   */
  createEntity(): Entity {
    const entity = this.nextEntityId++;
    this.entities.add(entity);
    return entity;
  }

  /**
   * 删除实体
   *
   * @param entity - 实体ID
   */
  removeEntity(entity: Entity): void {
    this.entities.delete(entity);

    // 删除所有组件
    for (const componentMap of this.components.values()) {
      componentMap.delete(entity);
    }
  }

  /**
   * 添加组件
   *
   * @param entity - 实体ID
   * @param componentClass - 组件类
   * @param component - 组件实例
   */
  addComponent<T extends Component>(
    entity: Entity,
    // biome-ignore lint/suspicious/noExplicitAny: Component constructor requires any for generic instantiation
    componentClass: new (...args: any[]) => T,
    component: T,
  ): void {
    let componentMap = this.components.get(componentClass);
    if (!componentMap) {
      componentMap = new Map();
      this.components.set(componentClass, componentMap);
    }
    componentMap.set(entity, component);
  }

  /**
   * 获取组件
   *
   * @param entity - 实体ID
   * @param componentClass - 组件类
   * @returns 组件实例或undefined
   */
  getComponent<T extends Component>(
    entity: Entity,
    // biome-ignore lint/suspicious/noExplicitAny: Component constructor requires any for generic instantiation
    componentClass: new (...args: any[]) => T,
  ): T | undefined {
    return this.components.get(componentClass)?.get(entity);
  }

  /**
   * 移除组件
   *
   * @param entity - 实体ID
   * @param componentClass - 组件类
   */
  removeComponent<T extends Component>(
    entity: Entity,
    // biome-ignore lint/suspicious/noExplicitAny: Component constructor requires any for generic instantiation
    componentClass: new (...args: any[]) => T,
  ): void {
    this.components.get(componentClass)?.delete(entity);
  }

  /**
   * 检查是否有组件
   *
   * @param entity - 实体ID
   * @param componentClass - 组件类
   * @returns 是否存在该组件
   */
  hasComponent<T extends Component>(
    entity: Entity,
    // biome-ignore lint/suspicious/noExplicitAny: Component constructor requires any for generic instantiation
    componentClass: new (...args: any[]) => T,
  ): boolean {
    return this.components.get(componentClass)?.has(entity) ?? false;
  }

  /**
   * 查询拥有指定组件的实体
   *
   * @param componentClasses - 组件类数组
   * @returns 实体ID数组
   */
  query<T extends Component>(...componentClasses: Array<new (...args: any[]) => T>): Entity[] {
    if (componentClasses.length === 0) return Array.from(this.entities);

    // 找到拥有最少实体的组件（优化查询性能）
    let smallestSet: Set<Entity> | undefined;
    let smallestSize = Infinity;

    for (const componentClass of componentClasses) {
      const componentMap = this.components.get(componentClass);
      if (!componentMap) return []; // 如果某个组件没有任何实体，直接返回空

      const size = componentMap.size;
      if (size < smallestSize) {
        smallestSize = size;
        smallestSet = new Set(componentMap.keys());
      }
    }

    if (!smallestSet) return [];

    // 过滤出同时拥有所有组件的实体
    const result: Entity[] = [];
    for (const entity of smallestSet) {
      if (componentClasses.every((cls) => this.hasComponent(entity, cls))) {
        result.push(entity);
      }
    }

    return result;
  }

  /**
   * 清空所有实体
   */
  clear(): void {
    this.entities.clear();
    this.components.clear();
    this.nextEntityId = 0;
  }

  /**
   * 获取统计信息
   *
   * @returns 统计数据
   */
  getStats() {
    return {
      entityCount: this.entities.size,
      componentTypeCount: this.components.size,
      componentCount: Array.from(this.components.values()).reduce((sum, map) => sum + map.size, 0),
    };
  }
}
