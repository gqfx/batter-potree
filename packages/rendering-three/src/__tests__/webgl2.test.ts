/**
 * Unit tests for WebGL2 utilities
 */

import { describe, expect, it, vi } from 'vitest';
import {
  assertWebGL2Available,
  checkWebGL2Support,
  getWebGL2Capabilities,
  isWebGL2Available,
} from '../utils/webgl2';

describe('webgl2 utilities', () => {
  describe('isWebGL2Available', () => {
    it('should return boolean for WebGL2 availability', () => {
      const result = isWebGL2Available();
      expect(typeof result).toBe('boolean');
    });

    it('should handle canvas creation errors', () => {
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation(() => {
        throw new Error('Canvas creation failed');
      });

      const result = isWebGL2Available();
      expect(result).toBe(false);

      document.createElement = originalCreateElement;
    });

    it('should return false when getContext returns null', () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);
      vi.spyOn(document, 'createElement').mockReturnValue(canvas);

      const result = isWebGL2Available();
      expect(result).toBe(false);

      vi.restoreAllMocks();
    });
  });

  describe('checkWebGL2Support', () => {
    it('should return available status when WebGL2 is supported', () => {
      const canvas = document.createElement('canvas');
      const result = checkWebGL2Support(canvas);

      // Result should have correct structure
      expect(result).toHaveProperty('available');
      expect(typeof result.available).toBe('boolean');

      if (result.available) {
        expect(result.context).toBeDefined();
        expect(result.error).toBeUndefined();
      } else {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should create canvas if not provided', () => {
      const result = checkWebGL2Support();

      expect(result).toHaveProperty('available');
      expect(typeof result.available).toBe('boolean');
    });

    it('should return error when getContext returns null', () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);

      const result = checkWebGL2Support(canvas);

      expect(result.available).toBe(false);
      expect(result.error).toContain('WebGL2 is not supported');
      expect(result.context).toBeUndefined();

      vi.restoreAllMocks();
    });

    it('should check for required extensions', () => {
      const canvas = document.createElement('canvas');
      const mockContext = {
        getExtension: vi.fn((ext: string) => {
          if (ext === 'EXT_color_buffer_float') {
            return null; // Simulate missing extension
          }
          return {};
        }),
      } as unknown as WebGL2RenderingContext;

      vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext);

      const result = checkWebGL2Support(canvas);

      expect(result.available).toBe(false);
      expect(result.error).toContain('Required WebGL2 extensions not available');
      expect(result.error).toContain('EXT_color_buffer_float');

      vi.restoreAllMocks();
    });

    it('should handle initialization errors', () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockImplementation(() => {
        throw new Error('WebGL2 initialization error');
      });

      const result = checkWebGL2Support(canvas);

      expect(result.available).toBe(false);
      expect(result.error).toContain('WebGL2 initialization failed');
      expect(result.error).toContain('WebGL2 initialization error');

      vi.restoreAllMocks();
    });

    it('should handle non-Error exceptions', () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockImplementation(() => {
        throw 'String error';
      });

      const result = checkWebGL2Support(canvas);

      expect(result.available).toBe(false);
      expect(result.error).toContain('WebGL2 initialization failed');

      vi.restoreAllMocks();
    });
  });

  describe('assertWebGL2Available', () => {
    it('should not throw when WebGL2 is available', () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2');

      if (context) {
        // Mock successful check
        vi.spyOn(canvas, 'getContext').mockReturnValue(context);

        expect(() => assertWebGL2Available()).not.toThrow();

        vi.restoreAllMocks();
      }
    });

    it('should throw error when WebGL2 is not available', () => {
      const canvas = document.createElement('canvas');
      vi.spyOn(canvas, 'getContext').mockReturnValue(null);
      vi.spyOn(document, 'createElement').mockReturnValue(canvas);

      expect(() => assertWebGL2Available()).toThrow('WebGL2 is not supported');

      vi.restoreAllMocks();
    });

    it('should throw custom error message when provided', () => {
      const canvas = document.createElement('canvas');
      const mockContext = {
        getExtension: vi.fn(() => null),
      } as unknown as WebGL2RenderingContext;

      vi.spyOn(canvas, 'getContext').mockReturnValue(mockContext);
      vi.spyOn(document, 'createElement').mockReturnValue(canvas);

      expect(() => assertWebGL2Available()).toThrow(/Required WebGL2 extensions/);

      vi.restoreAllMocks();
    });
  });

  describe('getWebGL2Capabilities', () => {
    it('should return capabilities object with all properties', () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2');

      if (context) {
        const capabilities = getWebGL2Capabilities(context);

        // Check that all expected properties exist
        expect(capabilities).toHaveProperty('maxTextureSize');
        expect(capabilities).toHaveProperty('max3DTextureSize');
        expect(capabilities).toHaveProperty('maxArrayTextureLayers');
        expect(capabilities).toHaveProperty('maxVertexAttributes');
        expect(capabilities).toHaveProperty('maxVertexUniformVectors');
        expect(capabilities).toHaveProperty('maxFragmentUniformVectors');
        expect(capabilities).toHaveProperty('maxVaryingVectors');
        expect(capabilities).toHaveProperty('maxVertexTextureImageUnits');
        expect(capabilities).toHaveProperty('maxCombinedTextureImageUnits');
        expect(capabilities).toHaveProperty('maxFragmentTextureImageUnits');
        expect(capabilities).toHaveProperty('maxRenderBufferSize');
        expect(capabilities).toHaveProperty('maxViewportDims');
        expect(capabilities).toHaveProperty('maxUniformBufferBindings');
        expect(capabilities).toHaveProperty('maxUniformBlockSize');
        expect(capabilities).toHaveProperty('vendor');
        expect(capabilities).toHaveProperty('renderer');
        expect(capabilities).toHaveProperty('version');
        expect(capabilities).toHaveProperty('shadingLanguageVersion');

        // Check types of numeric values
        expect(typeof capabilities.maxTextureSize).toBe('number');
        expect(typeof capabilities.max3DTextureSize).toBe('number');
        expect(typeof capabilities.maxVertexAttributes).toBe('number');

        // Check string values
        expect(typeof capabilities.vendor).toBe('string');
        expect(typeof capabilities.renderer).toBe('string');
        expect(typeof capabilities.version).toBe('string');
      }
    });

    it('should return reasonable values for capabilities', () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2');

      if (context) {
        const capabilities = getWebGL2Capabilities(context);

        // These should be positive numbers
        expect(capabilities.maxTextureSize).toBeGreaterThan(0);
        expect(capabilities.maxVertexAttributes).toBeGreaterThan(0);
        expect(capabilities.maxFragmentUniformVectors).toBeGreaterThan(0);

        // Viewport dimensions should be an array-like object (Int32Array in WebGL2)
        expect(capabilities.maxViewportDims).toBeDefined();
        expect(capabilities.maxViewportDims).toHaveProperty('length', 2);
      }
    });
  });
});
