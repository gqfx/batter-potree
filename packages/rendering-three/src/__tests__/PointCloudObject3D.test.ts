/**
 * Unit tests for PointCloudObject3D
 */

import { PointCloudColorMode, PointSizeType } from '@better-potree/core';
import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PointCloudMaterial } from '../materials/PointCloudMaterial';
import { PointCloudObject3D } from '../objects/PointCloudObject3D';

describe('PointCloudObject3D', () => {
  describe('Constructor', () => {
    it('should create object with default material', () => {
      const obj = new PointCloudObject3D();

      expect(obj).toBeInstanceOf(THREE.Object3D);
      expect(obj.getMaterial()).toBeInstanceOf(PointCloudMaterial);
      expect(obj.getGeometry()).toBeInstanceOf(THREE.BufferGeometry);
    });

    it('should create object with custom material config', () => {
      const obj = new PointCloudObject3D({
        size: 5.0,
        colorMode: PointCloudColorMode.INTENSITY,
      });

      const material = obj.getMaterial();
      expect(material.size).toBe(5.0);
      expect(material.colorMode).toBe(PointCloudColorMode.INTENSITY);
    });

    it('should initialize with default point budget', () => {
      const obj = new PointCloudObject3D();

      expect(obj.pointBudget).toBe(1_000_000);
    });

    it('should initialize with zero visible points', () => {
      const obj = new PointCloudObject3D();

      expect(obj.visiblePointCount).toBe(0);
    });

    it('should add points object to children', () => {
      const obj = new PointCloudObject3D();

      expect(obj.children.length).toBe(1);
      expect(obj.children[0]).toBeInstanceOf(THREE.Points);
    });
  });

  describe('Point Budget', () => {
    it('should get point budget', () => {
      const obj = new PointCloudObject3D();
      const budget = obj.pointBudget;

      expect(budget).toBe(1_000_000);
    });

    it('should set point budget', () => {
      const obj = new PointCloudObject3D();

      obj.pointBudget = 500_000;

      expect(obj.pointBudget).toBe(500_000);
    });
  });

  describe('Visible Point Count', () => {
    it('should return zero initially', () => {
      const obj = new PointCloudObject3D();

      expect(obj.visiblePointCount).toBe(0);
    });

    it('should update after geometry update', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);

      obj.updateGeometry(positions);

      expect(obj.visiblePointCount).toBe(3);
    });
  });

  describe('updateGeometry', () => {
    it('should update position attribute', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1]);

      obj.updateGeometry(positions);

      const geometry = obj.getGeometry();
      const posAttr = geometry.getAttribute('position');

      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBe(2);
      expect(posAttr.array).toEqual(positions);
    });

    it('should update color attribute when provided', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
      const colors = new Float32Array([1, 0, 0, 0, 1, 0]);

      obj.updateGeometry(positions, { colors });

      const geometry = obj.getGeometry();
      const colorAttr = geometry.getAttribute('color');

      expect(colorAttr).toBeDefined();
      expect(colorAttr.count).toBe(2);
      expect(colorAttr.array).toEqual(colors);
    });

    it('should update intensity attribute when provided', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
      const intensities = new Float32Array([0.5, 0.8]);

      obj.updateGeometry(positions, { intensities });

      const geometry = obj.getGeometry();
      const intensityAttr = geometry.getAttribute('intensity');

      expect(intensityAttr).toBeDefined();
      expect(intensityAttr.count).toBe(2);
      expect(intensityAttr.array).toEqual(intensities);
    });

    it('should update classification attribute when provided', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0]);
      const classifications = new Float32Array([2]);

      obj.updateGeometry(positions, { classifications });

      const geometry = obj.getGeometry();
      const classAttr = geometry.getAttribute('classification');

      expect(classAttr).toBeDefined();
      expect(classAttr.array).toEqual(classifications);
    });

    it('should update returnNumbers attribute when provided', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0]);
      const returnNumbers = new Float32Array([1]);

      obj.updateGeometry(positions, { returnNumbers });

      const geometry = obj.getGeometry();
      const returnAttr = geometry.getAttribute('returnNumber');

      expect(returnAttr).toBeDefined();
      expect(returnAttr.array).toEqual(returnNumbers);
    });

    it('should update numberOfReturns attribute when provided', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0]);
      const numberOfReturns = new Float32Array([3]);

      obj.updateGeometry(positions, { numberOfReturns });

      const geometry = obj.getGeometry();
      const returnsAttr = geometry.getAttribute('numberOfReturns');

      expect(returnsAttr).toBeDefined();
      expect(returnsAttr.array).toEqual(numberOfReturns);
    });

    it('should update normal attribute when provided', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0]);
      const normals = new Float32Array([0, 1, 0]);

      obj.updateGeometry(positions, { normals });

      const geometry = obj.getGeometry();
      const normalAttr = geometry.getAttribute('normal');

      expect(normalAttr).toBeDefined();
      expect(normalAttr.array).toEqual(normals);
    });

    it('should set draw range correctly', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);

      obj.updateGeometry(positions);

      const geometry = obj.getGeometry();
      expect(geometry.drawRange.start).toBe(0);
      expect(geometry.drawRange.count).toBe(3);
    });

    it('should compute bounding sphere', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1]);

      obj.updateGeometry(positions);

      const geometry = obj.getGeometry();
      expect(geometry.boundingSphere).toBeDefined();
      expect(geometry.boundingSphere).not.toBeNull();
    });

    it('should update visible point count', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]);

      obj.updateGeometry(positions);

      expect(obj.visiblePointCount).toBe(4);
    });

    it('should handle empty positions array', () => {
      const obj = new PointCloudObject3D();
      const positions = new Float32Array([]);

      obj.updateGeometry(positions);

      expect(obj.visiblePointCount).toBe(0);
      expect(obj.getGeometry().drawRange.count).toBe(0);
    });

    it('should handle multiple updates', () => {
      const obj = new PointCloudObject3D();

      // First update
      obj.updateGeometry(new Float32Array([0, 0, 0]));
      expect(obj.visiblePointCount).toBe(1);

      // Second update
      obj.updateGeometry(new Float32Array([0, 0, 0, 1, 1, 1]));
      expect(obj.visiblePointCount).toBe(2);
    });
  });

  describe('update', () => {
    it('should update material camera uniforms', () => {
      const obj = new PointCloudObject3D();
      const camera = new THREE.PerspectiveCamera(75, 1.5, 0.1, 1000);

      const material = obj.getMaterial();
      const updateCameraSpy = vi.spyOn(material, 'updateCamera');

      obj.update(camera);

      expect(updateCameraSpy).toHaveBeenCalledWith(camera);
    });

    it('should update point budget if provided', () => {
      const obj = new PointCloudObject3D();
      const camera = new THREE.PerspectiveCamera();

      obj.update(camera, 750_000);

      expect(obj.pointBudget).toBe(750_000);
    });

    it('should not change point budget if not provided', () => {
      const obj = new PointCloudObject3D();
      obj.pointBudget = 500_000;

      const camera = new THREE.PerspectiveCamera();
      obj.update(camera);

      expect(obj.pointBudget).toBe(500_000);
    });

    it('should handle orthographic camera', () => {
      const obj = new PointCloudObject3D();
      const camera = new THREE.OrthographicCamera(-10, 10, 5, -5);

      const material = obj.getMaterial();
      const updateCameraSpy = vi.spyOn(material, 'updateCamera');

      obj.update(camera);

      expect(updateCameraSpy).toHaveBeenCalledWith(camera);
    });
  });

  describe('updateScreenSize', () => {
    it('should update material screen size', () => {
      const obj = new PointCloudObject3D();

      const material = obj.getMaterial();
      const updateScreenSizeSpy = vi.spyOn(material, 'updateScreenSize');

      obj.updateScreenSize(1920, 1080);

      expect(updateScreenSizeSpy).toHaveBeenCalledWith(1920, 1080);
    });

    it('should handle various screen sizes', () => {
      const obj = new PointCloudObject3D();
      const material = obj.getMaterial();

      obj.updateScreenSize(800, 600);
      expect(material.uniforms?.uScreenWidth?.value).toBe(800);
      expect(material.uniforms?.uScreenHeight?.value).toBe(600);

      obj.updateScreenSize(3840, 2160);
      expect(material.uniforms?.uScreenWidth?.value).toBe(3840);
      expect(material.uniforms?.uScreenHeight?.value).toBe(2160);
    });
  });

  describe('updateOctreeSpacing', () => {
    it('should update material octree spacing', () => {
      const obj = new PointCloudObject3D();

      const material = obj.getMaterial();
      const updateOctreeSpacingSpy = vi.spyOn(material, 'updateOctreeSpacing');

      obj.updateOctreeSpacing(2.5);

      expect(updateOctreeSpacingSpy).toHaveBeenCalledWith(2.5);
    });

    it('should handle various spacing values', () => {
      const obj = new PointCloudObject3D();
      const material = obj.getMaterial();

      obj.updateOctreeSpacing(1.0);
      expect(material.uniforms?.uOctreeSpacing?.value).toBe(1.0);

      obj.updateOctreeSpacing(5.5);
      expect(material.uniforms?.uOctreeSpacing?.value).toBe(5.5);
    });
  });

  describe('dispose', () => {
    it('should dispose geometry', () => {
      const obj = new PointCloudObject3D();
      const geometry = obj.getGeometry();
      const disposeSpy = vi.spyOn(geometry, 'dispose');

      obj.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should dispose material', () => {
      const obj = new PointCloudObject3D();
      const material = obj.getMaterial();
      const disposeSpy = vi.spyOn(material, 'dispose');

      obj.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });

    it('should be safe to call multiple times', () => {
      const obj = new PointCloudObject3D();

      obj.dispose();
      expect(() => obj.dispose()).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with complete workflow', () => {
      // Create object
      const obj = new PointCloudObject3D({
        size: 3.0,
        colorMode: PointCloudColorMode.RGB,
        sizeType: PointSizeType.ADAPTIVE,
      });

      // Set point budget
      obj.pointBudget = 2_000_000;

      // Update geometry
      const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);
      const colors = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);

      obj.updateGeometry(positions, { colors });

      // Update screen size
      obj.updateScreenSize(1920, 1080);

      // Update with camera
      const camera = new THREE.PerspectiveCamera(75, 1920 / 1080, 0.1, 1000);
      obj.update(camera);

      // Verify state
      expect(obj.visiblePointCount).toBe(3);
      expect(obj.pointBudget).toBe(2_000_000);
      expect(obj.getMaterial().size).toBe(3.0);
      expect(obj.getGeometry().getAttribute('position').count).toBe(3);
      expect(obj.getGeometry().getAttribute('color').count).toBe(3);

      // Dispose
      obj.dispose();
    });
  });
});
