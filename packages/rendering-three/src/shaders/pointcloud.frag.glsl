#version 300 es

// Fragment shader for point cloud rendering (GLSL 3.00 ES)
precision highp float;
precision highp int;

// Uniforms
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform float uOpacity;
uniform float near;
uniform float far;

// Varyings - inputs from vertex shader
in vec3 vColor;
in float vLogDepth;
in vec3 vViewPosition;
in float vRadius;
in float vPointSize;

// Output
out vec4 fragColor;

void main() {
  vec3 color = vColor;
  float depth = gl_FragCoord.z;

  #if defined(CIRCLE_POINT_SHAPE) || defined(PARABOLOID_POINT_SHAPE)
    float u = 2.0 * gl_PointCoord.x - 1.0;
    float v = 2.0 * gl_PointCoord.y - 1.0;
  #endif

  #ifdef CIRCLE_POINT_SHAPE
    float cc = u * u + v * v;
    if (cc > 1.0) {
      discard;
    }
  #endif

  #ifdef PARABOLOID_POINT_SHAPE
    float wi = 0.0 - (u * u + v * v);
    vec4 pos = vec4(vViewPosition, 1.0);
    pos.z += wi * vRadius;
    float linearDepth = -pos.z;
    pos = projectionMatrix * pos;
    pos = pos / pos.w;
    float expDepth = pos.z;
    depth = (pos.z + 1.0) / 2.0;
    gl_FragDepth = depth;
  #endif

  // Output final color
  fragColor = vec4(color, uOpacity);

  #ifdef USE_EDL
    fragColor.a = vLogDepth;
  #endif
}
