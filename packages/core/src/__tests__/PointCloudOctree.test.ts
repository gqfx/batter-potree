/**
 * Unit tests for PointCloudOctree
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PointCloudOctree } from '../octree/PointCloudOctree';
import { PointAttributes } from '../attributes/PointAttributes';

describe('PointCloudOctree', () => {
  it('should create octree with root node', () => {
    const bbox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(100, 100, 100),
    );
    const attrs = new PointAttributes(['POSITION_CARTESIAN', 'RGB_PACKED']);
    const octree = new PointCloudOctree(bbox, 1.0, attrs);

    expect(octree.root.name).toBe('r');
    expect(octree.root.level).toBe(0);
    expect(octree.boundingBox).toBe(bbox);
    expect(octree.pointAttributes).toBe(attrs);
  });

  it('should find node by name', () => {
    const bbox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(100, 100, 100),
    );
    const attrs = new PointAttributes();
    const octree = new PointCloudOctree(bbox, 1.0, attrs);

    // Create some children
    const child0 = octree.root.createChild(0);
    const child01 = child0.createChild(1);

    expect(octree.findNode('r')).toBe(octree.root);
    expect(octree.findNode('r0')).toBe(child0);
    expect(octree.findNode('r01')).toBe(child01);
    expect(octree.findNode('r02')).toBeNull();
  });

  it('should get nodes at specific level', () => {
    const bbox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(100, 100, 100),
    );
    const attrs = new PointAttributes();
    const octree = new PointCloudOctree(bbox, 1.0, attrs);

    // Create children at level 1
    octree.root.createChild(0);
    octree.root.createChild(1);

    const level0Nodes = octree.getNodesAtLevel(0);
    const level1Nodes = octree.getNodesAtLevel(1);

    expect(level0Nodes.length).toBe(1);
    expect(level1Nodes.length).toBe(2);
  });
});
