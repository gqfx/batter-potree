/**
 * Core event type definitions
 */

import type { OctreeNode } from '../octree/OctreeNode.js';
import type { PointCloudOctree } from '../octree/PointCloudOctree.js';

/**
 * Point cloud related events
 */
export interface PointCloudEvents {
  'visibility-changed': { visible: boolean; pointCloud: PointCloudOctree };
  'name-changed': { name: string; pointCloud: PointCloudOctree };
  'transformation-changed': { pointCloud: PointCloudOctree };
  'node-loaded': { node: OctreeNode; pointCloud: PointCloudOctree };
  'node-disposed': { node: OctreeNode; pointCloud: PointCloudOctree };
  // biome-ignore lint/suspicious/noExplicitAny: Event map index signature requires any for type flexibility
  [key: string]: any; // 索引签名，满足 EventMap 约束
}

/**
 * Loader related events
 */
export interface LoaderEvents {
  'load-start': { url: string };
  'load-progress': { loaded: number; total: number; percentage: number };
  'load-complete': { url: string; data: unknown };
  'load-error': { url: string; error: Error };
  // biome-ignore lint/suspicious/noExplicitAny: Event map index signature requires any for type flexibility
  [key: string]: any;
}

/**
 * Measurement related events
 */
export interface MeasurementEvents {
  'measurement-added': { id: string; type: string };
  'measurement-removed': { id: string };
  'measurement-changed': { id: string };
  // biome-ignore lint/suspicious/noExplicitAny: Event map index signature requires any for type flexibility
  [key: string]: any;
}

/**
 * Camera control events
 */
export interface CameraEvents {
  'camera-changed': { position: [number, number, number]; target: [number, number, number] };
  'camera-move-start': Record<string, never>;
  'camera-move-end': Record<string, never>;
  // biome-ignore lint/suspicious/noExplicitAny: Event map index signature requires any for type flexibility
  [key: string]: any;
}
