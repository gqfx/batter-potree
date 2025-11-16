/**
 * 材质接口
 *
 * 定义了材质系统的抽象，用于控制渲染对象的外观。
 *
 * @example
 * ```ts
 * const material: MaterialOptions = {
 *   type: 'points',
 *   pointSize: 2.0,
 *   color: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
 *   blendMode: BlendMode.NORMAL,
 *   depthTest: true,
 *   depthWrite: true,
 * };
 *
 * const mat = renderer.createMaterial(material);
 * mat.setUniform('uPointSize', 3.0);
 * ```
 *
 * @packageDocumentation
 */

import type { BlendMode, Color, DepthFunc } from '../types/common';
import type { IShader } from './IShader';

/**
 * 材质类型
 */
export enum MaterialType {
  /** 点渲染材质 */
  POINTS = 'points',
  /** 线渲染材质 */
  LINES = 'lines',
  /** 三角形渲染材质 */
  TRIANGLES = 'triangles',
  /** 自定义着色器材质 */
  CUSTOM = 'custom',
}

/**
 * 材质参数类型
 */
export type UniformValue =
  | number
  | number[]
  | Float32Array
  | Int32Array
  | Uint32Array
  | boolean
  | Color
  | { type: 'texture'; value: unknown };

/**
 * 材质配置选项
 */
export interface MaterialOptions {
  /** 材质类型 */
  readonly type: MaterialType;
  /** 基础颜色 */
  readonly color?: Color;
  /** 点大小（仅 POINTS 类型） */
  readonly pointSize?: number;
  /** 线宽（仅 LINES 类型） */
  readonly lineWidth?: number;
  /** 混合模式 */
  readonly blendMode?: BlendMode;
  /** 深度测试 */
  readonly depthTest?: boolean;
  /** 深度写入 */
  readonly depthWrite?: boolean;
  /** 深度测试函数 */
  readonly depthFunc?: DepthFunc;
  /** 透明度 */
  readonly opacity?: number;
  /** 是否透明 */
  readonly transparent?: boolean;
  /** 是否双面渲染 */
  readonly side?: 'front' | 'back' | 'double';
  /** 自定义 shader（仅 CUSTOM 类型） */
  readonly shader?: IShader;
  /** 自定义 uniforms */
  readonly uniforms?: Record<string, UniformValue>;
}

/**
 * 材质接口
 *
 * 提供材质的运行时控制，包括：
 * - 参数设置（颜色、透明度等）
 * - Uniform 变量管理
 * - 着色器程序绑定
 * - 资源管理
 */
export interface IMaterial {
  /**
   * 材质唯一 ID
   */
  readonly id: string;

  /**
   * 材质类型
   */
  readonly type: MaterialType;

  /**
   * 获取材质选项
   *
   * @returns 材质配置选项
   */
  getOptions(): Readonly<MaterialOptions>;

  /**
   * 设置基础颜色
   *
   * @param color - RGBA 颜色
   */
  setColor(color: Color): void;

  /**
   * 获取基础颜色
   *
   * @returns RGBA 颜色
   */
  getColor(): Color;

  /**
   * 设置透明度
   *
   * @param opacity - 透明度（0-1）
   */
  setOpacity(opacity: number): void;

  /**
   * 获取透明度
   *
   * @returns 透明度（0-1）
   */
  getOpacity(): number;

  /**
   * 设置点大小（仅 POINTS 类型）
   *
   * @param size - 点大小
   */
  setPointSize(size: number): void;

  /**
   * 设置 uniform 变量
   *
   * @param name - uniform 名称
   * @param value - uniform 值
   */
  setUniform(name: string, value: UniformValue): void;

  /**
   * 获取 uniform 变量
   *
   * @param name - uniform 名称
   * @returns uniform 值，如果不存在则返回 undefined
   */
  getUniform(name: string): UniformValue | undefined;

  /**
   * 获取所有 uniform 变量
   *
   * @returns uniform 变量映射表
   */
  getUniforms(): Readonly<Record<string, UniformValue>>;

  /**
   * 设置着色器程序
   *
   * @param shader - 着色器程序
   */
  setShader(shader: IShader): void;

  /**
   * 获取着色器程序
   *
   * @returns 着色器程序，如果未设置则返回 undefined
   */
  getShader(): IShader | undefined;

  /**
   * 启用深度测试
   *
   * @param enabled - 是否启用
   */
  setDepthTest(enabled: boolean): void;

  /**
   * 启用深度写入
   *
   * @param enabled - 是否启用
   */
  setDepthWrite(enabled: boolean): void;

  /**
   * 设置混合模式
   *
   * @param mode - 混合模式
   */
  setBlendMode(mode: BlendMode): void;

  /**
   * 克隆材质
   *
   * @returns 材质副本
   */
  clone(): IMaterial;

  /**
   * 释放材质资源
   */
  dispose(): void;
}
