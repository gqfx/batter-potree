/**
 * Unit tests for Viewer class
 */

import type { EDLConfig, IPointCloudOctree, IRenderer, IScene } from '@better-potree/core';
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Viewer } from '../Viewer';

// Mock implementations
class MockRenderer implements IRenderer {
  private domElement: HTMLCanvasElement;
  private disposed = false;

  constructor() {
    this.domElement = document.createElement('canvas');
  }

  getDomElement(): HTMLCanvasElement {
    return this.domElement;
  }

  setSize(width: number, height: number): void {
    this.domElement.width = width;
    this.domElement.height = height;
  }

  render(_scene: IScene, _camera: THREE.Camera): void {
    // Mock render
  }

  dispose(): void {
    this.disposed = true;
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  getThreeRenderer?(): THREE.WebGLRenderer {
    return {
      getSize: (target: THREE.Vector2) => {
        target.set(800, 600);
        return target;
      },
    } as any;
  }
}

class MockScene implements IScene {
  private threeScene: THREE.Scene;

  constructor() {
    this.threeScene = new THREE.Scene();
  }

  getThreeScene(): THREE.Scene {
    return this.threeScene;
  }

  add(_object: any): void {
    // Mock add
  }

  remove(_object: any): void {
    // Mock remove
  }
}

describe('Viewer', () => {
  let container: HTMLElement;
  let renderer: MockRenderer;
  let scene: MockScene;

  beforeEach(() => {
    // Create container element
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';

    // Mock clientWidth/clientHeight since JSDOM doesn't compute layout
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 600,
    });

    document.body.appendChild(container);

    // Create mock dependencies
    renderer = new MockRenderer();
    scene = new MockScene();

    // Mock window.requestAnimationFrame and cancelAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    // Cleanup
    document.body.removeChild(container);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create viewer with required config', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer).toBeInstanceOf(Viewer);
      expect(viewer.getCamera()).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(viewer.getRenderer()).toBe(renderer);
      expect(viewer.getScene()).toBe(scene);
    });

    it('should use provided camera', () => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        camera,
      });

      expect(viewer.getCamera()).toBe(camera);
    });

    it('should set default point budget', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getPointBudget()).toBe(1_000_000);
    });

    it('should use custom point budget', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        pointBudget: 500_000,
      });

      expect(viewer.getPointBudget()).toBe(500_000);
    });

    it('should set default point size', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getPointSize()).toBe(1.0);
    });

    it('should use custom point size', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        pointSize: 2.5,
      });

      expect(viewer.getPointSize()).toBe(2.5);
    });

    it('should set default EDL config', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const edlConfig = viewer.getEDLConfig();
      expect(edlConfig.enabled).toBe(true);
      expect(edlConfig.radius).toBe(1.4);
      expect(edlConfig.strength).toBe(0.4);
    });

    it('should use custom EDL config', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        edlEnabled: false,
        edlRadius: 2.0,
        edlStrength: 0.6,
      });

      const edlConfig = viewer.getEDLConfig();
      expect(edlConfig.enabled).toBe(false);
      expect(edlConfig.radius).toBe(2.0);
      expect(edlConfig.strength).toBe(0.6);
    });

    it('should set default background color', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const bg = viewer.getBackground();
      expect(bg.getHex()).toBe(0x000000);
    });

    it('should use custom background color', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        backgroundColor: 0xff0000,
      });

      const bg = viewer.getBackground();
      expect(bg.getHex()).toBe(0xff0000);
    });

    it('should create default camera with correct aspect ratio', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const camera = viewer.getCamera() as THREE.PerspectiveCamera;
      expect(camera.aspect).toBe(800 / 600);
    });

    it('should create default camera with custom FOV', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        fov: 45,
      });

      const camera = viewer.getCamera() as THREE.PerspectiveCamera;
      expect(camera.fov).toBe(45);
    });

    it('should append canvas to container', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(container.contains(renderer.getDomElement())).toBe(true);
    });

    it('should set renderer size to container size', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const canvas = renderer.getDomElement();
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(600);
    });
  });

  describe('point budget', () => {
    it('should set point budget', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('point-budget-changed', listener);

      viewer.setPointBudget(2_000_000);

      expect(viewer.getPointBudget()).toBe(2_000_000);
      expect(listener).toHaveBeenCalledWith({ budget: 2_000_000 });
    });

    it('should enforce minimum point budget', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.setPointBudget(50_000);

      expect(viewer.getPointBudget()).toBe(100_000);
    });
  });

  describe('point size', () => {
    it('should set point size', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('point-size-changed', listener);

      viewer.setPointSize(3.0);

      expect(viewer.getPointSize()).toBe(3.0);
      expect(listener).toHaveBeenCalledWith({ size: 3.0 });
    });

    it('should enforce minimum point size', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.setPointSize(0.05);

      expect(viewer.getPointSize()).toBe(0.1);
    });
  });

  describe('background color', () => {
    it('should set background color from number', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('background-changed', listener);

      viewer.setBackground(0xff0000);

      const bg = viewer.getBackground();
      expect(bg.getHex()).toBe(0xff0000);
      expect(listener).toHaveBeenCalledWith({ color: bg });
    });

    it('should set background color from string', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.setBackground('#00ff00');

      const bg = viewer.getBackground();
      expect(bg.getHex()).toBe(0x00ff00);
    });

    it('should update scene background if getThreeScene is available', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.setBackground(0x0000ff);

      const threeScene = scene.getThreeScene();
      expect(threeScene.background).toBeInstanceOf(THREE.Color);
      expect((threeScene.background as THREE.Color).getHex()).toBe(0x0000ff);
    });
  });

  describe('EDL configuration', () => {
    it('should set EDL enabled', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('edl-changed', listener);

      viewer.setEDLEnabled(false);

      expect(viewer.getEDLConfig().enabled).toBe(false);
      expect(listener).toHaveBeenCalledWith({ enabled: false });
    });

    it('should set partial EDL config', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('edl-changed', listener);

      viewer.setEDLConfig({ radius: 2.5 });

      const config = viewer.getEDLConfig();
      expect(config.enabled).toBe(true); // unchanged
      expect(config.radius).toBe(2.5);
      expect(config.strength).toBe(0.4); // unchanged
    });

    it('should set full EDL config', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const newConfig: EDLConfig = {
        enabled: false,
        radius: 3.0,
        strength: 0.8,
      };

      viewer.setEDLConfig(newConfig);

      const config = viewer.getEDLConfig();
      expect(config).toEqual(newConfig);
    });

    it('should return copy of EDL config', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const config1 = viewer.getEDLConfig();
      const config2 = viewer.getEDLConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('point clouds', () => {
    it('should return empty array initially', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getPointClouds()).toEqual([]);
    });

    it('should throw error when loading (not yet implemented)', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      await expect(viewer.load('test.json')).rejects.toThrow(
        'Point cloud loading not yet implemented',
      );
    });

    it('should remove point cloud by name', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('pointcloud-removed', listener);

      // Manually add a point cloud for testing
      const mockCloud = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('test', mockCloud);

      viewer.remove('test');

      expect(viewer.getPointClouds()).toEqual([]);
      expect(listener).toHaveBeenCalledWith({
        pointCloud: mockCloud,
        name: 'test',
      });
    });

    it('should remove point cloud by reference', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockCloud = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('test', mockCloud);

      viewer.remove(mockCloud);

      expect(viewer.getPointClouds()).toEqual([]);
    });

    it('should warn when removing non-existent point cloud', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      viewer.remove('nonexistent');

      expect(consoleSpy).toHaveBeenCalledWith('Point cloud "nonexistent" not found');

      consoleSpy.mockRestore();
    });

    it('should get point cloud by name', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockCloud = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('test', mockCloud);

      expect(viewer.getPointCloud('test')).toBe(mockCloud);
    });

    it('should return undefined for non-existent point cloud', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getPointCloud('nonexistent')).toBeUndefined();
    });

    it('should return all point clouds', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const cloud1 = {} as IPointCloudOctree;
      const cloud2 = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('cloud1', cloud1);
      (viewer as any).pointClouds.set('cloud2', cloud2);

      const clouds = viewer.getPointClouds();
      expect(clouds).toHaveLength(2);
      expect(clouds).toContain(cloud1);
      expect(clouds).toContain(cloud2);
    });
  });

  describe('rendering', () => {
    it('should render a frame', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const renderSpy = vi.spyOn(renderer, 'render');

      viewer.render();

      expect(renderSpy).toHaveBeenCalledWith(scene, viewer.getCamera());
    });
  });

  describe('animation', () => {
    it('should start animation loop', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.startAnimation();

      expect((viewer as any).isAnimating).toBe(true);
    });

    it('should not start animation if already animating', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.startAnimation();
      const firstAnimationId = (viewer as any).animationId;

      viewer.startAnimation();
      const secondAnimationId = (viewer as any).animationId;

      expect(firstAnimationId).toBe(secondAnimationId);
    });

    it('should stop animation loop', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.startAnimation();
      viewer.stopAnimation();

      expect((viewer as any).isAnimating).toBe(false);
      expect((viewer as any).animationId).toBeNull();
    });

    it('should emit update event during animation', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const updateListener = vi.fn();
      viewer.on('update', updateListener);

      viewer.startAnimation();

      // Wait for next frame
      await new Promise((resolve) => setTimeout(resolve, 50));

      viewer.stopAnimation();

      expect(updateListener).toHaveBeenCalled();
      const call = updateListener.mock.calls[0][0];
      expect(call).toHaveProperty('deltaTime');
      expect(call).toHaveProperty('timestamp');
    });

    it('should emit render event during animation', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const renderListener = vi.fn();
      viewer.on('render', renderListener);

      viewer.startAnimation();

      // Wait for next frame
      await new Promise((resolve) => setTimeout(resolve, 50));

      viewer.stopAnimation();

      expect(renderListener).toHaveBeenCalled();
      const call = renderListener.mock.calls[0][0];
      expect(call).toHaveProperty('deltaTime');
      expect(call).toHaveProperty('timestamp');
    });

    it('should render during animation', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const renderSpy = vi.spyOn(renderer, 'render');

      viewer.startAnimation();

      // Wait for next frame
      await new Promise((resolve) => setTimeout(resolve, 50));

      viewer.stopAnimation();

      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe('resize handling', () => {
    it('should handle window resize', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Mock clientWidth/clientHeight (JSDOM doesn't update these from CSS)
      Object.defineProperty(container, 'clientWidth', {
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(container, 'clientHeight', {
        configurable: true,
        value: 768,
      });

      // Trigger resize
      window.dispatchEvent(new Event('resize'));

      const camera = viewer.getCamera() as THREE.PerspectiveCamera;
      expect(camera.aspect).toBe(1024 / 768);
    });

    it('should update renderer size on resize', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const setSizeSpy = vi.spyOn(renderer, 'setSize');

      // Mock clientWidth/clientHeight (JSDOM doesn't update these from CSS)
      Object.defineProperty(container, 'clientWidth', {
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(container, 'clientHeight', {
        configurable: true,
        value: 768,
      });

      // Trigger resize
      window.dispatchEvent(new Event('resize'));

      expect(setSizeSpy).toHaveBeenCalledWith(1024, 768);
    });
  });

  describe('destroy', () => {
    it('should stop animation on destroy', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.startAnimation();
      viewer.destroy();

      expect((viewer as any).isAnimating).toBe(false);
    });

    it('should remove resize listener on destroy', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      viewer.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should remove all point clouds on destroy', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const cloud1 = {} as IPointCloudOctree;
      const cloud2 = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('cloud1', cloud1);
      (viewer as any).pointClouds.set('cloud2', cloud2);

      viewer.destroy();

      expect(viewer.getPointClouds()).toEqual([]);
    });

    it('should dispose renderer on destroy', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.destroy();

      expect(renderer.isDisposed()).toBe(true);
    });

    it('should remove canvas from container on destroy', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const canvas = renderer.getDomElement();
      expect(container.contains(canvas)).toBe(true);

      viewer.destroy();

      expect(container.contains(canvas)).toBe(false);
    });

    it('should emit destroy event', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('destroy', listener);

      viewer.destroy();

      expect(listener).toHaveBeenCalledWith({});
    });

    it('should remove all event listeners on destroy', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('render', listener);

      viewer.destroy();

      // Try to emit event after destroy
      (viewer as any).emit('render', { deltaTime: 0, timestamp: 0 });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should get camera', () => {
      const camera = new THREE.PerspectiveCamera();
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        camera,
      });

      expect(viewer.getCamera()).toBe(camera);
    });

    it('should get scene', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getScene()).toBe(scene);
    });

    it('should get renderer', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getRenderer()).toBe(renderer);
    });
  });
});
