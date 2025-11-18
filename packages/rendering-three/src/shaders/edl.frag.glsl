#version 300 es

// EDL fragment shader (GLSL 3.00 ES)
// Algorithm by Christian Boucheny
// Adapted from CloudCompare EDL implementation:
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
// http://www.kitware.com/source/home/post/9
// https://tel.archives-ouvertes.fr/tel-00438464/document p. 115+ (french)

precision highp float;
precision highp int;

// Uniforms
uniform float uScreenWidth;
uniform float uScreenHeight;
uniform vec2 uNeighbours[NEIGHBOUR_COUNT];
uniform float uEDLStrength;
uniform float uEDLRadius;
uniform float uOpacity;

uniform float uNear;
uniform float uFar;

uniform mat4 uProj;

uniform sampler2D uEDLColor;
uniform sampler2D uEDLDepth;

// Varyings - inputs from vertex shader
in vec2 vUv;

// Output
out vec4 fragColor;

/**
 * Calculate EDL response (occlusion) for a given depth
 *
 * Compares the depth of the current pixel with its neighbors.
 * Larger depth differences indicate edges/occlusion and should be darkened.
 *
 * @param depth - Logarithmic depth of current pixel
 * @return EDL response value (higher = more occlusion)
 */
float response(float depth) {
  vec2 uvRadius = uEDLRadius / vec2(uScreenWidth, uScreenHeight);

  float sum = 0.0;

  for (int i = 0; i < NEIGHBOUR_COUNT; i++) {
    vec2 uvNeighbor = vUv + uvRadius * uNeighbours[i];

    // Sample neighbor depth from alpha channel
    float neighbourDepth = texture(uEDLColor, uvNeighbor).a;
    neighbourDepth = (neighbourDepth == 1.0) ? 0.0 : neighbourDepth;

    if (neighbourDepth != 0.0) {
      if (depth == 0.0) {
        sum += 100.0;
      } else {
        // Accumulate depth difference (only positive = occlusion)
        sum += max(0.0, depth - neighbourDepth);
      }
    }
  }

  return sum / float(NEIGHBOUR_COUNT);
}

void main() {
  vec4 cEDL = texture(uEDLColor, vUv);

  // Extract logarithmic depth from alpha channel
  float depth = cEDL.a;
  depth = (depth == 1.0) ? 0.0 : depth;

  // Calculate EDL response
  float res = response(depth);

  // Convert response to shading factor
  // Higher response (more occlusion) = darker shade
  float shade = exp(-res * 300.0 * uEDLStrength);

  // Apply shading to color
  fragColor = vec4(cEDL.rgb * shade, uOpacity);

  // Discard background pixels
  if (depth == 0.0) {
    discard;
  }
}
