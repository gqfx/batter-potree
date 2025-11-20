/**
 * Main Viewer class - high-level API for better-potree
 */

import type {
  EDLConfig,
  IPointCloudOctree,
  IRenderer,
  IScene,
  IWorkerDecodeResponse,
} from '@better-potree/core';
import {
  PointCloudColorMode,
  PointShape,
  PointSizeType,
  StreamingSystem,
  SystemScheduler,
  TraversalSystem,
  TypedEventEmitter,
  createDecoderWorkerPool,
  type WorkerPool,
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
  /**
   * Enable Worker-based decoding
   * @default true
   */
  enableWorkerDecoding?: boolean;
  /**
   * Maximum number of worker threads for decoding
   * @default navigator.hardwareConcurrency - 1
   */
  maxWorkers?: number;
  /**
   * Custom Worker URL for the BinaryDecoderWorker
   * If not provided, will try to resolve from import.meta.url
   */
  workerUrl?: string;
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

  // Worker Pool
  private workerPool?: WorkerPool;

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

    // Initialize Worker Pool for decoding
    const enableWorkerDecoding = config.enableWorkerDecoding ?? true;
    if (enableWorkerDecoding) {
      try {
        // Get Worker URL - use config or try to resolve from import.meta.url
        let workerUrl = config.workerUrl;
        if (!workerUrl) {
          try {
            workerUrl = new URL('./loaders/workers/BinaryDecoderWorker.js', import.meta.url).href;
          } catch {
            console.warn('[Viewer] Could not resolve Worker URL from import.meta.url');
          }
        }

        if (workerUrl) {
          const maxWorkers = config.maxWorkers ?? Math.max(1, (navigator.hardwareConcurrency || 4) - 1);

          console.log('[Viewer] Creating Worker Pool with URL:', workerUrl, 'maxWorkers:', maxWorkers);

          this.workerPool = createDecoderWorkerPool(workerUrl, maxWorkers);
        } else {
          console.warn('[Viewer] No Worker URL available, Worker decoding disabled');
        }
      } catch (error) {
        console.error('[Viewer] Failed to create Worker Pool:', error);
      }
    }

    // Initialize systems
    this.scheduler = new SystemScheduler({
      enableProfiling: true,
      errorHandler: (_error, _systemName) => {
      },
    });

    // Create StreamingSystem config
    const streamingConfig: {
      maxConcurrentLoads: number;
      maxRetries: number;
      maxRequestsPerFrame: number;
      workerPool?: WorkerPool;
    } = {
      maxConcurrentLoads: 8,
      maxRetries: 3,
      maxRequestsPerFrame: 10,
    };

    if (this.workerPool) {
      streamingConfig.workerPool = this.workerPool;
    }

    this.streamingSystem = new StreamingSystem(streamingConfig);

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

      console.log('[ViewerAPI] onLoadComplete callback triggered', { nodeName: node.name, numPoints: data.numPoints });

      // Find the point cloud scene for this octree
      const cloudName = this.getPointCloudNameByOctree(octree);
      console.log('[ViewerAPI] cloudName:', cloudName);
      if (!cloudName) {
        console.warn('[ViewerAPI] No cloudName found for octree');
        return;
      }

      const scene = this.pointCloudScenes.get(cloudName);
      console.log('[ViewerAPI] pointCloudScene:', scene);
      if (!scene) {
        console.warn('[ViewerAPI] No PointCloudScene found for cloudName:', cloudName);
        return;
      }

      try {
        // Create geometry from decoded data
        console.log('[ViewerAPI] Creating geometry from decoded data...');
        const geometry = this.createGeometry(data);
        console.log('[ViewerAPI] Geometry created:', geometry);

        // Calculate pcIndex (index in point clouds map)
        // For single point cloud, pcIndex is 0
        // For multiple point clouds, use the index in the map
        const pcIndex = Array.from(this.pointClouds.keys()).indexOf(cloudName);

        // Prepare node metadata for PointCloudScene
        const metadata = {
          level: node.level,
          vnStart: node.vnStart ?? 0, // Use vnStart from node or 0 if undefined
          pcIndex: pcIndex >= 0 ? pcIndex : 0,
          numPoints: data.numPoints,
        };

        console.log('[ViewerAPI] Adding node to PointCloudScene...', { nodeName: node.name, metadata });
        // Add node to PointCloudScene
        scene.addNode(node.name, geometry, metadata);
        console.log('[ViewerAPI] Node added successfully. Scene children:', scene.children.length);

        // Update node state
        node.loaded = true;
        node.loading = false;
        node.geometry = geometry; // Cache geometry reference on node
        node.numPoints = data.numPoints; // Update numPoints from actual data
      } catch (error) {
        console.error('[ViewerAPI] Error in onLoadComplete:', error);
        if (error instanceof Error) {
          console.error('[ViewerAPI] Error stack:', error.stack);
        }

        // Update node state on error
        node.loading = false;
        node.loaded = false;
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

      // Update node state
      node.loading = false;
      node.loaded = false;

      // Emit node-load-failed event for external listeners
      this.emit('node-load-failed', {
        node,
        error,
        retries,
      });
    });
  }

  /**
   * Validate geometry data from Worker decode response
   *
   * @param data - Worker decode response
   * @throws {Error} If positions are missing or invalid
   *
   * @example
   * ```typescript
   * this.validateGeometryData(data);
   * ```
   */
  private validateGeometryData(data: IWorkerDecodeResponse): void {
    // Check if we have attributeBuffers
    if (!data.attributeBuffers || Object.keys(data.attributeBuffers).length === 0) {
      throw new Error('Geometry data must contain attributeBuffers');
    }

    // Check for position data (POSITION_CARTESIAN is the standard Potree attribute name)
    const positionBuffer = data.attributeBuffers.POSITION_CARTESIAN;
    if (!positionBuffer || !positionBuffer.buffer) {
      throw new Error('Geometry data must contain POSITION_CARTESIAN attribute');
    }

    // Validate position buffer size
    const positionArray = new Float32Array(positionBuffer.buffer);
    if (positionArray.length === 0) {
      throw new Error('Position buffer is empty');
    }

    // Validate that position buffer size matches numPoints
    const expectedLength = data.numPoints * 3;
    if (positionArray.length !== expectedLength) {
    }

    // Validate other attributes if present
    const validateAttribute = (name: string, componentsPerPoint: number) => {
      const attr = data.attributeBuffers[name];
      if (attr?.buffer) {
        const array = new Float32Array(attr.buffer);
        const expectedLength = data.numPoints * componentsPerPoint;
        if (array.length !== expectedLength) {
        }
      }
    };

    // Validate common attributes
    validateAttribute('rgba', 4);
    validateAttribute('NORMAL', 3);
    validateAttribute('NORMAL_OCT16', 3);
    validateAttribute('NORMAL_SPHEREMAPPED', 3);
  }

  /**
   * Create THREE.BufferGeometry from Worker decode response
   *
   * Converts decoded point cloud data into a THREE.BufferGeometry with
   * appropriate attributes for rendering.
   *
   * @param data - Worker decode response containing attribute buffers
   * @returns THREE.BufferGeometry with position, color, and other attributes
   * @throws {Error} If position data is missing or invalid
   *
   * @example
   * ```typescript
   * const geometry = this.createGeometry(decodeResponse);
   * scene.addNode(nodeId, geometry, metadata);
   * ```
   */
  private createGeometry(data: IWorkerDecodeResponse): THREE.BufferGeometry {
    // Validate data first
    this.validateGeometryData(data);

    const geometry = new THREE.BufferGeometry();
    const attributeBuffers = data.attributeBuffers;

    console.log('[createGeometry] Processing attributes:', Object.keys(attributeBuffers));
    console.log('[createGeometry] data.numPoints:', data.numPoints);

    // Process each attribute buffer
    for (const attributeName in attributeBuffers) {
      const attrData = attributeBuffers[attributeName];
      if (!attrData) continue;

      const { buffer, attribute } = attrData;

      console.log(`[createGeometry] Processing attribute: ${attributeName}, buffer.byteLength: ${buffer.byteLength}, detached: ${buffer.byteLength === 0}`);

      // Check if buffer is detached
      if (buffer.byteLength === 0) {
        console.error(`[createGeometry] Buffer for ${attributeName} is detached!`);
        throw new Error(`Buffer for ${attributeName} has been detached`);
      }

      // Create typed array from buffer
      const array = new Float32Array(buffer);

      // Map Potree attribute names to THREE.js attribute names and handle special cases
      if (attributeName === 'POSITION_CARTESIAN') {
        // Position attribute (required)
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(array, 3));
      } else if (attributeName === 'rgba') {
        // Color attribute - convert from Uint8 RGBA to Float32 RGB
        // Note: Potree stores as Uint8Array, we need to convert to [0,1] range
        const uint8Array = new Uint8Array(buffer);
        const numPoints = uint8Array.length / 4;
        const colorArray = new Float32Array(numPoints * 3);
        for (let i = 0; i < numPoints; i++) {
          colorArray[i * 3 + 0] = uint8Array[i * 4 + 0]! / 255; // r
          colorArray[i * 3 + 1] = uint8Array[i * 4 + 1]! / 255; // g
          colorArray[i * 3 + 2] = uint8Array[i * 4 + 2]! / 255; // b
          // Alpha is ignored
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
      } else if (
        attributeName === 'NORMAL' ||
        attributeName === 'NORMAL_OCT16' ||
        attributeName === 'NORMAL_SPHEREMAPPED'
      ) {
        // Normal attributes (all decoded to Float32Array by worker)
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(array, 3));
      } else if (attributeName === 'intensity' || attributeName === 'INTENSITY') {
        // Intensity attribute - single component
        const bufferAttribute = new THREE.Float32BufferAttribute(array, 1);

        // Store additional metadata if available (for potential shader usage)
        if (attrData.offset !== undefined || attrData.scale !== undefined) {
          (bufferAttribute as unknown as { potree: unknown }).potree = {
            offset: attrData.offset,
            scale: attrData.scale,
            preciseBuffer: attrData.preciseBuffer,
          };
        }

        geometry.setAttribute('intensity', bufferAttribute);
      } else if (attributeName === 'classification' || attributeName === 'CLASSIFICATION') {
        // Classification attribute - single component
        const bufferAttribute = new THREE.Float32BufferAttribute(array, 1);

        if (attrData.offset !== undefined || attrData.scale !== undefined) {
          (bufferAttribute as unknown as { potree: unknown }).potree = {
            offset: attrData.offset,
            scale: attrData.scale,
            preciseBuffer: attrData.preciseBuffer,
          };
        }

        geometry.setAttribute('classification', bufferAttribute);
      } else if (attributeName === 'INDICES') {
        // Indices attribute (for GPU LOD traversal)
        const uint8Array = new Uint8Array(buffer);
        const bufferAttribute = new THREE.Uint8BufferAttribute(uint8Array, 4);
        bufferAttribute.normalized = true;
        geometry.setAttribute('indices', bufferAttribute);
      } else if (attributeName === 'SPACING') {
        // Spacing attribute (for adaptive point size)
        geometry.setAttribute('spacing', new THREE.Float32BufferAttribute(array, 1));
      } else {
        // Generic attribute - store as Float32 with single component
        const bufferAttribute = new THREE.Float32BufferAttribute(array, 1);

        // Store metadata for custom attributes
        if (attrData.offset !== undefined || attrData.scale !== undefined) {
          (bufferAttribute as unknown as { potree: unknown }).potree = {
            offset: attrData.offset,
            scale: attrData.scale,
            preciseBuffer: attrData.preciseBuffer,
            range: attribute.description ? JSON.parse(attribute.description) : undefined,
          };
        }

        geometry.setAttribute(attributeName, bufferAttribute);
      }
    }

    // Compute bounding box and sphere for frustum culling
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
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
    console.log('[Viewer.load] Starting load process...', { url, name });

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL: URL must be a non-empty string');
    }

    // Determine point cloud name
    const cloudName = name || this.extractNameFromUrl(url);
    console.log('[Viewer.load] Cloud name:', cloudName);

    // Check if point cloud with this name already exists
    if (this.pointClouds.has(cloudName)) {
      throw new Error(`Point cloud "${cloudName}" is already loaded`);
    }

    try {
      // 1. Create loader if not already created
      // TODO: Consider injecting loader in constructor for better testability
      const { PotreeLoader } = await import('./loaders/PotreeLoader.js');
      const loader = new PotreeLoader();
      console.log('[Viewer.load] Loader created');

      // 2. Load metadata and create octree structure
      console.log('[Viewer.load] Loading metadata from:', url);
      const octree = await loader.load(url);
      console.log('[Viewer.load] Octree loaded:', {
        version: octree.version,
        hasRoot: !!octree.root,
        rootLoaded: octree.root?.loaded,
        rootNumPoints: octree.root?.numPoints,
        spacing: octree.spacing,
        boundingBox: octree.boundingBox,
      });

      // 3. Store in point clouds map
      this.pointClouds.set(cloudName, octree);
      console.log('[Viewer.load] Octree stored in pointClouds map');

      // 4. Create PointCloudScene with material
      const material = this.createMaterial();
      console.log('[Viewer.load] Material created:', {
        size: material.size,
        colorMode: material.colorMode,
        sizeType: material.sizeType,
        shape: material.shape,
      });

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
      console.log('[Viewer.load] PointCloudScene created:', {
        children: pointCloudScene.children.length,
        visible: pointCloudScene.visible,
        material: pointCloudScene.material,
      });

      // 5. Add to Three.js scene
      const threeScene = this.scene.getThreeScene?.();
      if (threeScene) {
        threeScene.add(pointCloudScene);
        console.log('[Viewer.load] PointCloudScene added to Three.js scene. Scene children:', threeScene.children.length);
      } else {
        console.warn('[Viewer.load] No Three.js scene available!');
      }

      // 6. Store in point cloud scenes map
      this.pointCloudScenes.set(cloudName, pointCloudScene);
      console.log('[Viewer.load] PointCloudScene stored in map. Total scenes:', this.pointCloudScenes.size);

      // 7. Add to TraversalSystem for LOD traversal
      this.traversalSystem.addPointCloud(cloudName, octree);
      console.log('[Viewer.load] Octree added to TraversalSystem');

      // 8. Emit loaded event
      this.emit('pointcloud-loaded', {
        pointCloud: octree,
        name: cloudName,
      });
      console.log('[Viewer.load] Emitted pointcloud-loaded event');

      // 9. Request loading root node immediately
      if (octree.root && !octree.root.loaded && !octree.root.loading) {
        console.log('[Viewer.load] Requesting root node load...');
        this.streamingSystem.requestLoad(octree, octree.root, 1.0);
      } else {
        console.log('[Viewer.load] Root node state:', {
          hasRoot: !!octree.root,
          loaded: octree.root?.loaded,
          loading: octree.root?.loading,
        });
      }

      console.log('[Viewer.load] Load process completed successfully');
      return octree;
    } catch (error) {
      console.error('[Viewer.load] Load process failed:', error);

      // Clean up on error
      this.pointClouds.delete(cloudName);
      this.pointCloudScenes.delete(cloudName);

      // Re-throw with more context
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load point cloud from "${url}": ${errorMessage}`);
    }
  }

  /**
   * Add an already-loaded point cloud octree to the viewer
   *
   * Use this method when you have loaded the octree using a custom loader
   * (e.g., for local file system access) and want to add it to the viewer.
   *
   * @param octree - The loaded point cloud octree
   * @param name - Optional name for the point cloud (auto-generated if not provided)
   * @returns The same octree that was passed in
   * @throws {Error} If a point cloud with the same name already exists
   *
   * @example
   * ```typescript
   * const viewer = new Viewer({ ... });
   *
   * // Load with custom loader
   * const customLoader = new PotreeLoader({ customFileLoader: myLoader });
   * const octree = await customLoader.load('metadata.json');
   *
   * // Add to viewer
   * viewer.addPointCloud(octree, 'myCloud');
   * ```
   */
  addPointCloud(octree: IPointCloudOctree, name?: string): IPointCloudOctree {
    // Determine point cloud name
    const cloudName = name || this.extractNameFromUrl(octree.url || 'pointcloud');

    // Check if point cloud with this name already exists
    if (this.pointClouds.has(cloudName)) {
      throw new Error(`Point cloud "${cloudName}" is already loaded`);
    }

    try {
      // 1. Store in point clouds map
      this.pointClouds.set(cloudName, octree);

      // 2. Create PointCloudScene with material
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

      // 3. Add to Three.js scene
      const threeScene = this.scene.getThreeScene?.();
      if (threeScene) {
        threeScene.add(pointCloudScene);
      }

      // 4. Store in point cloud scenes map
      this.pointCloudScenes.set(cloudName, pointCloudScene);

      // 5. Add to TraversalSystem for LOD traversal
      this.traversalSystem.addPointCloud(cloudName, octree);

      // 6. Emit loaded event
      this.emit('pointcloud-loaded', {
        pointCloud: octree,
        name: cloudName,
      });

      // 7. Request loading root node immediately
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
      throw new Error(`Failed to add point cloud "${cloudName}": ${errorMessage}`);
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
   *
   * Cleans up all resources associated with the point cloud:
   * - Removes from TraversalSystem
   * - Disposes all node geometries
   * - Removes from Three.js scene
   * - Cleans up PointCloudScene
   *
   * @param pointCloud - Point cloud to remove or its name
   *
   * @example
   * ```typescript
   * viewer.remove('myCloud');
   * // or
   * viewer.remove(octree);
   * ```
   */
  remove(pointCloud: IPointCloudOctree | string): void {
    const name = typeof pointCloud === 'string' ? pointCloud : this.getPointCloudName(pointCloud);
    const cloud = this.pointClouds.get(name);

    if (!cloud) {
      return;
    }

    // Remove from TraversalSystem
    this.traversalSystem.removePointCloud(name);

    // Cleanup all node geometries recursively
    // This traverses the octree and disposes geometry for all loaded nodes
    if (cloud.root) {
      this.cleanupNodeGeometry(cloud.root);
    }

    // Remove from Three.js scene and dispose PointCloudScene
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
   * Recursively cleanup node geometry
   *
   * Traverses the octree hierarchy and disposes geometry for all loaded nodes.
   * This ensures proper memory cleanup when removing a point cloud.
   *
   * @param node - Root node to start cleanup from
   *
   * @internal
   */
  private cleanupNodeGeometry(node: any): void {
    // Dispose geometry if loaded
    if (node.geometry) {
      node.geometry.dispose();
      node.geometry = undefined;
      node.loaded = false;
    }

    // Recursively cleanup children
    if (node.children) {
      for (const child of node.children) {
        if (child) {
          this.cleanupNodeGeometry(child);
        }
      }
    }
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
   * Get all point cloud names
   *
   * @returns Array of point cloud names
   *
   * @example
   * ```typescript
   * const names = viewer.getPointCloudNames();
   * console.log('Loaded clouds:', names);
   * ```
   */
  getPointCloudNames(): string[] {
    return Array.from(this.pointClouds.keys());
  }

  /**
   * Check if a point cloud is loaded
   *
   * @param name - Point cloud name
   * @returns True if point cloud exists
   *
   * @example
   * ```typescript
   * if (viewer.hasPointCloud('myCloud')) {
   *   console.log('myCloud is loaded');
   * }
   * ```
   */
  hasPointCloud(name: string): boolean {
    return this.pointClouds.has(name);
  }

  /**
   * Set visibility for a point cloud
   *
   * When a point cloud is hidden, it will not be traversed or rendered,
   * but it remains loaded in memory.
   *
   * @param name - Point cloud name or reference
   * @param visible - Visibility flag
   *
   * @example
   * ```typescript
   * viewer.setPointCloudVisible('myCloud', false); // Hide
   * viewer.setPointCloudVisible('myCloud', true);  // Show
   * ```
   */
  setPointCloudVisible(name: string | IPointCloudOctree, visible: boolean): void {
    const cloudName = typeof name === 'string' ? name : this.getPointCloudName(name);
    const cloud = this.pointClouds.get(cloudName);

    if (!cloud) {
      return;
    }

    // Update point cloud scene visibility
    const scene = this.pointCloudScenes.get(cloudName);
    if (scene) {
      scene.visible = visible;
    }

    // Update traversal system
    if (visible) {
      // Re-add to traversal if not already present
      if (!this.traversalSystem.hasPointCloud(cloudName)) {
        this.traversalSystem.addPointCloud(cloudName, cloud);
      }
    } else {
      // Remove from traversal to stop LOD updates
      this.traversalSystem.removePointCloud(cloudName);
    }

    this.emit('pointcloud-visibility-changed', {
      pointCloud: cloud,
      name: cloudName,
      visible,
    });
  }

  /**
   * Get visibility of a point cloud
   *
   * @param name - Point cloud name or reference
   * @returns True if visible, false if hidden or not found
   *
   * @example
   * ```typescript
   * const isVisible = viewer.isPointCloudVisible('myCloud');
   * ```
   */
  isPointCloudVisible(name: string | IPointCloudOctree): boolean {
    const cloudName = typeof name === 'string' ? name : this.getPointCloudName(name);
    const scene = this.pointCloudScenes.get(cloudName);
    return scene?.visible ?? false;
  }

  /**
   * Set transform for a point cloud
   *
   * Allows independent positioning, rotation, and scaling of each point cloud.
   * The transform is applied to the PointCloudScene.
   *
   * @param name - Point cloud name or reference
   * @param position - Position vector (optional)
   * @param rotation - Rotation euler angles in radians (optional)
   * @param scale - Scale vector (optional)
   *
   * @example
   * ```typescript
   * // Move cloud to new position
   * viewer.setPointCloudTransform('cloud1', { x: 10, y: 0, z: 5 });
   *
   * // Rotate cloud 90 degrees around Y axis
   * viewer.setPointCloudTransform('cloud2', undefined, { x: 0, y: Math.PI / 2, z: 0 });
   *
   * // Scale cloud
   * viewer.setPointCloudTransform('cloud3', undefined, undefined, { x: 2, y: 2, z: 2 });
   *
   * // Combined transform
   * viewer.setPointCloudTransform('cloud4',
   *   { x: 10, y: 0, z: 0 },
   *   { x: 0, y: Math.PI / 4, z: 0 },
   *   { x: 1.5, y: 1.5, z: 1.5 }
   * );
   * ```
   */
  setPointCloudTransform(
    name: string | IPointCloudOctree,
    position?: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number },
    scale?: { x: number; y: number; z: number }
  ): void {
    const cloudName = typeof name === 'string' ? name : this.getPointCloudName(name);
    const scene = this.pointCloudScenes.get(cloudName);

    if (!scene) {
      return;
    }

    // Apply transform to PointCloudScene
    if (position) {
      scene.position.set(position.x, position.y, position.z);
    }

    if (rotation) {
      scene.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    if (scale) {
      scene.scale.set(scale.x, scale.y, scale.z);
    }

    // Update matrix
    scene.updateMatrix();
    scene.updateMatrixWorld(true);

    const cloud = this.pointClouds.get(cloudName);
    if (cloud) {
      this.emit('pointcloud-transform-changed', {
        pointCloud: cloud,
        name: cloudName,
        position: scene.position.clone(),
        rotation: scene.rotation.clone(),
        scale: scene.scale.clone(),
      });
    }
  }

  /**
   * Reset transform for a point cloud to identity
   *
   * @param name - Point cloud name or reference
   *
   * @example
   * ```typescript
   * viewer.resetPointCloudTransform('myCloud');
   * ```
   */
  resetPointCloudTransform(name: string | IPointCloudOctree): void {
    this.setPointCloudTransform(
      name,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 1 }
    );
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

    // 每5秒输出一次详细信息
    const now = performance.now();
    if (!this._lastVisibleNodesDebugTime || now - this._lastVisibleNodesDebugTime > 5000) {
      this._lastVisibleNodesDebugTime = now;
      console.log('[Viewer.updateVisibleNodes] Traversal result:', {
        visibleNodesCount: result.visibleNodes.length,
        totalPoints: result.totalPoints,
        pointCloudsCount: this.pointClouds.size,
      });
    }

    // Group visible nodes by point cloud
    const nodesByCloud = new Map<string, Array<typeof result.visibleNodes[number]>>();

    for (const visibleNode of result.visibleNodes) {
      const cloudName = this.getPointCloudNameByOctree(visibleNode.octree);
      if (!cloudName) continue;

      if (!nodesByCloud.has(cloudName)) {
        nodesByCloud.set(cloudName, []);
      }
      nodesByCloud.get(cloudName)?.push(visibleNode);
    }

    // Process each point cloud
    for (const [cloudName, visibleNodes] of nodesByCloud) {
      const octree = this.pointClouds.get(cloudName);
      if (!octree) continue;

      // Update visibility texture (if octree supports it)
      // TODO: Phase 4 - implement updateVisibilityTexture on octree
      // octree.updateVisibilityTexture?.(visibleNodes.map(vn => vn.node));

      // Request loading for unloaded nodes
      let requestedLoads = 0;
      for (const visibleNode of visibleNodes) {
        const node = visibleNode.node;

        // Only load if not already loaded and not currently loading
        if (!node.loaded && !node.loading) {
          // Calculate priority based on traversal priority
          const priority = this.calculateLoadPriority(visibleNode);

          // Request load from StreamingSystem
          this.streamingSystem.requestLoad(octree, node, priority);
          requestedLoads++;
        }
      }

      if (requestedLoads > 0 && (!this._lastVisibleNodesDebugTime || now - this._lastVisibleNodesDebugTime > 5000)) {
        console.log(`[Viewer.updateVisibleNodes] Requested ${requestedLoads} loads for ${cloudName}`);
      }

      // Update PointCloudScene visibility
      const scene = this.pointCloudScenes.get(cloudName);
      if (scene) {
        const visibleNodeIds = new Set(visibleNodes.map((vn) => vn.node.name));
        scene.updateVisibility(visibleNodeIds);
      }
    }
  }

  private _lastVisibleNodesDebugTime?: number;

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
   * Get the count of loaded nodes across all point clouds
   *
   * Traverses all octrees and counts nodes that have been successfully loaded.
   *
   * @returns Total number of loaded nodes
   *
   * @example
   * ```typescript
   * const loadedCount = viewer.getLoadedNodesCount();
   * console.log(`${loadedCount} nodes loaded`);
   * ```
   */
  getLoadedNodesCount(): number {
    let count = 0;
    for (const octree of this.pointClouds.values()) {
      if (octree.root) {
        count += this.countLoadedNodes(octree.root);
      }
    }
    return count;
  }

  /**
   * Get the total number of points loaded across all point clouds
   *
   * Sums up the point count from all loaded nodes.
   *
   * @returns Total number of points loaded
   *
   * @example
   * ```typescript
   * const totalPoints = viewer.getTotalPointsLoaded();
   * console.log(`${totalPoints} points loaded`);
   * ```
   */
  getTotalPointsLoaded(): number {
    let total = 0;
    for (const octree of this.pointClouds.values()) {
      if (octree.root) {
        total += this.countLoadedPoints(octree.root);
      }
    }
    return total;
  }

  /**
   * Recursively count loaded nodes in an octree
   *
   * @param node - Node to start counting from
   * @returns Number of loaded nodes
   *
   * @internal
   */
  private countLoadedNodes(node: any): number {
    let count = node.loaded ? 1 : 0;

    if (node.children) {
      for (const child of node.children) {
        if (child) {
          count += this.countLoadedNodes(child);
        }
      }
    }

    return count;
  }

  /**
   * Recursively count loaded points in an octree
   *
   * @param node - Node to start counting from
   * @returns Number of points in loaded nodes
   *
   * @internal
   */
  private countLoadedPoints(node: any): number {
    let total = 0;

    if (node.loaded && node.numPoints) {
      total += node.numPoints;
    }

    if (node.children) {
      for (const child of node.children) {
        if (child) {
          total += this.countLoadedPoints(child);
        }
      }
    }

    return total;
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

    // Dispose Worker Pool
    if (this.workerPool) {
      this.workerPool.dispose();
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
