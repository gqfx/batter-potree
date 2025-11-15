/**
 * Frustum culling for point cloud octrees
 */

import * as THREE from 'three';
import type { OctreeNode } from '../octree/OctreeNode.js';

/**
 * Performs frustum culling on octree nodes
 */
export class FrustumCuller {
  private frustum: THREE.Frustum;
  private projectionMatrix: THREE.Matrix4;

  constructor() {
    this.frustum = new THREE.Frustum();
    this.projectionMatrix = new THREE.Matrix4();
  }

  /**
   * Update frustum from camera
   */
  updateFrustum(camera: {
    matrixWorldInverse: THREE.Matrix4;
    projectionMatrix: THREE.Matrix4;
  }): void {
    this.projectionMatrix
      .multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projectionMatrix);
  }

  /**
   * Test if a node intersects the frustum
   */
  intersects(node: OctreeNode): boolean {
    return this.frustum.intersectsBox(node.boundingBox);
  }

  /**
   * Test if a sphere intersects the frustum
   */
  intersectsSphere(sphere: THREE.Sphere): boolean {
    return this.frustum.intersectsSphere(sphere);
  }

  /**
   * Test if a box intersects the frustum
   */
  intersectsBox(box: THREE.Box3): boolean {
    return this.frustum.intersectsBox(box);
  }
}
