/**
 * High Quality Splat (HQ Splat) shader utilities
 *
 * Provides advanced point rendering with:
 * - Circular splat shapes
 * - Surface normal estimation
 * - Physically-based lighting
 * - Smooth interpolation
 * - Depth correction
 *
 * @module @better-potree/rendering-three/shaders/hqsplat
 */

// ============================================================================
// HQ Splat Configuration
// ============================================================================

/**
 * HQ Splat quality levels
 * - FAST: Basic paraboloid with simple lighting
 * - NORMAL: Standard quality with diffuse lighting and edge smoothing
 * - HIGH: High quality with specular highlights and advanced lighting
 */
#ifndef HQSPLAT_QUALITY
  #define HQSPLAT_QUALITY 1  // 0=FAST, 1=NORMAL, 2=HIGH
#endif

// ============================================================================
// Lighting Configuration
// ============================================================================

// Ambient lighting intensity (base illumination)
#ifndef HQSPLAT_AMBIENT
  #define HQSPLAT_AMBIENT 0.5
#endif

// Diffuse lighting intensity (directional illumination)
#ifndef HQSPLAT_DIFFUSE
  #define HQSPLAT_DIFFUSE 0.5
#endif

// Specular lighting intensity (highlights)
#ifndef HQSPLAT_SPECULAR
  #define HQSPLAT_SPECULAR 0.3
#endif

// Specular shininess (higher = tighter highlights)
#ifndef HQSPLAT_SHININESS
  #define HQSPLAT_SHININESS 32.0
#endif

// Edge smoothing intensity (0.0 = no smoothing, 1.0 = maximum smoothing)
#ifndef HQSPLAT_EDGE_SMOOTH
  #define HQSPLAT_EDGE_SMOOTH 0.3
#endif

// ============================================================================
// Core HQ Splat Functions
// ============================================================================

/**
 * Calculate surface normal for paraboloid splat
 *
 * For a paraboloid defined as z = -(x^2 + y^2), the gradient is:
 * ∇f = (-2x, -2y, 1)
 *
 * @param u Normalized x coordinate [-1, 1]
 * @param v Normalized y coordinate [-1, 1]
 * @return Normalized surface normal in view space
 */
vec3 hqsplat_calculateNormal(float u, float v) {
  return normalize(vec3(-2.0 * u, -2.0 * v, 1.0));
}

/**
 * Calculate paraboloid depth offset
 *
 * @param u Normalized x coordinate [-1, 1]
 * @param v Normalized y coordinate [-1, 1]
 * @return Depth offset (negative value)
 */
float hqsplat_calculateDepthOffset(float u, float v) {
  return -(u * u + v * v);
}

/**
 * Calculate edge smoothing factor
 *
 * Creates soft edges near the splat boundary for better visual quality.
 * Uses smoothstep for smooth falloff.
 *
 * @param r Distance from splat center [0, 1]
 * @param smoothAmount Edge smoothing intensity [0, 1]
 * @return Edge falloff factor [0, 1]
 */
float hqsplat_calculateEdgeFalloff(float r, float smoothAmount) {
  // smoothstep creates smooth transition between two values
  // Transition starts at 0.9*r and ends at 0.7*r
  float edge = smoothstep(0.9, 0.7, r);

  // Mix between no smoothing (1.0) and full smoothing based on smoothAmount
  float minIntensity = 1.0 - smoothAmount * 0.2;
  return mix(minIntensity, 1.0, edge);
}

/**
 * Calculate Lambertian diffuse lighting
 *
 * @param normal Surface normal
 * @param lightDir Light direction
 * @return Diffuse lighting factor [0, 1]
 */
float hqsplat_calculateDiffuse(vec3 normal, vec3 lightDir) {
  return max(0.0, dot(normal, lightDir));
}

/**
 * Calculate Blinn-Phong specular lighting
 *
 * @param normal Surface normal
 * @param lightDir Light direction
 * @param viewDir View direction
 * @param shininess Specular shininess exponent
 * @return Specular lighting factor [0, 1]
 */
float hqsplat_calculateSpecular(vec3 normal, vec3 lightDir, vec3 viewDir, float shininess) {
  // Calculate half vector between light and view directions
  vec3 halfDir = normalize(lightDir + viewDir);

  // Blinn-Phong: spec = (N·H)^shininess
  float spec = pow(max(0.0, dot(normal, halfDir)), shininess);

  return spec;
}

/**
 * Calculate complete lighting for HQ Splat
 *
 * Combines ambient, diffuse, and optionally specular lighting.
 *
 * @param normal Surface normal in view space
 * @param viewDir View direction in view space
 * @param quality Quality level (0=FAST, 1=NORMAL, 2=HIGH)
 * @return Total lighting factor [0, 1+]
 */
float hqsplat_calculateLighting(vec3 normal, vec3 viewDir, int quality) {
  // Light direction in view space (from camera/front)
  vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));

  // Ambient component (base illumination)
  float ambient = HQSPLAT_AMBIENT;

  // Diffuse component (directional illumination)
  float diffuse = hqsplat_calculateDiffuse(normal, lightDir) * HQSPLAT_DIFFUSE;

  // Specular component (highlights) - only for HIGH quality
  float specular = 0.0;
  if (quality >= 2) {
    specular = hqsplat_calculateSpecular(normal, lightDir, viewDir, HQSPLAT_SHININESS) * HQSPLAT_SPECULAR;
  }

  // Combine all lighting components
  return ambient + diffuse + specular;
}

/**
 * Apply HQ Splat effect to a fragment
 *
 * This is the main function that applies the complete HQ Splat effect.
 *
 * @param u Normalized x coordinate from gl_PointCoord (range [-1, 1])
 * @param v Normalized y coordinate from gl_PointCoord (range [-1, 1])
 * @param color Input fragment color
 * @param vViewPosition Fragment position in view space
 * @param vRadius Point radius in view space
 * @param projectionMatrix Camera projection matrix
 * @param quality Quality level (0=FAST, 1=NORMAL, 2=HIGH)
 * @param outColor [out] Final lit and edge-smoothed color
 * @param outDepth [out] Corrected fragment depth
 * @return true if fragment should be kept, false if it should be discarded
 */
bool hqsplat_apply(
  float u,
  float v,
  vec3 color,
  vec3 vViewPosition,
  float vRadius,
  mat4 projectionMatrix,
  int quality,
  out vec3 outColor,
  out float outDepth
) {
  // Calculate distance from splat center
  float r = length(vec2(u, v));

  // Discard fragments outside the circular splat
  if (r > 1.0) {
    return false;
  }

  // Calculate paraboloid depth offset
  float depthOffset = hqsplat_calculateDepthOffset(u, v);

  // Adjust view position based on paraboloid surface
  vec4 pos = vec4(vViewPosition, 1.0);
  pos.z += depthOffset * vRadius;

  // Calculate surface normal
  vec3 surfaceNormal = hqsplat_calculateNormal(u, v);

  // View direction (towards camera)
  vec3 viewDir = normalize(-vViewPosition);

  // Calculate lighting
  float lighting = hqsplat_calculateLighting(surfaceNormal, viewDir, quality);

  // Apply lighting to color
  outColor = color * lighting;

  // Apply edge smoothing for NORMAL and HIGH quality
  if (quality >= 1) {
    float edgeFalloff = hqsplat_calculateEdgeFalloff(r, HQSPLAT_EDGE_SMOOTH);
    outColor = outColor * edgeFalloff;
  }

  // Calculate corrected fragment depth
  pos = projectionMatrix * pos;
  pos = pos / pos.w;
  outDepth = (pos.z + 1.0) / 2.0;

  return true;
}

// ============================================================================
// Simplified API for common use cases
// ============================================================================

/**
 * Apply HQ Splat with default NORMAL quality
 *
 * Convenience function that uses NORMAL quality level (1).
 */
bool hqsplat_applyNormal(
  float u,
  float v,
  vec3 color,
  vec3 vViewPosition,
  float vRadius,
  mat4 projectionMatrix,
  out vec3 outColor,
  out float outDepth
) {
  return hqsplat_apply(u, v, color, vViewPosition, vRadius, projectionMatrix, 1, outColor, outDepth);
}

/**
 * Apply HQ Splat with FAST quality
 *
 * Convenience function that uses FAST quality level (0).
 * Suitable for performance-critical scenarios.
 */
bool hqsplat_applyFast(
  float u,
  float v,
  vec3 color,
  vec3 vViewPosition,
  float vRadius,
  mat4 projectionMatrix,
  out vec3 outColor,
  out float outDepth
) {
  return hqsplat_apply(u, v, color, vViewPosition, vRadius, projectionMatrix, 0, outColor, outDepth);
}

/**
 * Apply HQ Splat with HIGH quality
 *
 * Convenience function that uses HIGH quality level (2).
 * Includes specular highlights for maximum visual quality.
 */
bool hqsplat_applyHigh(
  float u,
  float v,
  vec3 color,
  vec3 vViewPosition,
  float vRadius,
  mat4 projectionMatrix,
  out vec3 outColor,
  out float outDepth
) {
  return hqsplat_apply(u, v, color, vViewPosition, vRadius, projectionMatrix, 2, outColor, outDepth);
}
