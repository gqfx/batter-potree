/**
 * Pick material for GPU-based point cloud picking
 * @module @better-potree/rendering-three/materials
 */

import { PointSizeType } from '@better-potree/core';
import * as THREE from 'three';
import { getPickFragmentShader, getPickVertexShader } from '../shaders/index.js';

/**
 * Pick material configuration
 */
export interface PickMaterialConfig {
  /** Point size in pixels */
  size?: number;
  /** Minimum point size */
  minSize?: number;
  /** Maximum point size */
  maxSize?: number;
  /** Point size type */
  sizeType?: PointSizeType;
}

/**
 * PickMaterial - Material for GPU-based point picking
 *
 * This material renders point indices encoded as colors:
 * - RGB: point index (24-bit, up to 16,777,215 points per node)
 * - A: node index (8-bit, up to 255 nodes)
 *
 * Usage:
 * 1. Set uNodeIndex uniform before rendering each node
 * 2. Render nodes to a render target
 * 3. Read pixels to decode point index and node index
 *
 * @example
 * ```typescript
 * const pickMaterial = new PickMaterial({ size: 3 });
 *
 * // For each node
 * pickMaterial.setNodeIndex(nodeIndex);
 * renderer.render(node, camera);
 *
 * // Read back pixel at mouse position to get indices
 * const pixel = readPixel(x, y);
 * const pointIndex = pixel.r + pixel.g * 256 + pixel.b * 256 * 256;
 * const nodeIndex = pixel.a - 1; // -1 because we add 1 in shader
 * ```
 */
export class PickMaterial extends THREE.ShaderMaterial {
  private _size: number;
  private _minSize: number;
  private _maxSize: number;
  private _sizeType: PointSizeType;

  constructor(config: PickMaterialConfig = {}) {
    const size = config.size ?? 3.0;
    const minSize = config.minSize ?? 1.0;
    const maxSize = config.maxSize ?? 50.0;
    const sizeType = config.sizeType ?? PointSizeType.ATTENUATED;

    // Build shader defines
    const defines: Record<string, any> = {};

    switch (sizeType) {
      case PointSizeType.FIXED:
        defines.FIXED_POINT_SIZE = true;
        break;
      case PointSizeType.ATTENUATED:
        defines.ATTENUATED_POINT_SIZE = true;
        break;
      case PointSizeType.ADAPTIVE:
        defines.ADAPTIVE_POINT_SIZE = true;
        break;
    }

    // Create uniforms
    const uniforms = {
      // Screen uniforms
      uScreenWidth: { value: 1920 },
      uScreenHeight: { value: 1080 },
      fov: { value: Math.PI / 4 },

      // Camera uniforms
      uUseOrthographicCamera: { value: false },
      uOrthoWidth: { value: 1.0 },

      // Point size uniforms
      size: { value: size },
      minSize: { value: minSize },
      maxSize: { value: maxSize },
      uOctreeSpacing: { value: 1.0 },
      uLevel: { value: 0 },

      // Pick specific
      uNodeIndex: { value: 0.0 },
    };

    super({
      uniforms,
      defines,
      vertexShader: getPickVertexShader(),
      fragmentShader: getPickFragmentShader(),
      glslVersion: THREE.GLSL3,
      transparent: false,
      depthTest: true,
      depthWrite: true,
      blending: THREE.NoBlending,
    });

    this._size = size;
    this._minSize = minSize;
    this._maxSize = maxSize;
    this._sizeType = sizeType;
  }

  // Getters and setters
  public get size(): number {
    return this._size;
  }

  public set size(value: number) {
    this._size = value;
    if (this.uniforms?.size) {
      this.uniforms.size.value = value;
    }
  }

  public get minSize(): number {
    return this._minSize;
  }

  public set minSize(value: number) {
    this._minSize = value;
    if (this.uniforms?.minSize) {
      this.uniforms.minSize.value = value;
    }
  }

  public get maxSize(): number {
    return this._maxSize;
  }

  public set maxSize(value: number) {
    this._maxSize = value;
    if (this.uniforms?.maxSize) {
      this.uniforms.maxSize.value = value;
    }
  }

  public get sizeType(): PointSizeType {
    return this._sizeType;
  }

  public set sizeType(value: PointSizeType) {
    if (this._sizeType !== value) {
      this._sizeType = value;
      this._updateSizeTypeDefines();
      this.needsUpdate = true;
    }
  }

  /**
   * Set the current node index for rendering
   * @param index - Node index (0-254)
   */
  public setNodeIndex(index: number): void {
    if (this.uniforms?.uNodeIndex) {
      this.uniforms.uNodeIndex.value = index;
    }
  }

  /**
   * Update screen size uniforms
   */
  public updateScreenSize(width: number, height: number): void {
    if (this.uniforms?.uScreenWidth && this.uniforms?.uScreenHeight) {
      this.uniforms.uScreenWidth.value = width;
      this.uniforms.uScreenHeight.value = height;
    }
  }

  /**
   * Update camera uniforms
   */
  public updateCamera(camera: THREE.Camera): void {
    if (!this.uniforms) return;

    if (camera instanceof THREE.PerspectiveCamera) {
      if (this.uniforms.uUseOrthographicCamera) this.uniforms.uUseOrthographicCamera.value = false;
      if (this.uniforms.fov) this.uniforms.fov.value = (camera.fov * Math.PI) / 180;
    } else if (camera instanceof THREE.OrthographicCamera) {
      if (this.uniforms.uUseOrthographicCamera) this.uniforms.uUseOrthographicCamera.value = true;
      if (this.uniforms.uOrthoWidth) this.uniforms.uOrthoWidth.value = camera.right - camera.left;
    }
  }

  /**
   * Update octree spacing uniform
   */
  public updateOctreeSpacing(spacing: number): void {
    if (this.uniforms?.uOctreeSpacing) {
      this.uniforms.uOctreeSpacing.value = spacing;
    }
  }

  /**
   * Update octree level uniform
   */
  public updateLevel(level: number): void {
    if (this.uniforms?.uLevel) {
      this.uniforms.uLevel.value = level;
    }
  }

  private _updateSizeTypeDefines(): void {
    if (!this.defines) {
      this.defines = {};
    }

    delete this.defines.FIXED_POINT_SIZE;
    delete this.defines.ATTENUATED_POINT_SIZE;
    delete this.defines.ADAPTIVE_POINT_SIZE;

    switch (this._sizeType) {
      case PointSizeType.FIXED:
        this.defines.FIXED_POINT_SIZE = true;
        break;
      case PointSizeType.ATTENUATED:
        this.defines.ATTENUATED_POINT_SIZE = true;
        break;
      case PointSizeType.ADAPTIVE:
        this.defines.ADAPTIVE_POINT_SIZE = true;
        break;
    }
  }
}
