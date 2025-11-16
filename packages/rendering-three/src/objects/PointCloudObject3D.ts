/**
 * Point cloud 3D object for Three.js scene graph
 * @module @better-potree/rendering-three/objects
 */

import * as THREE from 'three';
import {
  PointCloudMaterial,
  type PointCloudMaterialConfig,
} from '../materials/PointCloudMaterial.js';

/**
 * Point cloud visualization object
 * Wraps THREE.Points and manages point cloud geometry
 */
export class PointCloudObject3D extends THREE.Object3D {
  private material: PointCloudMaterial;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private _pointBudget: number;
  private _visiblePointCount: number;

  constructor(materialConfig?: PointCloudMaterialConfig) {
    super();

    // Create material
    this.material = new PointCloudMaterial(materialConfig);

    // Create geometry
    this.geometry = new THREE.BufferGeometry();

    // Create points object
    this.points = new THREE.Points(this.geometry, this.material);
    this.add(this.points);

    // Initialize properties
    this._pointBudget = 1_000_000;
    this._visiblePointCount = 0;
  }

  /**
   * Get the point budget
   */
  public get pointBudget(): number {
    return this._pointBudget;
  }

  /**
   * Set the point budget
   */
  public set pointBudget(value: number) {
    this._pointBudget = value;
  }

  /**
   * Get the number of visible points
   */
  public get visiblePointCount(): number {
    return this._visiblePointCount;
  }

  /**
   * Get the material
   */
  public getMaterial(): PointCloudMaterial {
    return this.material;
  }

  /**
   * Get the geometry
   */
  public getGeometry(): THREE.BufferGeometry {
    return this.geometry;
  }

  /**
   * Update geometry with new point data
   * @param positions - Float32Array of positions (x, y, z)
   * @param colors - Optional Float32Array of colors (r, g, b)
   * @param intensities - Optional Float32Array of intensities
   * @param classifications - Optional Float32Array of classifications
   * @param normals - Optional Float32Array of normals
   */
  public updateGeometry(
    positions: Float32Array,
    attributes?: {
      colors?: Float32Array;
      intensities?: Float32Array;
      classifications?: Float32Array;
      returnNumbers?: Float32Array;
      numberOfReturns?: Float32Array;
      normals?: Float32Array;
    },
  ): void {
    const pointCount = positions.length / 3;

    // Update position attribute - always create new attribute
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Update color attribute
    if (attributes?.colors) {
      this.geometry.setAttribute('color', new THREE.BufferAttribute(attributes.colors, 3));
    }

    // Update intensity attribute
    if (attributes?.intensities) {
      this.geometry.setAttribute('intensity', new THREE.BufferAttribute(attributes.intensities, 1));
    }

    // Update classification attribute
    if (attributes?.classifications) {
      this.geometry.setAttribute(
        'classification',
        new THREE.BufferAttribute(attributes.classifications, 1),
      );
    }

    // Update returnNumber attribute
    if (attributes?.returnNumbers) {
      this.geometry.setAttribute(
        'returnNumber',
        new THREE.BufferAttribute(attributes.returnNumbers, 1),
      );
    }

    // Update numberOfReturns attribute
    if (attributes?.numberOfReturns) {
      this.geometry.setAttribute(
        'numberOfReturns',
        new THREE.BufferAttribute(attributes.numberOfReturns, 1),
      );
    }

    // Update normal attribute
    if (attributes?.normals) {
      this.geometry.setAttribute('normal', new THREE.BufferAttribute(attributes.normals, 3));
    }

    // Update draw range
    this.geometry.setDrawRange(0, pointCount);

    // Update bounding sphere
    this.geometry.computeBoundingSphere();

    // Update visible point count
    this._visiblePointCount = pointCount;
  }

  /**
   * Update LOD and render visible nodes
   * This is where LOD algorithm from @better-potree/core will be integrated
   * @param camera - The camera to use for LOD calculation
   * @param pointBudget - Optional point budget override
   */
  public update(camera: THREE.Camera, pointBudget?: number): void {
    // Update point budget if provided
    if (pointBudget !== undefined) {
      this._pointBudget = pointBudget;
    }

    // Update material camera uniforms
    this.material.updateCamera(camera);

    // TODO (T2.6): Integrate with @better-potree/core LOD algorithm
    // For now, this is a placeholder that would:
    // 1. Get visible nodes from LOD algorithm
    // 2. Collect point data from visible nodes
    // 3. Call updateGeometry() with the collected data
  }

  /**
   * Update screen size for material
   */
  public updateScreenSize(width: number, height: number): void {
    this.material.updateScreenSize(width, height);
  }

  /**
   * Update octree spacing for material
   */
  public updateOctreeSpacing(spacing: number): void {
    this.material.updateOctreeSpacing(spacing);
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
