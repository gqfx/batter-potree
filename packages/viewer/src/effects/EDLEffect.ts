/**
 * EDL (Eye-Dome Lighting) Post-Processing Effect
 *
 * Eye-Dome Lighting is a non-photorealistic shading technique that enhances
 * depth perception in point cloud visualization by darkening concave regions.
 *
 * @module effects
 * @see https://www.researchgate.net/publication/221314711_Eye-Dome_Lighting_for_Tree_Modeling
 *
 * @example
 * ```typescript
 * const edl = new EDLEffect(renderer, scene, camera);
 * edl.setEnabled(true);
 * edl.setRadius(1.4);
 * edl.setStrength(0.4);
 *
 * // In render loop
 * edl.render();
 * ```
 */

import * as THREE from 'three';
import type { EDLConfig } from '@better-potree/core';

/**
 * EDL shader uniforms
 */
interface EDLUniforms {
  tDiffuse: { value: THREE.Texture | null };
  tDepth: { value: THREE.Texture | null };
  screenWidth: { value: number };
  screenHeight: { value: number };
  radius: { value: number };
  strength: { value: number };
  opacity: { value: number };
  near: { value: number };
  far: { value: number };
  [uniform: string]: { value: any };
}

/**
 * EDL Effect class
 *
 * Implements Eye-Dome Lighting post-processing effect for enhanced depth perception.
 * This effect darkens concave regions and brightens convex regions based on depth differences.
 */
export class EDLEffect {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // Render targets
  private colorTarget: THREE.WebGLRenderTarget;
  private depthTarget: THREE.WebGLRenderTarget;
  private edlTarget: THREE.WebGLRenderTarget;

  // EDL materials and passes
  private edlMaterial: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;
  private quadMesh: THREE.Mesh;

  // Configuration
  private config: Required<EDLConfig>;

  // Scene for post-processing
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;

  /**
   * Create EDL effect
   *
   * @param renderer - WebGL renderer
   * @param scene - Scene to render
   * @param camera - Camera to use
   * @param config - Initial EDL configuration
   */
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: EDLConfig = { enabled: true }
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.config = {
      enabled: config.enabled ?? true,
      radius: config.radius ?? 1.4,
      strength: config.strength ?? 0.4,
      opacity: config.opacity ?? 1.0,
    };

    // Create render targets
    const size = renderer.getSize(new THREE.Vector2());
    const width = size.x;
    const height = size.y;

    // Color render target
    this.colorTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // Depth render target
    this.depthTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(width, height),
    });

    if (this.depthTarget.depthTexture) {
      this.depthTarget.depthTexture.format = THREE.DepthFormat;
      this.depthTarget.depthTexture.type = THREE.UnsignedIntType;
    }

    // EDL output target
    this.edlTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });

    // Create EDL shader material
    this.edlMaterial = this.createEDLMaterial();

    // Create composite material
    this.compositeMaterial = this.createCompositeMaterial();

    // Create post-processing scene
    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Create quad mesh for post-processing
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeometry, this.edlMaterial);
    this.postScene.add(this.quadMesh);
  }

  /**
   * Create EDL shader material
   *
   * @returns Shader material for EDL effect
   */
  private createEDLMaterial(): THREE.ShaderMaterial {
    const uniforms: EDLUniforms = {
      tDiffuse: { value: null },
      tDepth: { value: null },
      screenWidth: { value: this.renderer.domElement.width || 1 },
      screenHeight: { value: this.renderer.domElement.height || 1 },
      radius: { value: this.config.radius },
      strength: { value: this.config.strength },
      opacity: { value: this.config.opacity },
      near: { value: 0.1 },
      far: { value: 1000 },
    };

    return new THREE.ShaderMaterial({
      uniforms,

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tDepth;
        uniform float screenWidth;
        uniform float screenHeight;
        uniform float radius;
        uniform float strength;
        uniform float opacity;
        uniform float near;
        uniform float far;

        varying vec2 vUv;

        // Convert depth to linear depth
        float readDepth(sampler2D depthSampler, vec2 coord) {
          float fragCoordZ = texture2D(depthSampler, coord).x;
          float viewZ = perspectiveDepthToViewZ(fragCoordZ, near, far);
          return viewZToOrthographicDepth(viewZ, near, far);
        }

        // EDL shading calculation
        float computeEDL() {
          vec2 texelSize = vec2(1.0 / screenWidth, 1.0 / screenHeight);
          float centerDepth = readDepth(tDepth, vUv);

          // If depth is 1.0 (background), no shading
          if (centerDepth >= 0.9999) {
            return 1.0;
          }

          // Sample neighbors in a circular pattern
          float shade = 0.0;
          int samples = 8;

          for (int i = 0; i < 8; i++) {
            float angle = float(i) * 3.14159265 * 2.0 / 8.0;
            vec2 offset = radius * texelSize * vec2(cos(angle), sin(angle));

            float neighborDepth = readDepth(tDepth, vUv + offset);

            // Calculate depth difference
            float diff = max(0.0, centerDepth - neighborDepth);

            // Accumulate shading
            shade += diff;
          }

          // Normalize and apply strength
          shade = shade / float(samples);
          shade = pow(shade * strength, 2.0);

          // Convert to brightness (darker = more shade)
          return 1.0 - clamp(shade, 0.0, 1.0);
        }

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);

          // Compute EDL shading
          float edlShade = computeEDL();

          // Apply EDL shading to color
          vec3 shadedColor = color.rgb * edlShade;

          // Mix with original based on opacity
          vec3 finalColor = mix(color.rgb, shadedColor, opacity);

          gl_FragColor = vec4(finalColor, color.a);
        }
      `,

      depthWrite: false,
      depthTest: false,
    });
  }

  /**
   * Create composite shader material
   *
   * @returns Shader material for compositing
   */
  private createCompositeMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;

        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `,

      depthWrite: false,
      depthTest: false,
    });
  }

  /**
   * Render the effect
   *
   * This should be called instead of the normal renderer.render() call.
   * It handles the multi-pass rendering required for EDL.
   */
  render(): void {
    if (!this.config.enabled) {
      // EDL disabled, render directly
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Update camera uniforms
    if (this.camera instanceof THREE.PerspectiveCamera) {
      (this.edlMaterial.uniforms.near as { value: number }).value = this.camera.near;
      (this.edlMaterial.uniforms.far as { value: number }).value = this.camera.far;
    }

    // Pass 1: Render scene to color and depth targets
    this.renderer.setRenderTarget(this.depthTarget);
    this.renderer.render(this.scene, this.camera);

    this.renderer.setRenderTarget(this.colorTarget);
    this.renderer.render(this.scene, this.camera);

    // Pass 2: Apply EDL effect
    (this.edlMaterial.uniforms.tDiffuse as { value: THREE.Texture | null }).value = this.colorTarget.texture;
    (this.edlMaterial.uniforms.tDepth as { value: THREE.Texture | null }).value = this.depthTarget.depthTexture;

    this.quadMesh.material = this.edlMaterial;

    this.renderer.setRenderTarget(this.edlTarget);
    this.renderer.render(this.postScene, this.postCamera);

    // Pass 3: Composite to screen
    (this.compositeMaterial.uniforms as { tDiffuse: { value: THREE.Texture | null } }).tDiffuse.value = this.edlTarget.texture;

    this.quadMesh.material = this.compositeMaterial;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.postScene, this.postCamera);
  }

  /**
   * Set whether EDL is enabled
   *
   * @param enabled - Enable/disable EDL
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Get whether EDL is enabled
   *
   * @returns True if enabled
   */
  getEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Set EDL radius
   *
   * Controls the sampling radius for depth comparison.
   * Larger values create a more pronounced effect.
   *
   * @param radius - Radius in pixels (typically 1.0 - 3.0)
   */
  setRadius(radius: number): void {
    this.config.radius = radius;
    (this.edlMaterial.uniforms.radius as { value: number }).value = radius;
  }

  /**
   * Get EDL radius
   *
   * @returns Current radius
   */
  getRadius(): number {
    return this.config.radius;
  }

  /**
   * Set EDL strength
   *
   * Controls the intensity of the shading effect.
   *
   * @param strength - Strength factor (typically 0.1 - 1.0)
   */
  setStrength(strength: number): void {
    this.config.strength = strength;
    (this.edlMaterial.uniforms.strength as { value: number }).value = strength;
  }

  /**
   * Get EDL strength
   *
   * @returns Current strength
   */
  getStrength(): number {
    return this.config.strength;
  }

  /**
   * Set EDL opacity
   *
   * Controls how much the EDL effect is blended with the original.
   *
   * @param opacity - Opacity (0.0 = no effect, 1.0 = full effect)
   */
  setOpacity(opacity: number): void {
    this.config.opacity = opacity;
    (this.edlMaterial.uniforms.opacity as { value: number }).value = opacity;
  }

  /**
   * Get EDL opacity
   *
   * @returns Current opacity
   */
  getOpacity(): number {
    return this.config.opacity;
  }

  /**
   * Set complete EDL configuration
   *
   * @param config - EDL configuration
   */
  setConfig(config: Partial<EDLConfig>): void {
    if (config.enabled !== undefined) this.setEnabled(config.enabled);
    if (config.radius !== undefined) this.setRadius(config.radius);
    if (config.strength !== undefined) this.setStrength(config.strength);
    if (config.opacity !== undefined) this.setOpacity(config.opacity);
  }

  /**
   * Get current EDL configuration
   *
   * @returns Current configuration
   */
  getConfig(): Required<EDLConfig> {
    return { ...this.config };
  }

  /**
   * Resize render targets
   *
   * Call this when the renderer size changes.
   *
   * @param width - New width
   * @param height - New height
   */
  setSize(width: number, height: number): void {
    this.colorTarget.setSize(width, height);
    this.depthTarget.setSize(width, height);
    this.edlTarget.setSize(width, height);

    (this.edlMaterial.uniforms.screenWidth as { value: number }).value = width;
    (this.edlMaterial.uniforms.screenHeight as { value: number }).value = height;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.colorTarget.dispose();
    this.depthTarget.dispose();
    this.edlTarget.dispose();
    this.edlMaterial.dispose();
    this.compositeMaterial.dispose();
    this.quadMesh.geometry.dispose();
  }
}
