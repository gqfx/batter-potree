/**
 * Point cloud octree for hierarchical LOD rendering
 *
 * Migrated from Potree PointCloudOctree
 */
import * as THREE from 'three';
import type { PointAttributes } from '../attributes/PointAttributes.js';
import { OctreeNode } from './OctreeNode.js';
/**
 * Octree-based point cloud with hierarchical LOD
 */
export declare class PointCloudOctree {
    /** Root node of the octree */
    root: OctreeNode;
    /** Bounding box of the entire point cloud */
    readonly boundingBox: THREE.Box3;
    /** Bounding sphere */
    readonly boundingSphere: THREE.Sphere;
    /** Point budget (max points to render) */
    pointBudget: number;
    /** Minimum node pixel size for LOD selection */
    minimumNodePixelSize: number;
    /** Visible nodes (updated during culling) */
    visibleNodes: OctreeNode[];
    /** Number of visible points */
    numVisiblePoints: number;
    /** Point cloud name */
    name: string;
    /** Point attributes */
    pointAttributes: PointAttributes;
    /** Base spacing */
    spacing: number;
    /** Maximum octree level */
    maxLevel: number;
    /** World transformation offset */
    offset: THREE.Vector3;
    constructor(boundingBox: THREE.Box3, spacing: number, pointAttributes: PointAttributes, offset?: THREE.Vector3);
    /**
     * Set point cloud name
     */
    setName(name: string): void;
    /**
     * Get point cloud name
     */
    getName(): string;
    /**
     * Find node by name
     * @param name Node name (e.g., "r", "r0", "r01")
     */
    findNode(name: string): OctreeNode | null;
    /**
     * Get all nodes at a specific level
     */
    getNodesAtLevel(level: number): OctreeNode[];
    /**
     * Traverse all nodes in the octree
     */
    traverse(callback: (node: OctreeNode) => void): void;
    /**
     * Get total number of points in the octree
     */
    getTotalPoints(): number;
    /**
     * Dispose of octree resources
     */
    dispose(): void;
}
//# sourceMappingURL=PointCloudOctree.d.ts.map