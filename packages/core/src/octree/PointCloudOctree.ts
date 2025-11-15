/**
 * Point cloud octree for hierarchical LOD rendering
 *
 * Migrated from Potree PointCloudOctree
 */

import * as THREE from 'three';
import { OctreeNode } from './OctreeNode.js';
import type { PointAttributes } from '../attributes/PointAttributes.js';

/**
 * Octree-based point cloud with hierarchical LOD
 */
export class PointCloudOctree {
  /** Root node of the octree */
  public root: OctreeNode;

  /** Bounding box of the entire point cloud */
  public readonly boundingBox: THREE.Box3;

  /** Bounding sphere */
  public readonly boundingSphere: THREE.Sphere;

  /** Point budget (max points to render) */
  public pointBudget: number;

  /** Minimum node pixel size for LOD selection */
  public minimumNodePixelSize: number;

  /** Visible nodes (updated during culling) */
  public visibleNodes: OctreeNode[];

  /** Number of visible points */
  public numVisiblePoints: number;

  /** Point cloud name */
  public name: string;

  /** Point attributes */
  public pointAttributes: PointAttributes;

  /** Base spacing */
  public spacing: number;

  /** Maximum octree level */
  public maxLevel: number;

  /** World transformation offset */
  public offset: THREE.Vector3;

  constructor(
    boundingBox: THREE.Box3,
    spacing: number,
    pointAttributes: PointAttributes,
    offset: THREE.Vector3 = new THREE.Vector3(),
  ) {
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
    this.pointBudget = 1_000_000;
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
  setName(name: string): void {
    this.name = name;
  }

  /**
   * Get point cloud name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Find node by name
   * @param name Node name (e.g., "r", "r0", "r01")
   */
  findNode(name: string): OctreeNode | null {
    let node: OctreeNode | null = this.root;

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
  getNodesAtLevel(level: number): OctreeNode[] {
    const nodes: OctreeNode[] = [];
    const queue: OctreeNode[] = [this.root];

    while (queue.length > 0) {
      const node = queue.shift()!;

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
  traverse(callback: (node: OctreeNode) => void): void {
    const stack: OctreeNode[] = [this.root];

    while (stack.length > 0) {
      const node = stack.pop()!;
      callback(node);
      stack.push(...node.getChildren());
    }
  }

  /**
   * Get total number of points in the octree
   */
  getTotalPoints(): number {
    let total = 0;
    this.traverse((node) => {
      total += node.numPoints;
    });
    return total;
  }

  /**
   * Dispose of octree resources
   */
  dispose(): void {
    this.traverse((node) => {
      node.dispose();
    });
  }
}
