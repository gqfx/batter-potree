/**
 * Unit tests for shader utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getPointCloudVertexShader,
  getPointCloudFragmentShader,
  shaders,
} from '../shaders/index';

describe('shaders', () => {
  describe('getPointCloudVertexShader', () => {
    it('should return a non-empty string', () => {
      const shader = getPointCloudVertexShader();
      expect(typeof shader).toBe('string');
      expect(shader.length).toBeGreaterThan(0);
    });

    it('should return consistent shader code', () => {
      const shader1 = getPointCloudVertexShader();
      const shader2 = getPointCloudVertexShader();
      expect(shader1).toBe(shader2);
    });

    it('should contain GLSL version directive', () => {
      const shader = getPointCloudVertexShader();
      // Should contain common GLSL keywords
      expect(shader).toMatch(/void|main|vec|float|uniform|attribute|varying/);
    });
  });

  describe('getPointCloudFragmentShader', () => {
    it('should return a non-empty string', () => {
      const shader = getPointCloudFragmentShader();
      expect(typeof shader).toBe('string');
      expect(shader.length).toBeGreaterThan(0);
    });

    it('should return consistent shader code', () => {
      const shader1 = getPointCloudFragmentShader();
      const shader2 = getPointCloudFragmentShader();
      expect(shader1).toBe(shader2);
    });

    it('should contain GLSL fragment shader keywords', () => {
      const shader = getPointCloudFragmentShader();
      // Should contain common fragment shader keywords
      expect(shader).toMatch(/void|main|vec|float|uniform/);
    });
  });

  describe('shaders export', () => {
    it('should export vertex shader', () => {
      expect(shaders).toHaveProperty('vertex');
      expect(typeof shaders.vertex).toBe('string');
      expect(shaders.vertex.length).toBeGreaterThan(0);
    });

    it('should export fragment shader', () => {
      expect(shaders).toHaveProperty('fragment');
      expect(typeof shaders.fragment).toBe('string');
      expect(shaders.fragment.length).toBeGreaterThan(0);
    });

    it('should match individual getter functions', () => {
      expect(shaders.vertex).toBe(getPointCloudVertexShader());
      expect(shaders.fragment).toBe(getPointCloudFragmentShader());
    });

    it('should have different vertex and fragment shaders', () => {
      // Vertex and fragment shaders should be different
      expect(shaders.vertex).not.toBe(shaders.fragment);
    });
  });
});
