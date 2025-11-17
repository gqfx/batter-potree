/**
 * Unit tests for PointCloudScene
 */

import { PointCloudColorMode } from '@better-potree/core';
import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PointCloudMaterial } from '../materials/PointCloudMaterial';
import { PointCloudScene } from '../PointCloudScene';

describe('PointCloudScene', () => {
  describe('Constructor', () => {
    it('should create scene with default configuration', () => {
      const scene = new PointCloudScene();

      expect(scene).toBeInstanceOf(THREE.Group);
      expect(scene.material).toBeInstanceOf(PointCloudMaterial);
      expect(scene.name).toBe('PointCloudScene');
      expect(scene.nodeCount).toBe(0);
      expect(scene.visiblePointCount).toBe(0);
    });

    it('should create scene with custom material config', () => {
      const scene = new PointCloudScene({
        materialConfig: {
          size: 2.5,
          colorMode: PointCloudColorMode.INTENSITY,
        },
        octreeSpacing: 0.8,
      });

      expect(scene.material.size).toBe(2.5);
      expect(scene.material.colorMode).toBe(PointCloudColorMode.INTENSITY);
      expect(scene.octreeSpacing).toBe(0.8);
    });

    it('should initialize with default octree spacing', () => {
      const scene = new PointCloudScene();

      expect(scene.octreeSpacing).toBe(1.0);
    });
  });

  describe('addNode', () => {
    it('should add a node to the scene', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      scene.addNode('r', geometry);

      expect(scene.nodeCount).toBe(1);
      expect(scene.hasNode('r')).toBe(true);
      expect(scene.children.length).toBe(1);
    });

    it('should add node with custom metadata', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([0, 0, 0]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      scene.addNode('r0', geometry, {
        level: 1,
        vnStart: 5,
        pcIndex: 2,
        numPoints: 100,
      });

      const metadata = scene.getNodeMetadata('r0');
      expect(metadata?.level).toBe(1);
      expect(metadata?.vnStart).toBe(5);
      expect(metadata?.pcIndex).toBe(2);
      expect(metadata?.numPoints).toBe(100);
    });

    it('should extract level from node ID if not provided', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      expect(scene.getNodeMetadata('r')?.level).toBe(0);

      scene.addNode('r0', geometry);
      expect(scene.getNodeMetadata('r0')?.level).toBe(1);

      scene.addNode('r01', geometry);
      expect(scene.getNodeMetadata('r01')?.level).toBe(2);
    });

    it('should throw error for duplicate node ID', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);

      expect(() => {
        scene.addNode('r', geometry);
      }).toThrow('Node "r" already exists in the scene');
    });

    it('should update visible point count', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      scene.addNode('r', geometry);

      expect(scene.visiblePointCount).toBe(3);
    });

    it('should create Points object with shared material', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);

      const node = scene.getNode('r');
      expect(node).toBeInstanceOf(THREE.Points);
      expect(node?.material).toBe(scene.material);
    });

    it('should set node name correctly', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r0', geometry);

      const node = scene.getNode('r0');
      expect(node?.name).toBe('PointCloudNode_r0');
    });

    it('should disable frustum culling', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);

      const node = scene.getNode('r');
      expect(node?.frustumCulled).toBe(false);
    });

    it('should setup onBeforeRender hook', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r0', geometry, { level: 1 });

      const node = scene.getNode('r0');
      expect(node?.onBeforeRender).toBeDefined();
      expect(typeof node?.onBeforeRender).toBe('function');
    });
  });

  describe('removeNode', () => {
    it('should remove a node from the scene', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      expect(scene.nodeCount).toBe(1);

      const removed = scene.removeNode('r');

      expect(removed).toBe(true);
      expect(scene.nodeCount).toBe(0);
      expect(scene.hasNode('r')).toBe(false);
      expect(scene.children.length).toBe(0);
    });

    it('should return false for non-existent node', () => {
      const scene = new PointCloudScene();

      const removed = scene.removeNode('nonexistent');

      expect(removed).toBe(false);
    });

    it('should update visible point count', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      scene.addNode('r', geometry);
      expect(scene.visiblePointCount).toBe(2);

      scene.removeNode('r');

      expect(scene.visiblePointCount).toBe(0);
    });

    it('should dispose node geometry', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
      const disposeSpy = vi.spyOn(geometry, 'dispose');

      scene.addNode('r', geometry);
      scene.removeNode('r');

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should clear onBeforeRender hook', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      const node = scene.getNode('r');
      const originalHook = node?.onBeforeRender;

      scene.removeNode('r');

      // Hook should still be a function but empty
      expect(typeof node?.onBeforeRender).toBe('function');
      expect(node?.onBeforeRender).not.toBe(originalHook);
    });
  });

  describe('updateMaterial', () => {
    it('should update material for all nodes', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r0', geometry);
      scene.addNode('r1', geometry);

      const newMaterial = new PointCloudMaterial({ size: 5.0 });
      scene.updateMaterial(newMaterial);

      expect(scene.getNode('r0')?.material).toBe(newMaterial);
      expect(scene.getNode('r1')?.material).toBe(newMaterial);
      expect(scene.material).toBe(newMaterial);
    });

    it('should dispose old material', () => {
      const scene = new PointCloudScene();
      const oldMaterial = scene.material;
      const disposeSpy = vi.spyOn(oldMaterial, 'dispose');

      const newMaterial = new PointCloudMaterial();
      scene.updateMaterial(newMaterial);

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should update octree spacing on new material', () => {
      const scene = new PointCloudScene({ octreeSpacing: 2.5 });
      const newMaterial = new PointCloudMaterial();
      const updateSpacingSpy = vi.spyOn(newMaterial, 'updateOctreeSpacing');

      scene.updateMaterial(newMaterial);

      expect(updateSpacingSpy).toHaveBeenCalledWith(2.5);
    });
  });

  describe('updateVisibility', () => {
    let scene: PointCloudScene;

    beforeEach(() => {
      scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      scene.addNode('r', geometry);
      scene.addNode('r0', geometry);
      scene.addNode('r1', geometry);
    });

    it('should show only visible nodes', () => {
      const visibleNodes = new Set(['r', 'r1']);
      scene.updateVisibility(visibleNodes);

      expect(scene.getNode('r')?.visible).toBe(true);
      expect(scene.getNode('r0')?.visible).toBe(false);
      expect(scene.getNode('r1')?.visible).toBe(true);
    });

    it('should update visible point count', () => {
      const visibleNodes = new Set(['r']);
      scene.updateVisibility(visibleNodes);

      expect(scene.visiblePointCount).toBe(3);
    });

    it('should handle empty visibility set', () => {
      const visibleNodes = new Set<string>();
      scene.updateVisibility(visibleNodes);

      expect(scene.getNode('r')?.visible).toBe(false);
      expect(scene.getNode('r0')?.visible).toBe(false);
      expect(scene.getNode('r1')?.visible).toBe(false);
      expect(scene.visiblePointCount).toBe(0);
    });

    it('should handle all nodes visible', () => {
      const visibleNodes = new Set(['r', 'r0', 'r1']);
      scene.updateVisibility(visibleNodes);

      expect(scene.visiblePointCount).toBe(9);
    });

    it('should update metadata isVisible flag', () => {
      const visibleNodes = new Set(['r0']);
      scene.updateVisibility(visibleNodes);

      expect(scene.getNodeMetadata('r')?.isVisible).toBe(false);
      expect(scene.getNodeMetadata('r0')?.isVisible).toBe(true);
      expect(scene.getNodeMetadata('r1')?.isVisible).toBe(false);
    });
  });

  describe('getNode', () => {
    it('should return node by ID', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      const node = scene.getNode('r');

      expect(node).toBeInstanceOf(THREE.Points);
      expect(node?.name).toBe('PointCloudNode_r');
    });

    it('should return undefined for non-existent node', () => {
      const scene = new PointCloudScene();
      const node = scene.getNode('nonexistent');

      expect(node).toBeUndefined();
    });
  });

  describe('getNodeMetadata', () => {
    it('should return node metadata', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry, {
        level: 0,
        vnStart: 10,
        pcIndex: 3,
      });

      const metadata = scene.getNodeMetadata('r');

      expect(metadata).toBeDefined();
      expect(metadata?.level).toBe(0);
      expect(metadata?.vnStart).toBe(10);
      expect(metadata?.pcIndex).toBe(3);
    });

    it('should return undefined for non-existent node', () => {
      const scene = new PointCloudScene();
      const metadata = scene.getNodeMetadata('nonexistent');

      expect(metadata).toBeUndefined();
    });
  });

  describe('updateNodeMetadata', () => {
    it('should update node metadata', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      const success = scene.updateNodeMetadata('r', {
        vnStart: 15,
        pcIndex: 5,
      });

      expect(success).toBe(true);

      const metadata = scene.getNodeMetadata('r');
      expect(metadata?.vnStart).toBe(15);
      expect(metadata?.pcIndex).toBe(5);
    });

    it('should return false for non-existent node', () => {
      const scene = new PointCloudScene();
      const success = scene.updateNodeMetadata('nonexistent', { level: 5 });

      expect(success).toBe(false);
    });

    it('should update visible point count when changing visibility', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      scene.addNode('r', geometry);
      expect(scene.visiblePointCount).toBe(2);

      scene.updateNodeMetadata('r', { isVisible: false });

      expect(scene.visiblePointCount).toBe(0);
    });

    it('should update visible point count when changing numPoints', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry, { numPoints: 100 });
      expect(scene.visiblePointCount).toBe(100);

      scene.updateNodeMetadata('r', { numPoints: 200 });

      expect(scene.visiblePointCount).toBe(200);
    });
  });

  describe('hasNode', () => {
    it('should return true for existing node', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);

      expect(scene.hasNode('r')).toBe(true);
    });

    it('should return false for non-existent node', () => {
      const scene = new PointCloudScene();

      expect(scene.hasNode('r')).toBe(false);
    });
  });

  describe('getNodeIds', () => {
    it('should return all node IDs', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      scene.addNode('r0', geometry);
      scene.addNode('r1', geometry);

      const ids = scene.getNodeIds();

      expect(ids).toHaveLength(3);
      expect(ids).toContain('r');
      expect(ids).toContain('r0');
      expect(ids).toContain('r1');
    });

    it('should return empty array when no nodes', () => {
      const scene = new PointCloudScene();
      const ids = scene.getNodeIds();

      expect(ids).toHaveLength(0);
    });
  });

  describe('getVisibleNodeIds', () => {
    it('should return only visible node IDs', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      scene.addNode('r0', geometry);
      scene.addNode('r1', geometry);

      const visibleNodes = new Set(['r', 'r1']);
      scene.updateVisibility(visibleNodes);

      const visibleIds = scene.getVisibleNodeIds();

      expect(visibleIds).toHaveLength(2);
      expect(visibleIds).toContain('r');
      expect(visibleIds).toContain('r1');
      expect(visibleIds).not.toContain('r0');
    });

    it('should return empty array when no visible nodes', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      scene.updateVisibility(new Set());

      const visibleIds = scene.getVisibleNodeIds();

      expect(visibleIds).toHaveLength(0);
    });
  });

  describe('updateCamera', () => {
    it('should update material camera uniforms', () => {
      const scene = new PointCloudScene();
      const camera = new THREE.PerspectiveCamera(60, 1.5, 0.1, 1000);
      const updateCameraSpy = vi.spyOn(scene.material, 'updateCamera');

      scene.updateCamera(camera);

      expect(updateCameraSpy).toHaveBeenCalledWith(camera);
    });
  });

  describe('updateScreenSize', () => {
    it('should update material screen size uniforms', () => {
      const scene = new PointCloudScene();
      const updateScreenSizeSpy = vi.spyOn(scene.material, 'updateScreenSize');

      scene.updateScreenSize(1920, 1080);

      expect(updateScreenSizeSpy).toHaveBeenCalledWith(1920, 1080);
    });
  });

  describe('octreeSpacing', () => {
    it('should get octree spacing', () => {
      const scene = new PointCloudScene({ octreeSpacing: 2.0 });

      expect(scene.octreeSpacing).toBe(2.0);
    });

    it('should set octree spacing', () => {
      const scene = new PointCloudScene();

      scene.octreeSpacing = 3.5;

      expect(scene.octreeSpacing).toBe(3.5);
    });

    it('should update material when setting spacing', () => {
      const scene = new PointCloudScene();
      const updateSpacingSpy = vi.spyOn(scene.material, 'updateOctreeSpacing');

      scene.octreeSpacing = 2.5;

      expect(updateSpacingSpy).toHaveBeenCalledWith(2.5);
    });
  });

  describe('addDisposeHandler', () => {
    it('should add dispose handler', () => {
      const scene = new PointCloudScene();
      const handler = vi.fn();

      scene.addDisposeHandler(handler);
      scene.dispose();

      expect(handler).toHaveBeenCalled();
    });

    it('should call multiple dispose handlers', () => {
      const scene = new PointCloudScene();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      scene.addDisposeHandler(handler1);
      scene.addDisposeHandler(handler2);
      scene.dispose();

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('should remove all nodes', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));

      scene.addNode('r', geometry);
      scene.addNode('r0', geometry);

      scene.dispose();

      expect(scene.nodeCount).toBe(0);
      expect(scene.children.length).toBe(0);
    });

    it('should dispose all node geometries', () => {
      const scene = new PointCloudScene();
      const geometry1 = new THREE.BufferGeometry();
      const geometry2 = new THREE.BufferGeometry();
      geometry1.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
      geometry2.setAttribute('position', new THREE.BufferAttribute(new Float32Array([1, 1, 1]), 3));

      const disposeSpy1 = vi.spyOn(geometry1, 'dispose');
      const disposeSpy2 = vi.spyOn(geometry2, 'dispose');

      scene.addNode('r', geometry1);
      scene.addNode('r0', geometry2);
      scene.dispose();

      expect(disposeSpy1).toHaveBeenCalled();
      expect(disposeSpy2).toHaveBeenCalled();
    });

    it('should dispose material', () => {
      const scene = new PointCloudScene();
      const disposeSpy = vi.spyOn(scene.material, 'dispose');

      scene.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should reset visible point count', () => {
      const scene = new PointCloudScene();
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      scene.addNode('r', geometry);
      expect(scene.visiblePointCount).toBe(2);

      scene.dispose();

      expect(scene.visiblePointCount).toBe(0);
    });

    it('should call dispose handlers', () => {
      const scene = new PointCloudScene();
      const handler = vi.fn();

      scene.addDisposeHandler(handler);
      scene.dispose();

      expect(handler).toHaveBeenCalled();
    });

    it('should handle dispose handler errors gracefully', () => {
      const scene = new PointCloudScene();
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const successHandler = vi.fn();

      scene.addDisposeHandler(errorHandler);
      scene.addDisposeHandler(successHandler);

      expect(() => scene.dispose()).not.toThrow();
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('should work with complete workflow', () => {
      // Create scene
      const scene = new PointCloudScene({
        materialConfig: {
          size: 2.0,
          colorMode: PointCloudColorMode.RGB,
        },
        octreeSpacing: 1.5,
      });

      // Add nodes
      const geometry1 = new THREE.BufferGeometry();
      const positions1 = new Float32Array([0, 0, 0, 1, 1, 1]);
      geometry1.setAttribute('position', new THREE.BufferAttribute(positions1, 3));

      const geometry2 = new THREE.BufferGeometry();
      const positions2 = new Float32Array([2, 2, 2, 3, 3, 3, 4, 4, 4]);
      geometry2.setAttribute('position', new THREE.BufferAttribute(positions2, 3));

      scene.addNode('r', geometry1, { level: 0 });
      scene.addNode('r0', geometry2, { level: 1 });

      expect(scene.nodeCount).toBe(2);
      expect(scene.visiblePointCount).toBe(5);

      // Update visibility
      scene.updateVisibility(new Set(['r']));
      expect(scene.visiblePointCount).toBe(2);

      // Update camera and screen
      const camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 0.1, 1000);
      scene.updateCamera(camera);
      scene.updateScreenSize(1920, 1080);

      // Remove node
      scene.removeNode('r0');
      expect(scene.nodeCount).toBe(1);

      // Dispose
      scene.dispose();
      expect(scene.nodeCount).toBe(0);
      expect(scene.visiblePointCount).toBe(0);
    });
  });
});
