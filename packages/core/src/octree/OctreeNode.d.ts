/**
 * Octree node for hierarchical point cloud storage
 *
 * Migrated from Potree PointCloudOctreeNode
 */
import * as THREE from 'three';
import type { PointAttributes } from '../attributes/PointAttributes.js';
/**
 * Represents a node in the octree hierarchy
 */
export declare class OctreeNode {
    /** Node name (e.g., "r", "r0", "r01", etc.) */
    readonly name: string;
    /** Child nodes (up to 8 children) */
    readonly children: (OctreeNode | null)[];
    /** Bounding box in local space */
    readonly boundingBox: THREE.Box3;
    /** Bounding sphere (computed from bounding box) */
    readonly boundingSphere: THREE.Sphere;
    /** Octree level (0 = root) */
    readonly level: number;
    /** Number of points in this node */
    numPoints: number;
    /** Point spacing at this level */
    spacing: number;
    /** Geometry data (loaded on demand) */
    geometry: THREE.BufferGeometry | null;
    /** Whether geometry is loaded */
    loaded: boolean;
    /** Point attributes for this node */
    attributes: PointAttributes | null;
    constructor(name: string, boundingBox: THREE.Box3, spacing: number, level?: number);
    /**
     * Get child node by index (0-7)
     */
    getChild(index: number): OctreeNode | null;
    /**
     * Set child node
     */
    setChild(index: number, child: OctreeNode): void;
    /**
     * Get all non-null children
     */
    getChildren(): OctreeNode[];
    /**
     * Check if node is a leaf (has no children)
     */
    isLeaf(): boolean;
    /**
     * Check if node is loaded
     */
    isLoaded(): boolean;
    /**
     * Get node level in the octree
     */
    getLevel(): number;
    /**
     * Get number of points
     */
    getNumPoints(): number;
    /**
     * Get bounding box
     */
    getBoundingBox(): THREE.Box3;
    /**
     * Get bounding sphere
     */
    getBoundingSphere(): THREE.Sphere;
    /**
     * Compute child bounding box for a given octant index
     * @param index Octant index (0-7)
     */
    static computeChildBoundingBox(parentBox: THREE.Box3, index: number): THREE.Box3;
    /**
     * Create child node for a given octant
     */
    createChild(index: number): OctreeNode;
    /**
     * Dispose of node resources
     */
    dispose(): void;
}
//# sourceMappingURL=OctreeNode.d.ts.map