/**
 * 着色器接口
 *
 * 定义了着色器程序的抽象，支持顶点着色器和片段着色器。
 *
 * @example
 * ```ts
 * const shader: ShaderOptions = {
 *   vertexShader: `
 *     attribute vec3 position;
 *     uniform mat4 modelViewMatrix;
 *     uniform mat4 projectionMatrix;
 *     void main() {
 *       gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
 *     }
 *   `,
 *   fragmentShader: `
 *     precision mediump float;
 *     uniform vec4 color;
 *     void main() {
 *       gl_FragColor = color;
 *     }
 *   `,
 *   uniforms: {
 *     color: { r: 1.0, g: 0.0, b: 0.0, a: 1.0 },
 *   },
 * };
 *
 * const program = renderer.createShader(shader);
 * program.setUniform('color', { r: 0.0, g: 1.0, b: 0.0, a: 1.0 });
 * ```
 *
 * @packageDocumentation
 */

import type { UniformValue } from './IMaterial';

/**
 * 着色器属性定义
 */
export interface ShaderAttribute {
  /** 属性名称 */
  readonly name: string;
  /** 属性位置 */
  readonly location: number;
  /** 数据类型（如 'vec3', 'vec4', 'float'） */
  readonly type: string;
}

/**
 * 着色器 uniform 定义
 */
export interface ShaderUniform {
  /** uniform 名称 */
  readonly name: string;
  /** uniform 位置 */
  readonly location: WebGLUniformLocation;
  /** 数据类型（如 'mat4', 'vec4', 'float', 'sampler2D'） */
  readonly type: string;
}

/**
 * 着色器配置选项
 */
export interface ShaderOptions {
  /** 顶点着色器源码 */
  readonly vertexShader: string;
  /** 片段着色器源码 */
  readonly fragmentShader: string;
  /** 初始 uniform 值 */
  readonly uniforms?: Record<string, UniformValue>;
  /** 属性名称映射（将标准名称映射到着色器中的实际名称） */
  readonly attributeMap?: Record<string, string>;
}

/**
 * 着色器编译结果
 */
export interface ShaderCompileResult {
  /** 是否成功 */
  readonly success: boolean;
  /** 错误信息（如果失败） */
  readonly error?: string;
  /** 警告信息 */
  readonly warnings?: readonly string[];
}

/**
 * 着色器接口
 *
 * 提供着色器程序的运行时控制，包括：
 * - 编译和链接
 * - uniform 变量管理
 * - 属性绑定
 * - 资源管理
 */
export interface IShader {
  /**
   * 着色器程序唯一 ID
   */
  readonly id: string;

  /**
   * 获取 WebGL 程序对象
   *
   * @returns WebGLProgram
   */
  getProgram(): WebGLProgram;

  /**
   * 编译着色器
   *
   * @returns 编译结果
   */
  compile(): ShaderCompileResult;

  /**
   * 检查是否已编译
   *
   * @returns 是否已成功编译
   */
  isCompiled(): boolean;

  /**
   * 使用着色器程序
   */
  use(): void;

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
   * 获取所有 uniform 定义
   *
   * @returns uniform 定义列表
   */
  getUniforms(): readonly ShaderUniform[];

  /**
   * 获取 uniform 位置
   *
   * @param name - uniform 名称
   * @returns uniform 位置，如果不存在则返回 null
   */
  getUniformLocation(name: string): WebGLUniformLocation | null;

  /**
   * 获取所有属性定义
   *
   * @returns 属性定义列表
   */
  getAttributes(): readonly ShaderAttribute[];

  /**
   * 获取属性位置
   *
   * @param name - 属性名称
   * @returns 属性位置，如果不存在则返回 -1
   */
  getAttributeLocation(name: string): number;

  /**
   * 绑定属性到缓冲区
   *
   * @param name - 属性名称
   * @param buffer - WebGL 缓冲区
   * @param size - 每个顶点的分量数
   * @param type - 数据类型
   * @param normalized - 是否归一化
   * @param stride - 步长（字节）
   * @param offset - 偏移量（字节）
   */
  bindAttribute(
    name: string,
    buffer: WebGLBuffer,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
  ): void;

  /**
   * 获取顶点着色器源码
   *
   * @returns 顶点着色器源码
   */
  getVertexShaderSource(): string;

  /**
   * 获取片段着色器源码
   *
   * @returns 片段着色器源码
   */
  getFragmentShaderSource(): string;

  /**
   * 克隆着色器程序
   *
   * @returns 着色器程序副本
   */
  clone(): IShader;

  /**
   * 释放着色器资源
   */
  dispose(): void;
}
