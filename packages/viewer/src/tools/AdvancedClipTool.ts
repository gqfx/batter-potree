/**
 * Advanced Clip Tool
 *
 * Provides advanced clipping functionality for point clouds:
 * - Box clipping (axis-aligned or oriented)
 * - Plane clipping
 * - Sphere clipping
 * - Polygon clipping
 * - Multiple clip volumes with boolean operations
 *
 * @module tools
 * @example
 * ```typescript
 * const clipTool = new AdvancedClipTool(scene);
 *
 * // Add box clip volume
 * const box = new THREE.Box3(min, max);
 * const clipId = clipTool.addBoxClip(box);
 *
 * // Enable/disable clipping
 * clipTool.setClipEnabled(clipId, true);
 *
 * // Invert clipping (keep outside instead of inside)
 * clipTool.setClipInverted(clipId, true);
 * ```
 */

import { ClipMode, TypedEventEmitter } from '@better-potree/core';
import * as THREE from 'three';

/**
 * Local clip volume type enum
 * Extends core ClipVolumeType with 'plane' type
 */
export type LocalClipVolumeType = 'box' | 'sphere' | 'polygon' | 'plane';

/**
 * Clip volume configuration
 */
export interface ClipVolumeConfig {
  /** Unique ID */
  readonly id: string;
  /** Clip type */
  readonly type: LocalClipVolumeType;
  /** Enable state */
  enabled: boolean;
  /** Invert mode (clip outside instead of inside) */
  inverted: boolean;
  /** Clip mode */
  mode: ClipMode;
  /** Visualization color */
  color: THREE.ColorRepresentation;
  /** Visualization opacity */
  opacity: number;
}

/**
 * Box clip volume
 */
export interface BoxClipVolume extends ClipVolumeConfig {
  readonly type: 'box';
  /** Bounding box */
  box: THREE.Box3;
  /** Optional transform matrix */
  matrix: THREE.Matrix4 | undefined;
}

/**
 * Plane clip volume
 */
export interface PlaneClipVolume extends ClipVolumeConfig {
  readonly type: 'plane';
  /** Clipping plane */
  plane: THREE.Plane;
}

/**
 * Sphere clip volume
 */
export interface SphereClipVolume extends ClipVolumeConfig {
  readonly type: 'sphere';
  /** Bounding sphere */
  sphere: THREE.Sphere;
}

/**
 * Polygon clip volume
 */
export interface PolygonClipVolume extends ClipVolumeConfig {
  readonly type: 'polygon';
  /** Polygon points (in 3D space) */
  points: THREE.Vector3[];
  /** Extrusion height */
  height: number;
}

/**
 * Union type for all clip volumes
 */
export type ClipVolume = BoxClipVolume | PlaneClipVolume | SphereClipVolume | PolygonClipVolume;

/**
 * Clip tool events
 */
export interface ClipToolEvents {
  /** Fired when clip volume is added */
  'clip-added': { volume: ClipVolume };
  /** Fired when clip volume is removed */
  'clip-removed': { id: string };
  /** Fired when clip volume is updated */
  'clip-updated': { volume: ClipVolume };
  /** Fired when clip state changes */
  'clip-state-changed': { id: string; enabled: boolean; inverted: boolean };
  [key: string]: any;
}

/**
 * Clip tool configuration
 */
export interface ClipToolConfig {
  /** Default clip mode */
  readonly defaultMode?: ClipMode;
  /** Default visualization color */
  readonly defaultColor?: THREE.ColorRepresentation;
  /** Default visualization opacity */
  readonly defaultOpacity?: number;
  /** Show visualization */
  readonly showVisualization?: boolean;
}

/**
 * Advanced Clip Tool
 *
 * Manages multiple clip volumes with visualization and boolean operations.
 */
export class AdvancedClipTool extends TypedEventEmitter<ClipToolEvents> {
  private scene: THREE.Scene;
  private clipVolumes = new Map<string, ClipVolume>();
  private visualizations = new Map<string, THREE.Object3D>();
  private nextId = 0;

  // Configuration
  private config: Required<ClipToolConfig>;

  /**
   * Create advanced clip tool
   *
   * @param scene - Three.js scene for visualization
   * @param config - Tool configuration
   */
  constructor(scene: THREE.Scene, config: ClipToolConfig = {}) {
    super();

    this.scene = scene;

    this.config = {
      defaultMode: config.defaultMode ?? ClipMode.CLIP_OUTSIDE,
      defaultColor: config.defaultColor ?? 0xff0000,
      defaultOpacity: config.defaultOpacity ?? 0.3,
      showVisualization: config.showVisualization ?? true,
    };
  }

  /**
   * Add box clip volume
   *
   * @param box - Bounding box
   * @param matrix - Optional transform matrix
   * @param config - Optional clip configuration
   * @returns Clip volume ID
   */
  addBoxClip(
    box: THREE.Box3,
    matrix?: THREE.Matrix4,
    config?: Partial<Omit<ClipVolumeConfig, 'id' | 'type'>>
  ): string {
    const id = `clip-box-${this.nextId++}`;

    const volume: BoxClipVolume = {
      id,
      type: 'box',
      enabled: config?.enabled ?? true,
      inverted: config?.inverted ?? false,
      mode: config?.mode ?? this.config.defaultMode,
      color: config?.color ?? this.config.defaultColor,
      opacity: config?.opacity ?? this.config.defaultOpacity,
      box: box.clone(),
      matrix: matrix?.clone(),
    };

    this.clipVolumes.set(id, volume);

    if (this.config.showVisualization) {
      this.createBoxVisualization(volume);
    }

    this.emit('clip-added', { volume });

    return id;
  }

  /**
   * Add plane clip volume
   *
   * @param plane - Clipping plane
   * @param config - Optional clip configuration
   * @returns Clip volume ID
   */
  addPlaneClip(
    plane: THREE.Plane,
    config?: Partial<Omit<ClipVolumeConfig, 'id' | 'type'>>
  ): string {
    const id = `clip-plane-${this.nextId++}`;

    const volume: PlaneClipVolume = {
      id,
      type: 'plane',
      enabled: config?.enabled ?? true,
      inverted: config?.inverted ?? false,
      mode: config?.mode ?? this.config.defaultMode,
      color: config?.color ?? this.config.defaultColor,
      opacity: config?.opacity ?? this.config.defaultOpacity,
      plane: plane.clone(),
    };

    this.clipVolumes.set(id, volume);

    if (this.config.showVisualization) {
      this.createPlaneVisualization(volume);
    }

    this.emit('clip-added', { volume });

    return id;
  }

  /**
   * Add sphere clip volume
   *
   * @param sphere - Bounding sphere
   * @param config - Optional clip configuration
   * @returns Clip volume ID
   */
  addSphereClip(
    sphere: THREE.Sphere,
    config?: Partial<Omit<ClipVolumeConfig, 'id' | 'type'>>
  ): string {
    const id = `clip-sphere-${this.nextId++}`;

    const volume: SphereClipVolume = {
      id,
      type: 'sphere',
      enabled: config?.enabled ?? true,
      inverted: config?.inverted ?? false,
      mode: config?.mode ?? this.config.defaultMode,
      color: config?.color ?? this.config.defaultColor,
      opacity: config?.opacity ?? this.config.defaultOpacity,
      sphere: sphere.clone(),
    };

    this.clipVolumes.set(id, volume);

    if (this.config.showVisualization) {
      this.createSphereVisualization(volume);
    }

    this.emit('clip-added', { volume });

    return id;
  }

  /**
   * Add polygon clip volume
   *
   * @param points - Polygon points
   * @param height - Extrusion height
   * @param config - Optional clip configuration
   * @returns Clip volume ID
   */
  addPolygonClip(
    points: THREE.Vector3[],
    height: number,
    config?: Partial<Omit<ClipVolumeConfig, 'id' | 'type'>>
  ): string {
    const id = `clip-polygon-${this.nextId++}`;

    const volume: PolygonClipVolume = {
      id,
      type: 'polygon',
      enabled: config?.enabled ?? true,
      inverted: config?.inverted ?? false,
      mode: config?.mode ?? this.config.defaultMode,
      color: config?.color ?? this.config.defaultColor,
      opacity: config?.opacity ?? this.config.defaultOpacity,
      points: points.map((p) => p.clone()),
      height,
    };

    this.clipVolumes.set(id, volume);

    if (this.config.showVisualization) {
      this.createPolygonVisualization(volume);
    }

    this.emit('clip-added', { volume });

    return id;
  }

  /**
   * Remove clip volume
   *
   * @param id - Clip volume ID
   */
  removeClip(id: string): void {
    const volume = this.clipVolumes.get(id);
    if (!volume) {
      return;
    }

    this.clipVolumes.delete(id);
    this.removeVisualization(id);

    this.emit('clip-removed', { id });
  }

  /**
   * Enable or disable clip volume
   *
   * @param id - Clip volume ID
   * @param enabled - Enable state
   */
  setClipEnabled(id: string, enabled: boolean): void {
    const volume = this.clipVolumes.get(id);
    if (!volume) {
      return;
    }

    volume.enabled = enabled;

    const visualization = this.visualizations.get(id);
    if (visualization) {
      visualization.visible = enabled;
    }

    this.emit('clip-state-changed', {
      id,
      enabled: volume.enabled,
      inverted: volume.inverted,
    });
    this.emit('clip-updated', { volume });
  }

  /**
   * Invert clip volume
   *
   * @param id - Clip volume ID
   * @param inverted - Invert state
   */
  setClipInverted(id: string, inverted: boolean): void {
    const volume = this.clipVolumes.get(id);
    if (!volume) {
      return;
    }

    volume.inverted = inverted;

    this.emit('clip-state-changed', {
      id,
      enabled: volume.enabled,
      inverted: volume.inverted,
    });
    this.emit('clip-updated', { volume });
  }

  /**
   * Set clip mode
   *
   * @param id - Clip volume ID
   * @param mode - Clip mode
   */
  setClipMode(id: string, mode: ClipMode): void {
    const volume = this.clipVolumes.get(id);
    if (!volume) {
      return;
    }

    volume.mode = mode;

    this.emit('clip-updated', { volume });
  }

  /**
   * Update box clip volume
   *
   * @param id - Clip volume ID
   * @param box - New bounding box
   * @param matrix - Optional new transform matrix
   */
  updateBoxClip(id: string, box: THREE.Box3, matrix?: THREE.Matrix4): void {
    const volume = this.clipVolumes.get(id);
    if (!volume || volume.type !== 'box') {
      return;
    }

    (volume as BoxClipVolume).box = box.clone();
    (volume as BoxClipVolume).matrix = matrix?.clone();

    this.removeVisualization(id);
    if (this.config.showVisualization) {
      this.createBoxVisualization(volume as BoxClipVolume);
    }

    this.emit('clip-updated', { volume });
  }

  /**
   * Update plane clip volume
   *
   * @param id - Clip volume ID
   * @param plane - New clipping plane
   */
  updatePlaneClip(id: string, plane: THREE.Plane): void {
    const volume = this.clipVolumes.get(id);
    if (!volume || volume.type !== 'plane') {
      return;
    }

    (volume as PlaneClipVolume).plane = plane.clone();

    this.removeVisualization(id);
    if (this.config.showVisualization) {
      this.createPlaneVisualization(volume as PlaneClipVolume);
    }

    this.emit('clip-updated', { volume });
  }

  /**
   * Create box visualization
   *
   * @param volume - Box clip volume
   */
  private createBoxVisualization(volume: BoxClipVolume): void {
    const size = volume.box.getSize(new THREE.Vector3());
    const center = volume.box.getCenter(new THREE.Vector3());

    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({
      color: volume.color,
      transparent: true,
      opacity: volume.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);

    if (volume.matrix) {
      mesh.applyMatrix4(volume.matrix);
    }

    // Add wireframe
    const wireframe = new THREE.BoxHelper(mesh, volume.color);
    mesh.add(wireframe);

    this.scene.add(mesh);
    this.visualizations.set(volume.id, mesh);
  }

  /**
   * Create plane visualization
   *
   * @param volume - Plane clip volume
   */
  private createPlaneVisualization(volume: PlaneClipVolume): void {
    const size = 100; // Large plane for visualization
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
      color: volume.color,
      transparent: true,
      opacity: volume.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Position and orient plane
    const normal = volume.plane.normal;
    const distance = volume.plane.constant;

    mesh.position.copy(normal.clone().multiplyScalar(-distance));
    mesh.lookAt(mesh.position.clone().add(normal));

    // Add grid helper
    const gridHelper = new THREE.GridHelper(size, 10, volume.color, volume.color);
    gridHelper.rotation.x = Math.PI / 2;
    mesh.add(gridHelper);

    this.scene.add(mesh);
    this.visualizations.set(volume.id, mesh);
  }

  /**
   * Create sphere visualization
   *
   * @param volume - Sphere clip volume
   */
  private createSphereVisualization(volume: SphereClipVolume): void {
    const geometry = new THREE.SphereGeometry(volume.sphere.radius, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: volume.color,
      transparent: true,
      opacity: volume.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(volume.sphere.center);

    this.scene.add(mesh);
    this.visualizations.set(volume.id, mesh);
  }

  /**
   * Create polygon visualization
   *
   * @param volume - Polygon clip volume
   */
  private createPolygonVisualization(volume: PolygonClipVolume): void {
    // Create polygon shape
    const shape = new THREE.Shape();

    if (volume.points.length > 0) {
      const firstPoint = volume.points[0];
      if (firstPoint) {
        shape.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < volume.points.length; i++) {
          const point = volume.points[i];
          if (point) {
            shape.lineTo(point.x, point.y);
          }
        }
      }
    }

    // Extrude shape
    const extrudeSettings = {
      depth: volume.height,
      bevelEnabled: false,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshBasicMaterial({
      color: volume.color,
      transparent: true,
      opacity: volume.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Add wireframe
    const wireframeGeometry = new THREE.EdgesGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: volume.color });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    mesh.add(wireframe);

    this.scene.add(mesh);
    this.visualizations.set(volume.id, mesh);
  }

  /**
   * Remove visualization for clip volume
   *
   * @param id - Clip volume ID
   */
  private removeVisualization(id: string): void {
    const visualization = this.visualizations.get(id);
    if (!visualization) return;

    this.scene.remove(visualization);

    // Dispose geometry and materials
    if (visualization instanceof THREE.Mesh) {
      visualization.geometry.dispose();
      if (Array.isArray(visualization.material)) {
        visualization.material.forEach((mat) => mat.dispose());
      } else {
        visualization.material.dispose();
      }
    }

    this.visualizations.delete(id);
  }

  /**
   * Get clip volume by ID
   *
   * @param id - Clip volume ID
   * @returns Clip volume or undefined
   */
  getClip(id: string): ClipVolume | undefined {
    return this.clipVolumes.get(id);
  }

  /**
   * Get all clip volumes
   *
   * @returns Array of clip volumes
   */
  getAllClips(): ClipVolume[] {
    return Array.from(this.clipVolumes.values());
  }

  /**
   * Get enabled clip volumes
   *
   * @returns Array of enabled clip volumes
   */
  getEnabledClips(): ClipVolume[] {
    return Array.from(this.clipVolumes.values()).filter((v) => v.enabled);
  }

  /**
   * Clear all clip volumes
   */
  clearAllClips(): void {
    const ids = Array.from(this.clipVolumes.keys());
    ids.forEach((id) => this.removeClip(id));
  }

  /**
   * Get number of clip volumes
   *
   * @returns Count of clip volumes
   */
  getClipCount(): number {
    return this.clipVolumes.size;
  }

  /**
   * Export clip volumes to JSON
   *
   * @returns JSON representation
   */
  exportToJSON(): object {
    const clips: Record<string, any> = {};

    for (const [id, volume] of this.clipVolumes) {
      clips[id] = {
        type: volume.type,
        enabled: volume.enabled,
        inverted: volume.inverted,
        mode: volume.mode,
      };

      switch (volume.type) {
        case 'box':
          clips[id].box = {
            min: (volume as BoxClipVolume).box.min.toArray(),
            max: (volume as BoxClipVolume).box.max.toArray(),
          };
          if ((volume as BoxClipVolume).matrix) {
            clips[id].matrix = (volume as BoxClipVolume).matrix?.toArray();
          }
          break;

        case 'plane':
          clips[id].plane = {
            normal: (volume as PlaneClipVolume).plane.normal.toArray(),
            constant: (volume as PlaneClipVolume).plane.constant,
          };
          break;

        case 'sphere':
          clips[id].sphere = {
            center: (volume as SphereClipVolume).sphere.center.toArray(),
            radius: (volume as SphereClipVolume).sphere.radius,
          };
          break;

        case 'polygon':
          clips[id].points = (volume as PolygonClipVolume).points.map((p: THREE.Vector3) => p.toArray());
          clips[id].height = (volume as PolygonClipVolume).height;
          break;
      }
    }

    return { clips };
  }

  /**
   * Dispose tool and cleanup
   */
  dispose(): void {
    this.clearAllClips();
    this.removeAllListeners();
  }
}
