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
  /** Number of elements (Potree 1.x uses 'elements', Potree 2.0 uses 'numElements') */
  elements?: number;
  numElements?: number;
  elementSize: number;
  type: string;
  description?: string;
}

/**
 * Potree 1.x bounding box format
 */
export interface IPotree1xBoundingBox {
  lx: number;
  ly: number;
  lz: number;
  ux: number;
  uy: number;
  uz: number;
}

/**
 * Potree 2.0 bounding box format
 */
export interface IPotree2xBoundingBox {
  min: [number, number, number];
  max: [number, number, number];
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
 * Potree metadata (cloud.js / metadata.json format)
 */
export interface IPotreeMetadata {
  version: string;
  octreeDir?: string;
  /** Potree 1.x format */
  boundingBox: IPotree1xBoundingBox | IPotree2xBoundingBox;
  /** Potree 1.x format */
  tightBoundingBox?: IPotree1xBoundingBox | IPotree2xBoundingBox;
  pointAttributes: string | string[] | IPotreeAttributeMetadata[];
  spacing: number;
  /** Potree 1.x: number, Potree 2.0: [number, number, number] */
  scale: number | [number, number, number];
  points: number;
  projection?: string;
  /** Potree 1.x: unknown, Potree 2.0: IPotree2xHierarchy */
  hierarchy?: unknown | IPotree2xHierarchy;
  hierarchyStepSize?: number;
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
  scale: number;
  spacing: number;
  hasChildren: number;
  name: string;
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
