/**
 * Shader utilities and loader
 * @module @better-potree/rendering-three/shaders
 */

import fragmentShader from './pointcloud.frag.glsl?raw';
import vertexShader from './pointcloud.vert.glsl?raw';
import edlFragmentShader from './edl.frag.glsl?raw';
import edlVertexShader from './edl.vert.glsl?raw';

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
 * Shader export for convenience
 */
export const shaders = {
  vertex: vertexShader,
  fragment: fragmentShader,
  edlVertex: edlVertexShader,
  edlFragment: edlFragmentShader,
};
