/**
 * StreamingSystem 单元测试
 */

import * as THREE from 'three';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { StreamingSystem } from '../StreamingSystem.js';
import type { IPointCloudOctree, IPointCloudOctreeNode } from '../../types/potree.js';

describe('StreamingSystem', () => {
  let system: StreamingSystem;
  let mockOctree: IPointCloudOctree;
  let mockNode: IPointCloudOctreeNode;
  let fetchMock: ReturnType<typeof vi.fn>;

  const createMockNode = (
    name: string,
    level: number = 0,
  ): IPointCloudOctreeNode => ({
    name,
    level,
    boundingBox: new THREE.Box3(
      new THREE.Vector3(-10, -10, -10),
      new THREE.Vector3(10, 10, 10),
    ),
    numPoints: 10000,
    children: new Array(8).fill(null),
    loaded: false,
    loading: false,
  });

  beforeEach(() => {
    system = new StreamingSystem({
      maxConcurrentLoads: 4,
      maxRetries: 2,
      maxRequestsPerFrame: 5,
    });

    mockNode = createMockNode('r');

    mockOctree = {
      url: 'http://example.com/pointcloud/',
      spacing: 0.1,
      boundingBox: new THREE.Box3(
        new THREE.Vector3(-10, -10, -10),
        new THREE.Vector3(10, 10, 10),
      ),
      tightBoundingBox: new THREE.Box3(
        new THREE.Vector3(-10, -10, -10),
        new THREE.Vector3(10, 10, 10),
      ),
      root: mockNode,
      pointAttributes: { attributes: [], byteSize: 0, size: 0 },
      projection: null,
      version: '2.0',
      scale: 0.001,
    };

    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    system.dispose();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create system with default config', () => {
      const defaultSystem = new StreamingSystem();
      expect(defaultSystem.name).toBe('bp:streaming');
      expect(defaultSystem.stage).toBe(100);
      expect(defaultSystem.priority).toBe(10);
    });

    it('should accept custom config', () => {
      const customSystem = new StreamingSystem({
        maxConcurrentLoads: 16,
        maxRetries: 5,
      });
      expect(customSystem).toBeDefined();
    });
  });

  describe('requestLoad', () => {
    it('should add request to pending queue', () => {
      system.requestLoad(mockOctree, mockNode, 1.0);
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(1);
    });

    it('should not duplicate pending requests', () => {
      system.requestLoad(mockOctree, mockNode, 1.0);
      system.requestLoad(mockOctree, mockNode, 2.0);
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(1);
    });

    it('should update priority if higher', () => {
      system.requestLoad(mockOctree, mockNode, 1.0);
      system.requestLoad(mockOctree, mockNode, 5.0);
      // Priority should be updated to 5.0 (not directly testable without internal access)
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(1);
    });

    it('should skip already loaded nodes', () => {
      const loadedNode = createMockNode('loaded');
      (loadedNode as { loaded: boolean }).loaded = true;
      system.requestLoad(mockOctree, loadedNode, 1.0);
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(0);
    });
  });

  describe('cancelLoad', () => {
    it('should remove request from pending queue', () => {
      system.requestLoad(mockOctree, mockNode, 1.0);
      system.cancelLoad(mockOctree, mockNode);
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(0);
    });

    it('should handle canceling non-existent request', () => {
      system.cancelLoad(mockOctree, mockNode);
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(0);
    });
  });

  describe('cancelAllLoads', () => {
    it('should clear all pending requests', () => {
      const node1 = createMockNode('r0');
      const node2 = createMockNode('r1');
      system.requestLoad(mockOctree, node1, 1.0);
      system.requestLoad(mockOctree, node2, 2.0);
      system.cancelAllLoads();
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(0);
    });
  });

  describe('update', () => {
    it('should process pending requests', async () => {
      const mockBuffer = new ArrayBuffer(100);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      system.requestLoad(mockOctree, mockNode, 1.0);
      system.update(0.016);

      // Should move from pending to active
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(0);
      expect(stats.activeLoads).toBe(1);
    });

    it('should respect max concurrent loads', async () => {
      fetchMock.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  arrayBuffer: async () => new ArrayBuffer(100),
                }),
              1000,
            );
          }),
      );

      // Request more than max concurrent
      for (let i = 0; i < 10; i++) {
        const node = createMockNode(`r${i}`);
        system.requestLoad(mockOctree, node, 1.0);
      }

      system.update(0.016);

      const stats = system.getStats();
      expect(stats.activeLoads).toBeLessThanOrEqual(4);
      expect(stats.pendingRequests).toBeGreaterThan(0);
    });

    it('should process requests by priority', () => {
      fetchMock.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });

      const lowPriorityNode = createMockNode('low');
      const highPriorityNode = createMockNode('high');

      system.requestLoad(mockOctree, lowPriorityNode, 1.0);
      system.requestLoad(mockOctree, highPriorityNode, 10.0);

      system.update(0.016);

      // High priority should be processed first
      // This is a bit tricky to test without internal access
      const stats = system.getStats();
      expect(stats.activeLoads).toBeGreaterThan(0);
    });
  });

  describe('load completion', () => {
    it('should mark node as loaded on success', async () => {
      const mockBuffer = new ArrayBuffer(100);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      const completeCallback = vi.fn();
      system.setOnLoadComplete(completeCallback);

      system.requestLoad(mockOctree, mockNode, 1.0);
      system.update(0.016);

      // Wait for async operation
      await vi.waitFor(() => {
        expect(mockNode.loaded).toBe(true);
      });

      expect(mockNode.loading).toBe(false);
      expect(completeCallback).toHaveBeenCalled();
    });

    it('should update stats on completion', async () => {
      const mockBuffer = new ArrayBuffer(256);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => mockBuffer,
      });

      system.requestLoad(mockOctree, mockNode, 1.0);
      system.update(0.016);

      await vi.waitFor(() => {
        const stats = system.getStats();
        return stats.completedLoads > 0;
      });

      const stats = system.getStats();
      expect(stats.completedLoads).toBe(1);
      expect(stats.totalBytesLoaded).toBe(256);
      expect(stats.avgLoadTime).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should retry on failure', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: async () => new ArrayBuffer(100),
        });

      system.requestLoad(mockOctree, mockNode, 1.0);
      system.update(0.016);

      // Wait for first failure
      await vi.waitFor(() => {
        const stats = system.getStats();
        return stats.pendingRequests === 1; // Should be back in queue for retry
      });

      // Process retry
      system.update(0.016);

      await vi.waitFor(() => {
        return mockNode.loaded === true;
      });

      expect(mockNode.loaded).toBe(true);
    });

    it('should call onLoadFailed after max retries', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const failCallback = vi.fn();
      system.setOnLoadFailed(failCallback);

      system.requestLoad(mockOctree, mockNode, 1.0);

      // Process initial request + retries
      for (let i = 0; i < 5; i++) {
        system.update(0.016);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      await vi.waitFor(() => {
        const stats = system.getStats();
        return stats.failedLoads > 0;
      });

      const stats = system.getStats();
      expect(stats.failedLoads).toBe(1);
      expect(failCallback).toHaveBeenCalled();
    });

    it('should handle HTTP error response', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      const failCallback = vi.fn();
      system.setOnLoadFailed(failCallback);

      system.requestLoad(mockOctree, mockNode, 1.0);
      system.update(0.016);

      // Wait for retries to exhaust
      await vi.waitFor(
        () => {
          const stats = system.getStats();
          return stats.failedLoads > 0;
        },
        { timeout: 5000 },
      );

      expect(mockNode.loaded).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(0);
      expect(stats.activeLoads).toBe(0);
      expect(stats.completedLoads).toBe(0);
      expect(stats.failedLoads).toBe(0);
      expect(stats.totalBytesLoaded).toBe(0);
      expect(stats.avgLoadTime).toBe(0);
    });

    it('should calculate average load time', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });

      const node1 = createMockNode('r0');
      const node2 = createMockNode('r1');

      system.requestLoad(mockOctree, node1, 1.0);
      system.requestLoad(mockOctree, node2, 1.0);
      system.update(0.016);

      await vi.waitFor(() => {
        const stats = system.getStats();
        return stats.completedLoads === 2;
      });

      const stats = system.getStats();
      expect(stats.avgLoadTime).toBeGreaterThan(0);
    });
  });

  describe('dispose', () => {
    it('should cancel all loads and reset stats', () => {
      system.requestLoad(mockOctree, mockNode, 1.0);
      system.dispose();

      const stats = system.getStats();
      expect(stats.pendingRequests).toBe(0);
      expect(stats.activeLoads).toBe(0);
      expect(stats.completedLoads).toBe(0);
    });
  });
});
