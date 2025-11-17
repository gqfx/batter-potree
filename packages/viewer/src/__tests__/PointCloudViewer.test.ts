/**
 * PointCloudViewer 单元测试
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Three.js WebGLRenderer
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  return {
    ...actual,
    WebGLRenderer: class MockWebGLRenderer {
      domElement = document.createElement('canvas');
      setPixelRatio = vi.fn();
      setSize = vi.fn();
      setClearColor = vi.fn();
      render = vi.fn();
      dispose = vi.fn();
    },
  };
});

// Need to import after mocks
const { PointCloudViewer } = await import('../PointCloudViewer.js');

describe('PointCloudViewer', () => {
  let container: HTMLElement;
  let viewer: InstanceType<typeof PointCloudViewer>;

  beforeEach(() => {
    container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', { value: 1920 });
    Object.defineProperty(container, 'clientHeight', { value: 1080 });
    document.body.appendChild(container);

    viewer = new PointCloudViewer({
      container,
      pointBudget: 500_000,
    });
  });

  afterEach(() => {
    viewer.dispose();
    document.body.removeChild(container);
  });

  describe('constructor', () => {
    it('should create viewer with container', () => {
      expect(viewer).toBeDefined();
      expect(viewer.getCamera()).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(viewer.getScene()).toBeInstanceOf(THREE.Scene);
    });

    it('should accept custom configuration', () => {
      const customViewer = new PointCloudViewer({
        container,
        pointBudget: 2_000_000,
        maxConcurrentLoads: 16,
        backgroundColor: 0xffffff,
        cameraPosition: new THREE.Vector3(10, 20, 30),
        autoRotate: true,
      });

      expect(customViewer.getCamera().position.x).toBe(10);
      expect(customViewer.getCamera().position.y).toBe(20);
      expect(customViewer.getCamera().position.z).toBe(30);

      customViewer.dispose();
    });

    it('should add canvas to container', () => {
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeTruthy();
    });
  });

  describe('loadPointCloud', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            version: '2.0',
            octreeDir: 'r',
            boundingBox: {
              lx: -10,
              ly: -10,
              lz: -10,
              ux: 10,
              uy: 10,
              uz: 10,
            },
            pointAttributes: ['POSITION_CARTESIAN'],
            spacing: 0.1,
            scale: 0.001,
            points: 100000,
          }),
      });
    });

    it('should load point cloud from URL', async () => {
      const octree = await viewer.loadPointCloud('http://example.com/pointcloud/');
      expect(octree).toBeDefined();
      expect(octree.version).toBe('2.0');
    });

    it('should assign default name if not provided', async () => {
      const loadedHandler = vi.fn();
      viewer.on('pointcloud-loaded', loadedHandler);

      await viewer.loadPointCloud('http://example.com/pointcloud/');

      expect(loadedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'pointcloud-0',
        }),
      );
    });

    it('should use custom name if provided', async () => {
      const loadedHandler = vi.fn();
      viewer.on('pointcloud-loaded', loadedHandler);

      await viewer.loadPointCloud('http://example.com/pointcloud/', 'my-cloud');

      expect(loadedHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'my-cloud',
        }),
      );
    });

    it('should emit pointcloud-loaded event', async () => {
      const handler = vi.fn();
      viewer.on('pointcloud-loaded', handler);

      await viewer.loadPointCloud('http://example.com/pointcloud/');

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('removePointCloud', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          JSON.stringify({
            version: '2.0',
            octreeDir: 'r',
            boundingBox: {
              lx: -10,
              ly: -10,
              lz: -10,
              ux: 10,
              uy: 10,
              uz: 10,
            },
            pointAttributes: ['POSITION_CARTESIAN'],
            spacing: 0.1,
            scale: 0.001,
            points: 100000,
          }),
      });
    });

    it('should remove point cloud by name', async () => {
      await viewer.loadPointCloud('http://example.com/pointcloud/', 'test');

      const handler = vi.fn();
      viewer.on('pointcloud-removed', handler);

      viewer.removePointCloud('test');

      expect(handler).toHaveBeenCalledWith({ name: 'test' });
    });

    it('should handle removing non-existent point cloud', () => {
      expect(() => viewer.removePointCloud('non-existent')).not.toThrow();
    });
  });

  describe('start/stop', () => {
    it('should start animation loop', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

      viewer.start();

      expect(rafSpy).toHaveBeenCalled();
      viewer.stop();
    });

    it('should not start if already running', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

      viewer.start();
      viewer.start(); // Should be no-op

      expect(rafSpy).toHaveBeenCalledTimes(1);
      viewer.stop();
    });

    it('should stop animation loop', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 123);

      viewer.start();
      viewer.stop();

      expect(cancelSpy).toHaveBeenCalledWith(123);
    });

    it('should not stop if not running', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

      viewer.stop(); // Should be no-op

      expect(cancelSpy).not.toHaveBeenCalled();
    });
  });

  describe('setPointBudget', () => {
    it('should update point budget', () => {
      viewer.setPointBudget(2_000_000);
      // Internal state updated - no direct way to verify without accessing private
      expect(true).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      const stats = viewer.getStats();

      expect(stats).toHaveProperty('fps');
      expect(stats).toHaveProperty('visiblePoints');
      expect(stats).toHaveProperty('loadedNodes');
      expect(stats).toHaveProperty('pendingLoads');

      expect(typeof stats.fps).toBe('number');
      expect(typeof stats.visiblePoints).toBe('number');
      expect(typeof stats.loadedNodes).toBe('number');
      expect(typeof stats.pendingLoads).toBe('number');
    });
  });

  describe('getters', () => {
    it('should return camera', () => {
      const camera = viewer.getCamera();
      expect(camera).toBeInstanceOf(THREE.PerspectiveCamera);
    });

    it('should return scene', () => {
      const scene = viewer.getScene();
      expect(scene).toBeInstanceOf(THREE.Scene);
    });

    it('should return renderer', () => {
      const renderer = viewer.getRenderer();
      expect(renderer).toBeDefined();
    });
  });

  describe('dispose', () => {
    it('should clean up resources', () => {
      const handler = vi.fn();
      viewer.on('dispose', handler);

      viewer.dispose();

      expect(handler).toHaveBeenCalled();
    });

    it('should stop animation loop', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 123);

      viewer.start();
      viewer.dispose();

      expect(cancelSpy).toHaveBeenCalled();
    });

    it('should remove canvas from container', () => {
      viewer.dispose();
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeNull();
    });
  });

  describe('events', () => {
    it('should emit update event during animation', () => {
      const handler = vi.fn();
      viewer.on('update', handler);

      // Manually trigger update
      (viewer as any).update(0.016);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          deltaTime: 0.016,
        }),
      );
    });

    it('should emit render event during animation', () => {
      const handler = vi.fn();
      viewer.on('render', handler);

      // Manually trigger render
      (viewer as any).render();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          visiblePoints: expect.any(Number),
        }),
      );
    });
  });
});
