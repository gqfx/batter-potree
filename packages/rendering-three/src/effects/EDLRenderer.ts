/**
 * EDL (Eye-Dome Lighting) Renderer
 *
 * Implements a two-pass rendering pipeline for Eye-Dome Lighting effect.
 * Pass 1: Render point cloud with logarithmic depth in alpha channel
 * Pass 2: Apply EDL shading based on depth discontinuities
 *
 * @module @better-potree/rendering-three/effects
 */

import * as THREE from 'three';
import { EDLMaterial } from '../materials/EDLMaterial.js';

/**
 * EDL Renderer configuration
 */
export interface EDLRendererConfig {
  /** EDL strength (default: 1.0) */
  edlStrength?: number;
  /** EDL radius in pixels (default: 1.4) */
  edlRadius?: number;
  /** EDL opacity (default: 1.0) */
  edlOpacity?: number;
  /** Number of neighbor samples (default: 8) */
  neighbourCount?: number;
}

/**
 * EDL Renderer
 *
 * Manages the EDL rendering pipeline using render targets and the EDL material.
 *
 * @example
 * ```typescript
 * const edlRenderer = new EDLRenderer(renderer, {
 *   edlStrength: 1.0,
 *   edlRadius: 1.4
 * });
 *
 * // Resize when window changes
 * edlRenderer.setSize(width, height);
 *
 * // Render with EDL
 * edlRenderer.render(scene, camera, outputTarget);
 *
 * // Cleanup when done
 * edlRenderer.dispose();
 * ```
 */
export class EDLRenderer {
  private renderer: THREE.WebGLRenderer;
  private edlMaterial: EDLMaterial;

  // Render targets
  private rtEDL: THREE.WebGLRenderTarget;
  private rtRegular: THREE.WebGLRenderTarget | null = null;

  // Full-screen quad for EDL pass
  private fullscreenQuad: THREE.Mesh;

  // Enabled flag
  private _enabled: boolean = true;

  constructor(renderer: THREE.WebGLRenderer, config: EDLRendererConfig = {}) {
    this.renderer = renderer;

    // Create EDL material
    this.edlMaterial = new EDLMaterial({
      strength: config.edlStrength ?? 1.0,
      radius: config.edlRadius ?? 1.4,
      opacity: config.edlOpacity ?? 1.0,
      neighbourCount: config.neighbourCount ?? 8,
    });

    // Create EDL render target (color + depth)
    this.rtEDL = new THREE.WebGLRenderTarget(1024, 1024, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType, // Use FloatType to preserve logarithmic depth precision
      depthTexture: new THREE.DepthTexture(1024, 1024, THREE.UnsignedIntType),
    });

    // Create fullscreen quad for EDL pass
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(quadGeometry, this.edlMaterial);
    this.fullscreenQuad.frustumCulled = false;
  }

  /**
   * Get EDL enabled state
   */
  public get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Enable or disable EDL rendering
   *
   * When disabled, only the regular pass will be rendered.
   */
  public set enabled(value: boolean) {
    this._enabled = value;
  }

  /**
   * Get EDL strength
   */
  public get strength(): number {
    return this.edlMaterial.strength;
  }

  /**
   * Set EDL strength
   *
   * @param value - EDL strength (typically 0.0 - 2.0)
   */
  public set strength(value: number) {
    this.edlMaterial.strength = value;
  }

  /**
   * Get EDL radius
   */
  public get radius(): number {
    return this.edlMaterial.radius;
  }

  /**
   * Set EDL radius in pixels
   *
   * @param value - EDL radius in pixels (typically 1.0 - 3.0)
   */
  public set radius(value: number) {
    this.edlMaterial.radius = value;
  }

  /**
   * Get EDL opacity
   */
  public get opacity(): number {
    return this.edlMaterial.opacity;
  }

  /**
   * Set EDL opacity
   *
   * @param value - Opacity (0.0 - 1.0)
   */
  public set opacity(value: number) {
    this.edlMaterial.opacity = value;
  }

  /**
   * Resize render targets
   *
   * Should be called when the viewport size changes.
   *
   * @param width - New width in pixels
   * @param height - New height in pixels
   */
  public setSize(width: number, height: number): void {
    this.rtEDL.setSize(width, height);
    if (this.rtRegular) {
      this.rtRegular.setSize(width, height);
    }
  }

  /**
   * Clear render targets
   *
   * Clears both color and depth buffers of all render targets.
   */
  public clear(): void {
    const oldTarget = this.renderer.getRenderTarget();

    // Clear EDL render target
    this.renderer.setRenderTarget(this.rtEDL);
    this.renderer.clear(true, true, true);

    // Clear regular render target if it exists
    if (this.rtRegular) {
      this.renderer.setRenderTarget(this.rtRegular);
      this.renderer.clear(true, true, false);
    }

    this.renderer.setRenderTarget(oldTarget);
  }

  /**
   * Render scene with EDL effect
   *
   * Performs a two-pass rendering:
   * 1. Render point cloud to EDL render target with log depth in alpha
   * 2. Apply EDL shading and composite to output target
   *
   * @param scene - Scene to render (must contain point cloud objects)
   * @param camera - Camera to use for rendering
   * @param outputTarget - Output render target (null = screen)
   * @param clearColor - Whether to clear color buffer before rendering (default: true)
   * @param clearDepth - Whether to clear depth buffer before rendering (default: true)
   *
   * @example
   * ```typescript
   * // Render with EDL to screen
   * edlRenderer.render(scene, camera, null);
   *
   * // Render with EDL to custom target
   * edlRenderer.render(scene, camera, myRenderTarget);
   * ```
   */
  public render(
    scene: THREE.Scene,
    camera: THREE.Camera,
    outputTarget: THREE.WebGLRenderTarget | null = null,
    clearColor: boolean = true,
    clearDepth: boolean = true
  ): void {
    const { width, height } = this.renderer.getSize(new THREE.Vector2());

    if (!this._enabled) {
      // If EDL is disabled, just render normally
      this.renderer.setRenderTarget(outputTarget);
      if (clearColor || clearDepth) {
        this.renderer.clear(clearColor, clearDepth, false);
      }
      this.renderer.render(scene, camera);
      return;
    }

    // Save current render target
    const oldTarget = this.renderer.getRenderTarget();
    const oldAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    // === PASS 1: Render point cloud with logarithmic depth ===
    this.renderer.setRenderTarget(this.rtEDL);
    if (clearColor || clearDepth) {
      this.renderer.clear(clearColor, clearDepth, false);
    }
    this.renderer.render(scene, camera);

    // === PASS 2: Apply EDL shading ===

    // Check that depth texture exists
    if (!this.rtEDL.depthTexture) {
      this.renderer.setRenderTarget(oldTarget);
      this.renderer.autoClear = oldAutoClear;
      return;
    }

    // Update EDL material uniforms
    this.edlMaterial.updateUniforms(
      this.rtEDL.texture,
      this.rtEDL.depthTexture,
      camera,
      width,
      height
    );

    // Render fullscreen quad with EDL material to output target
    this.renderer.setRenderTarget(outputTarget);

    // Clear output target if requested
    if (outputTarget && (clearColor || clearDepth)) {
      this.renderer.clear(clearColor, clearDepth, false);
    }

    // Create a minimal scene for the fullscreen quad
    const quadScene = new THREE.Scene();
    const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quadScene.add(this.fullscreenQuad);

    this.renderer.render(quadScene, quadCamera);

    // Restore previous render target and autoClear setting
    this.renderer.setRenderTarget(oldTarget);
    this.renderer.autoClear = oldAutoClear;
  }

  /**
   * Get EDL render target (for debugging)
   *
   * @returns The EDL render target containing color and depth
   */
  public getEDLRenderTarget(): THREE.WebGLRenderTarget {
    return this.rtEDL;
  }

  /**
   * Dispose of all resources
   *
   * Should be called when the EDL renderer is no longer needed.
   */
  public dispose(): void {
    this.rtEDL.dispose();
    if (this.rtRegular) {
      this.rtRegular.dispose();
    }
    this.fullscreenQuad.geometry.dispose();
    this.edlMaterial.dispose();
  }
}
