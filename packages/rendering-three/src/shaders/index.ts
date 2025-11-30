/**
 * Shader utilities and loader
 * @module @better-potree/rendering-three/shaders
 */

import fragmentShader from './pointcloud.frag.glsl?raw';
import vertexShader from './pointcloud.vert.glsl?raw';
import edlFragmentShader from './edl.frag.glsl?raw';
import edlVertexShader from './edl.vert.glsl?raw';
import hqSplatShader from './hqsplat.glsl?raw';
import pickVertexShader from './pick.vert.glsl?raw';
import pickFragmentShader from './pick.frag.glsl?raw';

/**
 * Get the point cloud vertex shader source
 */
export function getPointCloudVertexShader(): string {
  return vertexShader;
}

/**
 * Get the point cloud fragment shader source
 */
export function getPointCloudFragmentShader(): string {
  return fragmentShader;
}

/**
 * Get the EDL vertex shader source
 */
export function getEDLVertexShader(): string {
  return edlVertexShader;
}

/**
 * Get the EDL fragment shader source
 */
export function getEDLFragmentShader(): string {
  return edlFragmentShader;
}

/**
 * Get HQ Splat shader utilities
 *
 * This shader provides high-quality point rendering with:
 * - Circular splat shapes
 * - Surface normal estimation
 * - Physically-based lighting (ambient + diffuse + specular)
 * - Smooth edge interpolation
 * - Depth correction
 *
 * @returns HQ Splat shader source code (GLSL utility functions)
 *
 * @example
 * ```typescript
 * // The HQ Splat shader is automatically included when using PointShape.PARABOLOID
 * const material = new PointCloudMaterial({
 *   shape: PointShape.PARABOLOID,
 * });
 * ```
 */
export function getHQSplatShader(): string {
  return hqSplatShader;
}

/**
 * Get the pick vertex shader source
 */
export function getPickVertexShader(): string {
  return pickVertexShader;
}

/**
 * Get the pick fragment shader source
 */
export function getPickFragmentShader(): string {
  return pickFragmentShader;
}

/**
 * Shader export for convenience
 */
export const shaders = {
  vertex: vertexShader,
  fragment: fragmentShader,
  edlVertex: edlVertexShader,
  edlFragment: edlFragmentShader,
  hqSplat: hqSplatShader,
  pickVertex: pickVertexShader,
  pickFragment: pickFragmentShader,
};
