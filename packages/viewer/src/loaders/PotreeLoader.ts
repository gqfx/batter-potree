/**
 * Potree point cloud loader
 * Loads Potree 2.0 format point clouds
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
  IPotree1xBoundingBox,
  IPotree2xBoundingBox,
  IPotree2xHierarchy,
  IPotreeMetadata,
} from '@better-potree/core';
import * as THREE from 'three';
import { parseAttributes } from './parseAttributes.js';

/**
 * Check if bounding box is in Potree 2.0 format (array-based)
 */
function isPotree2xBoundingBox(
  box: IPotree1xBoundingBox | IPotree2xBoundingBox,
): box is IPotree2xBoundingBox {
  return 'min' in box && Array.isArray(box.min);
}

/**
 * Parse bounding box from either Potree 1.x or 2.0 format
 */
function parseBoundingBox(box: IPotree1xBoundingBox | IPotree2xBoundingBox): THREE.Box3 {
  if (isPotree2xBoundingBox(box)) {
    return new THREE.Box3(
      new THREE.Vector3(box.min[0], box.min[1], box.min[2]),
      new THREE.Vector3(box.max[0], box.max[1], box.max[2]),
    );
  } else {
    return new THREE.Box3(
      new THREE.Vector3(box.lx, box.ly, box.lz),
      new THREE.Vector3(box.ux, box.uy, box.uz),
    );
  }
}

/**
 * Parse scale from either Potree 1.x (number) or 2.0 (array) format
 * For Potree 2.0, we assume uniform scale and use the first value
 */
function parseScale(scale: number | [number, number, number]): number {
  if (Array.isArray(scale)) {
    return scale[0]; // Use first scale value for uniform scaling
  }
  return scale;
}

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
  /** Byte offset in octree.bin (Potree 2.0) */
  readonly byteOffset?: number;
  /** Byte size in octree.bin (Potree 2.0) */
  readonly byteSize?: number;
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
   * @param url - URL to the point cloud metadata file (metadata.json)
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
    // Determine metadata file path (Potree 2.0 format only)
    let metadataUrl = url;
    if (url.endsWith('/')) {
      metadataUrl = `${url}metadata.json`;
    } else if (!url.endsWith('.json')) {
      metadataUrl = `${url}/metadata.json`;
    }

    // Load Potree 2.0 metadata
    const metadata = await this.loadMetadata(metadataUrl);
    return this.parseMetadata(url, metadata);
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

    console.log('[PotreeLoader] pointAttributes.byteSize:', pointAttributes.byteSize);
    console.log('[PotreeLoader] pointAttributes.attributes:', pointAttributes.attributes.map(a => ({ name: a.name, byteSize: a.byteSize, type: a.type.name, numElements: a.numElements })));

    // Parse bounding box
    const boundingBox = parseBoundingBox(metadata.boundingBox);

    // Parse tight bounding box (if available)
    const tightBoundingBox = metadata.tightBoundingBox
      ? parseBoundingBox(metadata.tightBoundingBox)
      : boundingBox.clone();

    // Parse scale
    const scale = parseScale(metadata.scale);

    // Potree 2.0: octree data is in root directory (no subdirectory)
    const octreeDir = metadata.octreeDir || '';

    // Construct full URL
    let fullUrl = baseUrl;
    if (fullUrl.endsWith('metadata.json')) {
      fullUrl = fullUrl.substring(0, fullUrl.lastIndexOf('/'));
    }
    if (!fullUrl.endsWith('/')) {
      fullUrl += '/';
    }
    if (octreeDir) {
      fullUrl += octreeDir.endsWith('/') ? octreeDir : octreeDir + '/';
    }

    // Create root node
    const root = this.createRootNode(boundingBox, metadata);

    // Load hierarchy if auto-load is enabled (Potree 2.0 format)
    if (this.config.autoLoadHierarchy && metadata.hierarchy) {
      // Potree 2.0: hierarchy.bin is in root directory
      await this.loadHierarchy2(root, baseUrl, metadata);
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
      scale,
    };

    // Attach custom file loader if present
    if (this.config.customFileLoader) {
      octree.customFileLoader = this.config.customFileLoader;
    }

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
   * @param baseUrl - Base URL for hierarchy files (root directory, not octreeDir)
   * @param metadata - Metadata with hierarchy info
   */
  private async loadHierarchy2(
    root: IPointCloudOctreeNode,
    baseUrl: string,
    metadata: IPotreeMetadata,
  ): Promise<void> {
    // Potree 2.0: hierarchy.bin is in root directory
    let hierarchyUrl = baseUrl;
    if (hierarchyUrl.endsWith('cloud.js') || hierarchyUrl.endsWith('metadata.json')) {
      hierarchyUrl = hierarchyUrl.substring(0, hierarchyUrl.lastIndexOf('/'));
    }
    if (!hierarchyUrl.endsWith('/')) {
      hierarchyUrl += '/';
    }
    hierarchyUrl += 'hierarchy.bin';

    try {
      let buffer: ArrayBuffer;

      if (this.config.customFileLoader) {
        // Use custom file loader with normalized path
        const normalizedPath = this.normalizePath(hierarchyUrl);
        buffer = await this.config.customFileLoader(normalizedPath);
      } else {
        const response = await fetch(hierarchyUrl, this.config.fetchOptions);
        if (!response.ok) {
          return;
        }
        buffer = await response.arrayBuffer();
      }

      // Get hierarchy info from metadata
      const hierarchyInfo = metadata.hierarchy as IPotree2xHierarchy;
      const stepSize = hierarchyInfo?.stepSize ?? 4;

      const nodes = this.parseHierarchyBinary2(buffer, stepSize);

      // Build tree structure from flat hierarchy
      this.buildTreeFromHierarchy(root, nodes);
    } catch (_error) {
    }
  }

  /**
   * Parse binary hierarchy file (Potree 2.0 format)
   *
   * Potree 2.0 hierarchy format:
   * Each entry is 22 bytes:
   * - 1 byte: type (0=internal, 1=leaf, 2=proxy)
   * - 1 byte: childMask (8 bits for 8 children)
   * - 4 bytes: numPoints (uint32)
   * - 8 bytes: byteOffset (uint64)
   * - 8 bytes: byteSize (uint64)
   *
   * @param buffer - Binary data
   * @param _stepSize - Hierarchy step size
   * @returns Array of hierarchy nodes
   */
  private parseHierarchyBinary2(buffer: ArrayBuffer, _stepSize: number): HierarchyNode[] {
    const view = new DataView(buffer);
    const nodes: HierarchyNode[] = [];

    // Each entry is 22 bytes
    const bytesPerNode = 22;
    const numNodes = Math.floor(buffer.byteLength / bytesPerNode);

    const stack: string[] = ['r'];

    for (let i = 0; i < numNodes && stack.length > 0; i++) {
      const offset = i * bytesPerNode;
      const type = view.getUint8(offset);
      const childMask = view.getUint8(offset + 1);
      const numPoints = view.getUint32(offset + 2, true);
      // Read byteOffset as uint64 (we use Number which is safe up to 2^53)
      const byteOffsetLow = view.getUint32(offset + 6, true);
      const byteOffsetHigh = view.getUint32(offset + 10, true);
      const byteOffset = byteOffsetLow + byteOffsetHigh * 0x100000000;
      // Read byteSize as uint64
      const byteSizeLow = view.getUint32(offset + 14, true);
      const byteSizeHigh = view.getUint32(offset + 18, true);
      const byteSize = byteSizeLow + byteSizeHigh * 0x100000000;

      const name = stack.shift()!;
      nodes.push({ name, numPoints, childMask, byteOffset, byteSize });

      // Add children to stack based on child mask
      // type 0 = internal node, type 1 = leaf node, type 2 = proxy (needs separate load)
      if (type === 0 || type === 1) {
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

    // Update root with actual point count and byte info if available
    const rootHierarchy = nodes.find((n) => n.name === 'r');
    if (rootHierarchy) {
      root.numPoints = rootHierarchy.numPoints;
      if (rootHierarchy.byteOffset !== undefined) {
        root.byteOffset = rootHierarchy.byteOffset;
      }
      if (rootHierarchy.byteSize !== undefined) {
        root.byteSize = rootHierarchy.byteSize;
      }
    }

    // Create child nodes
    for (const hierarchyNode of nodes) {
      if (hierarchyNode.name === 'r') continue;

      const parentName = hierarchyNode.name.slice(0, -1);
      const childIndex = parseInt(hierarchyNode.name.slice(-1), 10);
      const parent = nodeMap.get(parentName);

      if (parent) {
        const childNode = this.createChildNode(
          parent,
          childIndex,
          hierarchyNode.numPoints,
          hierarchyNode.byteOffset,
          hierarchyNode.byteSize,
        );
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
   * @param byteOffset - Byte offset in octree.bin (Potree 2.0)
   * @param byteSize - Byte size in octree.bin (Potree 2.0)
   * @returns New child node
   */
  private createChildNode(
    parent: IPointCloudOctreeNode,
    childIndex: number,
    numPoints: number,
    byteOffset?: number,
    byteSize?: number,
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

    const node: IPointCloudOctreeNode = {
      name: parent.name + childIndex,
      level: parent.level + 1,
      boundingBox: new THREE.Box3(min, max),
      numPoints,
      children: new Array(8).fill(null),
      loaded: false,
      loading: false,
    };

    // Only set byte offset/size if they are defined
    if (byteOffset !== undefined) {
      node.byteOffset = byteOffset;
    }
    if (byteSize !== undefined) {
      node.byteSize = byteSize;
    }

    return node;
  }
}
