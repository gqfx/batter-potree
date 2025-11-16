/**
 * Frustum culling for point cloud octrees
 */
import * as THREE from 'three';
/**
 * Performs frustum culling on octree nodes
 */
export class FrustumCuller {
    constructor() {
        this.frustum = new THREE.Frustum();
        this.projectionMatrix = new THREE.Matrix4();
    }
    /**
     * Update frustum from camera
     */
    updateFrustum(camera) {
        this.projectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.projectionMatrix);
    }
    /**
     * Test if a node intersects the frustum
     */
    intersects(node) {
        return this.frustum.intersectsBox(node.boundingBox);
    }
    /**
     * Test if a sphere intersects the frustum
     */
    intersectsSphere(sphere) {
        return this.frustum.intersectsSphere(sphere);
    }
    /**
     * Test if a box intersects the frustum
     */
    intersectsBox(box) {
        return this.frustum.intersectsBox(box);
    }
}
//# sourceMappingURL=FrustumCuller.js.map