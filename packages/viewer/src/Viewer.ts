/**
 * Main Viewer class - high-level API for better-potree
 */

import type { EDLConfig, IPointCloudOctree, IRenderer, IScene } from '@better-potree/core';
import { TypedEventEmitter } from '@better-potree/core';
import * as THREE from 'three';
import type { ViewerEvents } from './events.js';

/**
 * Viewer configuration
 */
export interface ViewerConfig {
  /** Canvas container element */
  container: HTMLElement;
  /** Renderer implementation (injected) */
  renderer: IRenderer;
  /** Scene implementation (injected) */
  scene: IScene;
  /** Initial camera */
  camera?: THREE.Camera;
  /** Point budget (max points rendered per frame) */
  pointBudget?: number;
  /** Initial point size */
  pointSize?: number;
  /** Field of view */
  fov?: number;
  /** Enable EDL (Eye-Dome Lighting) */
  edlEnabled?: boolean;
  /** EDL radius */
  edlRadius?: number;
  /** EDL strength */
  edlStrength?: number;
  /** Background color */
  backgroundColor?: THREE.ColorRepresentation;
  /** Show debug info */
  showStats?: boolean;
}

/**
 * Main Viewer class
 *
 * The Viewer is the central component of better-potree. It manages:
 * - Point cloud loading and rendering
 * - Camera and navigation
 * - Rendering parameters (point size, budget, EDL)
 * - Clip volumes
 * - Event notifications
 *
 * @example
 * ```typescript
 * const viewer = new Viewer({
 *   container: document.getElementById('viewer'),
 *   renderer: new ThreeRenderer(),
 *   scene: new ThreeScene()
 * });
 *
 * viewer.on('pointcloud-loaded', ({ pointCloud }) => {
 *   console.log('Loaded:', pointCloud);
 * });
 *
 * const pointCloud = await viewer.load('path/to/cloud.json');
 * ```
 */
export class Viewer extends TypedEventEmitter<ViewerEvents> {
  // Core dependencies (injected)
  private renderer: IRenderer;
  private scene: IScene;

  // Scene objects
  private camera: THREE.Camera;
  private pointClouds: Map<string, IPointCloudOctree>;
  // clipVolumes will be implemented later

  // Configuration
  private pointBudget: number;
  private pointSize: number;
  private edlConfig: EDLConfig;
  private backgroundColor: THREE.Color;

  // Animation
  private animationId: number | null;
  private lastTimestamp: number;
  private isAnimating: boolean;

  // Container
  private container: HTMLElement;

  constructor(config: ViewerConfig) {
    super();

    this.container = config.container;
    this.renderer = config.renderer;
    this.scene = config.scene;

    // Create or use provided camera
    this.camera = config.camera || this.createDefaultCamera(config);

    // Initialize point clouds
    this.pointClouds = new Map();
    // clipVolumes will be implemented later when ClipVolume class is ready

    // Configuration
    this.pointBudget = config.pointBudget ?? 1_000_000;
    this.pointSize = config.pointSize ?? 1.0;
    this.edlConfig = {
      enabled: config.edlEnabled ?? true,
      radius: config.edlRadius ?? 1.4,
      strength: config.edlStrength ?? 0.4,
    };
    this.backgroundColor = new THREE.Color(config.backgroundColor ?? 0x000000);

    // Animation state
    this.animationId = null;
    this.lastTimestamp = 0;
    this.isAnimating = false;

    // Setup renderer
    this.setupRenderer();

    // Handle window resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
  }

  /**
   * Create default perspective camera
   */
  private createDefaultCamera(config: ViewerConfig): THREE.PerspectiveCamera {
    const fov = config.fov ?? 60;
    const aspect = this.container.clientWidth / this.container.clientHeight;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 1000);
    camera.position.set(0, 0, 10);
    return camera;
  }

  /**
   * Setup renderer
   */
  private setupRenderer(): void {
    const canvas = this.renderer.getDomElement();
    this.container.appendChild(canvas);

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
  }

  /**
   * Handle window resize
   */
  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setSize(width, height);

    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Load a point cloud from URL
   *
   * This method loads a Potree point cloud and integrates it into the viewer:
   * 1. Uses PotreeLoader to load metadata and hierarchy
   * 2. Creates a PointCloudOctree entity
   * 3. Initializes the root node
   * 4. Adds the octree to rendering pipeline
   * 5. Emits 'pointcloud-loaded' event
   *
   * @param url - URL to point cloud metadata (cloud.js or metadata.json)
   * @param name - Optional name for the point cloud (defaults to extracted name from URL)
   * @returns Promise that resolves with the loaded IPointCloudOctree
   * @throws {Error} If the URL is invalid or loading fails
   *
   * @example
   * ```typescript
   * const viewer = new Viewer({ ... });
   *
   * // Load a point cloud
   * const octree = await viewer.load('http://example.com/pointcloud/');
   * console.log(`Loaded ${octree.root?.numPoints} points`);
   *
   * // Or with a custom name
   * const octree2 = await viewer.load('/data/cloud.js', 'myCloud');
   * ```
   */
  async load(url: string, name?: string): Promise<IPointCloudOctree> {
    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL: URL must be a non-empty string');
    }

    // Determine point cloud name
    const cloudName = name || this.extractNameFromUrl(url);

    // Check if point cloud with this name already exists
    if (this.pointClouds.has(cloudName)) {
      throw new Error(`Point cloud "${cloudName}" is already loaded`);
    }

    try {
      // 1. Create loader if not already created
      // TODO: Consider injecting loader in constructor for better testability
      const { PotreeLoader } = await import('./loaders/PotreeLoader.js');
      const loader = new PotreeLoader();

      // 2. Load metadata and create octree structure
      const octree = await loader.load(url);

      // 3. Store in point clouds map
      this.pointClouds.set(cloudName, octree);

      // 4. Add root node to scene (if it exists)
      // TODO: Create visual representation of the root node
      // For now, we just store the octree structure
      // In Phase 4, we'll integrate with StreamingSystem and ThreeRenderSystem

      // 5. Emit loaded event
      this.emit('pointcloud-loaded', {
        pointCloud: octree,
        name: cloudName,
      });

      return octree;
    } catch (error) {
      // Clean up on error
      this.pointClouds.delete(cloudName);

      // Re-throw with more context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load point cloud from "${url}": ${errorMessage}`);
    }
  }

  /**
   * Extract a name from the point cloud URL
   *
   * @param url - Point cloud URL
   * @returns Extracted name or 'pointcloud' if extraction fails
   *
   * @example
   * ```typescript
   * extractNameFromUrl('/data/lion_takanawa/')          // 'lion_takanawa'
   * extractNameFromUrl('http://example.com/cloud.js')   // 'cloud'
   * extractNameFromUrl('invalid')                       // 'pointcloud'
   * ```
   */
  private extractNameFromUrl(url: string): string {
    try {
      // Remove trailing slash
      let cleanUrl = url.replace(/\/$/, '');

      // Remove file extension if present
      cleanUrl = cleanUrl.replace(/\.(js|json)$/, '');

      // Extract last path segment
      const segments = cleanUrl.split('/');
      const lastSegment = segments[segments.length - 1];

      // Return last segment or fallback
      return lastSegment || 'pointcloud';
    } catch (_error) {
      return 'pointcloud';
    }
  }

  /**
   * Remove a point cloud
   * @param pointCloud - Point cloud to remove or its name
   */
  remove(pointCloud: IPointCloudOctree | string): void {
    const name = typeof pointCloud === 'string' ? pointCloud : this.getPointCloudName(pointCloud);
    const cloud = this.pointClouds.get(name);

    if (!cloud) {
      console.warn(`Point cloud "${name}" not found`);
      return;
    }

    // Remove from scene (will be implemented when PointCloud has scene representation)
    // this.scene.remove(cloud.sceneNode);

    this.pointClouds.delete(name);

    this.emit('pointcloud-removed', { pointCloud: cloud, name });
  }

  /**
   * Get name for a point cloud
   */
  private getPointCloudName(pointCloud: IPointCloudOctree): string {
    for (const [name, cloud] of this.pointClouds.entries()) {
      if (cloud === pointCloud) {
        return name;
      }
    }
    return 'unknown';
  }

  /**
   * Get all loaded point clouds
   */
  getPointClouds(): IPointCloudOctree[] {
    return Array.from(this.pointClouds.values());
  }

  /**
   * Get point cloud by name
   */
  getPointCloud(name: string): IPointCloudOctree | undefined {
    return this.pointClouds.get(name);
  }

  /**
   * Set point budget (max points rendered per frame)
   */
  setPointBudget(budget: number): void {
    this.pointBudget = Math.max(100_000, budget);
    this.emit('point-budget-changed', { budget: this.pointBudget });
  }

  /**
   * Get current point budget
   */
  getPointBudget(): number {
    return this.pointBudget;
  }

  /**
   * Set point size
   */
  setPointSize(size: number): void {
    this.pointSize = Math.max(0.1, size);

    // Update all point clouds (will be implemented when PointCloud has material)
    // for (const cloud of this.pointClouds.values()) {
    //   cloud.material.size = this.pointSize;
    // }

    this.emit('point-size-changed', { size: this.pointSize });
  }

  /**
   * Get current point size
   */
  getPointSize(): number {
    return this.pointSize;
  }

  /**
   * Set background color
   */
  setBackground(color: THREE.ColorRepresentation): void {
    this.backgroundColor.set(color);

    // Update scene background (if Three.js scene)
    const threeScene = this.scene.getThreeScene?.();
    if (threeScene) {
      threeScene.background = this.backgroundColor;
    }

    this.emit('background-changed', { color: this.backgroundColor });
  }

  /**
   * Get background color
   */
  getBackground(): THREE.Color {
    return this.backgroundColor;
  }

  /**
   * Enable or disable EDL (Eye-Dome Lighting)
   */
  setEDLEnabled(enabled: boolean): void {
    this.edlConfig.enabled = enabled;
    this.emit('edl-changed', { enabled });
  }

  /**
   * Set EDL configuration
   */
  setEDLConfig(config: Partial<EDLConfig>): void {
    this.edlConfig = { ...this.edlConfig, ...config };
    this.emit('edl-changed', this.edlConfig);
  }

  /**
   * Get EDL configuration
   */
  getEDLConfig(): EDLConfig {
    return { ...this.edlConfig };
  }

  /**
   * Get the camera
   */
  getCamera(): THREE.Camera {
    return this.camera;
  }

  /**
   * Get the scene
   */
  getScene(): IScene {
    return this.scene;
  }

  /**
   * Get the renderer
   */
  getRenderer(): IRenderer {
    return this.renderer;
  }

  /**
   * Render a single frame
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Start animation loop
   */
  startAnimation(): void {
    if (this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    this.lastTimestamp = performance.now();
    this.animate(this.lastTimestamp);
  }

  /**
   * Stop animation loop
   */
  stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
  }

  /**
   * Animation loop
   */
  private animate(timestamp: number): void {
    if (!this.isAnimating) {
      return;
    }

    this.animationId = requestAnimationFrame((ts) => this.animate(ts));

    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // Update event
    this.emit('update', { deltaTime, timestamp });

    // Update point clouds (LOD, visibility, etc.)
    // This will be implemented when PointCloud has update logic

    // Render
    this.render();

    // Render event
    this.emit('render', { deltaTime, timestamp });
  }

  /**
   * Destroy the viewer and cleanup resources
   */
  destroy(): void {
    this.stopAnimation();

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);

    // Remove all point clouds
    for (const name of Array.from(this.pointClouds.keys())) {
      this.remove(name);
    }

    // Cleanup renderer
    this.renderer.dispose();

    // Remove canvas from container
    const canvas = this.renderer.getDomElement();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }

    // Emit destroy event
    this.emit('destroy', {});

    // Remove all event listeners
    this.removeAllListeners();
  }
}
