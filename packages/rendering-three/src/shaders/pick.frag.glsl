// Pick fragment shader for point cloud index encoding (GLSL 3.00 ES)
precision highp float;
precision highp int;

// Varyings from vertex shader
in float vLogDepth;
in vec3 vViewPosition;
flat in float vPointIndex;
flat in float vNodeIndex;

// Output
out vec4 fragColor;

void main() {
  // Calculate point shape (circle)
  vec2 circleCoord = gl_PointCoord * 2.0 - 1.0;
  float dist = dot(circleCoord, circleCoord);

  // Discard pixels outside the circle
  if (dist > 1.0) {
    discard;
  }

  // Encode point index into RGB (24-bit)
  // This allows indexing up to 16,777,215 points per node
  uint pointIndex = uint(vPointIndex);
  float r = float(pointIndex & 0xFFu) / 255.0;
  float g = float((pointIndex >> 8u) & 0xFFu) / 255.0;
  float b = float((pointIndex >> 16u) & 0xFFu) / 255.0;

  // Encode node index into alpha (8-bit)
  // Node index is already offset by 1 (so 0 means no hit)
  float a = (vNodeIndex + 1.0) / 255.0;

  fragColor = vec4(r, g, b, a);
}
