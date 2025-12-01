/**
 * Potree-specific type definitions
 *
 * These types are specific to the Potree point cloud format.
 */

import type * as THREE from 'three';
import type { PointAttributeType } from '../attributes/PointAttribute.js';

// Re-export types from attributes module to avoid duplication
export type { PointAttributeType } from '../attributes/PointAttribute.js';
export { PointAttributeDataType } from '../attributes/PointAttribute.js';

// ============================================================================
// Point Attributes (Interfaces only)
// ============================================================================

/**
 * Point attribute interface
 */
export interface IPointAttribute {
  name: string;
  type: PointAttributeType;
  numElements: number;
  byteSize: number;
  description?: string;
}

/**
 * Point attributes collection interface
 */
export interface IPointAttributes {
  attributes: IPointAttribute[];
  byteSize: number;
  size: number;
}

// ============================================================================
// Potree Metadata
// ============================================================================

/**
 * Potree 2.0 attribute metadata
 */
export interface IPotreeAttributeMetadata {
  name: string;
  size: number;
  numElements?: number;
  /** Alias for numElements, used in some Potree 2.0 metadata files */
  elements?: number;
  elementSize: number;
  type: string;
  description?: string;
}

/**
 * Potree 2.0 bounding box format
 * Supports both array format (min/max) and legacy Potree 1.x format (lx/ly/lz/ux/uy/uz)
 */
export interface IPotree2xBoundingBox {
  min?: [number, number, number];
  max?: [number, number, number];
  /** Legacy Potree 1.x: lower x coordinate */
  lx?: number;
  /** Legacy Potree 1.x: lower y coordinate */
  ly?: number;
  /** Legacy Potree 1.x: lower z coordinate */
  lz?: number;
  /** Legacy Potree 1.x: upper x coordinate */
  ux?: number;
  /** Legacy Potree 1.x: upper y coordinate */
  uy?: number;
  /** Legacy Potree 1.x: upper z coordinate */
  uz?: number;
}

/**
 * Potree 2.0 hierarchy metadata
 */
export interface IPotree2xHierarchy {
  firstChunkSize: number;
  stepSize: number;
  depth: number;
}

/**
 * Potree 2.0 metadata (metadata.json format)
 */
export interface IPotreeMetadata {
  version: string;
  octreeDir?: string;
  boundingBox: IPotree2xBoundingBox;
  tightBoundingBox?: IPotree2xBoundingBox;
  pointAttributes: IPotreeAttributeMetadata[];
  spacing: number;
  scale: [number, number, number];
  points: number;
  projection?: string;
  hierarchy?: IPotree2xHierarchy;
  /** Potree 2.0: offset for coordinates */
  offset?: [number, number, number];
  /** Potree 2.0: encoding type */
  encoding?: string;
  /** Potree 2.0: attributes array with detailed metadata */
  attributes?: IPotreeAttributeMetadata[];
}

// ============================================================================
// Point Cloud Octree
// ============================================================================

/**
 * Point cloud octree interface
 */
export interface IPointCloudOctree {
  url: string;
  spacing: number;
  boundingBox: THREE.Box3;
  tightBoundingBox: THREE.Box3;
  root: IPointCloudOctreeNode | null;
  pointAttributes: IPointAttributes;
  projection: string | null;
  version: string;
  scale: number;
  /** Transform matrix (added at runtime by scene) */
  matrixWorld?: THREE.Matrix4;
  /** Custom file loader for non-HTTP sources (e.g., local file system) */
  customFileLoader?: (path: string) => Promise<ArrayBuffer>;
  /**
   * Potree 2.0: encoding type for point data
   * - 'DEFAULT': uncompressed data
   * - 'BROTLI': Brotli compressed data
   */
  encoding?: 'DEFAULT' | 'BROTLI';
}

/**
 * Point cloud octree node interface
 */
export interface IPointCloudOctreeNode {
  name: string;
  level: number;
  boundingBox: THREE.Box3;
  numPoints: number;
  children: (IPointCloudOctreeNode | null)[];
  loaded: boolean;
  loading: boolean;

  /**
   * Node type (Potree 2.0):
   * - 0: normal node (has data in octree.bin)
   * - 1: leaf node (has data in octree.bin, no children)
   * - 2: proxy node (hierarchy not loaded yet, need to load hierarchy chunk)
   */
  nodeType?: number;

  /**
   * Byte offset in hierarchy.bin for proxy nodes (Potree 2.0)
   * When nodeType=2, this indicates where to load the hierarchy chunk
   */
  hierarchyByteOffset?: number | bigint;

  /**
   * Byte size in hierarchy.bin for proxy nodes (Potree 2.0)
   * When nodeType=2, this indicates the size of the hierarchy chunk
   */
  hierarchyByteSize?: number | bigint;

  /**
   * Visibility texture offset for GPU LOD traversal
   * Set during traversal to indicate node position in visibility texture
   */
  vnStart?: number;

  /**
   * Three.js BufferGeometry (cached after loading)
   * Used for rendering and resource cleanup
   */
  geometry?: THREE.BufferGeometry;

  /**
   * Byte offset in octree.bin (Potree 2.0)
   */
  byteOffset?: number;

  /**
   * Byte size in octree.bin (Potree 2.0)
   */
  byteSize?: number;
}

// ============================================================================
// Worker Interfaces
// ============================================================================

/**
 * Decoded point cloud node data
 */
export interface IDecodedNodeData {
  buffer: ArrayBuffer;
  numPoints: number;
  mean: [number, number, number];
  tightBoundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  attributeBuffers: Record<
    string,
    {
      buffer: ArrayBuffer;
      attribute: IPointAttribute;
    }
  >;
}

/**
 * Worker decode request
 */
export interface IWorkerDecodeRequest {
  buffer: ArrayBuffer;
  pointAttributes: IPointAttributes;
  version: string;
  offset: [number, number, number];
  scale: number | [number, number, number]; // 支持单一值或数组 [x, y, z]
  spacing: number;
  hasChildren: number;
  name: string;
  numPoints: number; // Potree 2.0: 从元数据中读取的点数
}

/**
 * Worker decode response
 */
export interface IWorkerDecodeResponse {
  buffer: ArrayBuffer;
  numPoints: number;
  mean: [number, number, number];
  tightBoundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  attributeBuffers: Record<
    string,
    {
      buffer: ArrayBuffer;
      attribute: IPointAttribute;
      preciseBuffer?: ArrayBuffer;
      offset?: number;
      scale?: number;
    }
  >;
  error?: string;
}
