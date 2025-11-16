/**
 * Core event type definitions
 */
import type { OctreeNode } from '../octree/OctreeNode.js';
import type { PointCloudOctree } from '../octree/PointCloudOctree.js';
/**
 * Point cloud related events
 */
export interface PointCloudEvents {
    'visibility-changed': {
        visible: boolean;
        pointCloud: PointCloudOctree;
    };
    'name-changed': {
        name: string;
        pointCloud: PointCloudOctree;
    };
    'transformation-changed': {
        pointCloud: PointCloudOctree;
    };
    'node-loaded': {
        node: OctreeNode;
        pointCloud: PointCloudOctree;
    };
    'node-disposed': {
        node: OctreeNode;
        pointCloud: PointCloudOctree;
    };
    [key: string]: any;
}
/**
 * Loader related events
 */
export interface LoaderEvents {
    'load-start': {
        url: string;
    };
    'load-progress': {
        loaded: number;
        total: number;
        percentage: number;
    };
    'load-complete': {
        url: string;
        data: unknown;
    };
    'load-error': {
        url: string;
        error: Error;
    };
    [key: string]: any;
}
/**
 * Measurement related events
 */
export interface MeasurementEvents {
    'measurement-added': {
        id: string;
        type: string;
    };
    'measurement-removed': {
        id: string;
    };
    'measurement-changed': {
        id: string;
    };
    [key: string]: any;
}
/**
 * Camera control events
 */
export interface CameraEvents {
    'camera-changed': {
        position: [number, number, number];
        target: [number, number, number];
    };
    'camera-move-start': Record<string, never>;
    'camera-move-end': Record<string, never>;
    [key: string]: any;
}
//# sourceMappingURL=types.d.ts.map