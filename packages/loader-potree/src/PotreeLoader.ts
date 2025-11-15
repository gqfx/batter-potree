/**
 * Potree point cloud loader
 * Loads Potree format point clouds (1.x and 2.0)
 */

import * as THREE from 'three';
import type { ILoader, IPotreeMetadata, IPointCloudOctree } from '@better-potree/types';
import { parseAttributes } from './parseAttributes.js';

/**
 * Potree loader class
 * Implements the ILoader interface for Potree format
 */
export class PotreeLoader implements ILoader<IPointCloudOctree> {
  /**
   * Load a Potree point cloud from URL
   * @param url URL to the point cloud metadata file (cloud.js or metadata.json)
   * @returns Promise that resolves with the loaded octree
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
    } catch (error) {
      // Try metadata.json (Potree 2.0 format)
      const jsonUrl = metadataUrl.replace('cloud.js', 'metadata.json');
      const metadata = await this.loadMetadata(jsonUrl);
      return this.parseMetadata(url, metadata);
    }
  }

  /**
   * Load metadata file
   */
  private async loadMetadata(url: string): Promise<IPotreeMetadata> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load metadata from ${url}: ${response.statusText}`);
    }

    let text = await response.text();
    
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
   */
  private parseMetadata(baseUrl: string, metadata: IPotreeMetadata): IPointCloudOctree {
    // Parse point attributes
    const pointAttributes = parseAttributes(metadata);

    // Parse bounding box
    const boundingBox = new THREE.Box3(
      new THREE.Vector3(
        metadata.boundingBox.lx,
        metadata.boundingBox.ly,
        metadata.boundingBox.lz,
      ),
      new THREE.Vector3(
        metadata.boundingBox.ux,
        metadata.boundingBox.uy,
        metadata.boundingBox.uz,
      ),
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

    // Create octree object
    const octree: IPointCloudOctree = {
      url: fullUrl,
      spacing: metadata.spacing,
      boundingBox,
      tightBoundingBox,
      root: null, // Will be loaded on demand
      pointAttributes,
      projection: metadata.projection || null,
      version: metadata.version,
      scale: metadata.scale,
    };

    return octree;
  }
}
