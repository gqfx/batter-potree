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
      new Viewer({
        container,
        renderer,
        scene,
      });

      expect(container.contains(renderer.getDomElement())).toBe(true);
    });

    it('should set renderer size to container size', () => {
      new Viewer({
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

    it('should extract name from URL correctly', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Test various URL formats
      expect((viewer as any).extractNameFromUrl('/data/lion_takanawa/')).toBe('lion_takanawa');
      expect((viewer as any).extractNameFromUrl('http://example.com/cloud.js')).toBe('cloud');
      expect((viewer as any).extractNameFromUrl('/path/to/metadata.json')).toBe('metadata');
      expect((viewer as any).extractNameFromUrl('/')).toBe('pointcloud');
      expect((viewer as any).extractNameFromUrl('')).toBe('pointcloud');
    });

    it('should validate URL parameter', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Test empty URL
      await expect(viewer.load('')).rejects.toThrow('Invalid URL');

      // Test invalid URL type
      await expect(viewer.load(null as any)).rejects.toThrow('Invalid URL');
    });

    it('should reject loading same point cloud twice', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Manually add a point cloud to simulate it's already loaded
      const mockCloud = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('test', mockCloud);

      await expect(viewer.load('test.json', 'test')).rejects.toThrow(
        'Point cloud "test" is already loaded',
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

      // Also add to traversal system to match real behavior
      const traversalSystem = viewer.getTraversalSystem();
      const removeSpy = vi.spyOn(traversalSystem, 'removePointCloud');

      viewer.remove('test');

      expect(viewer.getPointClouds()).toEqual([]);
      expect(listener).toHaveBeenCalledWith({
        pointCloud: mockCloud,
        name: 'test',
      });
      expect(removeSpy).toHaveBeenCalledWith('test');
    });

    it('should remove point cloud by reference', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockCloud = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('test', mockCloud);

      const traversalSystem = viewer.getTraversalSystem();
      const removeSpy = vi.spyOn(traversalSystem, 'removePointCloud');

      viewer.remove(mockCloud);

      expect(viewer.getPointClouds()).toEqual([]);
      expect(removeSpy).toHaveBeenCalledWith('test');
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

    it('should get all point cloud names', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const cloud1 = {} as IPointCloudOctree;
      const cloud2 = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('cloud1', cloud1);
      (viewer as any).pointClouds.set('cloud2', cloud2);

      const names = viewer.getPointCloudNames();
      expect(names).toEqual(['cloud1', 'cloud2']);
    });

    it('should check if point cloud exists', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const cloud1 = {} as IPointCloudOctree;
      (viewer as any).pointClouds.set('cloud1', cloud1);

      expect(viewer.hasPointCloud('cloud1')).toBe(true);
      expect(viewer.hasPointCloud('cloud2')).toBe(false);
    });

    it('should set point cloud visibility', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('pointcloud-visibility-changed', listener);

      const mockCloud = {} as IPointCloudOctree;
      const mockScene = { visible: true } as any;
      (viewer as any).pointClouds.set('test', mockCloud);
      (viewer as any).pointCloudScenes.set('test', mockScene);

      const traversalSystem = viewer.getTraversalSystem();
      const addSpy = vi.spyOn(traversalSystem, 'addPointCloud');
      const removeSpy = vi.spyOn(traversalSystem, 'removePointCloud');
      const hasSpy = vi.spyOn(traversalSystem, 'hasPointCloud').mockReturnValue(true);

      // Hide point cloud
      viewer.setPointCloudVisible('test', false);

      expect(mockScene.visible).toBe(false);
      expect(removeSpy).toHaveBeenCalledWith('test');
      expect(listener).toHaveBeenCalledWith({
        pointCloud: mockCloud,
        name: 'test',
        visible: false,
      });

      // Show point cloud
      hasSpy.mockReturnValue(false);
      viewer.setPointCloudVisible('test', true);

      expect(mockScene.visible).toBe(true);
      expect(addSpy).toHaveBeenCalledWith('test', mockCloud);
    });

    it('should get point cloud visibility', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockScene = { visible: true } as any;
      (viewer as any).pointCloudScenes.set('test', mockScene);

      expect(viewer.isPointCloudVisible('test')).toBe(true);

      mockScene.visible = false;
      expect(viewer.isPointCloudVisible('test')).toBe(false);
    });

    it('should return false for non-existent point cloud visibility', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.isPointCloudVisible('nonexistent')).toBe(false);
    });

    it('should set point cloud transform - position', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('pointcloud-transform-changed', listener);

      const mockCloud = {} as IPointCloudOctree;
      const mockScene = {
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
        updateMatrix: vi.fn(),
        updateMatrixWorld: vi.fn(),
      } as any;
      (viewer as any).pointClouds.set('test', mockCloud);
      (viewer as any).pointCloudScenes.set('test', mockScene);

      viewer.setPointCloudTransform('test', { x: 10, y: 5, z: 2 });

      expect(mockScene.position.x).toBe(10);
      expect(mockScene.position.y).toBe(5);
      expect(mockScene.position.z).toBe(2);
      expect(mockScene.updateMatrix).toHaveBeenCalled();
      expect(mockScene.updateMatrixWorld).toHaveBeenCalledWith(true);
      expect(listener).toHaveBeenCalled();
    });

    it('should set point cloud transform - rotation', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockScene = {
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
        updateMatrix: vi.fn(),
        updateMatrixWorld: vi.fn(),
      } as any;
      (viewer as any).pointClouds.set('test', {} as IPointCloudOctree);
      (viewer as any).pointCloudScenes.set('test', mockScene);

      viewer.setPointCloudTransform('test', undefined, { x: 0, y: Math.PI / 2, z: 0 });

      expect(mockScene.rotation.x).toBe(0);
      expect(mockScene.rotation.y).toBe(Math.PI / 2);
      expect(mockScene.rotation.z).toBe(0);
    });

    it('should set point cloud transform - scale', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockScene = {
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
        updateMatrix: vi.fn(),
        updateMatrixWorld: vi.fn(),
      } as any;
      (viewer as any).pointClouds.set('test', {} as IPointCloudOctree);
      (viewer as any).pointCloudScenes.set('test', mockScene);

      viewer.setPointCloudTransform('test', undefined, undefined, { x: 2, y: 2, z: 2 });

      expect(mockScene.scale.x).toBe(2);
      expect(mockScene.scale.y).toBe(2);
      expect(mockScene.scale.z).toBe(2);
    });

    it('should set combined transform', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockScene = {
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(),
        scale: new THREE.Vector3(1, 1, 1),
        updateMatrix: vi.fn(),
        updateMatrixWorld: vi.fn(),
      } as any;
      (viewer as any).pointClouds.set('test', {} as IPointCloudOctree);
      (viewer as any).pointCloudScenes.set('test', mockScene);

      viewer.setPointCloudTransform(
        'test',
        { x: 10, y: 5, z: 2 },
        { x: 0, y: Math.PI / 2, z: 0 },
        { x: 2, y: 2, z: 2 }
      );

      expect(mockScene.position.x).toBe(10);
      expect(mockScene.rotation.y).toBe(Math.PI / 2);
      expect(mockScene.scale.x).toBe(2);
    });

    it('should reset point cloud transform', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockScene = {
        position: new THREE.Vector3(10, 10, 10),
        rotation: new THREE.Euler(1, 1, 1),
        scale: new THREE.Vector3(2, 2, 2),
        updateMatrix: vi.fn(),
        updateMatrixWorld: vi.fn(),
      } as any;
      (viewer as any).pointClouds.set('test', {} as IPointCloudOctree);
      (viewer as any).pointCloudScenes.set('test', mockScene);

      viewer.resetPointCloudTransform('test');

      expect(mockScene.position.x).toBe(0);
      expect(mockScene.position.y).toBe(0);
      expect(mockScene.position.z).toBe(0);
      expect(mockScene.rotation.x).toBe(0);
      expect(mockScene.rotation.y).toBe(0);
      expect(mockScene.rotation.z).toBe(0);
      expect(mockScene.scale.x).toBe(1);
      expect(mockScene.scale.y).toBe(1);
      expect(mockScene.scale.z).toBe(1);
    });

    it('should warn when setting transform for non-existent scene', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      viewer.setPointCloudTransform('nonexistent', { x: 10, y: 0, z: 0 });

      expect(consoleSpy).toHaveBeenCalledWith('Point cloud scene "nonexistent" not found');

      consoleSpy.mockRestore();
    });

    it('should warn when setting visibility for non-existent cloud', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      viewer.setPointCloudVisible('nonexistent', true);

      expect(consoleSpy).toHaveBeenCalledWith('Point cloud "nonexistent" not found');

      consoleSpy.mockRestore();
    });
  });

  describe('point cloud scenes', () => {
    it('should return empty array initially', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getPointCloudScenes()).toEqual([]);
    });

    it('should get point cloud scene by name', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockScene = {} as any;
      (viewer as any).pointCloudScenes.set('test', mockScene);

      expect(viewer.getPointCloudScene('test')).toBe(mockScene);
    });

    it('should return undefined for non-existent scene', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getPointCloudScene('nonexistent')).toBeUndefined();
    });

    it('should return all point cloud scenes', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scene1 = {} as any;
      const scene2 = {} as any;
      (viewer as any).pointCloudScenes.set('scene1', scene1);
      (viewer as any).pointCloudScenes.set('scene2', scene2);

      const scenes = viewer.getPointCloudScenes();
      expect(scenes).toHaveLength(2);
      expect(scenes).toContain(scene1);
      expect(scenes).toContain(scene2);
    });

    it('should update material size when setPointSize is called', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockMaterial = { size: 1.0 };
      const mockScene = { material: mockMaterial } as any;
      (viewer as any).pointCloudScenes.set('test', mockScene);

      viewer.setPointSize(2.5);

      expect(mockMaterial.size).toBe(2.5);
    });

    it('should update material screen size on resize', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const updateScreenSizeSpy = vi.fn();
      const mockMaterial = { updateScreenSize: updateScreenSizeSpy };
      const mockScene = { material: mockMaterial } as any;
      (viewer as any).pointCloudScenes.set('test', mockScene);

      Object.defineProperty(container, 'clientWidth', {
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(container, 'clientHeight', {
        configurable: true,
        value: 768,
      });

      window.dispatchEvent(new Event('resize'));

      expect(updateScreenSizeSpy).toHaveBeenCalledWith(1024, 768);
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
      const call = updateListener.mock.calls[0]?.[0];
      expect(call).toBeDefined();
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
      const call = renderListener.mock.calls[0]?.[0];
      expect(call).toBeDefined();
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
      new Viewer({
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

    it('should get scheduler', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scheduler = viewer.getScheduler();
      expect(scheduler).toBeDefined();
      expect(scheduler.isRunning()).toBe(false);
    });

    it('should get streaming system', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const streamingSystem = viewer.getStreamingSystem();
      expect(streamingSystem).toBeDefined();
      expect(streamingSystem.getStats()).toBeDefined();
    });

    it('should get traversal system', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const traversalSystem = viewer.getTraversalSystem();
      expect(traversalSystem).toBeDefined();
      expect(traversalSystem.getLastResult()).toBeDefined();
    });
  });

  describe('systems integration', () => {
    it('should initialize scheduler with streaming system', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scheduler = viewer.getScheduler();
      expect(scheduler.hasSystem('bp:streaming')).toBe(true);
    });

    it('should initialize scheduler with traversal system', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scheduler = viewer.getScheduler();
      expect(scheduler.hasSystem('bp:traversal')).toBe(true);
    });

    it('should initialize traversal system with camera', () => {
      const camera = new THREE.PerspectiveCamera();
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        camera,
      });

      const traversalSystem = viewer.getTraversalSystem();
      expect(traversalSystem).toBeDefined();
      // Verify camera is set by checking if system is ready to traverse
      expect((traversalSystem as any).camera).toBe(camera);
    });

    it('should initialize traversal system with point budget', () => {
      const pointBudget = 500_000;
      const viewer = new Viewer({
        container,
        renderer,
        scene,
        pointBudget,
      });

      const traversalSystem = viewer.getTraversalSystem();
      expect((traversalSystem as any).config.pointBudget).toBe(pointBudget);
    });

    it('should initialize traversal system with screen size', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const traversalSystem = viewer.getTraversalSystem();
      expect((traversalSystem as any).config.screenWidth).toBe(800);
      expect((traversalSystem as any).config.screenHeight).toBe(600);
    });

    it('should update traversal system screen size on resize', () => {
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

      const traversalSystem = viewer.getTraversalSystem();
      expect((traversalSystem as any).config.screenWidth).toBe(1024);
      expect((traversalSystem as any).config.screenHeight).toBe(768);
    });

    it('should update traversal system point budget', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      viewer.setPointBudget(2_000_000);

      const traversalSystem = viewer.getTraversalSystem();
      expect((traversalSystem as any).config.pointBudget).toBe(2_000_000);
    });

    it('should start scheduler when animation starts', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scheduler = viewer.getScheduler();

      viewer.startAnimation();

      expect(scheduler.isRunning()).toBe(true);

      viewer.stopAnimation();
    });

    it('should stop scheduler when animation stops', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scheduler = viewer.getScheduler();

      viewer.startAnimation();
      viewer.stopAnimation();

      expect(scheduler.isRunning()).toBe(false);
    });

    it('should update systems during animation', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scheduler = viewer.getScheduler();
      const updateSpy = vi.spyOn(scheduler, 'update');

      viewer.startAnimation();

      // Wait for next frame
      await new Promise((resolve) => setTimeout(resolve, 50));

      viewer.stopAnimation();

      expect(updateSpy).toHaveBeenCalled();
      // First call might be 0, but subsequent calls should have positive deltaTime
      const callsWithPositiveDelta = updateSpy.mock.calls.filter((call) => call[0] > 0);
      expect(callsWithPositiveDelta.length).toBeGreaterThan(0);
    });

    it('should dispose scheduler on viewer destroy', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scheduler = viewer.getScheduler();
      const disposeSpy = vi.spyOn(scheduler, 'dispose');

      viewer.destroy();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should have profiling enabled by default', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const scheduler = viewer.getScheduler();
      expect(scheduler.stats).toBeDefined();
    });

    it('should track streaming system stats', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const streamingSystem = viewer.getStreamingSystem();
      const stats = streamingSystem.getStats();

      expect(stats.pendingRequests).toBe(0);
      expect(stats.activeLoads).toBe(0);
      expect(stats.completedLoads).toBe(0);
      expect(stats.failedLoads).toBe(0);
      expect(stats.totalBytesLoaded).toBe(0);
    });
  });

  describe('TraversalSystem and StreamingSystem integration', () => {
    it('should connect traversal and streaming systems', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const traversalSystem = viewer.getTraversalSystem();
      const streamingSystem = viewer.getStreamingSystem();

      expect(traversalSystem).toBeDefined();
      expect(streamingSystem).toBeDefined();
    });

    it('should request loading for unloaded visible nodes during animation', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const streamingSystem = viewer.getStreamingSystem();
      const requestLoadSpy = vi.spyOn(streamingSystem, 'requestLoad');

      // Manually add a mock point cloud with an unloaded root node
      const mockOctree = {
        root: {
          name: 'r',
          level: 0,
          loaded: false,
          loading: false,
          numPoints: 1000,
          boundingBox: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
          children: [null, null, null, null, null, null, null, null],
        },
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
      } as any;
      (viewer as any).pointClouds.set('test', mockOctree);

      const traversalSystem = viewer.getTraversalSystem();
      traversalSystem.addPointCloud('test', mockOctree);

      // Start animation to trigger update
      viewer.startAnimation();

      // Wait for a few frames
      await new Promise((resolve) => setTimeout(resolve, 100));

      viewer.stopAnimation();

      // Verify that requestLoad was called for the unloaded node
      expect(requestLoadSpy).toHaveBeenCalled();
    });

    it('should not request loading for already loaded nodes', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const streamingSystem = viewer.getStreamingSystem();
      const requestLoadSpy = vi.spyOn(streamingSystem, 'requestLoad');

      // Manually add a mock point cloud with a loaded root node
      const mockOctree = {
        root: {
          name: 'r',
          level: 0,
          loaded: true,  // Already loaded
          loading: false,
          numPoints: 1000,
          boundingBox: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
          children: [null, null, null, null, null, null, null, null],
        },
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
      } as any;
      (viewer as any).pointClouds.set('test', mockOctree);

      const traversalSystem = viewer.getTraversalSystem();
      traversalSystem.addPointCloud('test', mockOctree);

      // Start animation to trigger update
      viewer.startAnimation();

      // Wait for a few frames
      await new Promise((resolve) => setTimeout(resolve, 100));

      viewer.stopAnimation();

      // Verify that requestLoad was NOT called for already loaded nodes
      expect(requestLoadSpy).not.toHaveBeenCalled();
    });

    it('should not request loading for nodes currently loading', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const streamingSystem = viewer.getStreamingSystem();
      const requestLoadSpy = vi.spyOn(streamingSystem, 'requestLoad');

      // Manually add a mock point cloud with a loading root node
      const mockOctree = {
        root: {
          name: 'r',
          level: 0,
          loaded: false,
          loading: true,  // Currently loading
          numPoints: 1000,
          boundingBox: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
          children: [null, null, null, null, null, null, null, null],
        },
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
      } as any;
      (viewer as any).pointClouds.set('test', mockOctree);

      const traversalSystem = viewer.getTraversalSystem();
      traversalSystem.addPointCloud('test', mockOctree);

      // Start animation to trigger update
      viewer.startAnimation();

      // Wait for a few frames
      await new Promise((resolve) => setTimeout(resolve, 100));

      viewer.stopAnimation();

      // Verify that requestLoad was NOT called for nodes currently loading
      expect(requestLoadSpy).not.toHaveBeenCalled();
    });

    it('should update PointCloudScene visibility based on traversal result', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Manually add a mock point cloud
      const mockOctree = {
        root: {
          name: 'r',
          level: 0,
          loaded: true,
          loading: false,
          numPoints: 1000,
          boundingBox: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
          children: [null, null, null, null, null, null, null, null],
        },
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)),
      } as any;
      (viewer as any).pointClouds.set('test', mockOctree);

      // Manually add a mock PointCloudScene
      const mockScene = {
        updateVisibility: vi.fn(),
      } as any;
      (viewer as any).pointCloudScenes.set('test', mockScene);

      const traversalSystem = viewer.getTraversalSystem();
      traversalSystem.addPointCloud('test', mockOctree);

      // Start animation to trigger update
      viewer.startAnimation();

      // Wait for a few frames
      await new Promise((resolve) => setTimeout(resolve, 100));

      viewer.stopAnimation();

      // Verify that updateVisibility was called on PointCloudScene
      expect(mockScene.updateVisibility).toHaveBeenCalled();
    });

    it('should calculate load priority based on traversal priority', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Test calculateLoadPriority via private method access
      const visibleNode = {
        distance: 10,
        screenSize: 100,
        node: { level: 2 },
        priority: 0.8,
      };

      const priority = (viewer as any).calculateLoadPriority(visibleNode);

      expect(priority).toBe(0.8);
    });
  });

  describe('streaming system callbacks', () => {
    it('should set onLoadComplete callback with correct metadata', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const streamingSystem = viewer.getStreamingSystem();

      // Verify callback is set by checking internal state
      expect((streamingSystem as any).onLoadComplete).toBeDefined();
    });

    it('should set onLoadFailed callback', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const streamingSystem = viewer.getStreamingSystem();

      // Verify callback is set by checking internal state
      expect((streamingSystem as any).onLoadFailed).toBeDefined();
    });

    it('should update node state on successful load', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Create mock octree and scene
      const mockNode = {
        name: 'r',
        level: 0,
        loaded: false,
        loading: true,
        numPoints: 0,
      };

      const mockOctree = {
        root: mockNode,
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(),
      } as any;

      const mockScene = {
        addNode: vi.fn(),
        material: {},
      } as any;

      (viewer as any).pointClouds.set('test', mockOctree);
      (viewer as any).pointCloudScenes.set('test', mockScene);

      // Simulate successful load
      const mockData = {
        buffer: new ArrayBuffer(0),
        numPoints: 100,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: new Float32Array([0, 0, 0]).buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
        },
      };

      // Call onLoadComplete callback directly
      const streamingSystem = viewer.getStreamingSystem();
      const callback = (streamingSystem as any).onLoadComplete;

      callback({
        octree: mockOctree,
        node: mockNode,
        data: mockData,
        loadTime: 10,
      });

      // Verify node state was updated
      expect(mockNode.loaded).toBe(true);
      expect(mockNode.loading).toBe(false);
      expect(mockNode.numPoints).toBe(100);
      // expect(mockNode.geometry).toBeDefined(); // geometry is not in the minimal mock type
    });

    it('should calculate correct pcIndex for multiple point clouds', async () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Create two mock point clouds
      const mockOctree1 = { root: { name: 'r', level: 0 }, url: 'test1/' } as any;
      const mockOctree2 = { root: { name: 'r', level: 0 }, url: 'test2/' } as any;

      const mockScene1 = { addNode: vi.fn(), material: {} } as any;
      const mockScene2 = { addNode: vi.fn(), material: {} } as any;

      (viewer as any).pointClouds.set('cloud1', mockOctree1);
      (viewer as any).pointClouds.set('cloud2', mockOctree2);
      (viewer as any).pointCloudScenes.set('cloud1', mockScene1);
      (viewer as any).pointCloudScenes.set('cloud2', mockScene2);

      const mockNode = {
        name: 'r',
        level: 0,
        loaded: false,
        loading: true,
      };

      const mockData = {
        buffer: new ArrayBuffer(0),
        numPoints: 50,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: new Float32Array([0, 0, 0]).buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
        },
      };

      // Call onLoadComplete for cloud2
      const streamingSystem = viewer.getStreamingSystem();
      const callback = (streamingSystem as any).onLoadComplete;

      callback({
        octree: mockOctree2,
        node: mockNode,
        data: mockData,
        loadTime: 10,
      });

      // Verify pcIndex is 1 (second cloud)
      expect(mockScene2.addNode).toHaveBeenCalledWith(
        'r',
        expect.any(THREE.BufferGeometry),
        expect.objectContaining({
          pcIndex: 1,
        })
      );
    });

    it('should update node state on load failure', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const mockNode = {
        name: 'r',
        level: 0,
        loaded: false,
        loading: true,
      };

      // Call onLoadFailed callback directly
      const streamingSystem = viewer.getStreamingSystem();
      const callback = (streamingSystem as any).onLoadFailed;

      callback({
        node: mockNode,
        error: new Error('Load failed'),
        retries: 3,
      });

      // Verify node state was updated
      expect(mockNode.loaded).toBe(false);
      expect(mockNode.loading).toBe(false);
    });

    it('should emit node-load-failed event', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('node-load-failed', listener);

      const mockNode = {
        name: 'r',
        level: 0,
        loaded: false,
        loading: true,
      };

      const error = new Error('Load failed');

      // Call onLoadFailed callback directly
      const streamingSystem = viewer.getStreamingSystem();
      const callback = (streamingSystem as any).onLoadFailed;

      callback({
        node: mockNode,
        error,
        retries: 3,
      });

      expect(listener).toHaveBeenCalledWith({
        node: mockNode,
        error,
        retries: 3,
      });
    });
  });

  describe('resource cleanup', () => {
    it('should cleanup node geometries on remove', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Create mock octree with loaded nodes
      const geometry1 = new THREE.BufferGeometry();
      const geometry2 = new THREE.BufferGeometry();
      const disposeSpy1 = vi.spyOn(geometry1, 'dispose');
      const disposeSpy2 = vi.spyOn(geometry2, 'dispose');

      const childNode = {
        name: 'r0',
        level: 1,
        loaded: true,
        geometry: geometry2,
        children: [],
      };

      const rootNode = {
        name: 'r',
        level: 0,
        loaded: true,
        geometry: geometry1,
        children: [childNode],
      };

      const mockOctree = {
        root: rootNode,
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(),
      } as any;

      (viewer as any).pointClouds.set('test', mockOctree);

      // Remove point cloud
      viewer.remove('test');

      // Verify geometries were disposed
      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();

      // Verify node states were reset
      expect(rootNode.geometry).toBeUndefined();
      expect(rootNode.loaded).toBe(false);
      expect(childNode.geometry).toBeUndefined();
      expect(childNode.loaded).toBe(false);
    });

    it('should handle nodes without geometry during cleanup', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const rootNode = {
        name: 'r',
        level: 0,
        loaded: false,
        children: [],
      };

      const mockOctree = {
        root: rootNode,
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(),
      } as any;

      (viewer as any).pointClouds.set('test', mockOctree);

      // Should not throw
      expect(() => viewer.remove('test')).not.toThrow();
    });
  });

  describe('statistics', () => {
    it('should count loaded nodes across all point clouds', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      // Create mock octree with loaded nodes
      const childNode = {
        name: 'r0',
        level: 1,
        loaded: true,
        children: [],
      };

      const rootNode = {
        name: 'r',
        level: 0,
        loaded: true,
        children: [childNode],
      };

      const mockOctree = {
        root: rootNode,
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(),
      } as any;

      (viewer as any).pointClouds.set('test', mockOctree);

      const count = viewer.getLoadedNodesCount();
      expect(count).toBe(2); // root + child
    });

    it('should not count unloaded nodes', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const childNode = {
        name: 'r0',
        level: 1,
        loaded: false, // Not loaded
        children: [],
      };

      const rootNode = {
        name: 'r',
        level: 0,
        loaded: true,
        children: [childNode],
      };

      const mockOctree = {
        root: rootNode,
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(),
      } as any;

      (viewer as any).pointClouds.set('test', mockOctree);

      const count = viewer.getLoadedNodesCount();
      expect(count).toBe(1); // Only root
    });

    it('should sum total points loaded', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const childNode = {
        name: 'r0',
        level: 1,
        loaded: true,
        numPoints: 500,
        children: [],
      };

      const rootNode = {
        name: 'r',
        level: 0,
        loaded: true,
        numPoints: 1000,
        children: [childNode],
      };

      const mockOctree = {
        root: rootNode,
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(),
      } as any;

      (viewer as any).pointClouds.set('test', mockOctree);

      const total = viewer.getTotalPointsLoaded();
      expect(total).toBe(1500); // 1000 + 500
    });

    it('should handle nodes without numPoints', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const rootNode = {
        name: 'r',
        level: 0,
        loaded: true,
        // numPoints is undefined
        children: [],
      };

      const mockOctree = {
        root: rootNode,
        url: 'test/',
        spacing: 1.0,
        boundingBox: new THREE.Box3(),
      } as any;

      (viewer as any).pointClouds.set('test', mockOctree);

      const total = viewer.getTotalPointsLoaded();
      expect(total).toBe(0); // No points counted
    });

    it('should count across multiple point clouds', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      const octree1 = {
        root: {
          name: 'r',
          level: 0,
          loaded: true,
          numPoints: 1000,
          children: [],
        },
        url: 'test1/',
      } as any;

      const octree2 = {
        root: {
          name: 'r',
          level: 0,
          loaded: true,
          numPoints: 2000,
          children: [],
        },
        url: 'test2/',
      } as any;

      (viewer as any).pointClouds.set('cloud1', octree1);
      (viewer as any).pointClouds.set('cloud2', octree2);

      const count = viewer.getLoadedNodesCount();
      const total = viewer.getTotalPointsLoaded();

      expect(count).toBe(2);
      expect(total).toBe(3000);
    });

    it('should return 0 for empty viewer', () => {
      const viewer = new Viewer({
        container,
        renderer,
        scene,
      });

      expect(viewer.getLoadedNodesCount()).toBe(0);
      expect(viewer.getTotalPointsLoaded()).toBe(0);
    });
  });

  describe('createGeometry', () => {
    let viewer: Viewer;

    beforeEach(() => {
      viewer = new Viewer({
        container,
        renderer,
        scene,
      });
    });

    it('should create geometry from worker decode response with positions', () => {
      // Create minimal worker decode response with positions
      const positions = new Float32Array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
      const positionBuffer = positions.buffer;

      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 2,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: positionBuffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
        },
      };

      const geometry = (viewer as any).createGeometry(decodeResponse);

      expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
      expect(geometry.attributes.position).toBeDefined();
      expect(geometry.attributes.position.count).toBe(2);
      expect(geometry.attributes.position.array).toEqual(positions);
    });

    it('should create geometry with color attribute from rgba', () => {
      const positions = new Float32Array([1.0, 2.0, 3.0]);
      const rgba = new Uint8Array([255, 128, 64, 255]); // 1 point RGBA

      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 1,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: positions.buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
          rgba: {
            buffer: rgba.buffer,
            attribute: {
              name: 'rgba',
              type: 0,
              numElements: 4,
              byteSize: 4,
            },
          },
        },
      };

      const geometry = (viewer as any).createGeometry(decodeResponse);

      expect(geometry.attributes.color).toBeDefined();
      expect(geometry.attributes.color.count).toBe(1);
      // Check RGB values are normalized to [0,1]
      expect(geometry.attributes.color.array[0]).toBeCloseTo(1.0, 5);
      expect(geometry.attributes.color.array[1]).toBeCloseTo(128 / 255, 5);
      expect(geometry.attributes.color.array[2]).toBeCloseTo(64 / 255, 5);
    });

    it('should create geometry with normal attribute', () => {
      const positions = new Float32Array([1.0, 2.0, 3.0]);
      const normals = new Float32Array([0.0, 1.0, 0.0]);

      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 1,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: positions.buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
          NORMAL: {
            buffer: normals.buffer,
            attribute: {
              name: 'NORMAL',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
        },
      };

      const geometry = (viewer as any).createGeometry(decodeResponse);

      expect(geometry.attributes.normal).toBeDefined();
      expect(geometry.attributes.normal.count).toBe(1);
      expect(geometry.attributes.normal.array).toEqual(normals);
    });

    it('should create geometry with intensity attribute', () => {
      const positions = new Float32Array([1.0, 2.0, 3.0]);
      const intensities = new Float32Array([0.5]);

      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 1,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: positions.buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
          intensity: {
            buffer: intensities.buffer,
            attribute: {
              name: 'intensity',
              type: 0,
              numElements: 1,
              byteSize: 4,
            },
            offset: 0,
            scale: 1.0,
          },
        },
      };

      const geometry = (viewer as any).createGeometry(decodeResponse);

      expect(geometry.attributes.intensity).toBeDefined();
      expect(geometry.attributes.intensity.count).toBe(1);
      expect(geometry.attributes.intensity.array).toEqual(intensities);
      // Check potree metadata is stored
      expect((geometry.attributes.intensity as any).potree).toBeDefined();
      expect((geometry.attributes.intensity as any).potree.offset).toBe(0);
      expect((geometry.attributes.intensity as any).potree.scale).toBe(1.0);
    });

    it('should create geometry with classification attribute', () => {
      const positions = new Float32Array([1.0, 2.0, 3.0]);
      const classification = new Float32Array([2]);

      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 1,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: positions.buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
          classification: {
            buffer: classification.buffer,
            attribute: {
              name: 'classification',
              type: 0,
              numElements: 1,
              byteSize: 4,
            },
          },
        },
      };

      const geometry = (viewer as any).createGeometry(decodeResponse);

      expect(geometry.attributes.classification).toBeDefined();
      expect(geometry.attributes.classification.count).toBe(1);
      expect(geometry.attributes.classification.array).toEqual(classification);
    });

    it('should create geometry with INDICES attribute', () => {
      const positions = new Float32Array([1.0, 2.0, 3.0]);
      const indices = new Uint8Array([0, 0, 0, 1]);

      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 1,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: positions.buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
          INDICES: {
            buffer: indices.buffer,
            attribute: {
              name: 'INDICES',
              type: 0,
              numElements: 4,
              byteSize: 4,
            },
          },
        },
      };

      const geometry = (viewer as any).createGeometry(decodeResponse);

      expect(geometry.attributes.indices).toBeDefined();
      expect(geometry.attributes.indices.count).toBe(1);
      expect(geometry.attributes.indices.normalized).toBe(true);
    });

    it('should create geometry with SPACING attribute', () => {
      const positions = new Float32Array([1.0, 2.0, 3.0]);
      const spacing = new Float32Array([0.1]);

      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 1,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: positions.buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
          SPACING: {
            buffer: spacing.buffer,
            attribute: {
              name: 'SPACING',
              type: 0,
              numElements: 1,
              byteSize: 4,
            },
          },
        },
      };

      const geometry = (viewer as any).createGeometry(decodeResponse);

      expect(geometry.attributes.spacing).toBeDefined();
      expect(geometry.attributes.spacing.count).toBe(1);
      expect(geometry.attributes.spacing.array).toEqual(spacing);
    });

    it('should compute bounding box and sphere', () => {
      const positions = new Float32Array([0, 0, 0, 1, 1, 1, -1, -1, -1]);

      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 3,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [-1, -1, -1] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: positions.buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
        },
      };

      const geometry = (viewer as any).createGeometry(decodeResponse);

      expect(geometry.boundingBox).toBeDefined();
      expect(geometry.boundingSphere).toBeDefined();
      expect(geometry.boundingBox?.min.x).toBe(-1);
      expect(geometry.boundingBox?.max.x).toBe(1);
    });

    it('should throw error if attributeBuffers is missing', () => {
      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 0,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {},
      };

      expect(() => (viewer as any).createGeometry(decodeResponse)).toThrow(
        'Geometry data must contain attributeBuffers',
      );
    });

    it('should throw error if POSITION_CARTESIAN is missing', () => {
      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 1,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          rgba: {
            buffer: new Uint8Array([255, 0, 0, 255]).buffer,
            attribute: {
              name: 'rgba',
              type: 0,
              numElements: 4,
              byteSize: 4,
            },
          },
        },
      };

      expect(() => (viewer as any).createGeometry(decodeResponse)).toThrow(
        'Geometry data must contain POSITION_CARTESIAN attribute',
      );
    });

    it('should throw error if position buffer is empty', () => {
      const decodeResponse: any = {
        buffer: new ArrayBuffer(0),
        numPoints: 0,
        mean: [0, 0, 0] as [number, number, number],
        tightBoundingBox: {
          min: [0, 0, 0] as [number, number, number],
          max: [1, 1, 1] as [number, number, number],
        },
        attributeBuffers: {
          POSITION_CARTESIAN: {
            buffer: new Float32Array([]).buffer,
            attribute: {
              name: 'POSITION_CARTESIAN',
              type: 0,
              numElements: 3,
              byteSize: 12,
            },
          },
        },
      };

      expect(() => (viewer as any).createGeometry(decodeResponse)).toThrow(
        'Position buffer is empty',
      );
    });
  });
});
