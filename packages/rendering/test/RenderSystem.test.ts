/**
 * RenderSystem 测试
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { IBuffer } from '../src/interfaces/IBuffer';
import type { IMaterial } from '../src/interfaces/IMaterial';
import type { IRenderer } from '../src/interfaces/IRenderer';
import type { RenderObject, } from '../src/systems/RenderSystem';
import { RenderSystem, SystemStage } from '../src/systems/RenderSystem';
import type { Matrix4 } from '../src/types/common';

/**
 * 测试用的 RenderSystem 实现
 */
class TestRenderSystem extends RenderSystem {
  public renderCallCount = 0;

  protected onRender(_deltaTime: number): void {
    this.renderCallCount++;
    // 渲染不透明对象
    for (const obj of this.renderQueue.opaque) {
      this.renderer.render(obj.buffer, obj.material, obj.modelMatrix);
    }
    // 渲染透明对象
    for (const obj of this.renderQueue.transparent) {
      this.renderer.render(obj.buffer, obj.material, obj.modelMatrix);
    }
  }
}

/**
 * Mock 渲染器
 */
class MockRenderer implements IRenderer {
  public renderCallCount = 0;
  private viewMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  private projectionMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  getContext(): any {
    return {};
  }
  getCanvas(): HTMLCanvasElement {
    return document.createElement('canvas');
  }
  setSize(_width: number, _height: number): void {}
  getSize() {
    return { width: 800, height: 600 };
  }
  setViewport(_viewport: any): void {}
  getViewport(): any {
    return { x: 0, y: 0, width: 800, height: 600 };
  }
  setClearColor(_color: any): void {}
  clear(_color: boolean, _depth: boolean, _stencil: boolean): void {}
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
    this.renderCallCount++;
  }
  getStats() {
    return { drawCalls: 0, triangles: 0, points: 0, textures: 0, programs: 0 };
  }
  resetStats(): void {}
  dispose(): void {}
}

/**
 * Mock 材质
 */
class MockMaterial implements IMaterial {
  readonly id = 'mock-material';
  readonly type: any = 'points';
  private transparent = false;

  constructor(transparent = false) {
    this.transparent = transparent;
  }

  getOptions() {
    return { type: this.type, transparent: this.transparent };
  }
  setColor(_color: any): void {}
  getColor(): any {
    return { r: 1, g: 1, b: 1, a: 1 };
  }
  setOpacity(_opacity: number): void {}
  getOpacity(): number {
    return 1;
  }
  setPointSize(_size: number): void {}
  setUniform(_name: string, _value: any): void {}
  getUniform(_name: string): any {
    return undefined;
  }
  getUniforms(): any {
    return {};
  }
  setShader(_shader: any): void {}
  getShader(): any {
    return undefined;
  }
  setDepthTest(_enabled: boolean): void {}
  setDepthWrite(_enabled: boolean): void {}
  setBlendMode(_mode: any): void {}
  clone(): IMaterial {
    return new MockMaterial(this.transparent);
  }
  dispose(): void {}
}

/**
 * Mock 缓冲区
 */
class MockBuffer implements IBuffer {
  readonly id = 'mock-buffer';

  getVertexCount(): number {
    return 100;
  }
  setVertexCount(_count: number): void {}
  getIndexCount(): number {
    return 0;
  }
  setAttribute(_name: string, _data: any): void {}
  getAttribute(_name: string): any {
    return undefined;
  }
  hasAttribute(_name: string): boolean {
    return false;
  }
  removeAttribute(_name: string): void {}
  getAttributeNames(): readonly string[] {
    return [];
  }
  updateAttribute(_name: string, _data: any, _offset: number, _count?: number): void {}
  setIndices(_indices: any): void {}
  getIndices(): any {
    return undefined;
  }
  setRenderMode(_mode: any): void {}
  getRenderMode(): any {
    return 'POINTS';
  }
  setBoundingBox(_boundingBox: any): void {}
  getBoundingBox(): any {
    return undefined;
  }
  computeBoundingBox(): any {
    return { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
  }
  clone(): IBuffer {
    return new MockBuffer();
  }
  dispose(): void {}
}

describe('RenderSystem', () => {
  let renderer: MockRenderer;
  let renderSystem: TestRenderSystem;

  beforeEach(() => {
    renderer = new MockRenderer();
    renderSystem = new TestRenderSystem('test-render', renderer);
  });

  it('应该能够创建渲染系统', () => {
    expect(renderSystem.name).toBe('test-render');
    expect(renderSystem.stage).toBe(SystemStage.RENDER);
    expect(renderSystem.priority).toBe(0);
  });

  it('应该能够初始化渲染系统', () => {
    expect(renderSystem.isInitialized).toBe(false);
    renderSystem.initialize();
    expect(renderSystem.isInitialized).toBe(true);
  });

  it('应该能够添加和移除渲染对象', () => {
    const buffer = new MockBuffer();
    const material = new MockMaterial(false);
    const modelMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    const obj: RenderObject = {
      buffer,
      material,
      modelMatrix,
      visible: true,
    };

    renderSystem.addRenderObject(obj);
    expect(renderSystem.renderQueue.opaque.length).toBe(1);

    renderSystem.removeRenderObject(obj);
    expect(renderSystem.renderQueue.opaque.length).toBe(0);
  });

  it('应该能够区分不透明和透明对象', () => {
    const buffer = new MockBuffer();
    const opaqueMaterial = new MockMaterial(false);
    const transparentMaterial = new MockMaterial(true);
    const modelMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    const opaqueObj: RenderObject = {
      buffer,
      material: opaqueMaterial,
      modelMatrix,
      visible: true,
    };

    const transparentObj: RenderObject = {
      buffer,
      material: transparentMaterial,
      modelMatrix,
      visible: true,
    };

    renderSystem.addRenderObject(opaqueObj);
    renderSystem.addRenderObject(transparentObj);

    expect(renderSystem.renderQueue.opaque.length).toBe(1);
    expect(renderSystem.renderQueue.transparent.length).toBe(1);
  });

  it('应该能够执行渲染循环', () => {
    const buffer = new MockBuffer();
    const material = new MockMaterial(false);
    const modelMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    const obj: RenderObject = {
      buffer,
      material,
      modelMatrix,
      visible: true,
    };

    renderSystem.addRenderObject(obj);
    renderSystem.update(0.016);

    expect(renderSystem.renderCallCount).toBe(1);
    expect(renderer.renderCallCount).toBe(1);
  });

  it('应该能够清空渲染队列', () => {
    const buffer = new MockBuffer();
    const material = new MockMaterial(false);
    const modelMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    const obj: RenderObject = {
      buffer,
      material,
      modelMatrix,
      visible: true,
    };

    renderSystem.addRenderObject(obj);
    expect(renderSystem.renderQueue.opaque.length).toBe(1);

    renderSystem.clearRenderQueue();
    expect(renderSystem.renderQueue.opaque.length).toBe(0);
    expect(renderSystem.renderQueue.transparent.length).toBe(0);
  });

  it('应该能够获取渲染器', () => {
    const result = renderSystem.getRenderer();
    expect(result).toBe(renderer);
  });

  it('应该能够销毁渲染系统', () => {
    const buffer = new MockBuffer();
    const material = new MockMaterial(false);
    const modelMatrix: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

    const obj: RenderObject = {
      buffer,
      material,
      modelMatrix,
      visible: true,
    };

    renderSystem.addRenderObject(obj);
    renderSystem.destroy();

    expect(renderSystem.renderQueue.opaque.length).toBe(0);
    expect(renderSystem.isInitialized).toBe(false);
  });
});
