/**
 * ECSWorld 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Component } from '../../types/component.js';
import { ECSWorld } from '../ECSWorld.js';

class PositionComponent implements Component {
  __componentType = 'Position';

  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}
}

class VelocityComponent implements Component {
  __componentType = 'Velocity';

  constructor(
    public vx = 0,
    public vy = 0,
    public vz = 0,
  ) {}
}

class HealthComponent implements Component {
  __componentType = 'Health';

  constructor(public health = 100) {}
}

describe('ECSWorld', () => {
  let world: ECSWorld;

  beforeEach(() => {
    world = new ECSWorld();
  });

  describe('实体管理', () => {
    it('应该能够创建实体', () => {
      const entity = world.createEntity();
      expect(entity).toBeDefined();
      expect(typeof entity).toBe('number');
    });

    it('应该生成唯一的实体ID', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      expect(entity1).not.toBe(entity2);
      expect(entity2).not.toBe(entity3);
      expect(entity1).not.toBe(entity3);
    });

    it('应该能够删除实体', () => {
      const entity = world.createEntity();
      world.addComponent(entity, PositionComponent, new PositionComponent());

      world.removeEntity(entity);

      const stats = world.getStats();
      expect(stats.entityCount).toBe(0);
    });

    it('删除实体应该移除其所有组件', () => {
      const entity = world.createEntity();
      world.addComponent(entity, PositionComponent, new PositionComponent());
      world.addComponent(entity, VelocityComponent, new VelocityComponent());

      world.removeEntity(entity);

      expect(world.getComponent(entity, PositionComponent)).toBeUndefined();
      expect(world.getComponent(entity, VelocityComponent)).toBeUndefined();
    });
  });

  describe('组件管理', () => {
    it('应该能够添加组件', () => {
      const entity = world.createEntity();
      const position = new PositionComponent(10, 20, 30);

      world.addComponent(entity, PositionComponent, position);

      const retrieved = world.getComponent(entity, PositionComponent);
      expect(retrieved).toBe(position);
      expect(retrieved?.x).toBe(10);
      expect(retrieved?.y).toBe(20);
      expect(retrieved?.z).toBe(30);
    });

    it('应该能够获取组件', () => {
      const entity = world.createEntity();
      const position = new PositionComponent(1, 2, 3);

      world.addComponent(entity, PositionComponent, position);

      const retrieved = world.getComponent(entity, PositionComponent);
      expect(retrieved).toBe(position);
    });

    it('应该在组件不存在时返回 undefined', () => {
      const entity = world.createEntity();

      const retrieved = world.getComponent(entity, PositionComponent);
      expect(retrieved).toBeUndefined();
    });

    it('应该能够移除组件', () => {
      const entity = world.createEntity();
      world.addComponent(entity, PositionComponent, new PositionComponent());

      world.removeComponent(entity, PositionComponent);

      expect(world.getComponent(entity, PositionComponent)).toBeUndefined();
    });

    it('应该能够检查组件是否存在', () => {
      const entity = world.createEntity();

      expect(world.hasComponent(entity, PositionComponent)).toBe(false);

      world.addComponent(entity, PositionComponent, new PositionComponent());

      expect(world.hasComponent(entity, PositionComponent)).toBe(true);
    });

    it('应该支持多个组件', () => {
      const entity = world.createEntity();
      const position = new PositionComponent(1, 2, 3);
      const velocity = new VelocityComponent(4, 5, 6);
      const health = new HealthComponent(80);

      world.addComponent(entity, PositionComponent, position);
      world.addComponent(entity, VelocityComponent, velocity);
      world.addComponent(entity, HealthComponent, health);

      expect(world.getComponent(entity, PositionComponent)).toBe(position);
      expect(world.getComponent(entity, VelocityComponent)).toBe(velocity);
      expect(world.getComponent(entity, HealthComponent)).toBe(health);
    });
  });

  describe('查询', () => {
    it('应该能够查询拥有单个组件的实体', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      world.addComponent(entity1, PositionComponent, new PositionComponent());
      world.addComponent(entity2, PositionComponent, new PositionComponent());
      // entity3 没有 Position 组件

      const entities = world.query(PositionComponent);

      expect(entities).toHaveLength(2);
      expect(entities).toContain(entity1);
      expect(entities).toContain(entity2);
      expect(entities).not.toContain(entity3);
    });

    it('应该能够查询拥有多个组件的实体', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      world.addComponent(entity1, PositionComponent, new PositionComponent());
      world.addComponent(entity1, VelocityComponent, new VelocityComponent());

      world.addComponent(entity2, PositionComponent, new PositionComponent());
      // entity2 没有 Velocity

      world.addComponent(entity3, VelocityComponent, new VelocityComponent());
      // entity3 没有 Position

      const entities = world.query(PositionComponent, VelocityComponent);

      expect(entities).toHaveLength(1);
      expect(entities).toContain(entity1);
    });

    it('应该在没有匹配实体时返回空数组', () => {
      const entity = world.createEntity();
      world.addComponent(entity, PositionComponent, new PositionComponent());

      const entities = world.query(VelocityComponent);

      expect(entities).toEqual([]);
    });

    it('应该在没有参数时返回所有实体', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      const entities = world.query();

      expect(entities).toHaveLength(3);
      expect(entities).toContain(entity1);
      expect(entities).toContain(entity2);
      expect(entities).toContain(entity3);
    });
  });

  describe('清空', () => {
    it('应该能够清空所有实体', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      world.addComponent(entity1, PositionComponent, new PositionComponent());
      world.addComponent(entity2, VelocityComponent, new VelocityComponent());

      world.clear();

      const stats = world.getStats();
      expect(stats.entityCount).toBe(0);
      expect(stats.componentTypeCount).toBe(0);
      expect(stats.componentCount).toBe(0);
    });

    it('清空后应该重置实体ID', () => {
      world.createEntity();
      world.createEntity();
      world.clear();

      const newEntity = world.createEntity();
      expect(newEntity).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该提供正确的统计信息', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      world.addComponent(entity1, PositionComponent, new PositionComponent());
      world.addComponent(entity1, VelocityComponent, new VelocityComponent());
      world.addComponent(entity2, HealthComponent, new HealthComponent());

      const stats = world.getStats();

      expect(stats.entityCount).toBe(2);
      expect(stats.componentTypeCount).toBe(3);
      expect(stats.componentCount).toBe(3);
    });
  });

  describe('性能测试', () => {
    it('10000实体查询应该小于 10ms', () => {
      // 创建实体
      const entities: number[] = [];
      for (let i = 0; i < 10000; i++) {
        const entity = world.createEntity();
        entities.push(entity);

        if (i % 2 === 0) {
          world.addComponent(entity, PositionComponent, new PositionComponent());
        }
        if (i % 3 === 0) {
          world.addComponent(entity, VelocityComponent, new VelocityComponent());
        }
      }

      // 查询
      const start = performance.now();
      const result = world.query(PositionComponent);
      const duration = performance.now() - start;

      expect(result.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(10);
    });
  });
});
