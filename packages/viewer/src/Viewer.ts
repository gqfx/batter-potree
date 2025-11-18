/**
 * Main Viewer class - high-level API for better-potree
 */

import type { EDLConfig, IPointCloudOctree, IRenderer, IScene } from '@better-potree/core';
import {
  PointCloudColorMode,
  PointShape,
  PointSizeType,
  StreamingSystem,
  SystemScheduler,
  TraversalSystem,
  TypedEventEmitter,
} from '@better-potree/core';
import { PointCloudMaterial, PointCloudScene } from '@better-potree/rendering-three';
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
  private pointCloudScenes: Map<string, PointCloudScene>;
  // clipVolumes will be implemented later

  // Configuration
  private pointBudget: number;
  private pointSize: number;
  private edlConfig: EDLConfig;
  private backgroundColor: THREE.Color;

  // Systems
  private scheduler: SystemScheduler;
  private streamingSystem: StreamingSystem;
  private traversalSystem: TraversalSystem;

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

    // Initialize point clouds and scenes
    this.pointClouds = new Map();
    this.pointCloudScenes = new Map();
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

    // Initialize systems
    this.scheduler = new SystemScheduler({
      enableProfiling: true,
      errorHandler: (error, systemName) => {
        console.error(`[Viewer] System "${systemName}" error:`, error);
      },
    });

    this.streamingSystem = new StreamingSystem({
      maxConcurrentLoads: 8,
      maxRetries: 3,
      maxRequestsPerFrame: 10,
    });

    // Create TraversalSystem
    this.traversalSystem = new TraversalSystem({
      pointBudget: this.pointBudget,
      minScreenSize: 1.0,
      maxLevel: 30,
      screenWidth: this.container.clientWidth,
      screenHeight: this.container.clientHeight,
    });

    // Add systems to scheduler
    this.scheduler.addSystem(this.streamingSystem);
    this.scheduler.addSystem(this.traversalSystem);

    // Set camera for TraversalSystem
    this.traversalSystem.setCamera(this.camera);

    // Set up load completion callback
    this.setupStreamingCallbacks();

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
   * Create material for point cloud rendering
   *
   * @returns Configured PointCloudMaterial instance
   *
   * @example
   * ```typescript
   * const material = viewer.createMaterial();
   * ```
   */
  private createMaterial(): PointCloudMaterial {
    const material = new PointCloudMaterial({
      size: this.pointSize,
      colorMode: PointCloudColorMode.RGB,
      sizeType: PointSizeType.ADAPTIVE,
      shape: PointShape.CIRCLE,
      enableGPULOD: true,
    });
    
    // Update screen size after creation
    material.updateScreenSize(this.container.clientWidth, this.container.clientHeight);
    
    return material;
  }

  /**
   * Setup streaming system callbacks
   *
   * Configures callbacks for node loading events to integrate
   * StreamingSystem with the rendering pipeline.
   */
  private setupStreamingCallbacks(): void {
    // Handle successful node loading
    this.streamingSystem.setOnLoadComplete((event) => {
      const { octree, node, data } = event;

      console.debug(
        `[Viewer] Node loaded: ${node.name} (${data.numPoints} points) in ${event.loadTime.toFixed(2)}ms`,
      );

      // Find the point cloud scene for this octree
      const cloudName = this.getPointCloudNameByOctree(octree);
      if (cloudName) {
        const scene = this.pointCloudScenes.get(cloudName);
        if (scene) {
          // TODO: Phase 4 - Create geometry from data and add to scene
          // For now we just track that the node is loaded
          // scene.addNode(node.name, geometry, { level: node.level, numPoints: node.numPoints });
        }
      }

      // Emit node-loaded event for external listeners
      this.emit('node-loaded', {
        pointCloud: octree,
        node,
        data,
      });

      // Trigger a render update
      if (!this.isAnimating) {
        this.render();
      }
    });

    // Handle failed node loading
    this.streamingSystem.setOnLoadFailed((event) => {
      const { node, error, retries } = event;
      console.error(`[Viewer] Node load failed: ${node.name} after ${retries} retries:`, error);

      // Emit node-load-failed event for external listeners
      this.emit('node-load-failed', {
        node,
        error,
        retries,
      });
    });
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

    // Update TraversalSystem screen size for LOD calculations
    this.traversalSystem.setScreenSize(width, height);

    // Update all point cloud material screen sizes
    for (const pointCloudScene of this.pointCloudScenes.values()) {
      if (pointCloudScene.material && typeof pointCloudScene.material.updateScreenSize === 'function') {
        pointCloudScene.material.updateScreenSize(width, height);
      }
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

      // 4. Create PointCloudScene with material
      const material = this.createMaterial();
      const pointCloudScene = new PointCloudScene({
        materialConfig: {
          size: material.size,
          colorMode: material.colorMode,
          sizeType: material.sizeType,
          shape: material.shape,
          enableGPULOD: true,
        },
        octreeSpacing: octree.spacing,
      });

      // 5. Add to Three.js scene
      const threeScene = this.scene.getThreeScene?.();
      if (threeScene) {
        threeScene.add(pointCloudScene);
      }

      // 6. Store in point cloud scenes map
      this.pointCloudScenes.set(cloudName, pointCloudScene);

      // 7. Add to TraversalSystem for LOD traversal
      this.traversalSystem.addPointCloud(cloudName, octree);

      // 8. Emit loaded event
      this.emit('pointcloud-loaded', {
        pointCloud: octree,
        name: cloudName,
      });

      // 9. Request loading root node immediately
      if (octree.root && !octree.root.loaded && !octree.root.loading) {
        this.streamingSystem.requestLoad(octree, octree.root, 1.0);
      }

      return octree;
    } catch (error) {
      // Clean up on error
      this.pointClouds.delete(cloudName);
      this.pointCloudScenes.delete(cloudName);

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

    // Remove from TraversalSystem
    this.traversalSystem.removePointCloud(name);

    // Remove from Three.js scene and dispose
    const pointCloudScene = this.pointCloudScenes.get(name);
    if (pointCloudScene) {
      const threeScene = this.scene.getThreeScene?.();
      if (threeScene) {
        threeScene.remove(pointCloudScene);
      }
      pointCloudScene.dispose();
      this.pointCloudScenes.delete(name);
    }

    // Remove from point clouds map
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
   * Get point cloud scene by name
   *
   * @param name - Name of the point cloud
   * @returns PointCloudScene or undefined if not found
   *
   * @example
   * ```typescript
   * const scene = viewer.getPointCloudScene('myCloud');
   * if (scene) {
   *   console.log('Node count:', scene.nodeCount);
   * }
   * ```
   */
  getPointCloudScene(name: string): PointCloudScene | undefined {
    return this.pointCloudScenes.get(name);
  }

  /**
   * Get all point cloud scenes
   *
   * @returns Array of all PointCloudScene instances
   *
   * @example
   * ```typescript
   * const scenes = viewer.getPointCloudScenes();
   * console.log('Total scenes:', scenes.length);
   * ```
   */
  getPointCloudScenes(): PointCloudScene[] {
    return Array.from(this.pointCloudScenes.values());
  }

  /**
   * Set point budget (max points rendered per frame)
   */
  setPointBudget(budget: number): void {
    this.pointBudget = Math.max(100_000, budget);

    // Update TraversalSystem point budget for LOD calculations
    this.traversalSystem.setPointBudget(this.pointBudget);

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

    // Update all point cloud materials
    for (const pointCloudScene of this.pointCloudScenes.values()) {
      pointCloudScene.material.size = this.pointSize;
    }

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
   * Get the system scheduler
   *
   * Provides access to the scheduler for advanced usage, such as
   * adding custom systems or inspecting system performance.
   *
   * @returns System scheduler instance
   *
   * @example
   * ```typescript
   * const scheduler = viewer.getScheduler();
   * console.log('Scheduler stats:', scheduler.stats);
   * ```
   */
  getScheduler(): SystemScheduler {
    return this.scheduler;
  }

  /**
   * Get the streaming system
   *
   * Provides access to the streaming system for monitoring
   * load progress and statistics.
   *
   * @returns StreamingSystem instance
   *
   * @example
   * ```typescript
   * const streaming = viewer.getStreamingSystem();
   * const stats = streaming.getStats();
   * console.log(`Loading: ${stats.activeLoads}/${stats.pendingRequests}`);
   * ```
   */
  getStreamingSystem(): StreamingSystem {
    return this.streamingSystem;
  }

  /**
   * Get the traversal system
   *
   * Provides access to the traversal system for monitoring
   * LOD traversal results and statistics.
   *
   * @returns TraversalSystem instance
   *
   * @example
   * ```typescript
   * const traversal = viewer.getTraversalSystem();
   * const result = traversal.getLastResult();
   * console.log(`Visible nodes: ${result.visibleNodes.length}, Points: ${result.totalPoints}`);
   * ```
   */
  getTraversalSystem(): TraversalSystem {
    return this.traversalSystem;
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

    // Start the scheduler
    this.scheduler.start();

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

    // Stop the scheduler
    this.scheduler.stop();
  }

  /**
   * Animation loop
   */
  private animate(timestamp: number): void {
    if (!this.isAnimating) {
      return;
    }

    this.animationId = requestAnimationFrame((ts) => this.animate(ts));

    const deltaTime = (timestamp - this.lastTimestamp) / 1000; // Convert to seconds
    this.lastTimestamp = timestamp;

    // Update event
    this.emit('update', { deltaTime, timestamp });

    // Update all systems through scheduler
    this.scheduler.update(deltaTime);

    // Update visible nodes and trigger streaming loads
    this.updateVisibleNodes();

    // Render
    this.render();

    // Render event
    this.emit('render', { deltaTime, timestamp });
  }

  /**
   * Update visible nodes and trigger streaming loads
   *
   * Connects TraversalSystem with StreamingSystem:
   * 1. Gets visible nodes from TraversalSystem traversal result
   * 2. Updates visibility textures on octrees
   * 3. Requests loading of unloaded nodes via StreamingSystem
   * 4. Updates PointCloudScene visibility
   */
  private updateVisibleNodes(): void {
    // Get traversal result from last update
    const result = this.traversalSystem.getLastResult();

    // Group visible nodes by point cloud
    const nodesByCloud = new Map<string, Array<typeof result.visibleNodes[number]>>();

    for (const visibleNode of result.visibleNodes) {
      const cloudName = this.getPointCloudNameByOctree(visibleNode.octree);
      if (!cloudName) continue;

      if (!nodesByCloud.has(cloudName)) {
        nodesByCloud.set(cloudName, []);
      }
      nodesByCloud.get(cloudName)!.push(visibleNode);
    }

    // Process each point cloud
    for (const [cloudName, visibleNodes] of nodesByCloud) {
      const octree = this.pointClouds.get(cloudName);
      if (!octree) continue;

      // Update visibility texture (if octree supports it)
      // TODO: Phase 4 - implement updateVisibilityTexture on octree
      // octree.updateVisibilityTexture?.(visibleNodes.map(vn => vn.node));

      // Request loading for unloaded nodes
      for (const visibleNode of visibleNodes) {
        const node = visibleNode.node;

        // Only load if not already loaded and not currently loading
        if (!node.loaded && !node.loading) {
          // Calculate priority based on traversal priority
          const priority = this.calculateLoadPriority(visibleNode);

          // Request load from StreamingSystem
          this.streamingSystem.requestLoad(octree, node, priority);
        }
      }

      // Update PointCloudScene visibility
      const scene = this.pointCloudScenes.get(cloudName);
      if (scene) {
        const visibleNodeIds = new Set(visibleNodes.map((vn) => vn.node.name));
        scene.updateVisibility(visibleNodeIds);
      }
    }
  }

  /**
   * Calculate load priority for a node
   *
   * Priority is based on:
   * - Distance to camera (closer = higher priority)
   * - Screen size (larger = higher priority)
   * - Node level (lower level = higher priority)
   *
   * @param visibleNode - Visible node info from TraversalSystem
   * @returns Priority value (higher = more important)
   */
  private calculateLoadPriority(visibleNode: {
    readonly distance: number;
    readonly screenSize: number;
    readonly node: { readonly level: number };
    readonly priority: number;
  }): number {
    // Use the priority already calculated by TraversalSystem
    // This ensures consistency between traversal and streaming
    return visibleNode.priority;
  }

  /**
   * Get point cloud name by octree reference
   *
   * @param octree - Octree to search for
   * @returns Cloud name or undefined
   */
  private getPointCloudNameByOctree(octree: IPointCloudOctree): string | undefined {
    for (const [name, cloud] of this.pointClouds.entries()) {
      if (cloud === octree) {
        return name;
      }
    }
    return undefined;
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

    // Dispose scheduler and all systems
    this.scheduler.dispose();

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
