/**
 * Shader utilities and loader
 * @module @better-potree/rendering-three/shaders
 */

import vertexShader from './pointcloud.vert.glsl?raw';
import fragmentShader from './pointcloud.frag.glsl?raw';

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
 * Shader export for convenience
 */
export const shaders = {
  vertex: vertexShader,
  fragment: fragmentShader,
};
