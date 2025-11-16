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
  elements: number;
  elementSize: number;
  type: string;
  description?: string;
}

/**
 * Potree metadata (cloud.js / metadata.json format)
 */
export interface IPotreeMetadata {
  version: string;
  octreeDir: string;
  boundingBox: {
    lx: number;
    ly: number;
    lz: number;
    ux: number;
    uy: number;
    uz: number;
  };
  tightBoundingBox?: {
    lx: number;
    ly: number;
    lz: number;
    ux: number;
    uy: number;
    uz: number;
  };
  pointAttributes: string[] | IPotreeAttributeMetadata[];
  spacing: number;
  scale: number;
  points: number;
  projection?: string;
  hierarchy?: unknown;
  hierarchyStepSize?: number;
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
