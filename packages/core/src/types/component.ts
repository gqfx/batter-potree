/**
 * ECS 组件系统类型定义
 *
 * @module types/component
 */

/**
 * 组件基础接口
 *
 * 所有 ECS 组件都应实现此接口。组件是纯数据容器，不包含逻辑。
 *
 * @example
 * ```typescript
 * // 定义一个具体的组件
 * export class Transform implements Component {
 *   __componentType = 'Transform';
 *
 *   constructor(
 *     public position: Vector3,
 *     public rotation: Vector3,
 *     public scale: Vector3
 *   ) {}
 * }
 *
 * // 定义另一个组件
 * export class Visibility implements Component {
 *   __componentType = 'Visibility';
 *
 *   constructor(public visible: boolean = true) {}
 * }
 * ```
 */
export interface Component {
  /**
   * 组件类型标识符（可选）
   *
   * 用于运行时类型识别和调试。建议设置为组件类名。
   *
   * @example
   * ```typescript
   * class MyComponent implements Component {
   *   __componentType = 'MyComponent';
   * }
   * ```
   */
  __componentType?: string;
}

/**
 * 实体 ID 类型
 *
 * 实体的唯一标识符，通常是字符串或数字
 */
export type EntityId = string | number;

/**
 * 组件构造函数类型
 *
 * 用于泛型约束和类型推断
 *
 * @template T - 组件类型
 *
 * @example
 * ```typescript
 * function getComponent<T extends Component>(
 *   entity: EntityId,
 *   componentType: ComponentConstructor<T>
 * ): T | undefined {
 *   // ...
 * }
 * ```
 */
export type ComponentConstructor<T extends Component = Component> = new (
  ...args: any[]
) => T;

/**
 * 组件查询接口
 *
 * 用于从 ECS 世界中查询包含特定组件的实体
 *
 * @example
 * ```typescript
 * const query: ComponentQuery = {
 *   all: [Transform, Visibility],
 *   any: [PotreeNodeData, GaussianSplatData],
 *   none: [Disabled]
 * };
 * ```
 */
export interface ComponentQuery {
  /**
   * 必须包含所有这些组件
   */
  readonly all?: ComponentConstructor[];

  /**
   * 必须包含至少一个这些组件
   */
  readonly any?: ComponentConstructor[];

  /**
   * 不能包含任何这些组件
   */
  readonly none?: ComponentConstructor[];
}
