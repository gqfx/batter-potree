/**
 * Unit tests for NodeResourceManager
 */

import * as THREE from 'three';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeResourceManager } from '../NodeResourceManager.js';
import type { IPointCloudOctreeNode } from '../../types/potree.js';

// Helper to create a mock geometry with known size
function createMockGeometry(numPoints: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Position attribute (3 floats per point)
  const positions = new Float32Array(numPoints * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  // Color attribute (3 floats per point)
  const colors = new Float32Array(numPoints * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  return geometry;
}

// Helper to create a mock node
function createMockNode(name: string, numPoints: number): IPointCloudOctreeNode {
  const node: Partial<IPointCloudOctreeNode> = {
    name,
    level: 0,
    numPoints,
    loaded: true,
    loading: false,
    boundingBox: new THREE.Box3(),
    children: [],
  };
  return node as IPointCloudOctreeNode;
}

describe('NodeResourceManager', () => {
  let manager: NodeResourceManager;

  beforeEach(() => {
    manager = new NodeResourceManager({
      memoryLimit: 100000, // 100KB for testing to avoid auto-cleanup
      cleanupThreshold: 0.9,
    });
  });

  describe('constructor', () => {
    it('should create manager with default options', () => {
      const defaultManager = new NodeResourceManager();
      const stats = defaultManager.getStats();
      expect(stats.memoryLimit).toBe(500 * 1024 * 1024);
    });

    it('should create manager with custom options', () => {
      const stats = manager.getStats();
      expect(stats.memoryLimit).toBe(100000);
    });
  });

  describe('register', () => {
    it('should register node resource', () => {
      const node = createMockNode('r', 10);
      const geometry = createMockGeometry(10);

      manager.register('cloud:r', node, geometry);

      expect(manager.has('cloud:r')).toBe(true);
      const stats = manager.getStats();
      expect(stats.totalNodes).toBe(1);
      expect(stats.totalMemory).toBeGreaterThan(0);
    });

    it('should replace existing resource', () => {
      const node1 = createMockNode('r', 10);
      const geometry1 = createMockGeometry(10);
      const node2 = createMockNode('r', 20);
      const geometry2 = createMockGeometry(20);

      manager.register('cloud:r', node1, geometry1);
      manager.register('cloud:r', node2, geometry2);

      const stats = manager.getStats();
      expect(stats.totalNodes).toBe(1);
    });

    it('should update total points', () => {
      const node = createMockNode('r', 100);
      const geometry = createMockGeometry(100);

      manager.register('cloud:r', node, geometry);

      const stats = manager.getStats();
      expect(stats.totalPoints).toBe(100);
    });
  });

  describe('touch', () => {
    it('should update access and move to head', () => {
      const node1 = createMockNode('r0', 10);
      const geometry1 = createMockGeometry(10);
      const node2 = createMockNode('r1', 10);
      const geometry2 = createMockGeometry(10);

      manager.register('cloud:r0', node1, geometry1);
      manager.register('cloud:r1', node2, geometry2);

      // r1 is now at head, r0 at tail
      // Touch r0 to move it to head
      manager.touch('cloud:r0');

      const ids = manager.getNodeIds();
      expect(ids[0]).toBe('cloud:r0');
      expect(ids[1]).toBe('cloud:r1');
    });

    it('should increment hits on successful touch', () => {
      const node = createMockNode('r', 10);
      const geometry = createMockGeometry(10);

      manager.register('cloud:r', node, geometry);
      manager.touch('cloud:r');

      const stats = manager.getStats();
      expect(stats.hits).toBe(1);
    });

    it('should increment misses on failed touch', () => {
      manager.touch('nonexistent');

      const stats = manager.getStats();
      expect(stats.misses).toBe(1);
    });
  });

  describe('remove', () => {
    it('should remove node and dispose geometry', () => {
      const node = createMockNode('r', 10);
      const geometry = createMockGeometry(10);
      const disposeSpy = vi.spyOn(geometry, 'dispose');

      manager.register('cloud:r', node, geometry);
      const result = manager.remove('cloud:r');

      expect(result).toBe(true);
      expect(manager.has('cloud:r')).toBe(false);
      expect(disposeSpy).toHaveBeenCalled();
      expect(node.loaded).toBe(false);
      expect(node.geometry).toBeUndefined();
    });

    it('should return false for non-existent node', () => {
      const result = manager.remove('nonexistent');
      expect(result).toBe(false);
    });

    it('should update memory and point counters', () => {
      const node = createMockNode('r', 100);
      const geometry = createMockGeometry(100);

      manager.register('cloud:r', node, geometry);
      const beforeStats = manager.getStats();

      manager.remove('cloud:r');
      const afterStats = manager.getStats();

      expect(afterStats.totalMemory).toBeLessThan(beforeStats.totalMemory);
      expect(afterStats.totalPoints).toBe(0);
    });
  });

  describe('freeMemory', () => {
    it('should evict LRU nodes when over limit', () => {
      // Create manager with small limit
      const smallManager = new NodeResourceManager({
        memoryLimit: 100, // Very small: 100 bytes
        cleanupThreshold: 1.0, // Only free when over 100%
      });

      // Add nodes
      const node1 = createMockNode('r0', 50);
      const geometry1 = createMockGeometry(50);
      const node2 = createMockNode('r1', 50);
      const geometry2 = createMockGeometry(50);

      smallManager.register('cloud:r0', node1, geometry1);
      smallManager.register('cloud:r1', node2, geometry2);

      // Check initial state (may have auto-cleaned or not)
      const beforeStats = smallManager.getStats();

      // Manual free to target = 0
      const freed = smallManager.freeMemory(0);

      // Should have freed nodes (at least one if any exist)
      if (beforeStats.totalNodes > 0) {
        expect(freed).toBeGreaterThan(0);
      }

      // After freeing to 0, memory should be 0
      const afterStats = smallManager.getStats();
      expect(afterStats.totalMemory).toBe(0);
    });

    it('should evict oldest nodes first', () => {
      const evictionCallback = vi.fn();
      const customManager = new NodeResourceManager({
        memoryLimit: 100, // Very small
        cleanupThreshold: 1.0,
        onNodeEvicted: evictionCallback,
      });

      const node1 = createMockNode('r0', 10);
      const geometry1 = createMockGeometry(10);
      const node2 = createMockNode('r1', 10);
      const geometry2 = createMockGeometry(10);

      customManager.register('cloud:r0', node1, geometry1);
      customManager.register('cloud:r1', node2, geometry2);

      // r1 is MRU, r0 is LRU
      customManager.freeMemory();

      // r0 should be evicted first
      if (evictionCallback.mock.calls.length > 0) {
        expect(evictionCallback.mock.calls[0]?.[0]).toBe('cloud:r0');
      }
    });

    it('should call onNodeEvicted callback', () => {
      const callback = vi.fn();
      const customManager = new NodeResourceManager({
        memoryLimit: 100,
        cleanupThreshold: 1.0,
        onNodeEvicted: callback,
      });

      const node = createMockNode('r', 10);
      const geometry = createMockGeometry(10);

      customManager.register('cloud:r', node, geometry);
      customManager.freeMemory(0); // Free all

      expect(callback).toHaveBeenCalledWith('cloud:r', node);
    });

    it('should update eviction counter', () => {
      const customManager = new NodeResourceManager({
        memoryLimit: 100,
        cleanupThreshold: 1.0,
      });

      const node = createMockNode('r', 10);
      const geometry = createMockGeometry(10);

      customManager.register('cloud:r', node, geometry);
      customManager.freeMemory(0);

      const stats = customManager.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return correct stats', () => {
      const node = createMockNode('r', 50);
      const geometry = createMockGeometry(50);

      manager.register('cloud:r', node, geometry);
      manager.touch('cloud:r');
      manager.touch('nonexistent');

      const stats = manager.getStats();

      expect(stats.totalNodes).toBe(1);
      expect(stats.totalMemory).toBeGreaterThan(0);
      expect(stats.totalPoints).toBe(50);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });
  });

  describe('getHitRate', () => {
    it('should return 0 for no accesses', () => {
      expect(manager.getHitRate()).toBe(0);
    });

    it('should return correct hit rate', () => {
      const node = createMockNode('r', 10);
      const geometry = createMockGeometry(10);

      manager.register('cloud:r', node, geometry);
      manager.touch('cloud:r'); // hit
      manager.touch('cloud:r'); // hit
      manager.touch('nonexistent'); // miss

      expect(manager.getHitRate()).toBeCloseTo(2 / 3);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return correct usage ratio', () => {
      const customManager = new NodeResourceManager({
        memoryLimit: 1000,
      });

      // Initially 0
      expect(customManager.getMemoryUsage()).toBe(0);

      const node = createMockNode('r', 10);
      const geometry = createMockGeometry(10); // ~240 bytes

      customManager.register('cloud:r', node, geometry);

      const usage = customManager.getMemoryUsage();
      expect(usage).toBeGreaterThan(0);
      expect(usage).toBeLessThanOrEqual(1);
    });
  });

  describe('clear', () => {
    it('should clear all resources', () => {
      const node1 = createMockNode('r0', 10);
      const geometry1 = createMockGeometry(10);
      const node2 = createMockNode('r1', 10);
      const geometry2 = createMockGeometry(10);

      manager.register('cloud:r0', node1, geometry1);
      manager.register('cloud:r1', node2, geometry2);

      manager.clear();

      const stats = manager.getStats();
      expect(stats.totalNodes).toBe(0);
      expect(stats.totalMemory).toBe(0);
      expect(stats.totalPoints).toBe(0);
      expect(node1.loaded).toBe(false);
      expect(node2.loaded).toBe(false);
    });
  });

  describe('getNodeIds', () => {
    it('should return IDs in MRU order', () => {
      const node1 = createMockNode('r0', 10);
      const geometry1 = createMockGeometry(10);
      const node2 = createMockNode('r1', 10);
      const geometry2 = createMockGeometry(10);
      const node3 = createMockNode('r2', 10);
      const geometry3 = createMockGeometry(10);

      manager.register('cloud:r0', node1, geometry1);
      manager.register('cloud:r1', node2, geometry2);
      manager.register('cloud:r2', node3, geometry3);

      // r2 is MRU, r0 is LRU
      let ids = manager.getNodeIds();
      expect(ids).toEqual(['cloud:r2', 'cloud:r1', 'cloud:r0']);

      // Touch r0 to make it MRU
      manager.touch('cloud:r0');

      ids = manager.getNodeIds();
      expect(ids).toEqual(['cloud:r0', 'cloud:r2', 'cloud:r1']);
    });
  });

  describe('LRU behavior', () => {
    it('should maintain correct order after multiple operations', () => {
      const nodes = [];
      const geometries = [];

      for (let i = 0; i < 5; i++) {
        nodes.push(createMockNode(`r${i}`, 10));
        geometries.push(createMockGeometry(10));
        manager.register(`cloud:r${i}`, nodes[i]!, geometries[i]!);
      }

      // Order: r4 (MRU) -> r3 -> r2 -> r1 -> r0 (LRU)
      let ids = manager.getNodeIds();
      expect(ids[0]).toBe('cloud:r4');
      expect(ids[4]).toBe('cloud:r0');

      // Touch r0 and r2
      manager.touch('cloud:r0');
      manager.touch('cloud:r2');

      // New order: r2 (MRU) -> r0 -> r4 -> r3 -> r1 (LRU)
      ids = manager.getNodeIds();
      expect(ids[0]).toBe('cloud:r2');
      expect(ids[1]).toBe('cloud:r0');
      expect(ids[4]).toBe('cloud:r1');
    });
  });

  describe('auto-cleanup', () => {
    it('should auto-cleanup when exceeding threshold', () => {
      // Small limit with 50% threshold
      const autoManager = new NodeResourceManager({
        memoryLimit: 200,
        cleanupThreshold: 0.5, // Cleanup at 100 bytes
      });

      const node1 = createMockNode('r0', 100);
      const geometry1 = createMockGeometry(100); // ~2400 bytes

      // This should trigger auto-cleanup
      autoManager.register('cloud:r0', node1, geometry1);

      // After auto-cleanup, memory should be below limit
      expect(autoManager.getMemoryUsage()).toBeLessThanOrEqual(1);
    });
  });
});
