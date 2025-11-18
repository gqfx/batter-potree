/**
 * EDL (Eye-Dome Lighting) Material
 *
 * Algorithm by Christian Boucheny
 * Adapted from CloudCompare EDL implementation:
 * https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
 * http://www.kitware.com/source/home/post/9
 * https://tel.archives-ouvertes.fr/tel-00438464/document p. 115+ (french)
 *
 * @module @better-potree/rendering-three/materials
 */

import * as THREE from 'three';
import { getEDLFragmentShader, getEDLVertexShader } from '../shaders/index.js';

/**
 * EDL Material configuration
 */
export interface EDLMaterialConfig {
  /** EDL strength (default: 1.0) */
  strength?: number;
  /** EDL radius in pixels (default: 1.4) */
  radius?: number;
  /** Opacity (default: 1.0) */
  opacity?: number;
  /** Number of neighbor samples (default: 8) */
  neighbourCount?: number;
}

/**
 * EDL Material - implements Eye-Dome Lighting post-processing effect
 *
 * EDL is a non-photorealistic shading technique that enhances depth perception
 * by darkening pixels based on depth discontinuities with their neighbors.
 *
 * @example
 * ```typescript
 * const edlMaterial = new EDLMaterial({
 *   strength: 1.0,
 *   radius: 1.4,
 *   neighbourCount: 8
 * });
 *
 * // Update uniforms before rendering
 * edlMaterial.updateUniforms(colorTexture, depthTexture, camera, width, height);
 * ```
 */
export class EDLMaterial extends THREE.ShaderMaterial {
  private _neighbourCount: number;
  private neighbours: Float32Array;

  constructor(config: EDLMaterialConfig = {}) {
    const strength = config.strength ?? 1.0;
    const radius = config.radius ?? 1.4;
    const opacity = config.opacity ?? 1.0;
    const neighbourCount = config.neighbourCount ?? 8;

    // Generate neighbor offsets in a circle
    const neighbours = new Float32Array(neighbourCount * 2);
    for (let c = 0; c < neighbourCount; c++) {
      neighbours[2 * c + 0] = Math.cos((2 * c * Math.PI) / neighbourCount);
      neighbours[2 * c + 1] = Math.sin((2 * c * Math.PI) / neighbourCount);
    }

    // Build shader defines
    const defines = {
      NEIGHBOUR_COUNT: neighbourCount,
    };

    // Create uniforms
    const uniforms = {
      // Screen size
      uScreenWidth: { value: 1920 },
      uScreenHeight: { value: 1080 },

      // EDL parameters
      uEDLStrength: { value: strength },
      uEDLRadius: { value: radius },
      uOpacity: { value: opacity },

      // Neighbor offsets
      uNeighbours: { value: neighbours },

      // Camera parameters
      uNear: { value: 0.1 },
      uFar: { value: 1000.0 },
      uProj: { value: new Float32Array(16) },

      // Textures
      uEDLColor: { value: null },
      uEDLDepth: { value: null },
    };

    // Call parent constructor
    super({
      uniforms,
      defines,
      vertexShader: getEDLVertexShader(),
      fragmentShader: getEDLFragmentShader(),
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this._neighbourCount = neighbourCount;
    this.neighbours = neighbours;
  }

  /**
   * Get number of neighbor samples
   */
  public get neighbourCount(): number {
    return this._neighbourCount;
  }

  /**
   * Set number of neighbor samples
   *
   * This will trigger a shader recompile.
   *
   * @param value - Number of neighbors (4, 8, or 16 recommended)
   */
  public set neighbourCount(value: number) {
    if (this._neighbourCount !== value) {
      this._neighbourCount = value;

      // Regenerate neighbor offsets
      this.neighbours = new Float32Array(value * 2);
      for (let c = 0; c < value; c++) {
        this.neighbours[2 * c + 0] = Math.cos((2 * c * Math.PI) / value);
        this.neighbours[2 * c + 1] = Math.sin((2 * c * Math.PI) / value);
      }

      // Update defines and uniforms
      if (this.defines) {
        this.defines.NEIGHBOUR_COUNT = value;
      }
      if (this.uniforms?.uNeighbours) {
        this.uniforms.uNeighbours.value = this.neighbours;
      }

      // Trigger shader recompile
      this.needsUpdate = true;
    }
  }

  /**
   * Get EDL strength
   */
  public get strength(): number {
    return this.uniforms?.uEDLStrength?.value ?? 1.0;
  }

  /**
   * Set EDL strength
   *
   * Higher values increase the darkening effect.
   *
   * @param value - EDL strength (typically 0.0 - 2.0)
   */
  public set strength(value: number) {
    if (this.uniforms?.uEDLStrength) {
      this.uniforms.uEDLStrength.value = value;
    }
  }

  /**
   * Get EDL radius
   */
  public get radius(): number {
    return this.uniforms?.uEDLRadius?.value ?? 1.4;
  }

  /**
   * Set EDL radius in pixels
   *
   * Larger radius samples neighbors further away.
   *
   * @param value - EDL radius in pixels (typically 1.0 - 3.0)
   */
  public set radius(value: number) {
    if (this.uniforms?.uEDLRadius) {
      this.uniforms.uEDLRadius.value = value;
    }
  }

  /**
   * Get opacity
   */
  public get opacity(): number {
    return this.uniforms?.uOpacity?.value ?? 1.0;
  }

  /**
   * Set opacity
   *
   * @param value - Opacity (0.0 - 1.0)
   */
  public set opacity(value: number) {
    if (this.uniforms?.uOpacity) {
      this.uniforms.uOpacity.value = value;
    }
  }

  /**
   * Update all uniforms before rendering
   *
   * This should be called once per frame before rendering with this material.
   *
   * @param colorTexture - Color texture with logarithmic depth in alpha channel
   * @param depthTexture - Depth texture
   * @param camera - Camera used for rendering
   * @param width - Screen width in pixels
   * @param height - Screen height in pixels
   *
   * @example
   * ```typescript
   * edlMaterial.updateUniforms(
   *   edlRenderTarget.texture,
   *   edlRenderTarget.depthTexture,
   *   camera,
   *   window.innerWidth,
   *   window.innerHeight
   * );
   * ```
   */
  public updateUniforms(
    colorTexture: THREE.Texture,
    depthTexture: THREE.Texture,
    camera: THREE.Camera,
    width: number,
    height: number
  ): void {
    if (!this.uniforms) return;

    // Update textures
    if (this.uniforms.uEDLColor) this.uniforms.uEDLColor.value = colorTexture;
    if (this.uniforms.uEDLDepth) this.uniforms.uEDLDepth.value = depthTexture;

    // Update screen size
    if (this.uniforms.uScreenWidth) this.uniforms.uScreenWidth.value = width;
    if (this.uniforms.uScreenHeight) this.uniforms.uScreenHeight.value = height;

    // Update camera parameters
    // Camera base class doesn't have near/far, check if it's PerspectiveCamera or OrthographicCamera
    if (
      camera instanceof THREE.PerspectiveCamera ||
      camera instanceof THREE.OrthographicCamera
    ) {
      if (this.uniforms.uNear) this.uniforms.uNear.value = camera.near;
      if (this.uniforms.uFar) this.uniforms.uFar.value = camera.far;
    }

    // Update projection matrix
    if (this.uniforms.uProj) {
      const projArray = new Float32Array(16);
      projArray.set(camera.projectionMatrix.elements);
      this.uniforms.uProj.value = projArray;
    }
  }
}
