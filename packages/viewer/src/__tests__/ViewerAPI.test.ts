/**
 * Unit tests for ViewerAPI class
 */

import type { IPointCloudOctree, IRenderer, IScene, NavigationMode } from '@better-potree/core';
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ViewerAPI } from '../ViewerAPI';

// Mock implementations
class MockRenderer implements IRenderer {
  private domElement: HTMLCanvasElement;

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

describe('ViewerAPI', () => {
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

    // Mock window functions
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      return window.setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    // Cleanup
    if (container?.parentElement) {
      document.body.removeChild(container);
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('setNavigation', () => {
    it('should set navigation mode', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('navigation-changed', listener);

      viewer.setNavigation('orbit' as NavigationMode);

      expect(listener).toHaveBeenCalledWith({ mode: 'orbit' });
    });

    it('should accept navigation options', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('navigation-changed', listener);

      viewer.setNavigation('fly' as NavigationMode, {
        speed: 2.0,
        enableRotation: true,
        enablePanning: true,
        enableZooming: true,
      });

      expect(listener).toHaveBeenCalledWith({ mode: 'fly' });
    });
  });

  describe('fitToScreen', () => {
    it('should warn if no point clouds', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      viewer.fitToScreen();

      expect(consoleSpy).toHaveBeenCalledWith('No point clouds to fit to screen');

      consoleSpy.mockRestore();
    });

    it('should accept fit options', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      // Add a mock point cloud
      (viewer as any).pointClouds.set('test', {} as IPointCloudOctree);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      viewer.fitToScreen(undefined, {
        padding: 1.5,
        duration: 1000,
      });

      // Should not warn with point clouds
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle specific point cloud', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const cloud = {} as IPointCloudOctree;

      viewer.fitToScreen(cloud);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('point size type', () => {
    it('should set point size type', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      viewer.setPointSizeType('fixed');

      expect(consoleSpy).toHaveBeenCalledWith('Setting point size type to:', 'fixed');

      consoleSpy.mockRestore();
    });
  });

  describe('point shape', () => {
    it('should set point shape', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      viewer.setPointShape('circle');

      expect(consoleSpy).toHaveBeenCalledWith('Setting point shape to:', 'circle');

      consoleSpy.mockRestore();
    });
  });

  describe('point quality', () => {
    it('should set point quality', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      viewer.setPointQuality('high');

      expect(consoleSpy).toHaveBeenCalledWith('Setting point quality to:', 'high');

      consoleSpy.mockRestore();
    });
  });

  describe('clip volumes', () => {
    it('should add clip volume', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('clip-volume-added', listener);

      const volume = { name: 'test-volume' };
      viewer.addClipVolume(volume);

      expect(listener).toHaveBeenCalledWith({ volume });
    });

    it('should remove clip volume', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('clip-volume-removed', listener);

      const volume = { name: 'test-volume' };
      viewer.removeClipVolume(volume);

      expect(listener).toHaveBeenCalledWith({ volume });
    });

    it('should remove all clip volumes', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      viewer.removeAllClipVolumes();

      expect(consoleSpy).toHaveBeenCalledWith('Removing all clip volumes');

      consoleSpy.mockRestore();
    });

    it('should get clip volumes', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const volumes = viewer.getClipVolumes();

      expect(volumes).toEqual([]);
    });
  });

  describe('measuring', () => {
    it('should start measuring', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      viewer.startMeasuring('distance');

      expect(consoleSpy).toHaveBeenCalledWith('Starting measurement:', 'distance');

      consoleSpy.mockRestore();
    });
  });

  describe('screenshot', () => {
    it('should take screenshot with defaults', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const canvas = renderer.getDomElement();
      const toDataURLSpy = vi
        .spyOn(canvas, 'toDataURL')
        .mockReturnValue('data:image/png;base64,abc');

      const dataUrl = viewer.screenshot();

      expect(dataUrl).toBe('data:image/png;base64,abc');
      expect(toDataURLSpy).toHaveBeenCalledWith('image/png', 0.92);

      toDataURLSpy.mockRestore();
    });

    it('should take screenshot with custom format', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const canvas = renderer.getDomElement();
      const toDataURLSpy = vi
        .spyOn(canvas, 'toDataURL')
        .mockReturnValue('data:image/jpeg;base64,abc');

      viewer.screenshot({
        format: 'image/jpeg',
        quality: 0.8,
      });

      expect(toDataURLSpy).toHaveBeenCalledWith('image/jpeg', 0.8);

      toDataURLSpy.mockRestore();
    });

    it('should take screenshot with custom size', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const setSizeSpy = vi.spyOn(renderer, 'setSize');
      const canvas = renderer.getDomElement();
      vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,abc');

      viewer.screenshot({
        width: 1920,
        height: 1080,
      });

      // Should set size to requested dimensions
      expect(setSizeSpy).toHaveBeenCalledWith(1920, 1080);
      // Should restore original size
      expect(setSizeSpy).toHaveBeenCalledWith(800, 600);
    });

    it('should throw error if renderer is not Three.js renderer', () => {
      const mockRenderer = {
        getDomElement: () => document.createElement('canvas'),
        setSize: () => {},
        render: () => {},
        dispose: () => {},
      } as IRenderer;

      const viewer = new ViewerAPI({
        container,
        renderer: mockRenderer,
        scene,
      });

      expect(() => viewer.screenshot()).toThrow('Screenshot requires Three.js renderer');
    });
  });

  describe('downloadScreenshot', () => {
    it('should download screenshot with default filename', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const canvas = renderer.getDomElement();
      vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,abc');

      const linkClickSpy = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        click: linkClickSpy,
        download: '',
        href: '',
      } as any);

      viewer.downloadScreenshot();

      expect(linkClickSpy).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });

    it('should download screenshot with custom filename', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const canvas = renderer.getDomElement();
      vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,abc');

      let capturedDownload = '';
      const linkClickSpy = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
        click: linkClickSpy,
        set download(value: string) {
          capturedDownload = value;
        },
        get download() {
          return capturedDownload;
        },
        href: '',
      } as any);

      viewer.downloadScreenshot('my-screenshot.png');

      expect(capturedDownload).toBe('my-screenshot.png');
      expect(linkClickSpy).toHaveBeenCalled();

      createElementSpy.mockRestore();
    });

    it('should download screenshot with custom options', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const canvas = renderer.getDomElement();
      const toDataURLSpy = vi
        .spyOn(canvas, 'toDataURL')
        .mockReturnValue('data:image/jpeg;base64,abc');

      const linkClickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        click: linkClickSpy,
        download: '',
        href: '',
      } as any);

      viewer.downloadScreenshot('custom.jpg', {
        format: 'image/jpeg',
        quality: 0.9,
      });

      expect(toDataURLSpy).toHaveBeenCalledWith('image/jpeg', 0.9);
    });
  });

  describe('camera movement', () => {
    it('should move camera instantly with zero duration', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const listener = vi.fn();
      viewer.on('camera-changed', listener);

      const position = new THREE.Vector3(10, 20, 30);
      const target = new THREE.Vector3(0, 0, 0);

      viewer.moveCameraTo(position, target, 0);

      const camera = viewer.getCamera();
      expect(camera.position.equals(position)).toBe(true);
      expect(listener).toHaveBeenCalled();
    });

    it('should move camera without target', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const position = new THREE.Vector3(10, 20, 30);

      viewer.moveCameraTo(position);

      const camera = viewer.getCamera();
      expect(camera.position.equals(position)).toBe(true);
    });

    it('should log for animated camera movement', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const position = new THREE.Vector3(10, 20, 30);
      viewer.moveCameraTo(position, undefined, 1000);

      expect(consoleSpy).toHaveBeenCalledWith('Animated camera movement not yet implemented');

      consoleSpy.mockRestore();
    });
  });

  describe('FOV', () => {
    it('should set FOV for perspective camera', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      viewer.setFOV(45);

      const camera = viewer.getCamera() as THREE.PerspectiveCamera;
      expect(camera.fov).toBe(45);
    });

    it('should get FOV for perspective camera', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
        fov: 70,
      });

      expect(viewer.getFOV()).toBe(70);
    });

    it('should return undefined for non-perspective camera', () => {
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1);
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
        camera,
      });

      expect(viewer.getFOV()).toBeUndefined();
    });

    it('should not set FOV for non-perspective camera', () => {
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1);
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
        camera,
      });

      viewer.setFOV(45);

      // Should not throw and camera should be unchanged
      expect(camera).toBeInstanceOf(THREE.OrthographicCamera);
    });
  });

  describe('bounding box', () => {
    it('should set show bounding box', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      viewer.setShowBoundingBox(true);

      expect(consoleSpy).toHaveBeenCalledWith('Show bounding box:', true);

      consoleSpy.mockRestore();
    });
  });

  describe('LOD settings', () => {
    it('should set minimum node size', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      viewer.setMinNodeSize(100);

      expect(consoleSpy).toHaveBeenCalledWith('Setting min node size:', 100);

      consoleSpy.mockRestore();
    });
  });

  describe('frustum culling', () => {
    it('should set frustum culling', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      viewer.setFrustumCulling(false);

      expect(consoleSpy).toHaveBeenCalledWith('Frustum culling:', false);

      consoleSpy.mockRestore();
    });
  });

  describe('inheritance', () => {
    it('should inherit from Viewer', () => {
      const viewer = new ViewerAPI({
        container,
        renderer,
        scene,
      });

      // Test that inherited methods work
      expect(viewer.getPointBudget()).toBe(1_000_000);
      expect(viewer.getPointSize()).toBe(1.0);

      viewer.setPointBudget(500_000);
      expect(viewer.getPointBudget()).toBe(500_000);
    });
  });
});
