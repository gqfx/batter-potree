/**
 * Geometry utility functions for point cloud interaction
 * Based on Potree's Utils module
 */

import type { IPointCloudOctree } from '@better-potree/core';
import * as THREE from 'three';

/**
 * Convert mouse coordinates to a ray in world space
 *
 * @param mouse - Mouse position (clientX, clientY)
 * @param camera - Camera to project from
 * @param width - Viewport width
 * @param height - Viewport height
 * @returns Ray in world space
 */
export function mouseToRay(
  mouse: { x: number; y: number },
  camera: THREE.Camera,
  width: number,
  height: number,
): THREE.Ray {
  // Convert mouse coordinates to normalized device coordinates (-1 to +1)
  const ndcX = (mouse.x / width) * 2 - 1;
  const ndcY = -(mouse.y / height) * 2 + 1;

  // Create ray from camera
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  return raycaster.ray;
}

/**
 * Result of point cloud intersection test
 */
export interface PointCloudIntersection {
  /** Intersected point cloud */
  pointcloud: IPointCloudOctree;
  /** Intersection point in world coordinates */
  location: THREE.Vector3;
  /** Normal at intersection point (if available) */
  normal?: THREE.Vector3;
  /** Distance from camera to intersection */
  distance: number;
}

/**
 * Get intersection between mouse ray and point clouds
 *
 * This performs a raycasting test against all provided point clouds
 * and returns the closest intersection point.
 *
 * @param mouse - Mouse position
 * @param camera - Camera
 * @param renderer - Renderer (for viewport dimensions)
 * @param pointclouds - Array of point clouds to test against
 * @param options - Additional options
 * @returns Intersection result or null if no hit
 */
export function getMousePointCloudIntersection(
  mouse: { x: number; y: number },
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  pointclouds: IPointCloudOctree[],
  options?: {
    /** Filter by clip volumes */
    pickClipped?: boolean;
  },
): PointCloudIntersection | null {
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  const ray = mouseToRay(mouse, camera, width, height);

  let closestIntersection: PointCloudIntersection | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  // Test against each point cloud
  for (const pointcloud of pointclouds) {
    const intersection = raycastPointCloud(ray, pointcloud, options);
    if (intersection && intersection.distance < minDistance) {
      minDistance = intersection.distance;
      closestIntersection = intersection;
    }
  }

  return closestIntersection;
}

/**
 * Raycast against a single point cloud
 *
 * This is a simplified implementation that tests against node bounding boxes.
 * For production use, you may want to implement more sophisticated raycasting
 * against actual point positions.
 *
 * @param ray - Ray in world space
 * @param pointcloud - Point cloud to test against
 * @param _options - Additional options (currently unused)
 * @returns Intersection result or null
 */
function raycastPointCloud(
  ray: THREE.Ray,
  pointcloud: IPointCloudOctree,
  _options?: {
    pickClipped?: boolean;
  },
): PointCloudIntersection | null {
  // Get visible nodes (or root if not available)
  const nodes = getVisibleNodes(pointcloud);
  if (nodes.length === 0) {
    return null;
  }

  let closestIntersection: PointCloudIntersection | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  // Test ray against each node's bounding box
  for (const node of nodes) {
    if (!node.loaded || !node.geometry) {
      continue;
    }

    // Get bounding box in world space
    const boundingBox = node.boundingBox;
    if (!boundingBox) {
      continue;
    }

    // Test ray against bounding box
    const intersection = ray.intersectBox(boundingBox, new THREE.Vector3());
    if (intersection) {
      const distance = intersection.distanceTo(ray.origin);
      if (distance < minDistance) {
        minDistance = distance;
        closestIntersection = {
          pointcloud,
          location: intersection.clone(),
          distance,
        };
      }
    }
  }

  return closestIntersection;
}

/**
 * Get visible nodes from a point cloud
 *
 * This is a temporary implementation that returns all loaded nodes.
 * For production use, this should integrate with the visibility system.
 *
 * @param pointcloud - Point cloud
 * @returns Array of visible nodes
 */
function getVisibleNodes(pointcloud: IPointCloudOctree): any[] {
  const nodes: any[] = [];

  if (!pointcloud.root) {
    return nodes;
  }

  // Traverse the tree and collect loaded nodes
  const stack = [pointcloud.root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    if (node.loaded) {
      nodes.push(node);
    }

    // Add children to stack
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
 * Calculate projected radius of a sphere in screen space
 *
 * This is useful for determining screen-space sizes for UI elements
 * that should maintain consistent visual size regardless of distance.
 *
 * @param radius - Radius of sphere in world space
 * @param camera - Camera
 * @param distance - Distance from camera to sphere center
 * @param _screenWidth - Screen width in pixels (currently unused)
 * @param screenHeight - Screen height in pixels
 * @returns Projected radius in pixels
 */
export function projectedRadius(
  radius: number,
  camera: THREE.Camera,
  distance: number,
  _screenWidth: number,
  screenHeight: number,
): number {
  if (!(camera instanceof THREE.PerspectiveCamera)) {
    // For orthographic cameras, size doesn't change with distance
    return radius;
  }

  // Calculate vertical FOV in radians
  const fovRadians = (camera.fov * Math.PI) / 180;

  // Calculate height of viewing frustum at given distance
  const frustumHeight = 2 * Math.tan(fovRadians / 2) * distance;

  // Calculate pixels per world unit
  const pixelsPerUnit = screenHeight / frustumHeight;

  // Return projected radius in pixels
  return radius * pixelsPerUnit;
}

/**
 * Get nodes along a ray in a point cloud
 *
 * This traverses the octree along a ray and returns all nodes that
 * the ray passes through, sorted by distance.
 *
 * @param pointcloud - Point cloud
 * @param ray - Ray in world space
 * @returns Array of nodes along ray, sorted by distance
 */
export function getNodesOnRay(pointcloud: IPointCloudOctree, ray: THREE.Ray): any[] {
  const result: Array<{ node: any; distance: number }> = [];

  if (!pointcloud.root) {
    return [];
  }

  // Traverse octree and collect nodes along ray
  const stack = [pointcloud.root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    // Test ray against node bounding box
    const boundingBox = node.boundingBox;
    if (!boundingBox) {
      continue;
    }

    const intersection = ray.intersectBox(boundingBox, new THREE.Vector3());
    if (intersection) {
      const distance = intersection.distanceTo(ray.origin);
      result.push({ node, distance });

      // Add children to stack
      if (node.children) {
        for (const child of node.children) {
          if (child) {
            stack.push(child);
          }
        }
      }
    }
  }

  // Sort by distance
  result.sort((a, b) => a.distance - b.distance);

  return result.map((item) => item.node);
}
