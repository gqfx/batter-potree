/**
 * WebGL2 detection and validation utilities
 * @module @better-potree/rendering-three/utils
 */

/**
 * WebGL2 support check result
 */
export interface WebGL2Support {
  /** Whether WebGL2 is available */
  available: boolean;
  /** Error message if not available */
  error?: string;
  /** WebGL2 context if available */
  context?: WebGL2RenderingContext;
}

/**
 * Checks if WebGL2 is available in the current browser
 * @returns true if WebGL2 is supported
 */
export function isWebGL2Available(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    return context !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Checks WebGL2 support and returns detailed information
 * @param canvas - Optional canvas element to use for testing
 * @returns WebGL2 support information
 */
export function checkWebGL2Support(canvas?: HTMLCanvasElement): WebGL2Support {
  const testCanvas = canvas || document.createElement('canvas');

  try {
    // Try to get WebGL2 context
    const gl = testCanvas.getContext('webgl2');

    if (!gl) {
      return {
        available: false,
        error: 'WebGL2 is not supported in this browser. Please use a modern browser with WebGL2 support.',
      };
    }

    // Check for required extensions and features
    const requiredExtensions = [
      'EXT_color_buffer_float', // For floating point render targets
    ];

    const missingExtensions: string[] = [];
    for (const ext of requiredExtensions) {
      if (!gl.getExtension(ext)) {
        missingExtensions.push(ext);
      }
    }

    if (missingExtensions.length > 0) {
      return {
        available: false,
        error: `Required WebGL2 extensions not available: ${missingExtensions.join(', ')}`,
      };
    }

    return {
      available: true,
      context: gl,
    };
  } catch (e) {
    return {
      available: false,
      error: `WebGL2 initialization failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Asserts that WebGL2 is available, throws error if not
 * @throws Error if WebGL2 is not available
 */
export function assertWebGL2Available(): void {
  const support = checkWebGL2Support();
  if (!support.available) {
    throw new Error(support.error || 'WebGL2 is not available');
  }
}

/**
 * Gets WebGL2 capabilities and limits
 * @param gl - WebGL2 rendering context
 * @returns Object containing capability information
 */
export function getWebGL2Capabilities(gl: WebGL2RenderingContext) {
  return {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    max3DTextureSize: gl.getParameter(gl.MAX_3D_TEXTURE_SIZE),
    maxArrayTextureLayers: gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS),
    maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
    maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
    maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
    maxFragmentTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
    maxUniformBufferBindings: gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS),
    maxUniformBlockSize: gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE),
    vendor: gl.getParameter(gl.VENDOR),
    renderer: gl.getParameter(gl.RENDERER),
    version: gl.getParameter(gl.VERSION),
    shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
  };
}
