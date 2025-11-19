/**
 * 渲染器接口测试
 */

import { describe, expect, it } from 'vitest';
import type { IBuffer } from '../src/interfaces/IBuffer';
import type { IMaterial } from '../src/interfaces/IMaterial';
import type { IRenderer, RendererOptions, Viewport } from '../src/interfaces/IRenderer';
import type { Color, Matrix4 } from '../src/types/common';

/**
 * 模拟渲染器实现（用于测试）
 */
class MockRenderer implements IRenderer {
  private canvas: HTMLCanvasElement;
  private context: WebGL2RenderingContext;
  private viewport: Viewport;
  private viewMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  private projectionMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  constructor(options: RendererOptions = {}) {
    this.canvas = options.canvas ?? document.createElement('canvas');
    this.context = this.canvas.getContext('webgl2')!;
    this.viewport = { x: 0, y: 0, width: this.canvas.width, height: this.canvas.height };
  }

  getContext(): WebGL2RenderingContext {
    return this.context;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.viewport = { x: 0, y: 0, width, height };
  }

  getSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
  }

  getViewport(): Viewport {
    return this.viewport;
  }

  setClearColor(color: Color): void {
    this.clearColor = color;
  }

  clear(_color: boolean, _depth: boolean, _stencil: boolean): void {
    // Mock implementation
  }

  setViewMatrix(matrix: Matrix4): void {
    this.viewMatrix = matrix;
  }

  setProjectionMatrix(matrix: Matrix4): void {
    this.projectionMatrix = matrix;
  }

  getViewMatrix(): Matrix4 {
    return this.viewMatrix;
  }

  getProjectionMatrix(): Matrix4 {
    return this.projectionMatrix;
  }

  render(_buffer: IBuffer, _material: IMaterial, _modelMatrix: Matrix4): void {
    // Mock implementation
  }

  getStats() {
    return {
      drawCalls: 0,
      triangles: 0,
      points: 0,
      textures: 0,
      programs: 0,
    };
  }

  resetStats(): void {
    // Mock implementation
  }

  dispose(): void {
    // Mock implementation
  }
}

describe('IRenderer 接口', () => {
  it('应该能够创建渲染器实例', () => {
    const renderer = new MockRenderer();
    expect(renderer).toBeDefined();
    expect(renderer.getContext()).toBeDefined();
    expect(renderer.getCanvas()).toBeDefined();
  });

  it('应该能够设置和获取画布大小', () => {
    const renderer = new MockRenderer();
    renderer.setSize(800, 600);
    const size = renderer.getSize();
    expect(size.width).toBe(800);
    expect(size.height).toBe(600);
  });

  it('应该能够设置和获取视口', () => {
    const renderer = new MockRenderer();
    const viewport: Viewport = { x: 10, y: 20, width: 640, height: 480 };
    renderer.setViewport(viewport);
    const result = renderer.getViewport();
    expect(result).toEqual(viewport);
  });

  it('应该能够设置视图矩阵和投影矩阵', () => {
    const renderer = new MockRenderer();
    const viewMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -5, 1];
    const projMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];

    renderer.setViewMatrix(viewMatrix);
    renderer.setProjectionMatrix(projMatrix);

    expect(renderer.getViewMatrix()).toEqual(viewMatrix);
    expect(renderer.getProjectionMatrix()).toEqual(projMatrix);
  });

  it('应该能够获取渲染统计信息', () => {
    const renderer = new MockRenderer();
    const stats = renderer.getStats();
    expect(stats).toHaveProperty('drawCalls');
    expect(stats).toHaveProperty('triangles');
    expect(stats).toHaveProperty('points');
    expect(stats).toHaveProperty('textures');
    expect(stats).toHaveProperty('programs');
  });
});
