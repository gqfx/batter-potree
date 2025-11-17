/**
 * Visibility texture for GPU-accelerated LOD traversal
 *
 * Encodes octree hierarchy relationships into a texture that can be
 * used by GPU shaders for efficient point cloud rendering.
 *
 * @module octree
 */

import * as THREE from 'three';
import type { OctreeNode } from './OctreeNode.js';

/**
 * Visibility texture data structure
 */
export interface VisibilityTextureData {
  /** Raw texture data (RGBA) */
  readonly data: Uint8Array;
  /** Texture width */
  readonly width: number;
  /** Texture height */
  readonly height: number;
  /** Map from node to texture offset */
  readonly nodeOffsets: ReadonlyMap<OctreeNode, number>;
}

/**
 * Result of computeVisibilityTextureData
 */
export interface VisibilityTextureResult {
  /** Raw texture data */
  readonly data: Uint8Array;
  /** Node offset mapping */
  readonly offsets: Map<OctreeNode, number>;
}

/**
 * Visibility texture generator for GPU LOD traversal
 *
 * This class encodes octree hierarchy into a texture format that can be
 * efficiently processed by GPU shaders. Each visible node occupies one
 * pixel (4 bytes) in the texture, encoding:
 * - Byte 0: Child mask (8 bits for 8 children)
 * - Byte 1: Offset to first child (high byte)
 * - Byte 2: Offset to first child (low byte)
 * - Byte 3: LOD offset (density-based)
 *
 * @example
 * ```ts
 * const texture = new VisibilityTexture();
 * const visibleNodes = octree.visibleNodes;
 * const data = texture.compute(visibleNodes, camera);
 * const glTexture = texture.createTexture(data);
 * material.uniforms.visibilityTexture.value = glTexture;
 * ```
 */
export class VisibilityTexture {
  private texture: THREE.DataTexture | null = null;

  /**
   * Compute visibility texture data from visible nodes
   *
   * Encodes the octree hierarchy of visible nodes into a compact texture format.
   * Nodes are sorted by level and name to ensure parents appear before children.
   *
   * @param nodes - Array of visible nodes to encode
   * @returns Texture data and node offset mapping
   *
   * @example
   * ```ts
   * const texture = new VisibilityTexture();
   * const result = texture.compute(octree.visibleNodes, camera);
   * console.log(`Encoded ${result.offsets.size} nodes`);
   * ```
   */
  compute(nodes: readonly OctreeNode[]): VisibilityTextureResult {
    // Copy and sort nodes by level and name (e.g., r, r0, r3, r4, r01, r07, r30, ...)
    const sortedNodes = [...nodes].sort((a, b) => {
      const na = a.name;
      const nb = b.name;
      if (na.length !== nb.length) return na.length - nb.length;
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    });

    // Allocate texture data (4 bytes per node)
    const data = new Uint8Array(sortedNodes.length * 4);
    const offsets = new Map<OctreeNode, number>();
    const nodeMap = new Map<string, OctreeNode>();
    const offsetsToChild = new Array(sortedNodes.length).fill(Infinity);

    // First pass: build node map and compute offsets
    for (let i = 0; i < sortedNodes.length; i++) {
      const node = sortedNodes[i]!;
      nodeMap.set(node.name, node);
      offsets.set(node, i);

      if (i > 0) {
        // Compute parent-child offset
        const index = Number.parseInt(node.name.slice(-1), 10);
        const parentName = node.name.slice(0, -1);
        const parent = nodeMap.get(parentName);

        if (parent) {
          const parentOffset = offsets.get(parent);
          if (parentOffset !== undefined) {
            const parentOffsetToChild = i - parentOffset;

            // Update minimum offset to any child
            const currentOffset = offsetsToChild[parentOffset] as number;
            offsetsToChild[parentOffset] = Math.min(currentOffset, parentOffsetToChild);

            // Set child mask bit
            data[parentOffset * 4 + 0] = (data[parentOffset * 4 + 0] ?? 0) | (1 << index);

            // Set offset to first child
            data[parentOffset * 4 + 1] = offsetsToChild[parentOffset] >> 8;
            data[parentOffset * 4 + 2] = offsetsToChild[parentOffset] & 0xff;
          }
        }
      }

      // Encode LOD offset (placeholder for now, can be computed from node density)
      // This will be used by the shader to adjust LOD selection
      data[i * 4 + 3] = 100; // Default LOD offset
    }

    return { data, offsets };
  }

  /**
   * Create Three.js DataTexture from visibility data
   *
   * @param data - Visibility texture data
   * @returns Three.js DataTexture ready for use in shaders
   *
   * @example
   * ```ts
   * const result = texture.compute(visibleNodes, camera);
   * const glTexture = texture.createTexture(result);
   * material.uniforms.visibilityTexture.value = glTexture;
   * ```
   */
  createTexture(result: VisibilityTextureResult): THREE.DataTexture {
    // Dispose previous texture if exists
    if (this.texture) {
      this.texture.dispose();
    }

    // Calculate texture dimensions (width x height)
    const nodeCount = result.data.length / 4;
    const width = Math.ceil(Math.sqrt(nodeCount));
    const height = Math.ceil(nodeCount / width);

    // Pad data to match texture dimensions
    const paddedSize = width * height * 4;
    const paddedData = new Uint8Array(paddedSize);
    paddedData.set(result.data);

    // Create texture
    this.texture = new THREE.DataTexture(
      paddedData,
      width,
      height,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
    );

    this.texture.needsUpdate = true;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    return this.texture;
  }

  /**
   * Update existing texture with new data
   *
   * More efficient than creating a new texture when dimensions haven't changed.
   *
   * @param result - New visibility texture data
   * @returns Updated texture, or new texture if dimensions changed
   */
  update(result: VisibilityTextureResult): THREE.DataTexture {
    const nodeCount = result.data.length / 4;
    const width = Math.ceil(Math.sqrt(nodeCount));
    const height = Math.ceil(nodeCount / width);

    // If texture doesn't exist or dimensions changed, create new texture
    if (
      !this.texture ||
      this.texture.image.width !== width ||
      this.texture.image.height !== height
    ) {
      return this.createTexture(result);
    }

    // Update existing texture data
    const paddedSize = width * height * 4;
    const paddedData = new Uint8Array(paddedSize);
    paddedData.set(result.data);

    this.texture.image.data = paddedData;
    this.texture.needsUpdate = true;

    return this.texture;
  }

  /**
   * Get current texture
   */
  getTexture(): THREE.DataTexture | null {
    return this.texture;
  }

  /**
   * Dispose of texture resources
   */
  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
  }
}
