/**
 * GPU-based point cloud picking system
 * @module @better-potree/viewer/picking
 */

import type { IPointCloudOctree, IPointCloudOctreeNode } from '@better-potree/core';
import { PickMaterial } from '@better-potree/rendering-three';
import * as THREE from 'three';

/**
 * Pick result containing the picked point information
 */
export interface PickResult {
  /** Position of the picked point in world coordinates */
  position: THREE.Vector3;
  /** Point index within the node */
  pointIndex: number;
  /** Node that contains the picked point */
  node: IPointCloudOctreeNode;
  /** Point cloud that was picked */
  pointcloud: IPointCloudOctree;
  /** Distance from camera to picked point */
  distance: number;
  /** All point attributes */
  [key: string]: any;
}

/**
 * Pick parameters
 */
export interface PickParams {
  /** Window size for picking (odd number, default: 17) */
  pickWindowSize?: number;
  /** Point size for picking */
  pointSize?: number;
  /** Whether to pick clipped points */
  pickClipped?: boolean;
  /** Screen x coordinate */
  x?: number;
  /** Screen y coordinate (from top) */
  y?: number;
  /** Return all hits instead of just the closest */
  all?: boolean;
}

/**
 * Pick state for caching GPU resources
 */
interface PickState {
  renderTarget: THREE.WebGLRenderTarget;
  material: PickMaterial;
  scene: THREE.Scene;
}

/**
 * PointCloudPicker - GPU-based point cloud picking
 *
 * This class implements GPU-accelerated picking for point clouds by:
 * 1. Finding nodes along the pick ray using bounding sphere tests
 * 2. Rendering those nodes with a special material that encodes point indices
 * 3. Reading back pixels to determine which point was hit
 * 4. Looking up the actual point position from geometry buffers
 *
 * @example
 * ```typescript
 * const picker = new PointCloudPicker();
 * const result = picker.pick(pointcloud, ray, camera, renderer, {
 *   x: mouseX,
 *   y: screenHeight - mouseY,
 *   pickWindowSize: 17
 * });
 *
 * if (result) {
 *   console.log('Picked point at:', result.position);
 * }
 * ```
 */
export class PointCloudPicker {
  private pickStateMap = new WeakMap<IPointCloudOctree, PickState>();

  /**
   * Find all visible nodes that the ray passes through
   *
   * Uses bounding sphere intersection tests for efficiency.
   * Returns nodes sorted by distance to camera.
   *
   * @param pointcloud - The point cloud to test
   * @param ray - The pick ray in world space
   * @returns Array of nodes along the ray
   */
  nodesOnRay(pointcloud: IPointCloudOctree, ray: THREE.Ray): IPointCloudOctreeNode[] {
    const nodesOnRay: IPointCloudOctreeNode[] = [];
    const visibleNodes = this.getVisibleNodes(pointcloud);

    // Clone ray to avoid mutation
    const _ray = ray.clone();

    for (const node of visibleNodes) {
      if (!node.loaded || !node.geometry) {
        continue;
      }

      // Get bounding sphere
      const boundingSphere = this.getNodeBoundingSphere(node, pointcloud);
      if (!boundingSphere) {
        continue;
      }

      // Test ray against bounding sphere
      if (_ray.intersectsSphere(boundingSphere)) {
        nodesOnRay.push(node);
      }
    }

    return nodesOnRay;
  }

  /**
   * Pick a point from the point cloud
   *
   * @param pointcloud - The point cloud to pick from
   * @param ray - The pick ray in world space
   * @param camera - The camera
   * @param renderer - The WebGL renderer
   * @param params - Pick parameters
   * @returns Pick result or null if nothing was hit
   */
  pick(
    pointcloud: IPointCloudOctree,
    ray: THREE.Ray,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    params: PickParams = {},
  ): PickResult | null {
    const pickWindowSize = params.pickWindowSize ?? 17;
    const pointSize = params.pointSize ?? 3;
    const x = params.x ?? 0;
    const y = params.y ?? 0;

    // Get nodes along ray
    const nodes = this.nodesOnRay(pointcloud, ray);
    if (nodes.length === 0) {
      return null;
    }

    // Get or create pick state
    const pickState = this.getOrCreatePickState(pointcloud, pointSize);
    const { renderTarget, material, scene } = pickState;

    // Get renderer size
    const size = renderer.getSize(new THREE.Vector2());
    const width = size.width;
    const height = size.height;

    // Update material
    material.updateScreenSize(width, height);
    material.updateCamera(camera);
    if (pointcloud.spacing) {
      material.updateOctreeSpacing(pointcloud.spacing);
    }
    material.size = pointSize;

    // Resize render target
    renderTarget.setSize(width, height);

    // Setup scissor test for performance
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const scissorX = Math.max(0, Math.floor(x - (pickWindowSize - 1) / 2));
    const scissorY = Math.max(0, Math.floor(y - (pickWindowSize - 1) / 2));
    const scissorW = Math.min(pickWindowSize, width - scissorX);
    const scissorH = Math.min(pickWindowSize, height - scissorY);

    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(scissorX, scissorY, scissorW, scissorH);

    // Save renderer state
    const oldRenderTarget = renderer.getRenderTarget();
    const oldAutoClear = renderer.autoClear;

    // Render nodes to pick buffer
    renderer.setRenderTarget(renderTarget);
    renderer.autoClear = false;
    gl.clearColor(0, 0, 0, 0);
    renderer.clear(true, true, true);

    // Prepare scene
    scene.children.length = 0;

    // Render each node with its index
    for (let nodeIndex = 0; nodeIndex < nodes.length && nodeIndex < 255; nodeIndex++) {
      const node = nodes[nodeIndex];
      if (!node) continue;

      // Update material for this node
      material.setNodeIndex(nodeIndex);
      if (node.level !== undefined) {
        material.updateLevel(node.level);
      }

      // Get or create mesh for this node
      const mesh = this.getNodeMesh(node, material, pointcloud);
      if (mesh) {
        scene.add(mesh);
        renderer.render(scene, camera);
        scene.remove(mesh);
      }
    }

    // Read pixels
    const pixelCount = pickWindowSize * pickWindowSize;
    const buffer = new Uint8Array(4 * pixelCount);

    const readX = Math.max(0, Math.floor(x - (pickWindowSize - 1) / 2));
    const readY = Math.max(0, Math.floor(y - (pickWindowSize - 1) / 2));
    const readW = Math.min(pickWindowSize, width - readX);
    const readH = Math.min(pickWindowSize, height - readY);

    gl.readPixels(readX, readY, readW, readH, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

    // Restore renderer state
    renderer.setRenderTarget(oldRenderTarget);
    renderer.autoClear = oldAutoClear;
    gl.disable(gl.SCISSOR_TEST);

    // Find closest hit
    const hits: Array<{
      pointIndex: number;
      nodeIndex: number;
      distanceToCenter: number;
    }> = [];

    const halfWindow = (pickWindowSize - 1) / 2;

    for (let v = 0; v < readH; v++) {
      for (let u = 0; u < readW; u++) {
        const offset = u + v * readW;
        const distanceToCenter = Math.pow(u - halfWindow, 2) + Math.pow(v - halfWindow, 2);

        // Decode point index from RGB (24-bit)
        const r = buffer[4 * offset + 0] ?? 0;
        const g = buffer[4 * offset + 1] ?? 0;
        const b = buffer[4 * offset + 2] ?? 0;
        const a = buffer[4 * offset + 3] ?? 0;

        // Skip empty pixels
        if (a === 0) continue;

        const pointIndex = r + g * 256 + b * 256 * 256;
        const nodeIndex = a - 1; // Subtract 1 because we added 1 in shader

        if (nodeIndex >= 0 && nodeIndex < nodes.length) {
          const hit = { pointIndex, nodeIndex, distanceToCenter };

          if (params.all) {
            hits.push(hit);
          } else {
            // Keep only closest hit
            const firstHit = hits[0];
            if (!firstHit || distanceToCenter < firstHit.distanceToCenter) {
              hits[0] = hit;
            }
          }
        }
      }
    }

    // Convert hits to results
    if (hits.length === 0) {
      return null;
    }

    // Get point data for closest hit
    const hit = hits[0];
    if (!hit) {
      return null;
    }

    const node = nodes[hit.nodeIndex];
    if (!node) {
      return null;
    }

    const point = this.getPointData(node, hit.pointIndex, pointcloud);

    if (!point) {
      return null;
    }

    const distance = camera.position.distanceTo(point.position);

    return {
      ...point,
      pointIndex: hit.pointIndex,
      node,
      pointcloud,
      distance,
    };
  }

  /**
   * Get visible nodes from a point cloud
   */
  private getVisibleNodes(pointcloud: IPointCloudOctree): IPointCloudOctreeNode[] {
    const nodes: IPointCloudOctreeNode[] = [];

    if (!pointcloud.root) {
      return nodes;
    }

    // Traverse and collect loaded nodes
    const stack: IPointCloudOctreeNode[] = [pointcloud.root];
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node) continue;

      if (node.loaded) {
        nodes.push(node);
      }

      // Add children
      if (node.children) {
        for (const child of node.children) {
          if (child) {
            stack.push(child);
          }
        }
      }
    }

    return nodes;
  }

  /**
   * Get bounding sphere for a node in world space
   */
  private getNodeBoundingSphere(
    node: IPointCloudOctreeNode,
    pointcloud: IPointCloudOctree,
  ): THREE.Sphere | null {
    const boundingBox = node.boundingBox;
    if (!boundingBox) {
      return null;
    }

    // Create bounding sphere from box
    const sphere = new THREE.Sphere();
    boundingBox.getBoundingSphere(sphere);

    // Apply point cloud transform if available
    if (pointcloud.matrixWorld) {
      sphere.applyMatrix4(pointcloud.matrixWorld);
    }

    return sphere;
  }

  /**
   * Get or create pick state for a point cloud
   */
  private getOrCreatePickState(pointcloud: IPointCloudOctree, pointSize: number): PickState {
    let pickState = this.pickStateMap.get(pointcloud);

    if (!pickState) {
      const scene = new THREE.Scene();
      const material = new PickMaterial({ size: pointSize });
      const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });

      pickState = { scene, material, renderTarget };
      this.pickStateMap.set(pointcloud, pickState);
    }

    return pickState;
  }

  /**
   * Get or create a mesh for a node
   */
  private getNodeMesh(
    node: IPointCloudOctreeNode,
    material: PickMaterial,
    pointcloud: IPointCloudOctree,
  ): THREE.Points | null {
    if (!node.geometry) {
      return null;
    }

    // Create a Points mesh with the pick material
    const mesh = new THREE.Points(node.geometry as THREE.BufferGeometry, material);

    // Apply point cloud transform if available
    if (pointcloud.matrixWorld) {
      mesh.matrixWorld.copy(pointcloud.matrixWorld);
      mesh.matrixWorldNeedsUpdate = false;
    }

    return mesh;
  }

  /**
   * Get point data from node geometry
   */
  private getPointData(
    node: IPointCloudOctreeNode,
    pointIndex: number,
    pointcloud: IPointCloudOctree,
  ): { position: THREE.Vector3; [key: string]: any } | null {
    const geometry = node.geometry as THREE.BufferGeometry;
    if (!geometry) {
      return null;
    }

    const result: { position: THREE.Vector3; [key: string]: any } = {
      position: new THREE.Vector3(),
    };

    // Read all attributes
    for (const attributeName in geometry.attributes) {
      const attribute = geometry.attributes[attributeName] as THREE.BufferAttribute;

      if (attributeName === 'position') {
        const x = attribute.array[3 * pointIndex + 0];
        const y = attribute.array[3 * pointIndex + 1];
        const z = attribute.array[3 * pointIndex + 2];

        const position = new THREE.Vector3(x, y, z);

        // Apply point cloud transform if available
        if (pointcloud.matrixWorld) {
          position.applyMatrix4(pointcloud.matrixWorld);
        }

        result.position = position;
      } else {
        // Read other attributes
        const itemSize = attribute.itemSize;
        const values = [];
        for (let i = 0; i < itemSize; i++) {
          values.push(attribute.array[itemSize * pointIndex + i]);
        }
        result[attributeName] = itemSize === 1 ? values[0] : values;
      }
    }

    return result;
  }

  /**
   * Dispose of all pick resources
   */
  dispose(): void {
    // WeakMap will handle cleanup automatically
    // But we could explicitly dispose render targets if needed
  }
}
