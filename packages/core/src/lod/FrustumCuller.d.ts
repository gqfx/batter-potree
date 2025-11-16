/**
 * Frustum culling for point cloud octrees
 */
import * as THREE from 'three';
import type { OctreeNode } from '../octree/OctreeNode.js';
/**
 * Performs frustum culling on octree nodes
 */
export declare class FrustumCuller {
  private frustum;
  private projectionMatrix;
  constructor();
  /**
   * Update frustum from camera
   */
  updateFrustum(camera: {
    matrixWorldInverse: THREE.Matrix4;
    projectionMatrix: THREE.Matrix4;
  }): void;
  /**
   * Test if a node intersects the frustum
   */
  intersects(node: OctreeNode): boolean;
  /**
   * Test if a sphere intersects the frustum
   */
  intersectsSphere(sphere: THREE.Sphere): boolean;
  /**
   * Test if a box intersects the frustum
   */
  intersectsBox(box: THREE.Box3): boolean;
}
//# sourceMappingURL=FrustumCuller.d.ts.map
