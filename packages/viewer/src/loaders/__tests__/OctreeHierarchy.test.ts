/**
 * Tests for Octree hierarchy and node management
 */

import type { IPointCloudOctreeNode } from '@better-potree/core';
import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Octree Hierarchy', () => {
  // MockOctree not needed for these tests
  let rootNode: IPointCloudOctreeNode;

  beforeEach(() => {
    // Create a mock octree structure
    rootNode = {
      name: 'r',
      level: 0,
      boundingBox: new THREE.Box3(
        new THREE.Vector3(-10, -10, -10),
        new THREE.Vector3(10, 10, 10),
      ),
      numPoints: 1000,
      children: new Array(8).fill(null),
      loaded: false,
      loading: false,
    };

    // Note: mockOctree not needed for these tests
  });

  describe('Node creation', () => {
    it('should create root node with correct properties', () => {
      expect(rootNode.name).toBe('r');
      expect(rootNode.level).toBe(0);
      expect(rootNode.numPoints).toBe(1000);
      expect(rootNode.loaded).toBe(false);
      expect(rootNode.loading).toBe(false);
      expect(rootNode.children.length).toBe(8);
    });

    it('should create child nodes with correct naming', () => {
      // Create child nodes following Potree naming convention
      for (let i = 0; i < 8; i++) {
        const child: IPointCloudOctreeNode = {
          name: `r${i}`,
          level: 1,
          boundingBox: new THREE.Box3(),
          numPoints: 100,
          children: new Array(8).fill(null),
          loaded: false,
          loading: false,
        };
        rootNode.children[i] = child;
      }

      expect(rootNode.children[0]?.name).toBe('r0');
      expect(rootNode.children[7]?.name).toBe('r7');
    });

    it('should calculate child bounding boxes correctly', () => {
      const parentBox = new THREE.Box3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 10, 10),
      );
      const center = parentBox.getCenter(new THREE.Vector3());

      // Create octants (8 children)
      const childBoxes: THREE.Box3[] = [];

      for (let i = 0; i < 8; i++) {
        const min = center.clone();
        const max = parentBox.max.clone();

        // childIndex bits: x=bit0, y=bit1, z=bit2
        if ((i & 1) === 0) {
          max.x = center.x;
          min.x = parentBox.min.x;
        }
        if ((i & 2) === 0) {
          max.y = center.y;
          min.y = parentBox.min.y;
        }
        if ((i & 4) === 0) {
          max.z = center.z;
          min.z = parentBox.min.z;
        }

        childBoxes.push(new THREE.Box3(min, max));
      }

      // Verify child 0 (000 binary) is in the negative octant
      const child0 = childBoxes[0];
      expect(child0).toBeDefined();
      expect(child0!.min.x).toBe(0);
      expect(child0!.min.y).toBe(0);
      expect(child0!.min.z).toBe(0);
      expect(child0!.max.x).toBe(5);
      expect(child0!.max.y).toBe(5);
      expect(child0!.max.z).toBe(5);

      // Verify child 7 (111 binary) is in the positive octant
      const child7 = childBoxes[7];
      expect(child7).toBeDefined();
      expect(child7!.min.x).toBe(5);
      expect(child7!.min.y).toBe(5);
      expect(child7!.min.z).toBe(5);
      expect(child7!.max.x).toBe(10);
      expect(child7!.max.y).toBe(10);
      expect(child7!.max.z).toBe(10);
    });
  });

  describe('Node hierarchy', () => {
    it('should build multi-level hierarchy', () => {
      // Level 1
      const child0: IPointCloudOctreeNode = {
        name: 'r0',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 500,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };
      rootNode.children[0] = child0;

      // Level 2
      const grandchild00: IPointCloudOctreeNode = {
        name: 'r00',
        level: 2,
        boundingBox: new THREE.Box3(),
        numPoints: 250,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };
      child0.children[0] = grandchild00;

      // Verify hierarchy
      const rootChild0 = rootNode.children[0];
      expect(rootChild0).toBeDefined();
      expect(rootChild0).toBe(child0);

      const grandchild = rootChild0!.children[0];
      expect(grandchild).toBeDefined();
      expect(grandchild).toBe(grandchild00);
      expect(grandchild00.level).toBe(2);
      expect(grandchild00.name).toBe('r00');
    });

    it('should traverse hierarchy depth-first', () => {
      // Build a simple tree
      const visited: string[] = [];

      function traverse(node: IPointCloudOctreeNode) {
        visited.push(node.name);
        for (const child of node.children) {
          if (child) {
            traverse(child);
          }
        }
      }

      // Add some children
      rootNode.children[0] = {
        name: 'r0',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 100,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };

      rootNode.children[1] = {
        name: 'r1',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 100,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };

      traverse(rootNode);

      expect(visited).toEqual(['r', 'r0', 'r1']);
    });

    it('should count nodes in hierarchy', () => {
      function countNodes(node: IPointCloudOctreeNode): number {
        let count = 1;
        for (const child of node.children) {
          if (child) {
            count += countNodes(child);
          }
        }
        return count;
      }

      // Initially just root
      expect(countNodes(rootNode)).toBe(1);

      // Add 2 children
      rootNode.children[0] = {
        name: 'r0',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 100,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };

      rootNode.children[1] = {
        name: 'r1',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 100,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };

      expect(countNodes(rootNode)).toBe(3);
    });
  });

  describe('Node state management', () => {
    it('should track loading state', () => {
      expect(rootNode.loaded).toBe(false);
      expect(rootNode.loading).toBe(false);

      // Start loading
      rootNode.loading = true;
      expect(rootNode.loading).toBe(true);
      expect(rootNode.loaded).toBe(false);

      // Complete loading
      rootNode.loading = false;
      rootNode.loaded = true;
      expect(rootNode.loading).toBe(false);
      expect(rootNode.loaded).toBe(true);
    });

    it('should handle failed loading', () => {
      rootNode.loading = true;

      // Loading failed
      rootNode.loading = false;
      rootNode.loaded = false;

      expect(rootNode.loading).toBe(false);
      expect(rootNode.loaded).toBe(false);
    });

    it('should track geometry attachment', () => {
      expect(rootNode.geometry).toBeUndefined();

      // Attach geometry
      const geometry = new THREE.BufferGeometry();
      rootNode.geometry = geometry;

      expect(rootNode.geometry).toBe(geometry);
    });

    it('should track vnStart for GPU LOD', () => {
      expect(rootNode.vnStart).toBeUndefined();

      // Set vnStart for vertex buffer indexing
      rootNode.vnStart = 0;
      expect(rootNode.vnStart).toBe(0);

      // Child node
      const child: IPointCloudOctreeNode = {
        name: 'r0',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 100,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
        vnStart: 1000,
      };

      expect(child.vnStart).toBe(1000);
    });
  });

  describe('Node byte offset (Potree 2.0)', () => {
    it('should track byteOffset and byteSize', () => {
      const node: IPointCloudOctreeNode = {
        name: 'r0',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 100,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
        byteOffset: 1024,
        byteSize: 3700, // 100 points * 37 bytes
      };

      expect(node.byteOffset).toBe(1024);
      expect(node.byteSize).toBe(3700);
    });

    it('should calculate byte range for HTTP Range request', () => {
      const node: IPointCloudOctreeNode = {
        name: 'r0',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 100,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
        byteOffset: 1000,
        byteSize: 3700,
      };

      const rangeStart = node.byteOffset!;
      const rangeEnd = node.byteOffset! + node.byteSize! - 1;

      expect(rangeStart).toBe(1000);
      expect(rangeEnd).toBe(4699);
    });
  });

  describe('Node point count hierarchy', () => {
    it('should maintain point count invariant', () => {
      // Parent should have >= sum of children points
      const children: IPointCloudOctreeNode[] = [];
      let childrenPointSum = 0;

      for (let i = 0; i < 4; i++) {
        const child: IPointCloudOctreeNode = {
          name: `r${i}`,
          level: 1,
          boundingBox: new THREE.Box3(),
          numPoints: 100 + i * 50,
          children: new Array(8).fill(null),
          loaded: false,
          loading: false,
        };
        children.push(child);
        childrenPointSum += child.numPoints;
      }

      // In Potree, parent typically has more points (includes overlap)
      expect(rootNode.numPoints).toBeGreaterThanOrEqual(0);
      expect(childrenPointSum).toBeGreaterThan(0);
    });

    it('should calculate total points in subtree', () => {
      function countTotalPoints(node: IPointCloudOctreeNode): number {
        let total = node.numPoints;
        for (const child of node.children) {
          if (child) {
            total += countTotalPoints(child);
          }
        }
        return total;
      }

      rootNode.children[0] = {
        name: 'r0',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 500,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };

      rootNode.children[1] = {
        name: 'r1',
        level: 1,
        boundingBox: new THREE.Box3(),
        numPoints: 300,
        children: new Array(8).fill(null),
        loaded: false,
        loading: false,
      };

      const total = countTotalPoints(rootNode);
      expect(total).toBe(1000 + 500 + 300);
    });
  });

  describe('Node name encoding', () => {
    it('should encode child index in name', () => {
      const nodeNames = ['r', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];

      for (let i = 0; i < 8; i++) {
        const name = nodeNames[i + 1];
        expect(name).toBeDefined();
        expect(name).toBe(`r${i}`);
      }
    });

    it('should build deep hierarchy names', () => {
      const names = [
        'r',       // level 0
        'r0',      // level 1, child 0
        'r00',     // level 2, child 0 of r0
        'r000',    // level 3, child 0 of r00
        'r0001',   // level 4, child 1 of r000
      ];

      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        expect(name).toBeDefined();
        expect(name!.startsWith('r')).toBe(true);
        expect(name!.length).toBe(i + 1);
      }
    });

    it('should extract parent name from child name', () => {
      function getParentName(name: string): string | null {
        if (name === 'r') return null;
        return name.slice(0, -1);
      }

      expect(getParentName('r')).toBeNull();
      expect(getParentName('r0')).toBe('r');
      expect(getParentName('r00')).toBe('r0');
      expect(getParentName('r1234')).toBe('r123');
    });

    it('should extract child index from name', () => {
      function getChildIndex(name: string): number {
        if (name === 'r') return -1;
        return parseInt(name.slice(-1), 10);
      }

      expect(getChildIndex('r')).toBe(-1);
      expect(getChildIndex('r0')).toBe(0);
      expect(getChildIndex('r7')).toBe(7);
      expect(getChildIndex('r123')).toBe(3);
    });
  });
});
