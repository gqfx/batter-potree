/**
 * GPU 可见性剔除测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedFrustumCuller } from './FrustumCuller.js';
import type { FrustumCullingStats } from './FrustumCuller.js';
import * as THREE from 'three';

describe('EnhancedFrustumCuller', () => {
  let camera: THREE.PerspectiveCamera;
  let culler: EnhancedFrustumCuller;

  beforeEach(() => {
    camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    culler = new EnhancedFrustumCuller(camera);
    culler.update();
  });

  describe('视锥剔除', () => {
    it('应该正确识别视锥内的包围盒', () => {
      const box = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));

      const isVisible = culler.testBox(box);

      expect(isVisible).toBe(true);
    });

    it('应该剔除视锥外的包围盒', () => {
      const box = new THREE.Box3(new THREE.Vector3(100, 100, 100), new THREE.Vector3(101, 101, 101));

      const isVisible = culler.testBox(box);

      expect(isVisible).toBe(false);
    });

    it('应该正确识别相机后方的包围盒', () => {
      const box = new THREE.Box3(new THREE.Vector3(-1, -1, 20), new THREE.Vector3(1, 1, 22));

      const isVisible = culler.testBox(box);

      expect(isVisible).toBe(false);
    });
  });

  describe('批量测试', () => {
    it('应该正确处理批量包围盒测试', () => {
      const boxes = [
        new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1)), // 可见
        new THREE.Box3(new THREE.Vector3(100, 100, 100), new THREE.Vector3(101, 101, 101)), // 不可见
        new THREE.Box3(new THREE.Vector3(-0.5, -0.5, -0.5), new THREE.Vector3(0.5, 0.5, 0.5)), // 可见
      ];

      const results = culler.testBoxes(boxes);

      expect(results).toEqual([true, false, true]);
    });
  });

  describe('统计信息', () => {
    it('应该正确记录测试统计', () => {
      const box1 = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
      const box2 = new THREE.Box3(new THREE.Vector3(100, 100, 100), new THREE.Vector3(101, 101, 101));

      culler.testBox(box1); // 可见
      culler.testBox(box2); // 被剔除

      const stats = culler.getStats();

      expect(stats.testedNodes).toBe(2);
      expect(stats.visibleNodes).toBe(1);
      expect(stats.culledNodes).toBe(1);
      expect(stats.cullRate).toBeCloseTo(0.5);
    });

    it('应该能重置统计信息', () => {
      const box = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));

      culler.testBox(box);
      culler.resetStats();

      const stats = culler.getStats();

      expect(stats.testedNodes).toBe(0);
      expect(stats.visibleNodes).toBe(0);
      expect(stats.culledNodes).toBe(0);
      expect(stats.cullRate).toBe(0);
    });
  });

  describe('包围球测试', () => {
    it('应该正确识别视锥内的包围球', () => {
      const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);

      const isVisible = culler.testSphere(sphere);

      expect(isVisible).toBe(true);
    });

    it('应该剔除视锥外的包围球', () => {
      const sphere = new THREE.Sphere(new THREE.Vector3(100, 100, 100), 1);

      const isVisible = culler.testSphere(sphere);

      expect(isVisible).toBe(false);
    });
  });
});
