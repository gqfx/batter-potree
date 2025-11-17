/**
 * Potree point cloud loader
 * Loads Potree format point clouds (1.x and 2.0)
 *
 * @module @better-potree/viewer/loaders
 * @example
 * ```ts
 * const loader = new PotreeLoader();
 * const octree = await loader.load('http://example.com/pointcloud/');
 * console.log(`Loaded ${octree.pointAttributes.size} attributes`);
 * ```
 */

import type {
  ILoader,
  IPointCloudOctree,
  IPointCloudOctreeNode,
  IPotreeMetadata,
} from '@better-potree/core';
import * as THREE from 'three';
import { parseAttributes } from './parseAttributes.js';
import { Version } from './Version.js';

/**
 * Custom file loader function type
 *
 * Used for loading files from non-standard sources (e.g., local file system)
 *
 * @param path - Relative path to the file
 * @returns Promise resolving to file content as ArrayBuffer
 */
export type CustomFileLoader = (path: string) => Promise<ArrayBuffer>;

/**
 * Potree loader configuration
 */
export interface PotreeLoaderConfig {
  /** Custom fetch options */
  readonly fetchOptions?: RequestInit;
  /** Base URL override */
  readonly baseUrl?: string;
  /** Whether to automatically load hierarchy */
  readonly autoLoadHierarchy?: boolean;
  /**
   * Custom file loader function for non-HTTP sources
   *
   * When provided, this function will be used instead of fetch() to load files.
   * Useful for loading from local file system or other custom sources.
   *
   * @example
   * ```ts
   * const loader = new PotreeLoader({
   *   customFileLoader: async (path) => {
   *     const fileHandle = await getFileHandle(path);
   *     const file = await fileHandle.getFile();
   *     return await file.arrayBuffer();
   *   }
   * });
   * ```
   */
  readonly customFileLoader?: CustomFileLoader;
}

/**
 * Potree 2.0 hierarchy information
 */
interface HierarchyNode {
  /** Node name (e.g., "r", "r0", "r01") */
  readonly name: string;
  /** Number of points in this node */
  readonly numPoints: number;
  /** Child mask (8 bits for 8 children) */
  readonly childMask: number;
}

/**
 * Potree loader class
 * Implements the ILoader interface for Potree format
 *
 * @remarks
 * Supports both Potree 1.x (cloud.js) and Potree 2.0 (metadata.json) formats.
 * The loader parses metadata, constructs the octree structure, and optionally
 * loads the hierarchy information.
 */
export class PotreeLoader implements ILoader<IPointCloudOctree> {
  private readonly config: {
    readonly fetchOptions: RequestInit;
    readonly baseUrl: string;
    readonly autoLoadHierarchy: boolean;
    readonly customFileLoader?: CustomFileLoader;
  };

  /**
   * Create a new PotreeLoader instance
   *
   * @param config - Loader configuration
   */
  constructor(config: PotreeLoaderConfig = {}) {
    this.config = {
      fetchOptions: config.fetchOptions ?? {},
      baseUrl: config.baseUrl ?? '',
      autoLoadHierarchy: config.autoLoadHierarchy ?? true,
    };

    // Only add customFileLoader if provided
    if (config.customFileLoader) {
      (this.config as any).customFileLoader = config.customFileLoader;
    }
  }

  /**
   * Normalize file path by removing leading './' or '/'
   *
   * @param path - Path to normalize
   * @returns Normalized path
   *
   * @example
   * ```ts
   * normalizePath('./data/r.bin')  // 'data/r.bin'
   * normalizePath('/data/r.bin')   // 'data/r.bin'
   * normalizePath('data/r.bin')    // 'data/r.bin'
   * ```
   */
  private normalizePath(path: string): string {
    return path.replace(/^\.?\//, '');
  }

  /**
   * Load a Potree point cloud from URL
   *
   * @param url - URL to the point cloud metadata file (cloud.js or metadata.json)
   * @returns Promise that resolves with the loaded octree
   * @throws {Error} If metadata cannot be loaded or parsed
   *
   * @example
   * ```ts
   * const loader = new PotreeLoader();
   * const octree = await loader.load('/data/lion_takanawa/');
   * console.log('Version:', octree.version);
   * console.log('Total points:', octree.root?.numPoints);
   * ```
   */
  async load(url: string): Promise<IPointCloudOctree> {
    // Determine metadata file path
    let metadataUrl = url;
    if (url.endsWith('/')) {
      metadataUrl = `${url}cloud.js`;
    } else if (!url.endsWith('.js') && !url.endsWith('.json')) {
      metadataUrl = `${url}/cloud.js`;
    }

    try {
      // Try loading as cloud.js first
      const metadata = await this.loadMetadata(metadataUrl);
      return this.parseMetadata(url, metadata);
    } catch (_error) {
      // Try metadata.json (Potree 2.0 format)
      const jsonUrl = metadataUrl.replace('cloud.js', 'metadata.json');
      const metadata = await this.loadMetadata(jsonUrl);
      return this.parseMetadata(url, metadata);
    }
  }

  /**
   * Load metadata file
   *
   * @param url - URL to metadata file
   * @returns Parsed metadata object
   * @throws {Error} If fetch fails or JSON is invalid
   */
  private async loadMetadata(url: string): Promise<IPotreeMetadata> {
    let text: string;

    if (this.config.customFileLoader) {
      // Use custom file loader with normalized path
      const normalizedPath = this.normalizePath(url);
      const buffer = await this.config.customFileLoader(normalizedPath);
      const decoder = new TextDecoder('utf-8');
      text = decoder.decode(buffer);
    } else {
      // Use standard fetch
      const response = await fetch(url, this.config.fetchOptions);
      if (!response.ok) {
        throw new Error(`Failed to load metadata from ${url}: ${response.statusText}`);
      }
      text = await response.text();
    }

    // Remove JSONP callback if present (for cloud.js format)
    if (text.startsWith('Potree.') || text.startsWith('var ')) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      text = text.substring(start, end + 1);
    }

    return JSON.parse(text) as IPotreeMetadata;
  }

  /**
   * Parse metadata and create octree structure
   *
   * @param baseUrl - Base URL of the point cloud
   * @param metadata - Parsed metadata object
   * @returns Complete octree structure
   */
  private async parseMetadata(
    baseUrl: string,
    metadata: IPotreeMetadata,
  ): Promise<IPointCloudOctree> {
    // Parse point attributes
    const pointAttributes = parseAttributes(metadata);

    // Parse bounding box
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(metadata.boundingBox.lx, metadata.boundingBox.ly, metadata.boundingBox.lz),
      new THREE.Vector3(metadata.boundingBox.ux, metadata.boundingBox.uy, metadata.boundingBox.uz),
    );

    // Parse tight bounding box (if available)
    const tightBoundingBox = metadata.tightBoundingBox
      ? new THREE.Box3(
          new THREE.Vector3(
            metadata.tightBoundingBox.lx,
            metadata.tightBoundingBox.ly,
            metadata.tightBoundingBox.lz,
          ),
          new THREE.Vector3(
            metadata.tightBoundingBox.ux,
            metadata.tightBoundingBox.uy,
            metadata.tightBoundingBox.uz,
          ),
        )
      : boundingBox.clone();

    // Determine octree directory
    let octreeDir = metadata.octreeDir;
    if (!octreeDir.endsWith('/')) {
      octreeDir += '/';
    }

    // Construct full URL
    let fullUrl = baseUrl;
    if (fullUrl.endsWith('cloud.js') || fullUrl.endsWith('metadata.json')) {
      fullUrl = fullUrl.substring(0, fullUrl.lastIndexOf('/'));
    }
    if (!fullUrl.endsWith('/')) {
      fullUrl += '/';
    }
    fullUrl += octreeDir;

    // Create root node
    const root = this.createRootNode(boundingBox, metadata);

    // Load hierarchy if auto-load is enabled
    if (this.config.autoLoadHierarchy && metadata.hierarchy) {
      const version = new Version(metadata.version);
      if (version.newerThan('1.9')) {
        await this.loadHierarchy(root, fullUrl, metadata);
      }
    }

    // Create octree object
    const octree: IPointCloudOctree = {
      url: fullUrl,
      spacing: metadata.spacing,
      boundingBox,
      tightBoundingBox,
      root,
      pointAttributes,
      projection: metadata.projection || null,
      version: metadata.version,
      scale: metadata.scale,
    };

    return octree;
  }

  /**
   * Create the root node of the octree
   *
   * @param boundingBox - Bounding box for the root
   * @param metadata - Metadata containing point count
   * @returns Root node
   */
  private createRootNode(
    boundingBox: THREE.Box3,
    metadata: IPotreeMetadata,
  ): IPointCloudOctreeNode {
    return {
      name: 'r',
      level: 0,
      boundingBox: boundingBox.clone(),
      numPoints: metadata.points || 0,
      children: new Array(8).fill(null),
      loaded: false,
      loading: false,
    };
  }

  /**
   * Load hierarchy information for Potree 2.0
   *
   * @param root - Root node to populate
   * @param baseUrl - Base URL for hierarchy files
   * @param metadata - Metadata with hierarchy info
   */
  private async loadHierarchy(
    root: IPointCloudOctreeNode,
    baseUrl: string,
    metadata: IPotreeMetadata,
  ): Promise<void> {
    // Potree 2.0 uses a binary hierarchy file
    const hierarchyUrl = `${baseUrl}hierarchy.bin`;

    try {
      let buffer: ArrayBuffer;

      if (this.config.customFileLoader) {
        // Use custom file loader with normalized path
        const normalizedPath = this.normalizePath(hierarchyUrl);
        buffer = await this.config.customFileLoader(normalizedPath);
      } else {
        // Use standard fetch
        const response = await fetch(hierarchyUrl, this.config.fetchOptions);
        if (!response.ok) {
          console.warn(`Failed to load hierarchy from ${hierarchyUrl}`);
          return;
        }
        buffer = await response.arrayBuffer();
      }

      const nodes = this.parseHierarchyBinary(buffer, metadata.hierarchyStepSize ?? 5);

      // Build tree structure from flat hierarchy
      this.buildTreeFromHierarchy(root, nodes);
    } catch (error) {
      console.warn('Failed to load hierarchy:', error);
    }
  }

  /**
   * Parse binary hierarchy file (Potree 2.0 format)
   *
   * @param buffer - Binary data
   * @param _stepSize - Hierarchy step size (reserved for future use)
   * @returns Array of hierarchy nodes
   */
  private parseHierarchyBinary(buffer: ArrayBuffer, _stepSize: number): HierarchyNode[] {
    const view = new DataView(buffer);
    const nodes: HierarchyNode[] = [];

    // Each entry is 22 bytes: 1 byte type + 4 byte childMask + 4 byte numPoints + 8 byte byteOffset + 4 byte byteSize
    const bytesPerNode = 22;
    const numNodes = buffer.byteLength / bytesPerNode;

    const stack: string[] = ['r'];

    for (let i = 0; i < numNodes && stack.length > 0; i++) {
      const offset = i * bytesPerNode;
      const type = view.getUint8(offset);
      const childMask = view.getUint8(offset + 1);
      const numPoints = view.getUint32(offset + 2, true);

      const name = stack.shift()!;
      nodes.push({ name, numPoints, childMask });

      // Add children to stack based on child mask
      if (type === 0 || type === 1) {
        // type 0 = internal node, type 1 = leaf node
        for (let childIndex = 0; childIndex < 8; childIndex++) {
          if ((childMask & (1 << childIndex)) !== 0) {
            const childName = name + childIndex;
            stack.push(childName);
          }
        }
      }
    }

    return nodes;
  }

  /**
   * Build tree structure from flat hierarchy
   *
   * @param root - Root node
   * @param nodes - Flat list of hierarchy nodes
   */
  private buildTreeFromHierarchy(root: IPointCloudOctreeNode, nodes: HierarchyNode[]): void {
    const nodeMap = new Map<string, IPointCloudOctreeNode>();
    nodeMap.set('r', root);

    // Update root with actual point count if available
    const rootHierarchy = nodes.find((n) => n.name === 'r');
    if (rootHierarchy) {
      root.numPoints = rootHierarchy.numPoints;
    }

    // Create child nodes
    for (const hierarchyNode of nodes) {
      if (hierarchyNode.name === 'r') continue;

      const parentName = hierarchyNode.name.slice(0, -1);
      const childIndex = parseInt(hierarchyNode.name.slice(-1), 10);
      const parent = nodeMap.get(parentName);

      if (parent) {
        const childNode = this.createChildNode(parent, childIndex, hierarchyNode.numPoints);
        parent.children[childIndex] = childNode;
        nodeMap.set(hierarchyNode.name, childNode);
      }
    }
  }

  /**
   * Create a child node from parent
   *
   * @param parent - Parent node
   * @param childIndex - Child index (0-7)
   * @param numPoints - Number of points in child
   * @returns New child node
   */
  private createChildNode(
    parent: IPointCloudOctreeNode,
    childIndex: number,
    numPoints: number,
  ): IPointCloudOctreeNode {
    // Calculate child bounding box
    const min = parent.boundingBox.min.clone();
    const max = parent.boundingBox.max.clone();
    const center = parent.boundingBox.getCenter(new THREE.Vector3());

    // Determine which octant based on child index
    // childIndex bits: x=bit0, y=bit1, z=bit2
    if ((childIndex & 1) === 0) {
      max.x = center.x;
    } else {
      min.x = center.x;
    }
    if ((childIndex & 2) === 0) {
      max.y = center.y;
    } else {
      min.y = center.y;
    }
    if ((childIndex & 4) === 0) {
      max.z = center.z;
    } else {
      min.z = center.z;
    }

    return {
      name: parent.name + childIndex,
      level: parent.level + 1,
      boundingBox: new THREE.Box3(min, max),
      numPoints,
      children: new Array(8).fill(null),
      loaded: false,
      loading: false,
    };
  }
}
