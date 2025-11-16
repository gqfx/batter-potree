/**
 * Unit tests for OctreeNode
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { OctreeNode } from '../octree/OctreeNode';

describe('OctreeNode', () => {
  describe('Constructor', () => {
    it('should create root node', () => {
      const bbox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10));
      const node = new OctreeNode('r', bbox, 1.0, 0);

      expect(node.name).toBe('r');
      expect(node.level).toBe(0);
      expect(node.spacing).toBe(1.0);
      expect(node.numPoints).toBe(0);
      expect(node.isLoaded()).toBe(false);
      expect(node.isLeaf()).toBe(true);
    });

    it('should initialize with 8 null children', () => {
      const bbox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10));
      const node = new OctreeNode('r', bbox, 1.0);

      expect(node.children.length).toBe(8);
      expect(node.getChildren().length).toBe(0);
    });
  });

  describe('Child Management', () => {
    it('should create child nodes correctly', () => {
      const bbox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10));
      const parent = new OctreeNode('r', bbox, 1.0, 0);
      const child = parent.createChild(0);

      expect(child.name).toBe('r0');
      expect(child.level).toBe(1);
      expect(child.spacing).toBe(0.5);
      expect(parent.getChild(0)).toBe(child);
    });

    it('should compute child bounding boxes correctly', () => {
      const parentBox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10));

      // Child 0: -X, -Y, -Z (min octant)
      const child0 = OctreeNode.computeChildBoundingBox(parentBox, 0);
      expect(child0.min.toArray()).toEqual([0, 0, 0]);
      expect(child0.max.toArray()).toEqual([5, 5, 5]);

      // Child 7: +X, +Y, +Z (max octant)
      const child7 = OctreeNode.computeChildBoundingBox(parentBox, 7);
      expect(child7.min.toArray()).toEqual([5, 5, 5]);
      expect(child7.max.toArray()).toEqual([10, 10, 10]);
    });
  });

  describe('Getters', () => {
    it('should return correct properties', () => {
      const bbox = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10));
      const node = new OctreeNode('r', bbox, 1.0, 0);
      node.numPoints = 1000;

      expect(node.getLevel()).toBe(0);
      expect(node.getNumPoints()).toBe(1000);
      expect(node.getBoundingBox()).toBe(bbox);
    });
  });
});
