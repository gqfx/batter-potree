/**
 * Unit tests for PointCloudMaterial
 */

import { PointCloudColorMode, PointShape, PointSizeType } from '@better-potree/core';
import * as THREE from 'three';
import { describe, expect, it, } from 'vitest';
import { PointCloudMaterial } from '../materials/PointCloudMaterial';

describe('PointCloudMaterial', () => {
  describe('Constructor', () => {
    it('should create material with default configuration', () => {
      const material = new PointCloudMaterial();

      expect(material).toBeInstanceOf(THREE.ShaderMaterial);
      expect(material.size).toBe(1.0);
      expect(material.minSize).toBe(1.0);
      expect(material.maxSize).toBe(50.0);
      expect(material.colorMode).toBe(PointCloudColorMode.RGB);
      expect(material.sizeType).toBe(PointSizeType.FIXED);
      expect(material.shape).toBe(PointShape.SQUARE);
    });

    it('should create material with custom size', () => {
      const material = new PointCloudMaterial({ size: 5.0 });

      expect(material.size).toBe(5.0);
      expect(material.uniforms?.size?.value).toBe(5.0);
    });

    it('should create material with custom min/max size', () => {
      const material = new PointCloudMaterial({
        minSize: 2.0,
        maxSize: 100.0,
      });

      expect(material.minSize).toBe(2.0);
      expect(material.maxSize).toBe(100.0);
      expect(material.uniforms?.minSize?.value).toBe(2.0);
      expect(material.uniforms?.maxSize?.value).toBe(100.0);
    });

    it('should create material with custom opacity', () => {
      const material = new PointCloudMaterial({ opacity: 0.5 });

      expect(material.uniforms?.uOpacity?.value).toBe(0.5);
      expect(material.transparent).toBe(true);
    });

    it('should not be transparent when opacity is 1.0', () => {
      const material = new PointCloudMaterial({ opacity: 1.0 });

      expect(material.transparent).toBe(false);
    });

    it('should set elevation range', () => {
      const material = new PointCloudMaterial({
        elevationRange: [100, 500],
      });

      expect(material.uniforms?.elevationRange?.value?.x).toBe(100);
      expect(material.uniforms?.elevationRange?.value?.y).toBe(500);
    });

    it('should set intensity range', () => {
      const material = new PointCloudMaterial({
        intensityRange: [0.2, 0.8],
      });

      expect(material.uniforms?.intensityRange?.value?.x).toBe(0.2);
      expect(material.uniforms?.intensityRange?.value?.y).toBe(0.8);
    });

    it('should create gradient texture if not provided', () => {
      const material = new PointCloudMaterial();

      expect(material.uniforms?.gradient?.value).toBeInstanceOf(THREE.Texture);
    });

    it('should create classification LUT texture if not provided', () => {
      const material = new PointCloudMaterial();

      expect(material.uniforms?.classificationLUT?.value).toBeInstanceOf(THREE.Texture);
    });

    it('should use custom gradient texture if provided', () => {
      const customGradient = new THREE.Texture();
      const material = new PointCloudMaterial({ gradient: customGradient });

      expect(material.uniforms?.gradient?.value).toBe(customGradient);
    });

    it('should use custom classification LUT if provided', () => {
      const customLUT = new THREE.Texture();
      const material = new PointCloudMaterial({ classificationLUT: customLUT });

      expect(material.uniforms?.classificationLUT?.value).toBe(customLUT);
    });
  });

  describe('Color Mode Defines', () => {
    it('should set RGB color mode define by default', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.COLOR_TYPE_RGB).toBe(true);
    });

    it('should set INTENSITY color mode define', () => {
      const material = new PointCloudMaterial({
        colorMode: PointCloudColorMode.INTENSITY,
      });

      expect(material.defines?.COLOR_TYPE_INTENSITY).toBe(true);
      expect(material.defines?.COLOR_TYPE_RGB).toBeUndefined();
    });

    it('should set CLASSIFICATION color mode define', () => {
      const material = new PointCloudMaterial({
        colorMode: PointCloudColorMode.CLASSIFICATION,
      });

      expect(material.defines?.COLOR_TYPE_CLASSIFICATION).toBe(true);
    });

    it('should set ELEVATION color mode define', () => {
      const material = new PointCloudMaterial({
        colorMode: PointCloudColorMode.ELEVATION,
      });

      expect(material.defines?.COLOR_TYPE_ELEVATION).toBe(true);
    });

    it('should set RETURN_NUMBER color mode define', () => {
      const material = new PointCloudMaterial({
        colorMode: PointCloudColorMode.RETURN_NUMBER,
      });

      expect(material.defines?.COLOR_TYPE_RETURN_NUMBER).toBe(true);
    });

    it('should set NORMAL color mode define', () => {
      const material = new PointCloudMaterial({
        colorMode: PointCloudColorMode.NORMAL,
      });

      expect(material.defines?.COLOR_TYPE_NORMAL).toBe(true);
    });

    it('should set LEVEL_OF_DETAIL color mode define', () => {
      const material = new PointCloudMaterial({
        colorMode: PointCloudColorMode.LEVEL_OF_DETAIL,
      });

      expect(material.defines?.COLOR_TYPE_LEVEL_OF_DETAIL).toBe(true);
    });
  });

  describe('Size Type Defines', () => {
    it('should set FIXED size type define by default', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.FIXED_POINT_SIZE).toBe(true);
    });

    it('should set ATTENUATED size type define', () => {
      const material = new PointCloudMaterial({
        sizeType: PointSizeType.ATTENUATED,
      });

      expect(material.defines?.ATTENUATED_POINT_SIZE).toBe(true);
      expect(material.defines?.FIXED_POINT_SIZE).toBeUndefined();
    });

    it('should set ADAPTIVE size type define', () => {
      const material = new PointCloudMaterial({
        sizeType: PointSizeType.ADAPTIVE,
      });

      expect(material.defines?.ADAPTIVE_POINT_SIZE).toBe(true);
    });
  });

  describe('Shape Defines', () => {
    it('should not set shape define for SQUARE by default', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.CIRCLE_POINT_SHAPE).toBeUndefined();
      expect(material.defines?.PARABOLOID_POINT_SHAPE).toBeUndefined();
    });

    it('should set CIRCLE shape define', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.CIRCLE,
      });

      expect(material.defines?.CIRCLE_POINT_SHAPE).toBe(true);
    });

    it('should set PARABOLOID shape define', () => {
      const material = new PointCloudMaterial({
        shape: PointShape.PARABOLOID,
      });

      expect(material.defines?.PARABOLOID_POINT_SHAPE).toBe(true);
    });
  });

  describe('EDL Configuration', () => {
    it('should not set EDL define by default', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.USE_EDL).toBeUndefined();
    });

    it('should set EDL define when enabled', () => {
      const material = new PointCloudMaterial({ useEDL: true });

      expect(material.defines?.USE_EDL).toBe(true);
    });
  });

  describe('Size Getters and Setters', () => {
    it('should update size property and uniform', () => {
      const material = new PointCloudMaterial();

      material.size = 10.0;

      expect(material.size).toBe(10.0);
      expect(material.uniforms?.size?.value).toBe(10.0);
    });

    it('should update minSize property and uniform', () => {
      const material = new PointCloudMaterial();

      material.minSize = 3.0;

      expect(material.minSize).toBe(3.0);
      expect(material.uniforms?.minSize?.value).toBe(3.0);
    });

    it('should update maxSize property and uniform', () => {
      const material = new PointCloudMaterial();

      material.maxSize = 200.0;

      expect(material.maxSize).toBe(200.0);
      expect(material.uniforms?.maxSize?.value).toBe(200.0);
    });

    it('should handle setting size when uniforms is undefined', () => {
      const material = new PointCloudMaterial();
      const uniforms = material.uniforms;
      (material as any).uniforms = undefined;

      material.size = 5.0;

      expect(material.size).toBe(5.0);

      // Restore uniforms
      (material as any).uniforms = uniforms;
    });
  });

  describe('Color Mode Setter', () => {
    it('should update color mode and defines', () => {
      const material = new PointCloudMaterial();

      material.colorMode = PointCloudColorMode.INTENSITY;

      expect(material.colorMode).toBe(PointCloudColorMode.INTENSITY);
      expect(material.defines?.COLOR_TYPE_INTENSITY).toBe(true);
      expect(material.defines?.COLOR_TYPE_RGB).toBeUndefined();
    });

    it('should update defines when color mode changes', () => {
      const material = new PointCloudMaterial();

      material.colorMode = PointCloudColorMode.ELEVATION;

      expect(material.colorMode).toBe(PointCloudColorMode.ELEVATION);
      expect(material.defines?.COLOR_TYPE_ELEVATION).toBe(true);
      expect(material.defines?.COLOR_TYPE_RGB).toBeUndefined();
    });

    it('should not change defines if color mode is the same', () => {
      const material = new PointCloudMaterial({
        colorMode: PointCloudColorMode.RGB,
      });

      material.colorMode = PointCloudColorMode.RGB;

      expect(material.colorMode).toBe(PointCloudColorMode.RGB);
      expect(material.defines?.COLOR_TYPE_RGB).toBe(true);
    });
  });

  describe('Size Type Setter', () => {
    it('should update size type and defines', () => {
      const material = new PointCloudMaterial();

      material.sizeType = PointSizeType.ATTENUATED;

      expect(material.sizeType).toBe(PointSizeType.ATTENUATED);
      expect(material.defines?.ATTENUATED_POINT_SIZE).toBe(true);
      expect(material.defines?.FIXED_POINT_SIZE).toBeUndefined();
    });

    it('should update defines when size type changes', () => {
      const material = new PointCloudMaterial();

      material.sizeType = PointSizeType.ADAPTIVE;

      expect(material.sizeType).toBe(PointSizeType.ADAPTIVE);
      expect(material.defines?.ADAPTIVE_POINT_SIZE).toBe(true);
      expect(material.defines?.FIXED_POINT_SIZE).toBeUndefined();
    });

    it('should not change defines if size type is the same', () => {
      const material = new PointCloudMaterial();

      material.sizeType = PointSizeType.FIXED;

      expect(material.sizeType).toBe(PointSizeType.FIXED);
      expect(material.defines?.FIXED_POINT_SIZE).toBe(true);
    });
  });

  describe('Shape Setter', () => {
    it('should update shape and defines', () => {
      const material = new PointCloudMaterial();

      material.shape = PointShape.CIRCLE;

      expect(material.shape).toBe(PointShape.CIRCLE);
      expect(material.defines?.CIRCLE_POINT_SHAPE).toBe(true);
    });

    it('should update defines when shape changes', () => {
      const material = new PointCloudMaterial();

      material.shape = PointShape.PARABOLOID;

      expect(material.shape).toBe(PointShape.PARABOLOID);
      expect(material.defines?.PARABOLOID_POINT_SHAPE).toBe(true);
    });

    it('should not change defines if shape is the same', () => {
      const material = new PointCloudMaterial({ shape: PointShape.CIRCLE });

      material.shape = PointShape.CIRCLE;

      expect(material.shape).toBe(PointShape.CIRCLE);
      expect(material.defines?.CIRCLE_POINT_SHAPE).toBe(true);
    });
  });

  describe('updateScreenSize', () => {
    it('should update screen size uniforms', () => {
      const material = new PointCloudMaterial();

      material.updateScreenSize(1920, 1080);

      expect(material.uniforms?.uScreenWidth?.value).toBe(1920);
      expect(material.uniforms?.uScreenHeight?.value).toBe(1080);
    });

    it('should handle missing uniforms gracefully', () => {
      const material = new PointCloudMaterial();
      const uniforms = material.uniforms;
      (material as any).uniforms = undefined;

      expect(() => material.updateScreenSize(800, 600)).not.toThrow();

      (material as any).uniforms = uniforms;
    });
  });

  describe('updateCamera', () => {
    it('should update perspective camera uniforms', () => {
      const material = new PointCloudMaterial();
      const camera = new THREE.PerspectiveCamera(75, 1.5, 0.1, 1000);

      material.updateCamera(camera);

      expect(material.uniforms?.uUseOrthographicCamera?.value).toBe(false);
      expect(material.uniforms?.fov?.value).toBeCloseTo((75 * Math.PI) / 180);
      expect(material.uniforms?.near?.value).toBe(0.1);
      expect(material.uniforms?.far?.value).toBe(1000);
    });

    it('should update orthographic camera uniforms', () => {
      const material = new PointCloudMaterial();
      const camera = new THREE.OrthographicCamera(-10, 10, 5, -5, 0.1, 100);

      material.updateCamera(camera);

      expect(material.uniforms?.uUseOrthographicCamera?.value).toBe(true);
      expect(material.uniforms?.uOrthoWidth?.value).toBe(20);
      expect(material.uniforms?.uOrthoHeight?.value).toBe(10);
      expect(material.uniforms?.near?.value).toBe(0.1);
      expect(material.uniforms?.far?.value).toBe(100);
    });

    it('should handle camera update when uniforms is undefined', () => {
      const material = new PointCloudMaterial();
      const uniforms = material.uniforms;
      (material as any).uniforms = undefined;

      const camera = new THREE.PerspectiveCamera();
      expect(() => material.updateCamera(camera)).not.toThrow();

      (material as any).uniforms = uniforms;
    });
  });

  describe('updateOctreeSpacing', () => {
    it('should update octree spacing uniform', () => {
      const material = new PointCloudMaterial();

      material.updateOctreeSpacing(2.5);

      expect(material.uniforms?.uOctreeSpacing?.value).toBe(2.5);
    });

    it('should handle missing uniforms gracefully', () => {
      const material = new PointCloudMaterial();
      const uniforms = material.uniforms;
      (material as any).uniforms = undefined;

      expect(() => material.updateOctreeSpacing(1.5)).not.toThrow();

      (material as any).uniforms = uniforms;
    });
  });

  describe('Shader Properties', () => {
    it('should have shader code', () => {
      const material = new PointCloudMaterial();

      expect(material.vertexShader).toBeDefined();
      expect(material.fragmentShader).toBeDefined();
      expect(typeof material.vertexShader).toBe('string');
      expect(typeof material.fragmentShader).toBe('string');
      expect(material.vertexShader.length).toBeGreaterThan(0);
      expect(material.fragmentShader.length).toBeGreaterThan(0);
    });

    it('should have depth test and write enabled', () => {
      const material = new PointCloudMaterial();

      expect(material.depthTest).toBe(true);
      expect(material.depthWrite).toBe(true);
    });

    it('should have all required uniforms', () => {
      const material = new PointCloudMaterial();

      expect(material.uniforms).toBeDefined();
      expect(material.uniforms?.uScreenWidth).toBeDefined();
      expect(material.uniforms?.uScreenHeight).toBeDefined();
      expect(material.uniforms?.fov).toBeDefined();
      expect(material.uniforms?.near).toBeDefined();
      expect(material.uniforms?.far).toBeDefined();
      expect(material.uniforms?.size).toBeDefined();
      expect(material.uniforms?.minSize).toBeDefined();
      expect(material.uniforms?.maxSize).toBeDefined();
      expect(material.uniforms?.uColor).toBeDefined();
      expect(material.uniforms?.uOpacity).toBeDefined();
      expect(material.uniforms?.gradient).toBeDefined();
      expect(material.uniforms?.classificationLUT).toBeDefined();
    });
  });

  describe('Shadow Mapping', () => {
    it('should create material without shadow maps by default', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.num_shadowmaps).toBeUndefined();
      expect(material.uniforms?.uShadowMap).toBeUndefined();
    });

    it('should create material with shadow maps', () => {
      const shadowMap = new THREE.Texture();
      const shadowWorldView = new THREE.Matrix4();
      const shadowProj = new THREE.Matrix4();

      const material = new PointCloudMaterial({
        shadowMaps: [shadowMap],
        shadowWorldView: [shadowWorldView],
        shadowProj: [shadowProj],
      });

      expect(material.defines?.num_shadowmaps).toBe(1);
      expect(material.uniforms?.uShadowMap).toBeDefined();
      expect(material.uniforms?.uShadowWorldView).toBeDefined();
      expect(material.uniforms?.uShadowProj).toBeDefined();
    });

    it('should update shadow maps dynamically', () => {
      const material = new PointCloudMaterial();

      const shadowMap = new THREE.Texture();
      const shadowWorldView = new THREE.Matrix4();
      const shadowProj = new THREE.Matrix4();

      material.setShadowMaps([shadowMap], [shadowWorldView], [shadowProj]);

      expect(material.defines?.num_shadowmaps).toBe(1);
      expect(material.uniforms?.uShadowMap?.value).toEqual([shadowMap]);
    });

    it('should support multiple shadow maps', () => {
      const shadowMap1 = new THREE.Texture();
      const shadowMap2 = new THREE.Texture();
      const shadowWorldView1 = new THREE.Matrix4();
      const shadowWorldView2 = new THREE.Matrix4();
      const shadowProj1 = new THREE.Matrix4();
      const shadowProj2 = new THREE.Matrix4();

      const material = new PointCloudMaterial({
        shadowMaps: [shadowMap1, shadowMap2],
        shadowWorldView: [shadowWorldView1, shadowWorldView2],
        shadowProj: [shadowProj1, shadowProj2],
      });

      expect(material.defines?.num_shadowmaps).toBe(2);
      expect(material.uniforms?.uShadowMap?.value).toHaveLength(2);
    });

    it('should clear shadow maps when set to empty array', () => {
      const shadowMap = new THREE.Texture();
      const shadowWorldView = new THREE.Matrix4();
      const shadowProj = new THREE.Matrix4();

      const material = new PointCloudMaterial({
        shadowMaps: [shadowMap],
        shadowWorldView: [shadowWorldView],
        shadowProj: [shadowProj],
      });

      material.setShadowMaps([], [], []);

      expect(material.defines?.num_shadowmaps).toBeUndefined();
      expect(material.uniforms?.uShadowMap).toBeUndefined();
    });

    it('should set shadow color', () => {
      const material = new PointCloudMaterial();

      const color = new THREE.Color(0.5, 0.5, 0.5);
      material.setShadowColor(color);

      expect(material.uniforms?.uShadowColor).toBeDefined();
      expect(material.uniforms?.uShadowColor?.value.x).toBe(0.5);
      expect(material.uniforms?.uShadowColor?.value.y).toBe(0.5);
      expect(material.uniforms?.uShadowColor?.value.z).toBe(0.5);
    });

    it('should create material with custom shadow color', () => {
      const shadowColor = new THREE.Color(0.3, 0.3, 0.3);
      const material = new PointCloudMaterial({
        shadowColor,
        shadowMaps: [new THREE.Texture()],
        shadowWorldView: [new THREE.Matrix4()],
        shadowProj: [new THREE.Matrix4()],
      });

      expect(material.uniforms?.uShadowColor).toBeDefined();
      expect(material.uniforms?.uShadowColor?.value.x).toBe(0.3);
      expect(material.uniforms?.uShadowColor?.value.y).toBe(0.3);
      expect(material.uniforms?.uShadowColor?.value.z).toBe(0.3);
    });

    it('should trigger shader recompile when shadow map count changes', () => {
      const material = new PointCloudMaterial();

      const shadowMap = new THREE.Texture();
      const shadowWorldView = new THREE.Matrix4();
      const shadowProj = new THREE.Matrix4();

      // First set: count changes from 0 to 1, defines should be updated
      material.setShadowMaps([shadowMap], [shadowWorldView], [shadowProj]);
      expect(material.defines?.num_shadowmaps).toBe(1);

      // Second set: count stays 1, defines should still be 1
      material.setShadowMaps([shadowMap], [shadowWorldView], [shadowProj]);
      expect(material.defines?.num_shadowmaps).toBe(1);

      // Third set: count changes to 2, defines should be updated
      material.setShadowMaps(
        [shadowMap, shadowMap],
        [shadowWorldView, shadowWorldView],
        [shadowProj, shadowProj],
      );
      expect(material.defines?.num_shadowmaps).toBe(2);
    });
  });
});
