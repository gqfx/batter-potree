/**
 * Three.js WebGL2 renderer implementation
 * @module @better-potree/rendering-three
 */

import type { IRenderer, IScene } from '@better-potree/core';
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
  }

  /**
   * Render the scene with the given camera
   */
  public render(scene: IScene, camera: THREE.Camera): void {
    const threeScene = scene.getThreeScene?.();
    if (!threeScene) {
      throw new Error('Scene must provide getThreeScene() method');
    }

    this.renderer.clear();
    this.renderer.render(threeScene, camera);
  }

  /**
   * Set the size of the render target
   */
  public setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  /**
   * Get the underlying DOM element
   */
  public getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Get the underlying Three.js renderer
   */
  public getThreeRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * Dispose of renderer resources
   */
  public dispose(): void {
    this.renderer.dispose();
  }

  /**
   * Clear the renderer
   */
  public clear(color = true, depth = true, stencil = true): void {
    this.renderer.clear(color, depth, stencil);
  }

  /**
   * Get the WebGL2 rendering context
   */
  public getContext(): WebGL2RenderingContext {
    return this.renderer.getContext() as WebGL2RenderingContext;
  }

  /**
   * Enable/disable autoClear
   */
  public setAutoClear(value: boolean): void {
    this.renderer.autoClear = value;
  }

  /**
   * Enable/disable sortObjects
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
