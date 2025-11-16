/**
 * Test setup and mocks for rendering-three package
 */

import { vi } from 'vitest';

// Mock WebGL2RenderingContext
class MockWebGL2RenderingContext {
  // Constants
  MAX_TEXTURE_SIZE = 16384;
  MAX_3D_TEXTURE_SIZE = 2048;
  MAX_ARRAY_TEXTURE_LAYERS = 2048;
  MAX_VERTEX_ATTRIBS = 16;
  MAX_VERTEX_UNIFORM_VECTORS = 4096;
  MAX_FRAGMENT_UNIFORM_VECTORS = 4096;
  MAX_VARYING_VECTORS = 31;
  MAX_VERTEX_TEXTURE_IMAGE_UNITS = 32;
  MAX_COMBINED_TEXTURE_IMAGE_UNITS = 96;
  MAX_TEXTURE_IMAGE_UNITS = 32;
  MAX_RENDERBUFFER_SIZE = 16384;
  MAX_VIEWPORT_DIMS = 3386;
  MAX_UNIFORM_BUFFER_BINDINGS = 84;
  MAX_UNIFORM_BLOCK_SIZE = 65536;
  VENDOR = 7936;
  RENDERER = 7937;
  VERSION = 7938;
  SHADING_LANGUAGE_VERSION = 35724;

  // Shader constants
  VERTEX_SHADER = 35633;
  FRAGMENT_SHADER = 35632;
  HIGH_FLOAT = 36338;
  MEDIUM_FLOAT = 36337;
  LOW_FLOAT = 36336;
  HIGH_INT = 36341;
  MEDIUM_INT = 36340;
  LOW_INT = 36339;

  // Additional constants
  SCISSOR_BOX = 3088;
  VIEWPORT = 2978;
  TEXTURE_3D = 32879;
  TEXTURE_2D_ARRAY = 35866;
  RGBA = 6408;
  UNSIGNED_BYTE = 5121;

  getParameter(param: number): any {
    const paramMap: Record<number, any> = {
      [this.MAX_TEXTURE_SIZE]: 16384,
      [this.MAX_3D_TEXTURE_SIZE]: 2048,
      [this.MAX_ARRAY_TEXTURE_LAYERS]: 2048,
      [this.MAX_VERTEX_ATTRIBS]: 16,
      [this.MAX_VERTEX_UNIFORM_VECTORS]: 4096,
      [this.MAX_FRAGMENT_UNIFORM_VECTORS]: 4096,
      [this.MAX_VARYING_VECTORS]: 31,
      [this.MAX_VERTEX_TEXTURE_IMAGE_UNITS]: 32,
      [this.MAX_COMBINED_TEXTURE_IMAGE_UNITS]: 96,
      [this.MAX_TEXTURE_IMAGE_UNITS]: 32,
      [this.MAX_RENDERBUFFER_SIZE]: 16384,
      [this.MAX_VIEWPORT_DIMS]: new Int32Array([32767, 32767]),
      [this.MAX_UNIFORM_BUFFER_BINDINGS]: 84,
      [this.MAX_UNIFORM_BLOCK_SIZE]: 65536,
      [this.VENDOR]: 'Mock WebGL Vendor',
      [this.RENDERER]: 'Mock WebGL Renderer',
      [this.VERSION]: 'WebGL 2.0',
      [this.SHADING_LANGUAGE_VERSION]: 'WebGL GLSL ES 3.00',
      [this.SCISSOR_BOX]: new Int32Array([0, 0, 300, 150]),
      [this.VIEWPORT]: new Int32Array([0, 0, 300, 150]),
    };
    return paramMap[param];
  }

  getExtension(name: string): any {
    // Mock available extensions
    if (name === 'EXT_color_buffer_float') {
      return {};
    }
    return {};
  }

  getContextAttributes(): any {
    return {
      alpha: false,
      antialias: true,
      depth: true,
      desynchronized: false,
      failIfMajorPerformanceCaveat: false,
      powerPreference: 'default',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: true,
    };
  }

  getShaderPrecisionFormat(_shaderType: number, _precisionType: number): any {
    return {
      precision: 23,
      rangeMin: 127,
      rangeMax: 127,
    };
  }

  clear = vi.fn();
  clearColor = vi.fn();
  clearDepth = vi.fn();
  clearStencil = vi.fn();
  frontFace = vi.fn();
  cullFace = vi.fn();
  blendEquation = vi.fn();
  blendFunc = vi.fn();
  colorMask = vi.fn();
  stencilMask = vi.fn();
  stencilFunc = vi.fn();
  stencilOp = vi.fn();
  enable = vi.fn();
  disable = vi.fn();
  depthFunc = vi.fn();
  depthMask = vi.fn();
  viewport = vi.fn();
  createTexture = vi.fn(() => ({}));
  bindTexture = vi.fn();
  texParameteri = vi.fn();
  texImage2D = vi.fn();
  texImage3D = vi.fn();
  deleteTexture = vi.fn();
  createProgram = vi.fn(() => ({}));
  createShader = vi.fn(() => ({}));
  shaderSource = vi.fn();
  compileShader = vi.fn();
  attachShader = vi.fn();
  linkProgram = vi.fn();
  useProgram = vi.fn();
  deleteProgram = vi.fn();
  deleteShader = vi.fn();
  getShaderParameter = vi.fn(() => true);
  getProgramParameter = vi.fn(() => true);
  getAttribLocation = vi.fn(() => 0);
  getUniformLocation = vi.fn(() => ({}));
  createBuffer = vi.fn(() => ({}));
  bindBuffer = vi.fn();
  bufferData = vi.fn();
  deleteBuffer = vi.fn();
  enableVertexAttribArray = vi.fn();
  vertexAttribPointer = vi.fn();
  drawArrays = vi.fn();
  drawElements = vi.fn();
  createFramebuffer = vi.fn(() => ({}));
  bindFramebuffer = vi.fn();
  deleteFramebuffer = vi.fn();
  createRenderbuffer = vi.fn(() => ({}));
  bindRenderbuffer = vi.fn();
  deleteRenderbuffer = vi.fn();
  pixelStorei = vi.fn();
  readPixels = vi.fn();
  scissor = vi.fn();
  getError = vi.fn(() => 0);
}

// Mock HTMLCanvasElement.getContext to return our mock WebGL2 context
const originalGetContext = HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.getContext = function (contextId: string, options?: any): any {
  if (contextId === 'webgl2') {
    return new MockWebGL2RenderingContext();
  }
  if (contextId === '2d') {
    // For texture creation, return a minimal 2d context
    return {
      canvas: this,
      fillStyle: '',
      fillRect: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillText: vi.fn(),
      createImageData: vi.fn((width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
      })),
      putImageData: vi.fn(),
      font: '',
      textAlign: '',
      textBaseline: '',
    };
  }
  // Fallback to original implementation for other contexts
  return originalGetContext.call(this, contextId, options);
};

// Ensure window.devicePixelRatio is available
if (typeof window !== 'undefined' && !window.devicePixelRatio) {
  Object.defineProperty(window, 'devicePixelRatio', {
    value: 1,
    writable: true,
  });
}

export { MockWebGL2RenderingContext };
