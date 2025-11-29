/**
 * Point cloud scene manager for Three.js
 *
 * Manages all loaded point cloud nodes within a Three.js scene graph.
 * Provides unified material management, dynamic node addition/removal,
 * and automatic uniform updates through onBeforeRender hooks.
 *
 * @module @better-potree/rendering-three
 */

import * as THREE from 'three';
import {
  PointCloudMaterial,
  type PointCloudMaterialConfig,
} from './materials/PointCloudMaterial.js';

/**
 * Node metadata for tracking node-specific information
 */
interface NodeMetadata {
  /** Octree level of this node */
  level: number;
  /** Visibility node start index (for LOD) */
  vnStart: number;
  /** Point cloud index (for multiple point clouds) */
  pcIndex: number;
  /** Number of points in this node */
  numPoints: number;
  /** Whether the node is currently visible */
  isVisible: boolean;
  /** Node position (boundingBox.min) for correct spatial placement */
  position?: THREE.Vector3;
}

/**
 * Configuration for PointCloudScene
 */
export interface PointCloudSceneConfig {
  /** Initial material configuration */
  materialConfig?: PointCloudMaterialConfig;
  /** Octree spacing for adaptive point sizing */
  octreeSpacing?: number;
}

/**
 * Point cloud scene manager
 *
 * Extends THREE.Group to manage all point cloud nodes in a unified way.
 * Features:
 * - Dynamic node addition/removal
 * - Unified material management (single material for all nodes)
 * - Automatic uniform updates via onBeforeRender hooks
 * - Visibility control for LOD systems
 * - Resource lifecycle management
 *
 * @example
 * ```typescript
 * const scene = new PointCloudScene();
 *
 * // Add a node with geometry
 * const geometry = new THREE.BufferGeometry();
 * geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
 * scene.addNode('r', geometry, { level: 0 });
 *
 * // Update visibility based on LOD
 * const visibleNodes = new Set(['r', 'r0', 'r1']);
 * scene.updateVisibility(visibleNodes);
 *
 * // Change material properties
 * scene.material.size = 2.0;
 *
 * // Cleanup
 * scene.dispose();
 * ```
 */
export class PointCloudScene extends THREE.Group {
  /**
   * Shared material for all point cloud nodes
   */
  public readonly material: PointCloudMaterial;

  /**
   * Map of node IDs to their Three.js Points objects
   */
  private readonly nodeMap: Map<string, THREE.Points>;

  /**
   * Map of node IDs to their metadata
   */
  private readonly metadataMap: Map<string, NodeMetadata>;

  /**
   * Octree spacing for adaptive point sizing
   */
  private _octreeSpacing: number;

  /**
   * Total number of visible points across all nodes
   */
  private _visiblePointCount: number;

  /**
   * One-time dispose handlers for cleanup
   */
  private readonly disposeHandlers: Array<() => void>;

  /**
   * Create a new PointCloudScene
   *
   * @param config - Configuration options
   *
   * @example
   * ```typescript
   * const scene = new PointCloudScene({
   *   materialConfig: {
   *     size: 1.5,
   *     colorMode: PointCloudColorMode.RGB,
   *   },
   *   octreeSpacing: 0.5,
   * });
   * ```
   */
  constructor(config: PointCloudSceneConfig = {}) {
    super();

    // Create shared material
    this.material = new PointCloudMaterial(config.materialConfig);

    // Initialize maps
    this.nodeMap = new Map();
    this.metadataMap = new Map();

    // Initialize properties
    this._octreeSpacing = config.octreeSpacing ?? 1.0;
    this._visiblePointCount = 0;
    this.disposeHandlers = [];

    // Update material with octree spacing
    this.material.updateOctreeSpacing(this._octreeSpacing);

    // Set object name for debugging
    this.name = 'PointCloudScene';
  }

  /**
   * Get the total number of visible points
   */
  public get visiblePointCount(): number {
    return this._visiblePointCount;
  }

  /**
   * Get the octree spacing
   */
  public get octreeSpacing(): number {
    return this._octreeSpacing;
  }

  /**
   * Set the octree spacing
   */
  public set octreeSpacing(value: number) {
    this._octreeSpacing = value;
    this.material.updateOctreeSpacing(value);
  }

  /**
   * Get the number of loaded nodes
   */
  public get nodeCount(): number {
    return this.nodeMap.size;
  }

  /**
   * Add a point cloud node to the scene
   *
   * Creates a THREE.Points object with the provided geometry and shared material.
   * Sets up onBeforeRender hook to automatically update node-level uniforms.
   *
   * @param nodeId - Unique identifier for the node (e.g., 'r', 'r0', 'r01')
   * @param geometry - BufferGeometry containing point data
   * @param metadata - Optional node metadata (level, visibility info)
   * @throws {Error} If a node with the same ID already exists
   *
   * @example
   * ```typescript
   * const geometry = new THREE.BufferGeometry();
   * const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
   * geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
   *
   * scene.addNode('r0', geometry, { level: 1, numPoints: 2 });
   * ```
   */
  public addNode(
    nodeId: string,
    geometry: THREE.BufferGeometry,
    metadata: Partial<NodeMetadata> = {},
  ): void {
    // Check for duplicate node
    if (this.nodeMap.has(nodeId)) {
      throw new Error(`Node "${nodeId}" already exists in the scene`);
    }

    // Create Points object with shared material
    const points = new THREE.Points(geometry, this.material);
    points.name = `PointCloudNode_${nodeId}`;

    // Set frustum culling to false for now (octree handles culling)
    points.frustumCulled = false;

    // **关键修复**: 设置节点位置为 boundingBox.min
    // 参考 potree-core: sceneNode.position.copy(geometryNode.boundingBox.min)
    // 这确保每个节点渲染在正确的空间位置
    if (metadata.position) {
      points.position.copy(metadata.position);
    }

    // Store metadata
    const nodeMetadata: NodeMetadata = {
      level: metadata.level ?? this.extractLevelFromId(nodeId),
      vnStart: metadata.vnStart ?? 0,
      pcIndex: metadata.pcIndex ?? 0,
      numPoints: metadata.numPoints ?? this.getPointCount(geometry),
      isVisible: metadata.isVisible ?? true,
    };
    // 只有当 position 存在时才添加到 metadata
    if (metadata.position) {
      nodeMetadata.position = metadata.position;
    }
    this.metadataMap.set(nodeId, nodeMetadata);

    // Setup onBeforeRender hook for automatic uniform updates
    points.onBeforeRender = (
      _renderer: THREE.WebGLRenderer,
      _scene: THREE.Scene,
      _camera: THREE.Camera,
      _geometry: THREE.BufferGeometry,
      material: THREE.Material,
      _group: THREE.Group,
    ) => {
      // Update node-level uniforms if material has uniforms
      if (material instanceof THREE.ShaderMaterial && material.uniforms) {
        // Level uniform for LOD-based sizing (uLevel in shader)
        if (material.uniforms.uLevel) {
          material.uniforms.uLevel.value = nodeMetadata.level;
        }

        // Visibility node start for LOD (uVNStart in shader)
        if (material.uniforms.uVNStart) {
          material.uniforms.uVNStart.value = nodeMetadata.vnStart;
        }

        // Point cloud index for multi-cloud rendering (uPCIndex in shader)
        if (material.uniforms.uPCIndex) {
          material.uniforms.uPCIndex.value = nodeMetadata.pcIndex;
        }
      }
    };

    // Add to scene graph
    this.add(points);

    // Store in map
    this.nodeMap.set(nodeId, points);

    // Update visibility
    points.visible = nodeMetadata.isVisible;
    if (nodeMetadata.isVisible) {
      this._visiblePointCount += nodeMetadata.numPoints;
    }
  }

  /**
   * Remove a point cloud node from the scene
   *
   * Removes the node from the scene graph, disposes its geometry,
   * and cleans up all associated resources.
   *
   * @param nodeId - ID of the node to remove
   * @returns True if the node was found and removed, false otherwise
   *
   * @example
   * ```typescript
   * const removed = scene.removeNode('r0');
   * if (removed) {
   *   console.log('Node r0 removed successfully');
   * }
   * ```
   */
  public removeNode(nodeId: string): boolean {
    const points = this.nodeMap.get(nodeId);
    if (!points) {
      return false;
    }

    const metadata = this.metadataMap.get(nodeId);

    // Update visible point count
    if (metadata?.isVisible) {
      this._visiblePointCount -= metadata.numPoints;
    }

    // Remove from scene graph
    this.remove(points);

    // Dispose geometry (material is shared, don't dispose it here)
    points.geometry.dispose();

    // Clear onBeforeRender hook
    points.onBeforeRender = () => {};

    // Remove from maps
    this.nodeMap.delete(nodeId);
    this.metadataMap.delete(nodeId);

    return true;
  }

  /**
   * Update the shared material for all nodes
   *
   * Replaces the current material with a new one across all nodes.
   * The old material is disposed automatically.
   *
   * @param material - New material to use
   *
   * @example
   * ```typescript
   * const newMaterial = new PointCloudMaterial({
   *   colorMode: PointCloudColorMode.ELEVATION,
   *   size: 2.0,
   * });
   * scene.updateMaterial(newMaterial);
   * ```
   */
  public updateMaterial(material: PointCloudMaterial): void {
    // Update all nodes to use new material
    for (const points of this.nodeMap.values()) {
      points.material = material;
    }

    // Dispose old material
    (this.material as PointCloudMaterial).dispose();

    // Replace reference (note: this is readonly, so we need to bypass)
    (this as { material: PointCloudMaterial }).material = material;

    // Update octree spacing on new material
    material.updateOctreeSpacing(this._octreeSpacing);
  }

  /**
   * Update visibility of nodes based on LOD calculation
   *
   * Shows only the nodes in the provided set, hiding all others.
   * Updates the visible point count accordingly.
   *
   * @param visibleNodes - Set of node IDs that should be visible
   *
   * @example
   * ```typescript
   * // After LOD calculation
   * const visibleNodes = new Set(['r', 'r0', 'r1', 'r01']);
   * scene.updateVisibility(visibleNodes);
   * console.log(`Visible points: ${scene.visiblePointCount}`);
   * ```
   */
  public updateVisibility(visibleNodes: Set<string>): void {
    let totalVisiblePoints = 0;

    for (const [nodeId, points] of this.nodeMap) {
      const metadata = this.metadataMap.get(nodeId);
      const shouldBeVisible = visibleNodes.has(nodeId);

      if (metadata) {
        metadata.isVisible = shouldBeVisible;
        if (shouldBeVisible) {
          totalVisiblePoints += metadata.numPoints;
        }
      }

      points.visible = shouldBeVisible;
    }

    this._visiblePointCount = totalVisiblePoints;
  }

  /**
   * Get a node by its ID
   *
   * @param nodeId - ID of the node to retrieve
   * @returns The THREE.Points object or undefined if not found
   *
   * @example
   * ```typescript
   * const node = scene.getNode('r0');
   * if (node) {
   *   node.position.set(10, 0, 0);
   * }
   * ```
   */
  public getNode(nodeId: string): THREE.Points | undefined {
    return this.nodeMap.get(nodeId);
  }

  /**
   * Get metadata for a node
   *
   * @param nodeId - ID of the node
   * @returns Node metadata or undefined if not found
   *
   * @example
   * ```typescript
   * const metadata = scene.getNodeMetadata('r0');
   * console.log(`Node level: ${metadata?.level}`);
   * ```
   */
  public getNodeMetadata(nodeId: string): NodeMetadata | undefined {
    return this.metadataMap.get(nodeId);
  }

  /**
   * Update metadata for a node
   *
   * @param nodeId - ID of the node
   * @param metadata - Partial metadata to update
   * @returns True if the node was found and updated, false otherwise
   *
   * @example
   * ```typescript
   * scene.updateNodeMetadata('r0', { vnStart: 5, pcIndex: 1 });
   * ```
   */
  public updateNodeMetadata(nodeId: string, metadata: Partial<NodeMetadata>): boolean {
    const existing = this.metadataMap.get(nodeId);
    if (!existing) {
      return false;
    }

    const wasVisible = existing.isVisible;
    const oldNumPoints = existing.numPoints;

    // Update metadata
    Object.assign(existing, metadata);

    // Update visible point count if necessary
    if ('isVisible' in metadata || 'numPoints' in metadata) {
      if (wasVisible) {
        this._visiblePointCount -= oldNumPoints;
      }
      if (existing.isVisible) {
        this._visiblePointCount += existing.numPoints;
      }
    }

    return true;
  }

  /**
   * Check if a node exists
   *
   * @param nodeId - ID of the node to check
   * @returns True if the node exists
   */
  public hasNode(nodeId: string): boolean {
    return this.nodeMap.has(nodeId);
  }

  /**
   * Get all node IDs
   *
   * @returns Array of all node IDs
   */
  public getNodeIds(): string[] {
    return Array.from(this.nodeMap.keys());
  }

  /**
   * Get all visible node IDs
   *
   * @returns Array of visible node IDs
   */
  public getVisibleNodeIds(): string[] {
    const visibleIds: string[] = [];
    for (const [nodeId, metadata] of this.metadataMap) {
      if (metadata.isVisible) {
        visibleIds.push(nodeId);
      }
    }
    return visibleIds;
  }

  /**
   * Update camera uniforms on the material
   *
   * @param camera - Camera to use for uniform updates
   *
   * @example
   * ```typescript
   * const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
   * scene.updateCamera(camera);
   * ```
   */
  public updateCamera(camera: THREE.Camera): void {
    this.material.updateCamera(camera);
  }

  /**
   * Update screen size uniforms on the material
   *
   * @param width - Screen width in pixels
   * @param height - Screen height in pixels
   *
   * @example
   * ```typescript
   * scene.updateScreenSize(window.innerWidth, window.innerHeight);
   * ```
   */
  public updateScreenSize(width: number, height: number): void {
    this.material.updateScreenSize(width, height);
  }

  /**
   * Add a one-time dispose handler
   *
   * @param handler - Function to call on dispose
   */
  public addDisposeHandler(handler: () => void): void {
    this.disposeHandlers.push(handler);
  }

  /**
   * Dispose of all resources
   *
   * Removes all nodes, disposes geometries and material,
   * and cleans up all associated resources.
   *
   * @example
   * ```typescript
   * // When done with the point cloud scene
   * scene.dispose();
   * ```
   */
  public dispose(): void {
    // Call one-time dispose handlers
    for (const handler of this.disposeHandlers) {
      try {
        handler();
      } catch (_error) {
      }
    }
    this.disposeHandlers.length = 0;

    // Remove and dispose all nodes
    for (const points of this.nodeMap.values()) {
      this.remove(points);
      points.geometry.dispose();
      points.onBeforeRender = () => {};
    }

    // Clear maps
    this.nodeMap.clear();
    this.metadataMap.clear();

    // Dispose material
    this.material.dispose();

    // Reset counters
    this._visiblePointCount = 0;
  }

  /**
   * Extract level from node ID
   *
   * @param nodeId - Node ID (e.g., 'r', 'r0', 'r01')
   * @returns Level number (0 for 'r', 1 for 'r0', 2 for 'r01', etc.)
   */
  private extractLevelFromId(nodeId: string): number {
    // Root node 'r' is level 0, 'r0' is level 1, 'r01' is level 2, etc.
    return Math.max(0, nodeId.length - 1);
  }

  /**
   * Get point count from geometry
   *
   * @param geometry - BufferGeometry to count points from
   * @returns Number of points in the geometry
   */
  private getPointCount(geometry: THREE.BufferGeometry): number {
    const position = geometry.getAttribute('position');
    if (position) {
      return position.count;
    }
    return 0;
  }
}
