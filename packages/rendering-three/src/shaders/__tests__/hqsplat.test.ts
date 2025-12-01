/**
 * Tests for HQ Splat shader functionality
 *
 * @module @better-potree/rendering-three/shaders/__tests__/hqsplat.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PointCloudMaterial } from '../../materials/PointCloudMaterial.js';
import { PointShape, PointSizeType, PointCloudColorMode } from '@better-potree/core';
import * as THREE from 'three';

describe('HQ Splat Shader Integration', () => {
  describe('PointShape.PARABOLOID Material Creation', () => {
    it('should create material with PARABOLOID shape', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        size: 2.0,
        colorMode: PointCloudColorMode.RGB,
      });

      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(material.shape).toBe(PointShape.PARABOLOID);
      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);
    });

    it('should not have CIRCLE_POINT_SHAPE define when using PARABOLOID', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      expect(material.defines).not.toHaveProperty('CIRCLE_POINT_SHAPE');
      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);
    });

    it('should compile shader without errors', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        sizeType: PointSizeType.ADAPTIVE,
      });

      // Material should be ready to use
      expect(material.vertexShader).toBeTruthy();
      expect(material.fragmentShader).toBeTruthy();
      expect(material.uniforms).toBeTruthy();
    });
  });

  describe('Shape Switching', () => {
    let material: PointCloudMaterial;

    beforeEach(() => {
      material = new PointCloudMaterial({
        shape: PointShape.SQUARE,
        size: 1.5,
      });
    });

    it('should switch from SQUARE to PARABOLOID', () => {
      expect(material.shape).toBe(PointShape.SQUARE);
      expect(material.defines).not.toHaveProperty('PARABOLOID_POINT_SHAPE');

      material.shape = PointShape.PARABOLOID;

      expect(material.shape).toBe(PointShape.PARABOLOID);
      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);
      // Note: needsUpdate is set internally by Three.js material system
    });

    it('should switch from CIRCLE to PARABOLOID', () => {
      material.shape = PointShape.CIRCLE;
      expect(material.defines).toHaveProperty('CIRCLE_POINT_SHAPE', true);

      material.shape = PointShape.PARABOLOID;

      expect(material.defines).not.toHaveProperty('CIRCLE_POINT_SHAPE');
      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);
    });

    it('should switch from PARABOLOID to CIRCLE', () => {
      material.shape = PointShape.PARABOLOID;
      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);

      material.shape = PointShape.CIRCLE;

      expect(material.defines).not.toHaveProperty('PARABOLOID_POINT_SHAPE');
      expect(material.defines).toHaveProperty('CIRCLE_POINT_SHAPE', true);
    });

    it('should not change defines when setting same shape', () => {
      material.shape = PointShape.PARABOLOID;
      const definesBefore = { ...material.defines };

      material.shape = PointShape.PARABOLOID;

      // Defines should remain unchanged
      expect(material.defines).toEqual(definesBefore);
    });
  });

  describe('Uniforms and Configuration', () => {
    it('should configure uniforms correctly for PARABOLOID', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        size: 3.0,
        minSize: 1.0,
        maxSize: 10.0,
        opacity: 0.9,
      });

      expect(material.uniforms.size).toBeDefined();
      expect(material.uniforms.minSize).toBeDefined();
      expect(material.uniforms.maxSize).toBeDefined();
      expect(material.uniforms.uOpacity).toBeDefined();
      expect(material.uniforms.size!.value).toBe(3.0);
      expect(material.uniforms.minSize!.value).toBe(1.0);
      expect(material.uniforms.maxSize!.value).toBe(10.0);
      expect(material.uniforms.uOpacity!.value).toBe(0.9);
    });

    it('should work with different size types', () => {
      const fixedMaterial = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        sizeType: PointSizeType.FIXED,
      });
      expect(fixedMaterial.defines).toHaveProperty('FIXED_POINT_SIZE', true);

      const attenuatedMaterial = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        sizeType: PointSizeType.ATTENUATED,
      });
      expect(attenuatedMaterial.defines).toHaveProperty('ATTENUATED_POINT_SIZE', true);

      const adaptiveMaterial = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        sizeType: PointSizeType.ADAPTIVE,
      });
      expect(adaptiveMaterial.defines).toHaveProperty('ADAPTIVE_POINT_SIZE', true);
    });

    it('should work with different color modes', () => {
      const rgbMaterial = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        colorMode: PointCloudColorMode.RGB,
      });
      expect(rgbMaterial.defines).toHaveProperty('COLOR_TYPE_RGB', true);

      const elevationMaterial = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        colorMode: PointCloudColorMode.ELEVATION,
      });
      expect(elevationMaterial.defines).toHaveProperty('COLOR_TYPE_ELEVATION', true);

      const intensityMaterial = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        colorMode: PointCloudColorMode.INTENSITY,
      });
      expect(intensityMaterial.defines).toHaveProperty('COLOR_TYPE_INTENSITY', true);
    });
  });

  describe('Camera Updates', () => {
    it('should update camera uniforms for perspective camera', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      const camera = new THREE.PerspectiveCamera(60, 1920 / 1080, 0.1, 1000);
      material.updateCamera(camera);

      expect(material.uniforms.uUseOrthographicCamera).toBeDefined();
      expect(material.uniforms.fov).toBeDefined();
      expect(material.uniforms.near).toBeDefined();
      expect(material.uniforms.far).toBeDefined();
      expect(material.uniforms.uUseOrthographicCamera!.value).toBe(false);
      expect(material.uniforms.fov!.value).toBeCloseTo((60 * Math.PI) / 180, 5);
      expect(material.uniforms.near!.value).toBe(0.1);
      expect(material.uniforms.far!.value).toBe(1000);
    });

    it('should update camera uniforms for orthographic camera', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
      material.updateCamera(camera);

      expect(material.uniforms.uUseOrthographicCamera).toBeDefined();
      expect(material.uniforms.uOrthoWidth).toBeDefined();
      expect(material.uniforms.uOrthoHeight).toBeDefined();
      expect(material.uniforms.uUseOrthographicCamera!.value).toBe(true);
      expect(material.uniforms.uOrthoWidth!.value).toBe(20);
      expect(material.uniforms.uOrthoHeight!.value).toBe(20);
    });
  });

  describe('Screen Size Updates', () => {
    it('should update screen size uniforms', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      material.updateScreenSize(1920, 1080);

      expect(material.uniforms.uScreenWidth).toBeDefined();
      expect(material.uniforms.uScreenHeight).toBeDefined();
      expect(material.uniforms.uScreenWidth!.value).toBe(1920);
      expect(material.uniforms.uScreenHeight!.value).toBe(1080);
    });

    it('should handle different aspect ratios', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      // 16:9
      material.updateScreenSize(1920, 1080);
      expect(material.uniforms.uScreenWidth).toBeDefined();
      expect(material.uniforms.uScreenHeight).toBeDefined();
      expect(material.uniforms.uScreenWidth!.value).toBe(1920);
      expect(material.uniforms.uScreenHeight!.value).toBe(1080);

      // 4:3
      material.updateScreenSize(1024, 768);
      expect(material.uniforms.uScreenWidth!.value).toBe(1024);
      expect(material.uniforms.uScreenHeight!.value).toBe(768);

      // Ultra-wide 21:9
      material.updateScreenSize(2560, 1080);
      expect(material.uniforms.uScreenWidth!.value).toBe(2560);
      expect(material.uniforms.uScreenHeight!.value).toBe(1080);
    });
  });

  describe('Compatibility with EDL', () => {
    it('should work with EDL enabled', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        useEDL: true,
      });

      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);
      expect(material.defines).toHaveProperty('USE_EDL', true);
    });
  });

  describe('Compatibility with Clipping', () => {
    it('should work with clip boxes', () => {
      const clipBox = new THREE.Matrix4();
      clipBox.makeScale(10, 10, 10);

      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        clipBoxes: [clipBox],
      });

      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);
      expect(material.defines).toHaveProperty('num_clipboxes', 1);
    });
  });

  describe('Compatibility with Shadow Mapping', () => {
    it('should work with shadow maps', () => {
      const shadowMap = new THREE.Texture();
      const shadowView = new THREE.Matrix4();
      const shadowProj = new THREE.Matrix4();

      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        shadowMaps: [shadowMap],
        shadowWorldView: [shadowView],
        shadowProj: [shadowProj],
      });

      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);
      expect(material.defines).toHaveProperty('num_shadowmaps', 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero point size gracefully', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        size: 0,
        minSize: 0,
      });

      expect(material.size).toBe(0);
      expect(material.minSize).toBe(0);
    });

    it('should handle very large point sizes', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        size: 1000,
        maxSize: 2000,
      });

      expect(material.size).toBe(1000);
      expect(material.maxSize).toBe(2000);
    });

    it('should handle full transparency', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        opacity: 0,
      });

      expect(material.uniforms.uOpacity).toBeDefined();
      expect(material.uniforms.uOpacity!.value).toBe(0);
      expect(material.transparent).toBe(true);
    });

    it('should handle full opacity', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        opacity: 1,
      });

      expect(material.uniforms.uOpacity).toBeDefined();
      expect(material.uniforms.uOpacity!.value).toBe(1);
      expect(material.transparent).toBe(false);
    });
  });

  describe('Performance Considerations', () => {
    it('should not recreate defines object unnecessarily', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      const originalDefines = material.defines;

      // Update uniform that doesn't require shader recompile
      material.size = 5.0;

      expect(material.defines).toBe(originalDefines);
    });

    it('should only change defines when shape changes', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      const definesBefore = { ...material.defines };

      // Update uniform - should not change defines
      material.size = 3.0;
      expect(material.defines).toEqual(definesBefore);

      // Change shape - should change defines
      material.shape = PointShape.CIRCLE;
      expect(material.defines).not.toEqual(definesBefore);
      expect(material.defines).toHaveProperty('CIRCLE_POINT_SHAPE', true);
      expect(material.defines).not.toHaveProperty('PARABOLOID_POINT_SHAPE');
    });
  });
});

describe('HQ Splat Visual Quality', () => {
  describe('Shader Define Structure', () => {
    it('should have correct define structure for PARABOLOID', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
        colorMode: PointCloudColorMode.RGB,
        sizeType: PointSizeType.ADAPTIVE,
      });

      // Should have PARABOLOID define
      expect(material.defines).toHaveProperty('PARABOLOID_POINT_SHAPE', true);

      // Should have size type define
      expect(material.defines).toHaveProperty('ADAPTIVE_POINT_SIZE', true);

      // Should have color mode define
      expect(material.defines).toHaveProperty('COLOR_TYPE_RGB', true);

      // Should not have conflicting defines
      expect(material.defines).not.toHaveProperty('CIRCLE_POINT_SHAPE');
      expect(material.defines).not.toHaveProperty('FIXED_POINT_SIZE');
      expect(material.defines).not.toHaveProperty('ATTENUATED_POINT_SIZE');
    });

    it('should include fragment shader code for depth correction', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      // Fragment shader should contain depth-related code
      expect(material.fragmentShader).toContain('gl_FragDepth');
      expect(material.fragmentShader).toContain('PARABOLOID_POINT_SHAPE');
    });

    it('should include fragment shader code for lighting', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      // Fragment shader should contain lighting-related code
      expect(material.fragmentShader).toContain('surfaceNormal');
      expect(material.fragmentShader).toContain('lighting');
    });

    it('should include fragment shader code for edge smoothing', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      // Fragment shader should contain edge smoothing code
      expect(material.fragmentShader).toContain('edgeFalloff');
      expect(material.fragmentShader).toContain('smoothstep');
    });
  });
});
