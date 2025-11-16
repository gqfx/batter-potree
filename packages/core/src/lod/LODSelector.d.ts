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
export declare class LODSelector {
  /**
   * Calculate screen-space radius of a node's bounding sphere
   */
  static calculateScreenPixelRadius(node: OctreeNode, params: LODSelectionParams): number;
  /**
   * Determine if node should be visible based on screen size
   */
  static shouldRender(node: OctreeNode, params: LODSelectionParams): boolean;
  /**
   * Calculate priority for node loading (higher = more important)
   */
  static calculatePriority(node: OctreeNode, params: LODSelectionParams): number;
}
//# sourceMappingURL=LODSelector.d.ts.map
