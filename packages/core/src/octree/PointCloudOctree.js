/**
 * Point cloud octree for hierarchical LOD rendering
 *
 * Migrated from Potree PointCloudOctree
 */
import * as THREE from 'three';
import { OctreeNode } from './OctreeNode.js';
/**
 * Octree-based point cloud with hierarchical LOD
 */
export class PointCloudOctree {
  constructor(boundingBox, spacing, pointAttributes, offset = new THREE.Vector3()) {
    this.boundingBox = boundingBox;
    this.spacing = spacing;
    this.pointAttributes = pointAttributes;
    this.offset = offset.clone();
    // Create root node
    this.root = new OctreeNode('r', boundingBox, spacing, 0);
    // Compute bounding sphere
    this.boundingSphere = new THREE.Sphere();
    this.boundingBox.getBoundingSphere(this.boundingSphere);
    // Default parameters
    this.pointBudget = 1000000;
    this.minimumNodePixelSize = 150;
    this.maxLevel = Number.POSITIVE_INFINITY;
    this.name = '';
    // Runtime state
    this.visibleNodes = [];
    this.numVisiblePoints = 0;
  }
  /**
   * Set point cloud name
   */
  setName(name) {
    this.name = name;
  }
  /**
   * Get point cloud name
   */
  getName() {
    return this.name;
  }
  /**
   * Find node by name
   * @param name Node name (e.g., "r", "r0", "r01")
   */
  findNode(name) {
    let node = this.root;
    for (let i = 1; i < name.length; i++) {
      const char = name[i];
      if (!char) return null;
      const index = Number.parseInt(char, 10);
      if (Number.isNaN(index) || index < 0 || index >= 8) {
        return null;
      }
      node = node?.getChild(index) ?? null;
      if (!node) {
        return null;
      }
    }
    return node;
  }
  /**
   * Get all nodes at a specific level
   */
  getNodesAtLevel(level) {
    const nodes = [];
    const queue = [this.root];
    while (queue.length > 0) {
      const node = queue.shift();
      if (node.level === level) {
        nodes.push(node);
      } else if (node.level < level) {
        queue.push(...node.getChildren());
      }
    }
    return nodes;
  }
  /**
   * Traverse all nodes in the octree
   */
  traverse(callback) {
    const stack = [this.root];
    while (stack.length > 0) {
      const node = stack.pop();
      callback(node);
      stack.push(...node.getChildren());
    }
  }
  /**
   * Get total number of points in the octree
   */
  getTotalPoints() {
    let total = 0;
    this.traverse((node) => {
      total += node.numPoints;
    });
    return total;
  }
  /**
   * Dispose of octree resources
   */
  dispose() {
    this.traverse((node) => {
      node.dispose();
    });
  }
}
//# sourceMappingURL=PointCloudOctree.js.map
