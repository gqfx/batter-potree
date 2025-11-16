/**
 * LOD (Level of Detail) selector for point clouds
 * Based on screen-space projection
 */

import type * as THREE from 'three';
import type { OctreeNode } from '../octree/OctreeNode.js';

export interface LODSelectionParams {
  cameraPosition: THREE.Vector3;
  screenWidth: number;
  screenHeight: number;
  fov: number;
  minimumNodePixelSize: number;
}

/**
 * Selects appropriate LOD level based on screen-space criteria
 */
export class LODSelector {
  /**
   * Calculate screen-space radius of a node's bounding sphere
   */
  static calculateScreenPixelRadius(node: OctreeNode, params: LODSelectionParams): number {
    const sphere = node.getBoundingSphere();
    const distance = params.cameraPosition.distanceTo(sphere.center);

    if (distance <= 0) {
      return Number.POSITIVE_INFINITY;
    }

    const fovRad = (params.fov * Math.PI) / 180;
    const slope = Math.tan(fovRad / 2);
    const projFactor = (0.5 * params.screenHeight) / (slope * distance);

    return sphere.radius * projFactor;
  }

  /**
   * Determine if node should be visible based on screen size
   */
  static shouldRender(node: OctreeNode, params: LODSelectionParams): boolean {
    const pixelRadius = LODSelector.calculateScreenPixelRadius(node, params);
    return pixelRadius >= params.minimumNodePixelSize;
  }

  /**
   * Calculate priority for node loading (higher = more important)
   */
  static calculatePriority(node: OctreeNode, params: LODSelectionParams): number {
    return LODSelector.calculateScreenPixelRadius(node, params);
  }
}
