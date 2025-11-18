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

// Shadow mapping uniforms
#if defined(num_shadowmaps) && num_shadowmaps > 0
  uniform sampler2D uShadowMap[num_shadowmaps];
  uniform vec3 uShadowColor;
#endif

// Varyings - inputs from vertex shader
in vec3 vColor;
in float vLogDepth;
in vec3 vViewPosition;
in float vRadius;
in float vPointSize;

#if defined(num_shadowmaps) && num_shadowmaps > 0
  in vec3 vShadowCoord[num_shadowmaps];
  in float vDistanceToLight[num_shadowmaps];
#endif

// Output
out vec4 fragColor;

/**
 * Calculate shadow visibility using PCF (Percentage Closer Filtering)
 *
 * Samples the shadow map multiple times around the current fragment
 * to produce soft shadow edges. Uses a 3x3 PCF kernel.
 *
 * @return Shadow visibility factor (0.0 = fully shadowed, 1.0 = fully lit)
 */
float calculateShadowVisibility() {
  #if defined(num_shadowmaps) && num_shadowmaps > 0
    float totalVisibility = 1.0;

    // Shadow map resolution (1024x1024)
    const float shadowMapSize = 1024.0;
    const float texelSize = 1.0 / shadowMapSize;

    // PCF sample offsets (3x3 kernel with 1.5 pixel spacing)
    const vec2 sampleOffsets[9] = vec2[9](
      vec2(0.0, 0.0),
      vec2(texelSize, texelSize) * 1.5,
      vec2(-texelSize, -texelSize) * 1.5,
      vec2(texelSize, -texelSize) * 1.5,
      vec2(-texelSize, texelSize) * 1.5,
      vec2(0.0, texelSize) * 1.5,
      vec2(0.0, -texelSize) * 1.5,
      vec2(texelSize, 0.0) * 1.5,
      vec2(-texelSize, 0.0) * 1.5
    );

    // Process each shadow map
    for (int i = 0; i < num_shadowmaps; i++) {
      vec3 shadowCoord = vShadowCoord[i];
      float distanceToLight = vDistanceToLight[i];

      // Check if fragment is within shadow map bounds
      if (shadowCoord.x < 0.0 || shadowCoord.x > 1.0 ||
          shadowCoord.y < 0.0 || shadowCoord.y > 1.0 ||
          shadowCoord.z < 0.0 || shadowCoord.z > 1.0) {
        continue; // Outside shadow map, skip
      }

      // PCF: Sample shadow map multiple times
      float visibleSamples = 0.0;
      float bias = vRadius * 2.0; // Depth bias to prevent shadow acne

      for (int j = 0; j < 9; j++) {
        vec2 sampleUV = shadowCoord.xy + sampleOffsets[j];
        vec4 shadowMapValue = texture(uShadowMap[i], sampleUV);

        // Compare depths (shadow map stores linear depth)
        float shadowDepth = shadowMapValue.x + bias;
        if (shadowDepth > distanceToLight) {
          visibleSamples += 1.0;
        }
      }

      // Average the samples for soft shadows
      float visibility = visibleSamples / 9.0;
      totalVisibility *= visibility;
    }

    return totalVisibility;
  #else
    return 1.0; // No shadows
  #endif
}

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
    // Calculate distance from point center
    float r = length(vec2(u, v));

    // Discard fragments outside the circle
    if (r > 1.0) {
      discard;
    }

    // Calculate paraboloid surface depth offset
    // wi represents the z-offset on the paraboloid surface
    float wi = 0.0 - (u * u + v * v);

    // Adjust view position based on paraboloid surface
    vec4 pos = vec4(vViewPosition, 1.0);
    pos.z += wi * vRadius;
    float linearDepth = -pos.z;

    // Calculate surface normal for the paraboloid
    // Normal points outward from the paraboloid surface
    // For paraboloid z = -(x^2 + y^2), gradient is (-2x, -2y, 1)
    vec3 surfaceNormal = normalize(vec3(-2.0 * u, -2.0 * v, 1.0));

    // Simple lighting calculation (ambient + diffuse)
    // Light direction in view space (from camera)
    vec3 lightDir = normalize(vec3(0.0, 0.0, 1.0));

    // Ambient lighting component
    float ambient = 0.5;

    // Diffuse lighting component (Lambertian)
    float diffuse = max(0.0, dot(surfaceNormal, lightDir));

    // Combine lighting (ambient + diffuse)
    float lighting = ambient + diffuse * 0.5;

    // Apply lighting to color
    color = color * lighting;

    // Smooth edge falloff for better visual quality
    // Creates soft edges near the point boundary
    float edgeFalloff = smoothstep(0.9, 0.7, r);
    color = color * mix(0.8, 1.0, edgeFalloff);

    // Calculate corrected fragment depth
    pos = projectionMatrix * pos;
    pos = pos / pos.w;
    float expDepth = pos.z;
    depth = (pos.z + 1.0) / 2.0;
    gl_FragDepth = depth;
  #endif

  // Apply shadow mapping
  #if defined(num_shadowmaps) && num_shadowmaps > 0
    float shadowVisibility = calculateShadowVisibility();
    // Mix lit color with shadow color based on visibility
    color = color * shadowVisibility + color * uShadowColor * (1.0 - shadowVisibility);
  #endif

  // Output final color
  fragColor = vec4(color, uOpacity);

  #ifdef USE_EDL
    fragColor.a = vLogDepth;
  #endif
}
