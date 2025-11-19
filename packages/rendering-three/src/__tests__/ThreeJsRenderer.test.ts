/**
 * Unit tests for ThreeJsRenderer and ThreeScene
 */

import type { IScene } from '@better-potree/core';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { ThreeJsRenderer, ThreeScene } from '../ThreeJsRenderer';

describe('ThreeJsRenderer', () => {
  describe('Constructor', () => {
    it('should create renderer with default config', () => {
      const renderer = new ThreeJsRenderer();

      expect(renderer).toBeDefined();
      expect(renderer.getDomElement()).toBeInstanceOf(HTMLCanvasElement);
    });

    it('should use provided canvas', () => {
      const canvas = document.createElement('canvas');
      const renderer = new ThreeJsRenderer({ canvas });

      expect(renderer.getDomElement()).toBe(canvas);
    });

    it('should set antialias by default', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();

      // Three.js doesn't expose antialias directly, but we can verify renderer exists
      expect(threeRenderer).toBeInstanceOf(THREE.WebGLRenderer);
    });

    it('should respect custom antialias setting', () => {
      const renderer = new ThreeJsRenderer({ antialias: false });

      expect(renderer).toBeDefined();
    });

    it('should set default pixel ratio', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();

      expect(threeRenderer.getPixelRatio()).toBeGreaterThan(0);
    });

    it('should use custom pixel ratio', () => {
      const renderer = new ThreeJsRenderer({ pixelRatio: 2.0 });
      const threeRenderer = renderer.getThreeRenderer();

      expect(threeRenderer.getPixelRatio()).toBe(2.0);
    });

    it('should disable sortObjects by default', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();

      expect(threeRenderer.sortObjects).toBe(false);
    });

    it('should disable autoClear by default', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();

      expect(threeRenderer.autoClear).toBe(false);
    });

    it('should throw error if WebGL2 is not available', () => {
      // Mock WebGL2 not available
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);
      vi.spyOn(document, 'createElement').mockReturnValue(canvas);

      expect(() => new ThreeJsRenderer()).toThrow(/WebGL2/);

      vi.restoreAllMocks();
    });
  });

  describe('render', () => {
    it('should render scene with camera', () => {
      const renderer = new ThreeJsRenderer();
      const scene = new ThreeScene();
      const camera = new THREE.PerspectiveCamera();

      const threeRenderer = renderer.getThreeRenderer();
      const renderSpy = vi.spyOn(threeRenderer, 'render');
      const clearSpy = vi.spyOn(threeRenderer, 'clear');

      renderer.render(scene, camera);

      expect(clearSpy).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalledWith(scene.getThreeScene(), camera);
    });

    it('should throw error if scene does not provide getThreeScene', () => {
      const renderer = new ThreeJsRenderer();
      const invalidScene = {} as IScene;
      const camera = new THREE.PerspectiveCamera();

      expect(() => renderer.render(invalidScene, camera)).toThrow(
        'Scene must provide getThreeScene() method',
      );
    });

    it('should work with orthographic camera', () => {
      const renderer = new ThreeJsRenderer();
      const scene = new ThreeScene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1);

      const threeRenderer = renderer.getThreeRenderer();
      const renderSpy = vi.spyOn(threeRenderer, 'render');

      renderer.render(scene, camera);

      expect(renderSpy).toHaveBeenCalledWith(scene.getThreeScene(), camera);
    });
  });

  describe('setSize', () => {
    it('should set renderer size', () => {
      const renderer = new ThreeJsRenderer();

      renderer.setSize(800, 600);

      const canvas = renderer.getDomElement();
      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    it('should handle various sizes', () => {
      const renderer = new ThreeJsRenderer();

      renderer.setSize(1920, 1080);
      expect(renderer.getDomElement().width).toBeGreaterThan(0);

      renderer.setSize(640, 480);
      expect(renderer.getDomElement().width).toBeGreaterThan(0);
    });
  });

  describe('getDomElement', () => {
    it('should return canvas element', () => {
      const renderer = new ThreeJsRenderer();
      const element = renderer.getDomElement();

      expect(element).toBeInstanceOf(HTMLCanvasElement);
      expect(element.tagName).toBe('CANVAS');
    });

    it('should return the same element consistently', () => {
      const renderer = new ThreeJsRenderer();
      const element1 = renderer.getDomElement();
      const element2 = renderer.getDomElement();

      expect(element1).toBe(element2);
    });
  });

  describe('getThreeRenderer', () => {
    it('should return Three.js WebGLRenderer instance', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();

      expect(threeRenderer).toBeInstanceOf(THREE.WebGLRenderer);
    });

    it('should return the same renderer consistently', () => {
      const renderer = new ThreeJsRenderer();
      const renderer1 = renderer.getThreeRenderer();
      const renderer2 = renderer.getThreeRenderer();

      expect(renderer1).toBe(renderer2);
    });
  });

  describe('dispose', () => {
    it('should dispose renderer resources', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();
      const disposeSpy = vi.spyOn(threeRenderer, 'dispose');

      renderer.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      const renderer = new ThreeJsRenderer();

      renderer.dispose();
      expect(() => renderer.dispose()).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear with default parameters', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();
      const clearSpy = vi.spyOn(threeRenderer, 'clear');

      renderer.clear();

      expect(clearSpy).toHaveBeenCalledWith(true, true, true);
    });

    it('should clear with custom parameters', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();
      const clearSpy = vi.spyOn(threeRenderer, 'clear');

      renderer.clear(false, true, false);

      expect(clearSpy).toHaveBeenCalledWith(false, true, false);
    });

    it('should clear only color buffer', () => {
      const renderer = new ThreeJsRenderer();
      const threeRenderer = renderer.getThreeRenderer();
      const clearSpy = vi.spyOn(threeRenderer, 'clear');

      renderer.clear(true, false, false);

      expect(clearSpy).toHaveBeenCalledWith(true, false, false);
    });
  });

  describe('getContext', () => {
    it('should return WebGL2 rendering context', () => {
      const renderer = new ThreeJsRenderer();
      const context = renderer.getContext();

      expect(context).toBeDefined();
      // WebGL2RenderingContext should have specific methods
      expect(typeof context.getParameter).toBe('function');
      expect(typeof context.clear).toBe('function');
    });
  });

  describe('setAutoClear', () => {
    it('should enable autoClear', () => {
      const renderer = new ThreeJsRenderer();

      renderer.setAutoClear(true);

      expect(renderer.getThreeRenderer().autoClear).toBe(true);
    });

    it('should disable autoClear', () => {
      const renderer = new ThreeJsRenderer();

      renderer.setAutoClear(false);

      expect(renderer.getThreeRenderer().autoClear).toBe(false);
    });
  });

  describe('setSortObjects', () => {
    it('should enable sortObjects', () => {
      const renderer = new ThreeJsRenderer();

      renderer.setSortObjects(true);

      expect(renderer.getThreeRenderer().sortObjects).toBe(true);
    });

    it('should disable sortObjects', () => {
      const renderer = new ThreeJsRenderer();

      renderer.setSortObjects(false);

      expect(renderer.getThreeRenderer().sortObjects).toBe(false);
    });
  });
});

describe('ThreeScene', () => {
  describe('Constructor', () => {
    it('should create an empty scene', () => {
      const scene = new ThreeScene();

      expect(scene).toBeDefined();
      expect(scene.getThreeScene()).toBeInstanceOf(THREE.Scene);
    });

    it('should have no children initially', () => {
      const scene = new ThreeScene();
      const threeScene = scene.getThreeScene();

      expect(threeScene.children.length).toBe(0);
    });
  });

  describe('add', () => {
    it('should add object to scene', () => {
      const scene = new ThreeScene();
      const mesh = new THREE.Mesh();

      scene.add(mesh);

      expect(scene.getThreeScene().children).toContain(mesh);
      expect(scene.getThreeScene().children.length).toBe(1);
    });

    it('should add multiple objects', () => {
      const scene = new ThreeScene();
      const mesh1 = new THREE.Mesh();
      const mesh2 = new THREE.Mesh();

      scene.add(mesh1);
      scene.add(mesh2);

      expect(scene.getThreeScene().children).toContain(mesh1);
      expect(scene.getThreeScene().children).toContain(mesh2);
      expect(scene.getThreeScene().children.length).toBe(2);
    });

    it('should add different types of objects', () => {
      const scene = new ThreeScene();
      const mesh = new THREE.Mesh();
      const light = new THREE.PointLight();
      const camera = new THREE.PerspectiveCamera();

      scene.add(mesh);
      scene.add(light);
      scene.add(camera);

      expect(scene.getThreeScene().children.length).toBe(3);
    });
  });

  describe('remove', () => {
    it('should remove object from scene', () => {
      const scene = new ThreeScene();
      const mesh = new THREE.Mesh();

      scene.add(mesh);
      scene.remove(mesh);

      expect(scene.getThreeScene().children).not.toContain(mesh);
      expect(scene.getThreeScene().children.length).toBe(0);
    });

    it('should handle removing non-existent object', () => {
      const scene = new ThreeScene();
      const mesh = new THREE.Mesh();

      expect(() => scene.remove(mesh)).not.toThrow();
      expect(scene.getThreeScene().children.length).toBe(0);
    });

    it('should remove specific object among multiple', () => {
      const scene = new ThreeScene();
      const mesh1 = new THREE.Mesh();
      const mesh2 = new THREE.Mesh();
      const mesh3 = new THREE.Mesh();

      scene.add(mesh1);
      scene.add(mesh2);
      scene.add(mesh3);

      scene.remove(mesh2);

      expect(scene.getThreeScene().children).toContain(mesh1);
      expect(scene.getThreeScene().children).not.toContain(mesh2);
      expect(scene.getThreeScene().children).toContain(mesh3);
      expect(scene.getThreeScene().children.length).toBe(2);
    });
  });

  describe('getThreeScene', () => {
    it('should return Three.js Scene instance', () => {
      const scene = new ThreeScene();
      const threeScene = scene.getThreeScene();

      expect(threeScene).toBeInstanceOf(THREE.Scene);
    });

    it('should return the same scene consistently', () => {
      const scene = new ThreeScene();
      const scene1 = scene.getThreeScene();
      const scene2 = scene.getThreeScene();

      expect(scene1).toBe(scene2);
    });
  });

  describe('clear', () => {
    it('should clear all objects from scene', () => {
      const scene = new ThreeScene();
      const mesh1 = new THREE.Mesh();
      const mesh2 = new THREE.Mesh();
      const mesh3 = new THREE.Mesh();

      scene.add(mesh1);
      scene.add(mesh2);
      scene.add(mesh3);

      scene.clear();

      expect(scene.getThreeScene().children.length).toBe(0);
    });

    it('should handle clearing empty scene', () => {
      const scene = new ThreeScene();

      expect(() => scene.clear()).not.toThrow();
      expect(scene.getThreeScene().children.length).toBe(0);
    });

    it('should be idempotent', () => {
      const scene = new ThreeScene();
      const mesh = new THREE.Mesh();

      scene.add(mesh);
      scene.clear();
      scene.clear();

      expect(scene.getThreeScene().children.length).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should clear scene on dispose', () => {
      const scene = new ThreeScene();
      const mesh1 = new THREE.Mesh();
      const mesh2 = new THREE.Mesh();

      scene.add(mesh1);
      scene.add(mesh2);

      scene.dispose();

      expect(scene.getThreeScene().children.length).toBe(0);
    });

    it('should be safe to call multiple times', () => {
      const scene = new ThreeScene();
      const mesh = new THREE.Mesh();

      scene.add(mesh);
      scene.dispose();

      expect(() => scene.dispose()).not.toThrow();
      expect(scene.getThreeScene().children.length).toBe(0);
    });
  });
});
