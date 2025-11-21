// EDL vertex shader for full-screen quad rendering (GLSL 3.00 ES)
precision highp float;
precision highp int;

// Vertex attributes
// Note: Three.js automatically provides:
//   - vec3 position
//   - vec2 uv

// Uniforms
// Note: Three.js automatically provides:
//   - mat4 projectionMatrix
//   - mat4 modelViewMatrix

// Varyings - outputs to fragment shader
out vec2 vUv;

void main() {
  vUv = uv;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
