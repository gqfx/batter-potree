/**
 * VisibilityTexture tests
 */

import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { OctreeNode } from '../OctreeNode.js';
import { VisibilityTexture } from '../VisibilityTexture.js';

describe('VisibilityTexture', () => {
  describe('compute', () => {
    it('should handle empty node array', () => {
      const texture = new VisibilityTexture();
      const result = texture.compute([]);

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(result.data.length).toBe(0);
      expect(result.offsets.size).toBe(0);
    });

    it('should encode single root node', () => {
      const texture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      const result = texture.compute([root]);

      // Should have 4 bytes for one node
      expect(result.data.length).toBe(4);
      expect(result.offsets.size).toBe(1);
      expect(result.offsets.get(root)).toBe(0);

      // Root node has no children yet, so child mask should be 0
      expect(result.data[0]).toBe(0);
      // LOD offset should be default value
      expect(result.data[3]).toBe(100);
    });

    it('should encode parent-child relationships', () => {
      const texture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      // Create children
      const child0 = root.createChild(0);
      const child1 = root.createChild(1);
      const child7 = root.createChild(7);

      const nodes = [root, child0, child1, child7];
      const result = texture.compute(nodes);

      // Should have 4 bytes per node
      expect(result.data.length).toBe(16);
      expect(result.offsets.size).toBe(4);

      // Check root node offset
      const rootOffset = result.offsets.get(root)!;
      expect(rootOffset).toBe(0);

      // Check child offsets
      expect(result.offsets.get(child0)).toBe(1);
      expect(result.offsets.get(child1)).toBe(2);
      expect(result.offsets.get(child7)).toBe(3);

      // Root node should have child mask for children 0, 1, 7
      // Binary: 10000011 = 131
      const childMask = result.data[rootOffset * 4 + 0];
      expect(childMask).toBe((1 << 0) | (1 << 1) | (1 << 7));

      // Offset to first child should be 1
      const offsetHigh = result.data[rootOffset * 4 + 1];
      const offsetLow = result.data[rootOffset * 4 + 2];
      const offsetToChild = (offsetHigh << 8) | offsetLow;
      expect(offsetToChild).toBe(1);
    });

    it('should sort nodes by level and name', () => {
      const texture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      const child0 = root.createChild(0);
      const child3 = root.createChild(3);
      const child7 = root.createChild(7);

      // Create grandchildren
      const grandchild01 = child0.createChild(1);
      const grandchild07 = child0.createChild(7);

      // Pass nodes in random order
      const nodes = [grandchild07, child3, grandchild01, root, child7, child0];
      const result = texture.compute(nodes);

      // After sorting, order should be: r, r0, r3, r7, r01, r07
      expect(result.offsets.get(root)).toBe(0);
      expect(result.offsets.get(child0)).toBe(1);
      expect(result.offsets.get(child3)).toBe(2);
      expect(result.offsets.get(child7)).toBe(3);
      expect(result.offsets.get(grandchild01)).toBe(4);
      expect(result.offsets.get(grandchild07)).toBe(5);
    });

    it('should handle deep hierarchy', () => {
      const texture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      // Create a chain: r -> r0 -> r00 -> r000
      const child0 = root.createChild(0);
      const child00 = child0.createChild(0);
      const child000 = child00.createChild(0);

      const nodes = [root, child0, child00, child000];
      const result = texture.compute(nodes);

      expect(result.offsets.size).toBe(4);
      expect(result.data.length).toBe(16);

      // Verify parent-child relationships
      const rootOffset = result.offsets.get(root)!;
      const child0Offset = result.offsets.get(child0)!;
      const child00Offset = result.offsets.get(child00)!;
      const child000Offset = result.offsets.get(child000)!;

      expect(rootOffset).toBe(0);
      expect(child0Offset).toBe(1);
      expect(child00Offset).toBe(2);
      expect(child000Offset).toBe(3);

      // Each parent should have child mask bit 0 set
      expect(result.data[rootOffset * 4 + 0] & (1 << 0)).toBeTruthy();
      expect(result.data[child0Offset * 4 + 0] & (1 << 0)).toBeTruthy();
      expect(result.data[child00Offset * 4 + 0] & (1 << 0)).toBeTruthy();
    });
  });

  describe('createTexture', () => {
    it('should create valid Three.js DataTexture', () => {
      const visTexture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);
      const child0 = root.createChild(0);

      const result = visTexture.compute([root, child0]);
      const texture = visTexture.createTexture(result);

      expect(texture).toBeInstanceOf(THREE.DataTexture);
      expect(texture.format).toBe(THREE.RGBAFormat);
      expect(texture.type).toBe(THREE.UnsignedByteType);
      expect(texture.minFilter).toBe(THREE.NearestFilter);
      expect(texture.magFilter).toBe(THREE.NearestFilter);
    });

    it('should calculate correct texture dimensions', () => {
      const visTexture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      // Create 10 nodes
      const nodes = [root];
      for (let i = 0; i < 8; i++) {
        nodes.push(root.createChild(i));
      }

      const result = visTexture.compute(nodes);
      const texture = visTexture.createTexture(result);

      // 9 nodes -> sqrt(9) = 3 -> 3x3 texture
      expect(texture.image.width).toBe(3);
      expect(texture.image.height).toBe(3);

      // Data should be padded to match dimensions
      expect(texture.image.data.length).toBe(3 * 3 * 4);
    });

    it('should dispose previous texture when creating new one', () => {
      const visTexture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      const result1 = visTexture.compute([root]);
      const texture1 = visTexture.createTexture(result1);

      // Create a second texture
      const child0 = root.createChild(0);
      const result2 = visTexture.compute([root, child0]);
      const texture2 = visTexture.createTexture(result2);

      // Should be different textures
      expect(texture1).not.toBe(texture2);
    });
  });

  describe('update', () => {
    it('should reuse texture when dimensions match', () => {
      const visTexture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      const result1 = visTexture.compute([root]);
      const texture1 = visTexture.createTexture(result1);

      // Update with same dimensions
      const result2 = visTexture.compute([root]);
      const texture2 = visTexture.update(result2);

      // Should reuse same texture instance
      expect(texture1).toBe(texture2);
    });

    it('should create new texture when dimensions change', () => {
      const visTexture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      const result1 = visTexture.compute([root]);
      const texture1 = visTexture.createTexture(result1);

      // Update with different dimensions
      const child0 = root.createChild(0);
      const result2 = visTexture.compute([root, child0]);
      const texture2 = visTexture.update(result2);

      // Should create new texture
      expect(texture1).not.toBe(texture2);
    });
  });

  describe('getTexture', () => {
    it('should return null before texture is created', () => {
      const texture = new VisibilityTexture();
      expect(texture.getTexture()).toBeNull();
    });

    it('should return texture after creation', () => {
      const visTexture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      const result = visTexture.compute([root]);
      const texture = visTexture.createTexture(result);

      expect(visTexture.getTexture()).toBe(texture);
    });
  });

  describe('dispose', () => {
    it('should dispose texture and set to null', () => {
      const visTexture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      const result = visTexture.compute([root]);
      visTexture.createTexture(result);

      visTexture.dispose();

      expect(visTexture.getTexture()).toBeNull();
    });

    it('should be safe to call dispose multiple times', () => {
      const visTexture = new VisibilityTexture();
      const bbox = new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
      const root = new OctreeNode('r', bbox, 1.0, 0);

      const result = visTexture.compute([root]);
      visTexture.createTexture(result);

      visTexture.dispose();
      visTexture.dispose();
      visTexture.dispose();

      expect(visTexture.getTexture()).toBeNull();
    });
  });
});
