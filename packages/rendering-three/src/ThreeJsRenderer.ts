/**
 * Three.js WebGL2 renderer implementation
 * @module @better-potree/rendering-three
 */

import type { IScene } from '@better-potree/core';
import type {
  Color,
  IBuffer,
  IMaterial,
  IRenderer,
  Matrix4,
  RenderStats,
  Viewport,
} from '@better-potree/rendering';
import * as THREE from 'three';
import { assertWebGL2Available, checkWebGL2Support } from './utils/webgl2.js';

/**
 * Three.js renderer configuration
 */
export interface ThreeRendererConfig {
  /** Canvas element to render to */
  canvas?: HTMLCanvasElement;
  /** Enable anti-aliasing */
  antialias?: boolean;
  /** Enable alpha channel */
  alpha?: boolean;
  /** Premultiply alpha */
  premultipliedAlpha?: boolean;
  /** Preserve drawing buffer */
  preserveDrawingBuffer?: boolean;
  /** Pixel ratio */
  pixelRatio?: number;
}

/**
 * Three.js renderer implementation with forced WebGL2 context
 */
export class ThreeJsRenderer implements IRenderer {
  private renderer: THREE.WebGLRenderer;
  private viewMatrix: Matrix4;
  private projectionMatrix: Matrix4;
  private _drawCalls: number = 0;

  constructor(config: ThreeRendererConfig = {}) {
    // Check WebGL2 availability before creating renderer
    assertWebGL2Available();

    const canvas = config.canvas || document.createElement('canvas');

    // Verify WebGL2 support on the canvas
    const support = checkWebGL2Support(canvas);
    if (!support.available) {
      throw new Error(support.error || 'WebGL2 not available');
    }

    // Create renderer with WebGL2 context
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: support.context,
      antialias: config.antialias ?? true,
      alpha: config.alpha ?? false,
      premultipliedAlpha: config.premultipliedAlpha ?? false,
      preserveDrawingBuffer: config.preserveDrawingBuffer ?? false,
    });

    // Set pixel ratio
    const pixelRatio =
      config.pixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    this.renderer.setPixelRatio(pixelRatio);

    // Configure renderer
    this.renderer.sortObjects = false; // Important for point clouds
    this.renderer.autoClear = false; // We'll control clearing manually

    // Initialize matrices
    this.viewMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as Matrix4;

    this.projectionMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as Matrix4;
  }

  /**
   * Get WebGL rendering context
   *
   * @returns WebGL2 rendering context
   */
  public getContext(): WebGL2RenderingContext {
    return this.renderer.getContext() as WebGL2RenderingContext;
  }

  /**
   * Get canvas element
   *
   * @returns Canvas element
   */
  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Set canvas size
   *
   * @param width - Width in pixels
   * @param height - Height in pixels
   */
  public setSize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  /**
   * Get current canvas size
   *
   * @returns Width and height
   */
  public getSize(): { width: number; height: number } {
    const size = this.renderer.getSize(new THREE.Vector2());
    return { width: size.x, height: size.y };
  }

  /**
   * Set viewport
   *
   * @param viewport - Viewport info
   */
  public setViewport(viewport: Viewport): void {
    this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
  }

  /**
   * Get current viewport
   *
   * @returns Viewport info
   */
  public getViewport(): Viewport {
    const vp = this.renderer.getViewport(new THREE.Vector4());
    return {
      x: vp.x,
      y: vp.y,
      width: vp.z,
      height: vp.w,
    };
  }

  /**
   * Set clear color
   *
   * @param color - Background color
   */
  public setClearColor(color: Color): void {
    this.renderer.setClearColor(new THREE.Color(color.r, color.g, color.b), color.a);
  }

  /**
   * Clear render buffers
   *
   * @param color - Whether to clear color buffer
   * @param depth - Whether to clear depth buffer
   * @param stencil - Whether to clear stencil buffer
   */
  public clear(color: boolean, depth: boolean, stencil: boolean): void {
    this.renderer.clear(color, depth, stencil);
  }

  /**
   * Set view matrix
   *
   * @param matrix - 4x4 view matrix
   */
  public setViewMatrix(matrix: Matrix4): void {
    this.viewMatrix = matrix;
  }

  /**
   * Set projection matrix
   *
   * @param matrix - 4x4 projection matrix
   */
  public setProjectionMatrix(matrix: Matrix4): void {
    this.projectionMatrix = matrix;
  }

  /**
   * Get current view matrix
   *
   * @returns 4x4 view matrix
   */
  public getViewMatrix(): Matrix4 {
    return this.viewMatrix;
  }

  /**
   * Get current projection matrix
   *
   * @returns 4x4 projection matrix
   */
  public getProjectionMatrix(): Matrix4 {
    return this.projectionMatrix;
  }

  /**
   * Render buffer data
   *
   * @param _buffer - Geometry buffer
   * @param _material - Material
   * @param _modelMatrix - Model transform matrix
   */
  public render(_buffer: IBuffer, _material: IMaterial, _modelMatrix: Matrix4): void {
    // TODO: 实现具体的渲染逻辑
    // 这需要将抽象的 IBuffer 和 IMaterial 转换为 Three.js 对象
    this._drawCalls++;
  }

  /**
   * Get render statistics
   *
   * @returns Statistics
   */
  public getStats(): RenderStats {
    const info = this.renderer.info;
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
    };
  }

  /**
   * Reset render statistics
   */
  public resetStats(): void {
    this.renderer.info.reset();
    this._drawCalls = 0;
  }

  /**
   * Dispose of renderer resources
   */
  public dispose(): void {
    this.renderer.dispose();
  }

  // ===== Legacy methods for backward compatibility =====

  /**
   * Render the scene with the given camera (legacy method)
   *
   * @deprecated Use the RenderSystem instead
   */
  public renderScene(scene: IScene, camera: THREE.Camera): void {
    const threeScene = scene.getThreeScene?.();
    if (!threeScene) {
      throw new Error('Scene must provide getThreeScene() method');
    }

    this.renderer.clear();
    this.renderer.render(threeScene, camera);
  }

  /**
   * Get the underlying DOM element (legacy method)
   *
   * @deprecated Use getCanvas() instead
   */
  public getDomElement(): HTMLCanvasElement {
    return this.getCanvas();
  }

  /**
   * Get the underlying Three.js renderer
   *
   * @returns Three.js WebGLRenderer instance
   */
  public getThreeRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Enable/disable autoClear
   *
   * @param value - Whether to enable
   */
  public setAutoClear(value: boolean): void {
    this.renderer.autoClear = value;
  }

  /**
   * Enable/disable sortObjects
   *
   * @param value - Whether to enable
   */
  public setSortObjects(value: boolean): void {
    this.renderer.sortObjects = value;
  }
}

/**
 * Three.js scene manager implementation
 */
export class ThreeScene implements IScene {
  private scene: THREE.Scene;

  constructor() {
    this.scene = new THREE.Scene();
  }

  /**
   * Add an object to the scene
   */
  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remove an object from the scene
   */
  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Get the underlying Three.js scene
   */
  public getThreeScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * Clear all objects from the scene
   */
  public clear(): void {
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      if (child) {
        this.scene.remove(child);
      }
    }
  }

  /**
   * Dispose of scene resources
   */
  public dispose(): void {
    this.clear();
  }
}
