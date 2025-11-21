/**
 * Point cloud material using Three.js ShaderMaterial
 * @module @better-potree/rendering-three/materials
 */

import {
  ClipMethod,
  ClipTask,
  PointCloudColorMode,
  PointShape,
  PointSizeType,
} from '@better-potree/core';
import * as THREE from 'three';
import { getPointCloudFragmentShader, getPointCloudVertexShader } from '../shaders/index.js';

/**
 * Attribute filter configuration
 */
export interface AttributeFilterConfig {
  /** Enable filter */
  readonly enabled: boolean;
  /** Filter range [min, max] */
  readonly range: readonly [number, number];
}

/**
 * Point cloud material configuration
 */
export interface PointCloudMaterialConfig {
  /** Point size in pixels */
  size?: number;
  /** Minimum point size */
  minSize?: number;
  /** Maximum point size */
  maxSize?: number;
  /** Point size type */
  sizeType?: PointSizeType;
  /** Point shape */
  shape?: PointShape;
  /** Color mode */
  colorMode?: PointCloudColorMode;
  /** Opacity */
  opacity?: number;
  /** Elevation range */
  elevationRange?: [number, number];
  /** Intensity range */
  intensityRange?: [number, number];
  /** Use EDL */
  useEDL?: boolean;
  /** Gradient texture */
  gradient?: THREE.Texture;
  /** Classification LUT texture */
  classificationLUT?: THREE.Texture;
  /** Enable GPU LOD traversal */
  enableGPULOD?: boolean;
  /** Visibility texture for GPU LOD */
  visibilityTexture?: THREE.Texture;
  /** Octree size for GPU LOD */
  octreeSize?: number;
  /** Node level for GPU LOD */
  level?: number;
  /** VN start index for GPU LOD */
  vnStart?: number;
  /** Clip task - what to do with points inside/outside clip boxes */
  clipTask?: ClipTask;
  /** Clip method - how to combine multiple clip boxes (AND/OR) */
  clipMethod?: ClipMethod;
  /** Clip boxes - array of 4x4 transformation matrices */
  clipBoxes?: THREE.Matrix4[];
  /** Shadow maps - array of shadow map textures */
  shadowMaps?: THREE.Texture[];
  /** Shadow world-view matrices - transform from world to light view space */
  shadowWorldView?: THREE.Matrix4[];
  /** Shadow projection matrices - transform from light view to clip space */
  shadowProj?: THREE.Matrix4[];
  /** Shadow color - color to use for shadowed areas (default: black) */
  shadowColor?: THREE.Color;
  /** GPS time filter range [min, max] (disabled by default) */
  filterGPSTimeRange?: [number, number];
  /** Return number filter range [min, max] (disabled by default) */
  filterReturnNumberRange?: [number, number];
  /** Number of returns filter range [min, max] (disabled by default) */
  filterNumberOfReturnsRange?: [number, number];
  /** Point source ID filter range [min, max] (disabled by default) */
  filterPointSourceIDRange?: [number, number];
}

/**
 * Point cloud material - extends Three.js ShaderMaterial
 */
export class PointCloudMaterial extends THREE.ShaderMaterial {
  private _size: number;
  private _minSize: number;
  private _maxSize: number;
  private _sizeType: PointSizeType;
  private _shape: PointShape;
  private _colorMode: PointCloudColorMode;

  constructor(config: PointCloudMaterialConfig = {}) {
    // Initialize configuration
    const size = config.size ?? 1.0;
    const minSize = config.minSize ?? 1.0;
    const maxSize = config.maxSize ?? 50.0;
    const sizeType = config.sizeType ?? PointSizeType.FIXED;
    const shape = config.shape ?? PointShape.SQUARE;
    const colorMode = config.colorMode ?? PointCloudColorMode.RGB;
    const opacity = config.opacity ?? 1.0;
    const elevationRange = config.elevationRange ?? [0, 1];
    const intensityRange = config.intensityRange ?? [0, 1];
    const useEDL = config.useEDL ?? false;
    const enableGPULOD = config.enableGPULOD ?? false;
    const octreeSize = config.octreeSize ?? 1.0;
    const level = config.level ?? 0;
    const vnStart = config.vnStart ?? 0;
    const clipTask = config.clipTask ?? ClipTask.NONE;
    const clipMethod = config.clipMethod ?? ClipMethod.INSIDE_ANY;
    const clipBoxes = config.clipBoxes ?? [];
    const shadowMaps = config.shadowMaps ?? [];
    const shadowWorldView = config.shadowWorldView ?? [];
    const shadowProj = config.shadowProj ?? [];
    const shadowColor = config.shadowColor ?? new THREE.Color(0, 0, 0);

    // Initialize attribute filters
    const filterGPSTimeRange = config.filterGPSTimeRange;
    const filterReturnNumberRange = config.filterReturnNumberRange;
    const filterNumberOfReturnsRange = config.filterNumberOfReturnsRange;
    const filterPointSourceIDRange = config.filterPointSourceIDRange;

    // Create default textures if not provided
    const gradient = config.gradient ?? PointCloudMaterial.createDefaultGradient();
    const classificationLUT =
      config.classificationLUT ?? PointCloudMaterial.createDefaultClassificationLUT();
    const visibilityTexture =
      config.visibilityTexture ?? PointCloudMaterial.createDefaultVisibilityTexture();

    // Build shader defines
    const defines: Record<string, any> = {};

    // Color mode defines
    switch (colorMode) {
      case PointCloudColorMode.RGB:
        defines.COLOR_TYPE_RGB = true;
        break;
      case PointCloudColorMode.INTENSITY:
        defines.COLOR_TYPE_INTENSITY = true;
        break;
      case PointCloudColorMode.CLASSIFICATION:
        defines.COLOR_TYPE_CLASSIFICATION = true;
        break;
      case PointCloudColorMode.ELEVATION:
        defines.COLOR_TYPE_ELEVATION = true;
        break;
      case PointCloudColorMode.RETURN_NUMBER:
        defines.COLOR_TYPE_RETURN_NUMBER = true;
        break;
      case PointCloudColorMode.NORMAL:
        defines.COLOR_TYPE_NORMAL = true;
        break;
      case PointCloudColorMode.LEVEL_OF_DETAIL:
        defines.COLOR_TYPE_LEVEL_OF_DETAIL = true;
        break;
      case PointCloudColorMode.MATCAP:
        defines.COLOR_TYPE_MATCAP = true;
        break;
      case PointCloudColorMode.GPS_TIME:
        defines.COLOR_TYPE_GPS_TIME = true;
        break;
      case PointCloudColorMode.POINT_INDEX:
        defines.COLOR_TYPE_POINT_INDEX = true;
        break;
      case PointCloudColorMode.COMPOSITE:
        defines.COLOR_TYPE_COMPOSITE = true;
        break;
    }

    // Point size type defines
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

    // Point shape defines
    switch (shape) {
      case PointShape.CIRCLE:
        defines.CIRCLE_POINT_SHAPE = true;
        break;
      case PointShape.PARABOLOID:
        defines.PARABOLOID_POINT_SHAPE = true;
        break;
    }

    // EDL define
    if (useEDL) {
      defines.USE_EDL = true;
    }

    // ClipBox defines
    if (clipBoxes.length > 0) {
      defines.num_clipboxes = clipBoxes.length;
    }

    // Shadow map defines
    if (shadowMaps.length > 0) {
      defines.num_shadowmaps = shadowMaps.length;
    }

    // Attribute filter defines
    if (filterGPSTimeRange) {
      defines.clip_gps_enabled = true;
    }
    if (filterReturnNumberRange) {
      defines.clip_return_number_enabled = true;
    }
    if (filterNumberOfReturnsRange) {
      defines.clip_number_of_returns_enabled = true;
    }
    if (filterPointSourceIDRange) {
      defines.clip_point_source_id_enabled = true;
    }

    // Create uniforms
    const uniforms = {
      // Screen uniforms
      uScreenWidth: { value: 1920 },
      uScreenHeight: { value: 1080 },
      fov: { value: Math.PI / 4 },
      near: { value: 0.1 },
      far: { value: 1000.0 },

      // Camera uniforms
      uUseOrthographicCamera: { value: false },
      uOrthoWidth: { value: 1.0 },
      uOrthoHeight: { value: 1.0 },

      // Point size uniforms
      size: { value: size },
      minSize: { value: minSize },
      maxSize: { value: maxSize },
      uOctreeSpacing: { value: 1.0 },

      // GPU LOD uniforms
      uEnableGPULOD: { value: enableGPULOD },
      visibilityTexture: { value: visibilityTexture },
      uVNStart: { value: vnStart },
      uLevel: { value: level },
      uOctreeSize: { value: octreeSize },
      uVisibilityTextureWidth: { value: visibilityTexture.image?.width ?? 1 },
      uVisibilityTextureHeight: { value: visibilityTexture.image?.height ?? 1 },

      // Color uniforms
      uColor: { value: new THREE.Color(1, 1, 1) },
      uOpacity: { value: opacity },
      elevationRange: { value: new THREE.Vector2(elevationRange[0], elevationRange[1]) },
      intensityRange: { value: new THREE.Vector2(intensityRange[0], intensityRange[1]) },

      // Texture uniforms
      gradient: { value: gradient },
      classificationLUT: { value: classificationLUT },

      // Clipping uniforms
      clipTask: { value: clipTask },
      clipMethod: { value: clipMethod },
      ...(clipBoxes.length > 0 && {
        clipBoxes: {
          value: clipBoxes.map((m) => m.elements),
        },
      }),

      // Shadow mapping uniforms
      ...(shadowMaps.length > 0 && {
        uShadowMap: { value: shadowMaps },
        uShadowWorldView: { value: shadowWorldView.map((m) => m.elements) },
        uShadowProj: { value: shadowProj.map((m) => m.elements) },
        uShadowColor: { value: new THREE.Vector3(shadowColor.r, shadowColor.g, shadowColor.b) },
      }),

      // Attribute filter uniforms
      ...(filterGPSTimeRange && {
        uFilterGPSTimeRange: { value: new THREE.Vector2(filterGPSTimeRange[0], filterGPSTimeRange[1]) },
      }),
      ...(filterReturnNumberRange && {
        uFilterReturnNumberRange: { value: new THREE.Vector2(filterReturnNumberRange[0], filterReturnNumberRange[1]) },
      }),
      ...(filterNumberOfReturnsRange && {
        uFilterNumberOfReturnsRange: { value: new THREE.Vector2(filterNumberOfReturnsRange[0], filterNumberOfReturnsRange[1]) },
      }),
      ...(filterPointSourceIDRange && {
        uFilterPointSourceIDRange: { value: new THREE.Vector2(filterPointSourceIDRange[0], filterPointSourceIDRange[1]) },
      }),
    };

    // Call parent constructor
    super({
      uniforms,
      defines,
      vertexShader: getPointCloudVertexShader(),
      fragmentShader: getPointCloudFragmentShader(),
      glslVersion: THREE.GLSL3, // Force GLSL ES 3.0
      transparent: opacity < 1.0,
      depthTest: true,
      depthWrite: true,
    });

    // Store private properties
    this._size = size;
    this._minSize = minSize;
    this._maxSize = maxSize;
    this._sizeType = sizeType;
    this._shape = shape;
    this._colorMode = colorMode;
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

  public get colorMode(): PointCloudColorMode {
    return this._colorMode;
  }

  public set colorMode(value: PointCloudColorMode) {
    if (this._colorMode !== value) {
      this._colorMode = value;
      this._updateColorModeDefines();
      this.needsUpdate = true;
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

  public get shape(): PointShape {
    return this._shape;
  }

  public set shape(value: PointShape) {
    if (this._shape !== value) {
      this._shape = value;
      this._updateShapeDefines();
      this.needsUpdate = true;
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
      if (this.uniforms.near) this.uniforms.near.value = camera.near;
      if (this.uniforms.far) this.uniforms.far.value = camera.far;
    } else if (camera instanceof THREE.OrthographicCamera) {
      if (this.uniforms.uUseOrthographicCamera) this.uniforms.uUseOrthographicCamera.value = true;
      if (this.uniforms.uOrthoWidth) this.uniforms.uOrthoWidth.value = camera.right - camera.left;
      if (this.uniforms.uOrthoHeight) this.uniforms.uOrthoHeight.value = camera.top - camera.bottom;
      if (this.uniforms.near) this.uniforms.near.value = camera.near;
      if (this.uniforms.far) this.uniforms.far.value = camera.far;
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
   * Enable or disable GPU LOD traversal
   *
   * @param enabled - Whether to enable GPU LOD
   */
  public setGPULODEnabled(enabled: boolean): void {
    if (this.uniforms?.uEnableGPULOD) {
      this.uniforms.uEnableGPULOD.value = enabled;
    }
  }

  /**
   * Update GPU LOD parameters for the current node
   *
   * @param vnStart - VN start index for this node
   * @param level - Octree level of this node
   * @param octreeSize - Total octree size
   */
  public updateGPULODParams(vnStart: number, level: number, octreeSize: number): void {
    if (this.uniforms) {
      if (this.uniforms.uVNStart) this.uniforms.uVNStart.value = vnStart;
      if (this.uniforms.uLevel) this.uniforms.uLevel.value = level;
      if (this.uniforms.uOctreeSize) this.uniforms.uOctreeSize.value = octreeSize;
    }
  }

  /**
   * Update visibility texture for GPU LOD traversal
   *
   * @param texture - The visibility texture containing octree traversal data
   */
  public updateVisibilityTexture(texture: THREE.Texture): void {
    if (this.uniforms) {
      if (this.uniforms.visibilityTexture) this.uniforms.visibilityTexture.value = texture;
      if (this.uniforms.uVisibilityTextureWidth) {
        this.uniforms.uVisibilityTextureWidth.value = texture.image?.width ?? 1;
      }
      if (this.uniforms.uVisibilityTextureHeight) {
        this.uniforms.uVisibilityTextureHeight.value = texture.image?.height ?? 1;
      }
    }
  }

  /**
   * Set clip boxes for point cloud clipping
   *
   * Updates the clip boxes used for clipping. This will trigger a shader recompile
   * if the number of clip boxes changes.
   *
   * @param clipBoxes - Array of transformation matrices for clip boxes (max 8)
   *
   * @example
   * ```typescript
   * const box = new THREE.Matrix4();
   * box.makeTranslation(0, 0, 0);
   * box.scale(new THREE.Vector3(10, 10, 10));
   * material.setClipBoxes([box]);
   * ```
   */
  public setClipBoxes(clipBoxes: THREE.Matrix4[]): void {
    if (!this.defines) {
      this.defines = {};
    }

    const oldCount = this.defines.num_clipboxes ?? 0;
    const newCount = clipBoxes.length;

    // Update define if count changed
    if (newCount !== oldCount) {
      if (newCount > 0) {
        this.defines.num_clipboxes = newCount;
      } else {
        delete this.defines.num_clipboxes;
      }
      this.needsUpdate = true; // Trigger shader recompile
    }

    // Update uniforms
    if (this.uniforms) {
      if (newCount > 0) {
        if (!this.uniforms.clipBoxes) {
          this.uniforms.clipBoxes = { value: [] };
        }
        this.uniforms.clipBoxes.value = clipBoxes.map((m) => m.elements);
      } else if (this.uniforms.clipBoxes) {
        delete this.uniforms.clipBoxes;
      }
    }
  }

  /**
   * Set clip task
   *
   * Determines how points inside/outside clip boxes are handled.
   *
   * @param task - The clip task (NONE, HIGHLIGHT, SHOW_INSIDE, SHOW_OUTSIDE)
   *
   * @example
   * ```typescript
   * // Highlight points inside clip boxes
   * material.setClipTask(ClipTask.HIGHLIGHT);
   *
   * // Only show points inside clip boxes
   * material.setClipTask(ClipTask.SHOW_INSIDE);
   * ```
   */
  public setClipTask(task: ClipTask): void {
    if (this.uniforms?.clipTask) {
      this.uniforms.clipTask.value = task;
    }
  }

  /**
   * Set clip method
   *
   * Determines how multiple clip boxes are combined.
   *
   * @param method - The clip method (INSIDE_ANY for OR, INSIDE_ALL for AND)
   *
   * @example
   * ```typescript
   * // Show points inside ANY clip box (OR logic)
   * material.setClipMethod(ClipMethod.INSIDE_ANY);
   *
   * // Show points inside ALL clip boxes (AND logic)
   * material.setClipMethod(ClipMethod.INSIDE_ALL);
   * ```
   */
  public setClipMethod(method: ClipMethod): void {
    if (this.uniforms?.clipMethod) {
      this.uniforms.clipMethod.value = method;
    }
  }

  /**
   * Set shadow maps for shadow mapping
   *
   * Updates the shadow maps, view matrices, and projection matrices.
   * This will trigger a shader recompile if the number of shadow maps changes.
   *
   * @param shadowMaps - Array of shadow map textures
   * @param shadowWorldView - Array of world-to-light-view transformation matrices
   * @param shadowProj - Array of light-view-to-clip projection matrices
   *
   * @example
   * ```typescript
   * const shadowMap = new THREE.WebGLRenderTarget(1024, 1024);
   * const lightView = new THREE.Matrix4().lookAt(
   *   new THREE.Vector3(10, 10, 10),
   *   new THREE.Vector3(0, 0, 0),
   *   new THREE.Vector3(0, 1, 0)
   * );
   * const lightProj = new THREE.Matrix4().makePerspective(-10, 10, 10, -10, 0.1, 100);
   * material.setShadowMaps([shadowMap.texture], [lightView], [lightProj]);
   * ```
   */
  public setShadowMaps(
    shadowMaps: THREE.Texture[],
    shadowWorldView: THREE.Matrix4[],
    shadowProj: THREE.Matrix4[],
  ): void {
    if (!this.defines) {
      this.defines = {};
    }

    const oldCount = this.defines.num_shadowmaps ?? 0;
    const newCount = shadowMaps.length;

    // Update define if count changed
    if (newCount !== oldCount) {
      if (newCount > 0) {
        this.defines.num_shadowmaps = newCount;
      } else {
        delete this.defines.num_shadowmaps;
      }
      // Trigger shader recompile
      this.needsUpdate = true;
    }

    // Update uniforms
    if (this.uniforms) {
      if (newCount > 0) {
        if (!this.uniforms.uShadowMap) {
          this.uniforms.uShadowMap = { value: [] };
        }
        if (!this.uniforms.uShadowWorldView) {
          this.uniforms.uShadowWorldView = { value: [] };
        }
        if (!this.uniforms.uShadowProj) {
          this.uniforms.uShadowProj = { value: [] };
        }
        this.uniforms.uShadowMap.value = shadowMaps;
        this.uniforms.uShadowWorldView.value = shadowWorldView.map((m) => m.elements);
        this.uniforms.uShadowProj.value = shadowProj.map((m) => m.elements);
      } else {
        delete this.uniforms.uShadowMap;
        delete this.uniforms.uShadowWorldView;
        delete this.uniforms.uShadowProj;
      }
    }
  }

  /**
   * Set shadow color
   *
   * Sets the color to use for shadowed areas. Default is black (0, 0, 0).
   *
   * @param color - The shadow color
   *
   * @example
   * ```typescript
   * // Dark gray shadows
   * material.setShadowColor(new THREE.Color(0.3, 0.3, 0.3));
   *
   * // Blue-tinted shadows
   * material.setShadowColor(new THREE.Color(0.1, 0.1, 0.3));
   * ```
   */
  public setShadowColor(color: THREE.Color): void {
    if (this.uniforms?.uShadowColor) {
      this.uniforms.uShadowColor.value.set(color.r, color.g, color.b);
    } else if (this.uniforms) {
      this.uniforms.uShadowColor = {
        value: new THREE.Vector3(color.r, color.g, color.b),
      };
    }
  }


  /**
 * Set GPS time filter range
 *
 * Filters points based on GPS time. Points outside the range will not be rendered.
 * Set to null to disable filtering.
 *
 * @param range - GPS time range [min, max] or null to disable
 *
 * @example
 * ```typescript
 * // Filter points with GPS time between 1000 and 2000
 * material.setFilterGPSTimeRange([1000, 2000]);
 *
 * // Disable GPS time filtering
 * material.setFilterGPSTimeRange(null);
 * ```
 */
public setFilterGPSTimeRange(range: [number, number] | null): void {
  if (!this.defines) {
    this.defines = {};
  }

  const wasEnabled = !!this.defines.clip_gps_enabled;
  const isEnabled = range !== null;

  if (wasEnabled !== isEnabled) {
    if (isEnabled) {
      this.defines.clip_gps_enabled = true;
    } else {
      delete this.defines.clip_gps_enabled;
    }
    this.needsUpdate = true;
  }

  if (this.uniforms) {
    if (range) {
      if (!this.uniforms.uFilterGPSTimeRange) {
        this.uniforms.uFilterGPSTimeRange = { value: new THREE.Vector2() };
      }
      this.uniforms.uFilterGPSTimeRange.value.set(range[0], range[1]);
    } else if (this.uniforms.uFilterGPSTimeRange) {
      delete this.uniforms.uFilterGPSTimeRange;
    }
  }
}

/**
 * Set return number filter range
 *
 * Filters points based on return number. Points outside the range will not be rendered.
 * Set to null to disable filtering.
 *
 * @param range - Return number range [min, max] or null to disable
 *
 * @example
 * ```typescript
 * // Show only first returns
 * material.setFilterReturnNumberRange([1, 1]);
 *
 * // Disable return number filtering
 * material.setFilterReturnNumberRange(null);
 * ```
 */
public setFilterReturnNumberRange(range: [number, number] | null): void {
  if (!this.defines) {
    this.defines = {};
  }

  const wasEnabled = !!this.defines.clip_return_number_enabled;
  const isEnabled = range !== null;

  if (wasEnabled !== isEnabled) {
    if (isEnabled) {
      this.defines.clip_return_number_enabled = true;
    } else {
      delete this.defines.clip_return_number_enabled;
    }
    this.needsUpdate = true;
  }

  if (this.uniforms) {
    if (range) {
      if (!this.uniforms.uFilterReturnNumberRange) {
        this.uniforms.uFilterReturnNumberRange = { value: new THREE.Vector2() };
      }
      this.uniforms.uFilterReturnNumberRange.value.set(range[0], range[1]);
    } else if (this.uniforms.uFilterReturnNumberRange) {
      delete this.uniforms.uFilterReturnNumberRange;
    }
  }
}

/**
 * Set number of returns filter range
 *
 * Filters points based on number of returns. Points outside the range will not be rendered.
 * Set to null to disable filtering.
 *
 * @param range - Number of returns range [min, max] or null to disable
 *
 * @example
 * ```typescript
 * // Show only points with 2 or more returns
 * material.setFilterNumberOfReturnsRange([2, 15]);
 *
 * // Disable number of returns filtering
 * material.setFilterNumberOfReturnsRange(null);
 * ```
 */
public setFilterNumberOfReturnsRange(range: [number, number] | null): void {
  if (!this.defines) {
    this.defines = {};
  }

  const wasEnabled = !!this.defines.clip_number_of_returns_enabled;
  const isEnabled = range !== null;

  if (wasEnabled !== isEnabled) {
    if (isEnabled) {
      this.defines.clip_number_of_returns_enabled = true;
    } else {
      delete this.defines.clip_number_of_returns_enabled;
    }
    this.needsUpdate = true;
  }

  if (this.uniforms) {
    if (range) {
      if (!this.uniforms.uFilterNumberOfReturnsRange) {
        this.uniforms.uFilterNumberOfReturnsRange = { value: new THREE.Vector2() };
      }
      this.uniforms.uFilterNumberOfReturnsRange.value.set(range[0], range[1]);
    } else if (this.uniforms.uFilterNumberOfReturnsRange) {
      delete this.uniforms.uFilterNumberOfReturnsRange;
    }
  }
}

/**
 * Set point source ID filter range
 *
 * Filters points based on point source ID. Points outside the range will not be rendered.
 * Set to null to disable filtering.
 *
 * @param range - Point source ID range [min, max] or null to disable
 *
 * @example
 * ```typescript
 * // Show only points from sources 1-5
 * material.setFilterPointSourceIDRange([1, 5]);
 *
 * // Disable point source ID filtering
 * material.setFilterPointSourceIDRange(null);
 * ```
 */
public setFilterPointSourceIDRange(range: [number, number] | null): void {
  if (!this.defines) {
    this.defines = {};
  }

  const wasEnabled = !!this.defines.clip_point_source_id_enabled;
  const isEnabled = range !== null;

  if (wasEnabled !== isEnabled) {
    if (isEnabled) {
      this.defines.clip_point_source_id_enabled = true;
    } else {
      delete this.defines.clip_point_source_id_enabled;
    }
    this.needsUpdate = true;
  }

  if (this.uniforms) {
    if (range) {
      if (!this.uniforms.uFilterPointSourceIDRange) {
        this.uniforms.uFilterPointSourceIDRange = { value: new THREE.Vector3() };
      }
      this.uniforms.uFilterPointSourceIDRange.value.set(range[0], range[1]);
    } else if (this.uniforms.uFilterPointSourceIDRange) {
      delete this.uniforms.uFilterPointSourceIDRange;
    }
  }
}


  private _updateColorModeDefines(): void {
    if (!this.defines) {
      this.defines = {};
    }

    // Clear all color mode defines
    delete this.defines.COLOR_TYPE_RGB;
    delete this.defines.COLOR_TYPE_INTENSITY;
    delete this.defines.COLOR_TYPE_CLASSIFICATION;
    delete this.defines.COLOR_TYPE_ELEVATION;
    delete this.defines.COLOR_TYPE_RETURN_NUMBER;
    delete this.defines.COLOR_TYPE_NORMAL;
    delete this.defines.COLOR_TYPE_LEVEL_OF_DETAIL;
    delete this.defines.COLOR_TYPE_MATCAP;
    delete this.defines.COLOR_TYPE_GPS_TIME;
    delete this.defines.COLOR_TYPE_POINT_INDEX;
    delete this.defines.COLOR_TYPE_COMPOSITE;

    // Set new define
    switch (this._colorMode) {
      case PointCloudColorMode.RGB:
        this.defines.COLOR_TYPE_RGB = true;
        break;
      case PointCloudColorMode.INTENSITY:
        this.defines.COLOR_TYPE_INTENSITY = true;
        break;
      case PointCloudColorMode.CLASSIFICATION:
        this.defines.COLOR_TYPE_CLASSIFICATION = true;
        break;
      case PointCloudColorMode.ELEVATION:
        this.defines.COLOR_TYPE_ELEVATION = true;
        break;
      case PointCloudColorMode.RETURN_NUMBER:
        this.defines.COLOR_TYPE_RETURN_NUMBER = true;
        break;
      case PointCloudColorMode.NORMAL:
        this.defines.COLOR_TYPE_NORMAL = true;
        break;
      case PointCloudColorMode.LEVEL_OF_DETAIL:
        this.defines.COLOR_TYPE_LEVEL_OF_DETAIL = true;
        break;
      case PointCloudColorMode.MATCAP:
        this.defines.COLOR_TYPE_MATCAP = true;
        break;
      case PointCloudColorMode.GPS_TIME:
        this.defines.COLOR_TYPE_GPS_TIME = true;
        break;
      case PointCloudColorMode.POINT_INDEX:
        this.defines.COLOR_TYPE_POINT_INDEX = true;
        break;
      case PointCloudColorMode.COMPOSITE:
        this.defines.COLOR_TYPE_COMPOSITE = true;
        break;
    }
  }

  private _updateSizeTypeDefines(): void {
    if (!this.defines) {
      this.defines = {};
    }

    // Clear all size type defines
    delete this.defines.FIXED_POINT_SIZE;
    delete this.defines.ATTENUATED_POINT_SIZE;
    delete this.defines.ADAPTIVE_POINT_SIZE;

    // Set new define
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

  private _updateShapeDefines(): void {
    if (!this.defines) {
      this.defines = {};
    }

    // Clear all shape defines
    delete this.defines.CIRCLE_POINT_SHAPE;
    delete this.defines.PARABOLOID_POINT_SHAPE;

    // Set new define
    switch (this._shape) {
      case PointShape.CIRCLE:
        this.defines.CIRCLE_POINT_SHAPE = true;
        break;
      case PointShape.PARABOLOID:
        this.defines.PARABOLOID_POINT_SHAPE = true;
        break;
    }
  }

  /**
   * Create a default gradient texture
   */
  private static createDefaultGradient(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Create a simple rainbow gradient
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0.0, '#0000ff');
    gradient.addColorStop(0.25, '#00ffff');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(0.75, '#ffff00');
    gradient.addColorStop(1.0, '#ff0000');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }

  /**
   * Create a default classification LUT texture
   */
  private static createDefaultClassificationLUT(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Fill with default colors
    const imageData = ctx.createImageData(256, 1);
    for (let i = 0; i < 256; i++) {
      const idx = i * 4;
      imageData.data[idx] = i; // R
      imageData.data[idx + 1] = i; // G
      imageData.data[idx + 2] = i; // B
      imageData.data[idx + 3] = 255; // A
    }
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }

  /**
   * Create a default visibility texture for GPU LOD
   *
   * Creates a 1x1 black texture that signals no child nodes exist.
   * This serves as a placeholder when GPU LOD is not enabled.
   *
   * @returns Default visibility texture
   */
  private static createDefaultVisibilityTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }

    // Fill with black (0,0,0,0) indicating no children
    const imageData = ctx.createImageData(1, 1);
    imageData.data[0] = 0; // R
    imageData.data[1] = 0; // G
    imageData.data[2] = 0; // B
    imageData.data[3] = 0; // A
    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return texture;
  }
}
