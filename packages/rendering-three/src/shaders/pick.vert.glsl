// Pick vertex shader for point cloud index encoding (GLSL 3.00 ES)
precision highp float;
precision highp int;

// Uniforms - matrices (Three.js built-in)
// mat4 modelMatrix, modelViewMatrix, projectionMatrix, viewMatrix

// Uniforms - screen
uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float fov;

// Uniforms - camera
uniform bool uUseOrthographicCamera;
uniform float uOrthoWidth;

// Uniforms - point size
uniform float size;
uniform float minSize;
uniform float maxSize;
uniform float uOctreeSpacing;
uniform float uLevel;

// Uniforms - pick specific
uniform float uNodeIndex; // Current node index (0-255)

// Varyings
out float vLogDepth;
out vec3 vViewPosition;
flat out float vPointIndex;
flat out float vNodeIndex;

void main() {
  // Calculate view position
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  vLogDepth = log2(-mvPosition.z);

  // Calculate point size (simplified version for picking)
  float pointSize = size;

  float slope = tan(fov / 2.0);
  float projFactor = -0.5 * uScreenHeight / (slope * vViewPosition.z);

  // Calculate scale factor
  float scale = length(
    modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0) -
    modelViewMatrix * vec4(uOctreeSpacing, 0.0, 0.0, 1.0)
  ) / uOctreeSpacing;
  projFactor = projFactor * scale;

  float r = uOctreeSpacing * 1.7;

  #ifdef ATTENUATED_POINT_SIZE
    if (uUseOrthographicCamera) {
      pointSize = size;
    } else {
      pointSize = size * projFactor;
    }
  #elif defined(ADAPTIVE_POINT_SIZE)
    float attenuation = pow(2.0, uLevel);
    if (uUseOrthographicCamera) {
      float worldSpaceSize = size * r / attenuation;
      pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
    } else {
      float worldSpaceSize = size * r / attenuation;
      pointSize = worldSpaceSize * projFactor;
    }
  #endif

  pointSize = max(minSize, pointSize);
  pointSize = min(maxSize, pointSize);
  gl_PointSize = pointSize;

  // Pass point index and node index to fragment shader
  // gl_VertexID is the point index within this draw call
  vPointIndex = float(gl_VertexID);
  vNodeIndex = uNodeIndex;
}
