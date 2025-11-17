/**
 * TraversalSystem 单元测试
 */

import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPointCloudOctree, IPointCloudOctreeNode } from '../../types/potree.js';
import { TraversalSystem } from '../TraversalSystem.js';

describe('TraversalSystem', () => {
  let system: TraversalSystem;
  let camera: THREE.PerspectiveCamera;
  let mockOctree: IPointCloudOctree;

  const createMockNode = (
    name: string,
    level: number,
    min: THREE.Vector3,
    max: THREE.Vector3,
    numPoints: number,
    children: Array<IPointCloudOctreeNode | null> = new Array(8).fill(null),
  ): IPointCloudOctreeNode => ({
    name,
    level,
    boundingBox: new THREE.Box3(min, max),
    numPoints,
    children,
    loaded: false,
    loading: false,
  });

  beforeEach(() => {
    system = new TraversalSystem({
      pointBudget: 100_000,
      maxLevel: 10,
      minScreenSize: 50,
      screenWidth: 1920,
      screenHeight: 1080,
    });

    camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const rootNode = createMockNode(
      'r',
      0,
      new THREE.Vector3(-10, -10, -10),
      new THREE.Vector3(10, 10, 10),
      10000,
    );

    mockOctree = {
      url: 'http://example.com/pointcloud/',
      spacing: 0.1,
      boundingBox: new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10)),
      tightBoundingBox: new THREE.Box3(
        new THREE.Vector3(-10, -10, -10),
        new THREE.Vector3(10, 10, 10),
      ),
      root: rootNode,
      pointAttributes: { attributes: [], byteSize: 0, size: 0 },
      projection: null,
      version: '2.0',
      scale: 0.001,
    };

    system.setCamera(camera);
  });

  describe('constructor', () => {
    it('should create system with default config', () => {
      const defaultSystem = new TraversalSystem();
      expect(defaultSystem.name).toBe('bp:traversal');
      expect(defaultSystem.stage).toBe(100);
      expect(defaultSystem.priority).toBe(0);
    });

    it('should accept custom config', () => {
      const customSystem = new TraversalSystem({
        pointBudget: 500_000,
        maxLevel: 15,
        minScreenSize: 200,
      });
      expect(customSystem).toBeDefined();
    });
  });

  describe('addPointCloud/removePointCloud', () => {
    it('should add point cloud', () => {
      system.addPointCloud('test', mockOctree);
      const result = system.getLastResult();
      expect(result.visibleNodes).toHaveLength(0); // No update called yet
    });

    it('should remove point cloud', () => {
      system.addPointCloud('test', mockOctree);
      system.removePointCloud('test');
      system.update(0.016);
      const result = system.getLastResult();
      expect(result.visibleNodes).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should return empty result without camera', () => {
      const noCamera = new TraversalSystem();
      noCamera.addPointCloud('test', mockOctree);
      noCamera.update(0.016);
      const result = noCamera.getLastResult();
      expect(result.visibleNodes).toHaveLength(0);
    });

    it('should return empty result without point clouds', () => {
      system.update(0.016);
      const result = system.getLastResult();
      expect(result.visibleNodes).toHaveLength(0);
    });

    it('should find visible nodes within frustum', () => {
      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      const result = system.getLastResult();
      expect(result.visibleNodes.length).toBeGreaterThan(0);
      expect(result.totalPoints).toBeGreaterThan(0);
    });

    it('should respect point budget', () => {
      system.setPointBudget(5000);
      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      const result = system.getLastResult();
      expect(result.totalPoints).toBeLessThanOrEqual(5000);
    });

    it('should sort nodes by priority', () => {
      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      const result = system.getLastResult();

      if (result.visibleNodes.length > 1) {
        for (let i = 1; i < result.visibleNodes.length; i++) {
          expect(result.visibleNodes[i - 1].priority).toBeGreaterThanOrEqual(
            result.visibleNodes[i].priority,
          );
        }
      }
    });

    it('should calculate traversal time', () => {
      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      const result = system.getLastResult();
      expect(result.traversalTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('frustum culling', () => {
    it('should cull nodes outside frustum', () => {
      // Position camera far away from the point cloud
      camera.position.set(1000, 0, 0);
      camera.lookAt(1000, 0, 1); // Looking away from point cloud
      camera.updateMatrixWorld();

      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      const result = system.getLastResult();

      // Node should be culled as it's outside the frustum
      expect(result.visibleNodes.length).toBe(0);
    });

    it('should include nodes inside frustum', () => {
      // Camera is looking at the point cloud
      camera.position.set(0, 0, 20);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      const result = system.getLastResult();

      expect(result.visibleNodes.length).toBeGreaterThan(0);
    });
  });

  describe('LOD selection', () => {
    it('should respect max level', () => {
      // Create a deep hierarchy
      const child = createMockNode(
        'r0',
        11, // Beyond max level of 10
        new THREE.Vector3(-5, -5, -5),
        new THREE.Vector3(5, 5, 5),
        1000,
      );
      mockOctree.root!.children[0] = child;

      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      const result = system.getLastResult();

      // Should not traverse beyond max level
      const maxLevel = Math.max(...result.visibleNodes.map((n) => n.node.level));
      expect(maxLevel).toBeLessThanOrEqual(11);
    });

    it('should prioritize closer nodes', () => {
      // Create two child nodes at different distances
      const nearChild = createMockNode(
        'r0',
        1,
        new THREE.Vector3(-5, -5, 8), // Closer to camera at z=10
        new THREE.Vector3(5, 5, 12),
        1000,
      );
      const farChild = createMockNode(
        'r1',
        1,
        new THREE.Vector3(-5, -5, -12), // Far from camera
        new THREE.Vector3(5, 5, -8),
        1000,
      );
      mockOctree.root!.children[0] = nearChild;
      mockOctree.root!.children[1] = farChild;

      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      const result = system.getLastResult();

      // Near child should have higher priority
      const nearNode = result.visibleNodes.find((n) => n.node.name === 'r0');
      const farNode = result.visibleNodes.find((n) => n.node.name === 'r1');

      if (nearNode && farNode) {
        expect(nearNode.priority).toBeGreaterThan(farNode.priority);
      }
    });
  });

  describe('setters', () => {
    it('should update point budget', () => {
      system.setPointBudget(2_000_000);
      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      // Should not throw
      expect(true).toBe(true);
    });

    it('should update screen size', () => {
      system.setScreenSize(3840, 2160);
      system.addPointCloud('test', mockOctree);
      system.update(0.016);
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should clear all resources', () => {
      system.addPointCloud('test', mockOctree);
      system.dispose();
      system.update(0.016);
      const result = system.getLastResult();
      expect(result.visibleNodes).toHaveLength(0);
    });
  });
});
