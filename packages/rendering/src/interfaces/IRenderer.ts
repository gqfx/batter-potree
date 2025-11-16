/**
 * 渲染器接口
 *
 * 定义了渲染引擎的核心抽象，支持不同的渲染后端（Three.js、Babylon.js 等）。
 *
 * @example
 * ```ts
 * class ThreeRenderer implements IRenderer {
 *   private renderer: THREE.WebGLRenderer;
 *
 *   constructor(canvas: HTMLCanvasElement) {
 *     this.renderer = new THREE.WebGLRenderer({ canvas });
 *   }
 *
 *   getContext(): WebGLRenderingContext | WebGL2RenderingContext {
 *     return this.renderer.getContext();
 *   }
 *
 *   setSize(width: number, height: number): void {
 *     this.renderer.setSize(width, height, false);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

import type { Color, Matrix4 } from '../types/common';
import type { IBuffer } from './IBuffer';
import type { IMaterial } from './IMaterial';

/**
 * 渲染器配置选项
 */
export interface RendererOptions {
  /** 画布元素 */
  readonly canvas?: HTMLCanvasElement;
  /** 抗锯齿 */
  readonly antialias?: boolean;
  /** 透明背景 */
  readonly alpha?: boolean;
  /** 深度缓冲 */
  readonly depth?: boolean;
  /** 模板缓冲 */
  readonly stencil?: boolean;
  /** 使用设备像素比 */
  readonly devicePixelRatio?: number;
}

/**
 * 渲染统计信息
 */
export interface RenderStats {
  /** 绘制调用次数 */
  readonly drawCalls: number;
  /** 渲染的三角形数量 */
  readonly triangles: number;
  /** 渲染的点数量 */
  readonly points: number;
  /** 使用的纹理数量 */
  readonly textures: number;
  /** 使用的着色器程序数量 */
  readonly programs: number;
}

/**
 * 视口信息
 */
export interface Viewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * 渲染器接口
 *
 * 定义了渲染上下文的核心功能，包括：
 * - 渲染循环控制
 * - 资源管理（缓冲区、材质等）
 * - 视口和画布管理
 * - 性能监控
 */
export interface IRenderer {
  /**
   * 获取 WebGL 上下文
   *
   * @returns WebGL 渲染上下文
   */
  getContext(): WebGLRenderingContext | WebGL2RenderingContext;

  /**
   * 获取画布元素
   *
   * @returns HTMLCanvasElement
   */
  getCanvas(): HTMLCanvasElement;

  /**
   * 设置画布大小
   *
   * @param width - 宽度（像素）
   * @param height - 高度（像素）
   */
  setSize(width: number, height: number): void;

  /**
   * 获取当前画布大小
   *
   * @returns 宽度和高度
   */
  getSize(): { width: number; height: number };

  /**
   * 设置视口
   *
   * @param viewport - 视口信息
   */
  setViewport(viewport: Viewport): void;

  /**
   * 获取当前视口
   *
   * @returns 视口信息
   */
  getViewport(): Viewport;

  /**
   * 设置清除颜色
   *
   * @param color - 背景颜色
   */
  setClearColor(color: Color): void;

  /**
   * 清除渲染缓冲区
   *
   * @param color - 是否清除颜色缓冲区
   * @param depth - 是否清除深度缓冲区
   * @param stencil - 是否清除模板缓冲区
   */
  clear(color: boolean, depth: boolean, stencil: boolean): void;

  /**
   * 设置视图矩阵
   *
   * @param matrix - 4x4 视图矩阵
   */
  setViewMatrix(matrix: Matrix4): void;

  /**
   * 设置投影矩阵
   *
   * @param matrix - 4x4 投影矩阵
   */
  setProjectionMatrix(matrix: Matrix4): void;

  /**
   * 获取当前视图矩阵
   *
   * @returns 4x4 视图矩阵
   */
  getViewMatrix(): Matrix4;

  /**
   * 获取当前投影矩阵
   *
   * @returns 4x4 投影矩阵
   */
  getProjectionMatrix(): Matrix4;

  /**
   * 渲染缓冲区数据
   *
   * @param buffer - 几何缓冲区
   * @param material - 材质
   * @param modelMatrix - 模型变换矩阵
   */
  render(buffer: IBuffer, material: IMaterial, modelMatrix: Matrix4): void;

  /**
   * 获取渲染统计信息
   *
   * @returns 统计信息
   */
  getStats(): RenderStats;

  /**
   * 重置渲染统计信息
   */
  resetStats(): void;

  /**
   * 释放渲染器资源
   */
  dispose(): void;
}
