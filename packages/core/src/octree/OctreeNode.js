/**
 * Octree node for hierarchical point cloud storage
 *
 * Migrated from Potree PointCloudOctreeNode
 */
import * as THREE from 'three';
/**
 * Represents a node in the octree hierarchy
 */
export class OctreeNode {
  constructor(name, boundingBox, spacing, level = 0) {
    this.name = name;
    this.boundingBox = boundingBox;
    this.level = level;
    this.spacing = spacing;
    this.numPoints = 0;
    this.geometry = null;
    this.loaded = false;
    this.attributes = null;
    // Initialize 8 children slots
    this.children = new Array(8).fill(null);
    // Compute bounding sphere from bounding box
    this.boundingSphere = new THREE.Sphere();
    this.boundingBox.getBoundingSphere(this.boundingSphere);
  }
  /**
   * Get child node by index (0-7)
   */
  getChild(index) {
    if (index < 0 || index >= 8) {
      return null;
    }
    return this.children[index] ?? null;
  }
  /**
   * Set child node
   */
  setChild(index, child) {
    if (index >= 0 && index < 8) {
      this.children[index] = child;
    }
  }
  /**
   * Get all non-null children
   */
  getChildren() {
    return this.children.filter((child) => child !== null);
  }
  /**
   * Check if node is a leaf (has no children)
   */
  isLeaf() {
    return this.getChildren().length === 0;
  }
  /**
   * Check if node is loaded
   */
  isLoaded() {
    return this.loaded;
  }
  /**
   * Get node level in the octree
   */
  getLevel() {
    return this.level;
  }
  /**
   * Get number of points
   */
  getNumPoints() {
    return this.numPoints;
  }
  /**
   * Get bounding box
   */
  getBoundingBox() {
    return this.boundingBox;
  }
  /**
   * Get bounding sphere
   */
  getBoundingSphere() {
    return this.boundingSphere;
  }
  /**
   * Compute child bounding box for a given octant index
   * @param index Octant index (0-7)
   */
  static computeChildBoundingBox(parentBox, index) {
    const min = parentBox.min.clone();
    const max = parentBox.max.clone();
    const center = new THREE.Vector3();
    parentBox.getCenter(center);
    // Octant indices follow this pattern:
    // 0: -X, -Y, -Z
    // 1: +X, -Y, -Z
    // 2: -X, +Y, -Z
    // 3: +X, +Y, -Z
    // 4: -X, -Y, +Z
    // 5: +X, -Y, +Z
    // 6: -X, +Y, +Z
    // 7: +X, +Y, +Z
    const childMin = new THREE.Vector3();
    const childMax = new THREE.Vector3();
    childMin.x = index & 1 ? center.x : min.x;
    childMin.y = index & 2 ? center.y : min.y;
    childMin.z = index & 4 ? center.z : min.z;
    childMax.x = index & 1 ? max.x : center.x;
    childMax.y = index & 2 ? max.y : center.y;
    childMax.z = index & 4 ? max.z : center.z;
    return new THREE.Box3(childMin, childMax);
  }
  /**
   * Create child node for a given octant
   */
  createChild(index) {
    const childName = this.name + index.toString();
    const childBox = OctreeNode.computeChildBoundingBox(this.boundingBox, index);
    const childSpacing = this.spacing / 2;
    const childLevel = this.level + 1;
    const child = new OctreeNode(childName, childBox, childSpacing, childLevel);
    this.setChild(index, child);
    return child;
  }
  /**
   * Dispose of node resources
   */
  dispose() {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    this.loaded = false;
  }
}
//# sourceMappingURL=OctreeNode.js.map
