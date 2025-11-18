#version 300 es

// Vertex shader for point cloud rendering (GLSL 3.00 ES)
precision highp float;
precision highp int;

// Vertex attributes
in vec3 position;
in vec3 color;
in float intensity;
in float classification;
in float returnNumber;
in float numberOfReturns;
in vec3 normal;

// Uniforms - matrices
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

// Uniforms - screen
uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float fov;
uniform float near;
uniform float far;

// Uniforms - camera
uniform bool uUseOrthographicCamera;
uniform float uOrthoWidth;
uniform float uOrthoHeight;

// Uniforms - point size
uniform float size;
uniform float minSize;
uniform float maxSize;
uniform float uOctreeSpacing;

// Uniforms - GPU LOD traversal
uniform sampler2D visibilityTexture;
uniform float uVNStart;
uniform float uLevel;
uniform float uOctreeSize;
uniform float uVisibilityTextureWidth;
uniform float uVisibilityTextureHeight;
uniform bool uEnableGPULOD;

// Uniforms - color
uniform vec3 uColor;
uniform float uOpacity;
uniform vec2 elevationRange;
uniform vec2 intensityRange;

// Uniforms - textures
uniform sampler2D gradient;
uniform sampler2D classificationLUT;

// Uniforms - clipping
#define CLIPTASK_NONE 0
#define CLIPTASK_HIGHLIGHT 1
#define CLIPTASK_SHOW_INSIDE 2
#define CLIPTASK_SHOW_OUTSIDE 3

#define CLIPMETHOD_INSIDE_ANY 0
#define CLIPMETHOD_INSIDE_ALL 1

uniform int clipTask;
uniform int clipMethod;
#if defined(num_clipboxes) && num_clipboxes > 0
  uniform mat4 clipBoxes[num_clipboxes];
#endif

// Varyings - outputs to fragment shader
out vec3 vColor;
out float vLogDepth;
out vec3 vViewPosition;
out float vRadius;
out float vPointSize;

// Color calculation functions
vec3 getRGB() {
  return color;
}

float getIntensity() {
  float w = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
  w = clamp(w, 0.0, 1.0);
  return w;
}

vec3 getElevation() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float w = (world.z - elevationRange.x) / (elevationRange.y - elevationRange.x);
  vec3 cElevation = texture(gradient, vec2(w, 1.0 - w)).rgb;
  return cElevation;
}

vec4 getClassification() {
  vec2 uv = vec2(classification / 255.0, 0.5);
  vec4 classColor = texture(classificationLUT, uv);
  return classColor;
}

vec3 getReturnNumber() {
  if (numberOfReturns == 1.0) {
    return vec3(1.0, 1.0, 0.0); // Yellow for single return
  } else {
    if (returnNumber == 1.0) {
      return vec3(1.0, 0.0, 0.0); // Red for first return
    } else if (returnNumber == numberOfReturns) {
      return vec3(0.0, 0.0, 1.0); // Blue for last return
    } else {
      return vec3(0.0, 1.0, 0.0); // Green for intermediate
    }
  }
}

vec3 getNormal() {
  vec3 n_view = normalize(vec3(modelViewMatrix * vec4(normal, 0.0)));
  return n_view;
}

// Color selection based on defines
vec3 getColor() {
  vec3 outputColor;

  #ifdef COLOR_TYPE_RGB
    outputColor = getRGB();
  #elif defined(COLOR_TYPE_ELEVATION)
    outputColor = getElevation();
  #elif defined(COLOR_TYPE_INTENSITY)
    float w = getIntensity();
    outputColor = vec3(w, w, w);
  #elif defined(COLOR_TYPE_INTENSITY_GRADIENT)
    float w = getIntensity();
    outputColor = texture(gradient, vec2(w, 1.0 - w)).rgb;
  #elif defined(COLOR_TYPE_CLASSIFICATION)
    vec4 cl = getClassification();
    outputColor = cl.rgb;
  #elif defined(COLOR_TYPE_RETURN_NUMBER)
    outputColor = getReturnNumber();
  #elif defined(COLOR_TYPE_NORMAL)
    outputColor = (modelMatrix * vec4(normal, 0.0)).xyz;
  #elif defined(COLOR_TYPE_COLOR)
    outputColor = uColor;
  #else
    outputColor = getRGB();
  #endif

  return outputColor;
}

/**
 * Get LOD depth by traversing octree using visibility texture
 *
 * Traverses the octree hierarchy from the current node level to find
 * the leaf node containing the current point. Returns the depth offset
 * from the starting level.
 *
 * @return LOD depth offset from uLevel
 */
float getLOD() {
  vec3 offset = vec3(0.0);
  int iOffset = int(uVNStart);
  float depth = 0.0;

  // Traverse octree until we find the leaf node containing this point
  // Max 30 levels to prevent infinite loops
  for (float i = 0.0; i <= 30.0; i++) {
    // Calculate node size at current level
    float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel);

    // Calculate 3D index of child containing this point
    vec3 index3d = (position - offset) / nodeSizeAtLevel;
    ivec3 iIndex = ivec3(index3d);

    // Convert 3D index to child index (0-7)
    // Using Z-Y-X order: childIndex = x + y*2 + z*4
    int childIndex = iIndex.x + iIndex.y * 2 + iIndex.z * 4;

    // Query visibility texture to get next VN start
    int index = iOffset + childIndex;
    vec2 texCoord = vec2(
      float(index % int(uVisibilityTextureWidth)),
      float(index / int(uVisibilityTextureWidth))
    ) / vec2(uVisibilityTextureWidth, uVisibilityTextureHeight);

    vec4 visibility = texture(visibilityTexture, texCoord);

    // Decode VN start from RG channels (16-bit value)
    float nextVNStart = visibility.r * 255.0 + visibility.g * 255.0 * 256.0;

    // If nextVNStart is 0, this is a leaf node
    if (nextVNStart == 0.0) break;

    // Move to next level
    iOffset = int(nextVNStart);
    offset = offset + vec3(iIndex) * nodeSizeAtLevel;
    depth++;
  }

  return depth;
}

/**
 * Calculate point size attenuation based on LOD depth
 *
 * Points deeper in the octree are rendered smaller to maintain
 * consistent visual density across LOD levels.
 *
 * @return Attenuated point size in world space
 */
float getPointSizeAttenuation() {
  float lod = getLOD();
  float lodLevel = uLevel + lod;

  // Points at deeper levels need to be smaller
  // attenuation = 2^lodLevel scales inversely with node size
  float attenuation = pow(2.0, lodLevel);

  return attenuation * size;
}

// Point size calculation
float getPointSize() {
  float pointSize = 1.0;

  float slope = tan(fov / 2.0);
  float projFactor = -0.5 * uScreenHeight / (slope * vViewPosition.z);

  float r = uOctreeSpacing * 1.7;
  vRadius = r;

  #ifdef FIXED_POINT_SIZE
    pointSize = size;
  #elif defined(ATTENUATED_POINT_SIZE)
    if (uUseOrthographicCamera) {
      pointSize = size;
    } else {
      pointSize = size * projFactor;
    }
  #elif defined(ADAPTIVE_POINT_SIZE)
    if (uEnableGPULOD) {
      // Use GPU LOD traversal for adaptive point sizing
      float attenuatedSize = getPointSizeAttenuation();
      if (uUseOrthographicCamera) {
        float worldSpaceSize = attenuatedSize * r / pow(2.0, uLevel);
        pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
      } else {
        float worldSpaceSize = attenuatedSize * r / pow(2.0, uLevel);
        pointSize = worldSpaceSize * projFactor;
      }
    } else {
      // Fallback to simple adaptive sizing without GPU LOD
      if (uUseOrthographicCamera) {
        float worldSpaceSize = size * r;
        pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
      } else {
        float worldSpaceSize = size * r;
        pointSize = worldSpaceSize * projFactor;
      }
    }
  #else
    // Default to fixed
    pointSize = size;
  #endif

  pointSize = max(minSize, pointSize);
  pointSize = min(maxSize, pointSize);

  vRadius = pointSize / projFactor;

  return pointSize;
}

/**
 * Apply clipping logic based on clipTask and clipMethod
 *
 * Checks if the point is inside any/all clip boxes and applies
 * the appropriate action (highlight, show inside, show outside).
 * Points that should be clipped are moved outside the view frustum.
 */
void doClipping() {
  int clipVolumesCount = 0;
  int insideCount = 0;

  #if defined(num_clipboxes) && num_clipboxes > 0
    for (int i = 0; i < num_clipboxes; i++) {
      // Transform point position to clip box local space
      vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4(position, 1.0);

      // Check if point is inside the box (box is centered at origin, size 1x1x1)
      bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
      inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
      inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;

      insideCount = insideCount + (inside ? 1 : 0);
      clipVolumesCount++;
    }
  #endif

  bool insideAny = insideCount > 0;
  bool insideAll = (clipVolumesCount > 0) && (clipVolumesCount == insideCount);

  // Apply clipping based on clipMethod and clipTask
  if (clipMethod == CLIPMETHOD_INSIDE_ANY) {
    if (insideAny && clipTask == CLIPTASK_HIGHLIGHT) {
      // Highlight points inside any box (add red tint)
      vColor.r = min(vColor.r + 0.5, 1.0);
    } else if (!insideAny && clipTask == CLIPTASK_SHOW_INSIDE) {
      // Clip points outside all boxes
      gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
    } else if (insideAny && clipTask == CLIPTASK_SHOW_OUTSIDE) {
      // Clip points inside any box
      gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
    }
  } else if (clipMethod == CLIPMETHOD_INSIDE_ALL) {
    if (insideAll && clipTask == CLIPTASK_HIGHLIGHT) {
      // Highlight points inside all boxes (add red tint)
      vColor.r = min(vColor.r + 0.5, 1.0);
    } else if (!insideAll && clipTask == CLIPTASK_SHOW_INSIDE) {
      // Clip points not inside all boxes
      gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
    } else if (insideAll && clipTask == CLIPTASK_SHOW_OUTSIDE) {
      // Clip points inside all boxes
      gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
    }
  }
}

void main() {
  // Calculate view position
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
  vLogDepth = log2(-mvPosition.z);

  // Calculate point size
  float pointSize = getPointSize();
  gl_PointSize = pointSize;
  vPointSize = pointSize;

  // Calculate color
  vColor = getColor();

  // Apply clipping (must be after color calculation for HIGHLIGHT mode)
  doClipping();
}
