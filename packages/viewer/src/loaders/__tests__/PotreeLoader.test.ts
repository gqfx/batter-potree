/**
 * Unit tests for PotreeLoader
 */

import type { IPotreeMetadata } from '@better-potree/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PotreeLoader } from '../PotreeLoader';

describe('PotreeLoader', () => {
  let loader: PotreeLoader;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    loader = new PotreeLoader();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create loader with default config', () => {
      const defaultLoader = new PotreeLoader();
      expect(defaultLoader).toBeDefined();
    });

    it('should accept custom fetch options', () => {
      const customLoader = new PotreeLoader({
        fetchOptions: { credentials: 'include' },
      });
      expect(customLoader).toBeDefined();
    });

    it('should accept autoLoadHierarchy option', () => {
      const customLoader = new PotreeLoader({
        autoLoadHierarchy: false,
      });
      expect(customLoader).toBeDefined();
    });
  });

  describe('load()', () => {
    const validMetadata: IPotreeMetadata = {
      version: '1.7',
      octreeDir: 'r',
      boundingBox: {
        lx: -5,
        ly: -5,
        lz: -5,
        ux: 5,
        uy: 5,
        uz: 5,
      },
      tightBoundingBox: {
        lx: -4,
        ly: -4,
        lz: -4,
        ux: 4,
        uy: 4,
        uz: 4,
      },
      pointAttributes: ['POSITION_CARTESIAN', 'RGBA', 'INTENSITY'],
      spacing: 0.1,
      scale: 0.001,
      points: 1000000,
      projection: 'EPSG:4326',
    };

    it('should load metadata from URL ending with /', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(validMetadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(fetchMock).toHaveBeenCalledWith('https://example.com/pointcloud/cloud.js', {});
      expect(octree.url).toBe('https://example.com/pointcloud/r/');
      expect(octree.spacing).toBe(0.1);
      expect(octree.version).toBe('1.7');
    });

    it('should load metadata from URL without trailing slash', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(validMetadata),
      });

      const octree = await loader.load('https://example.com/pointcloud');

      expect(fetchMock).toHaveBeenCalledWith('https://example.com/pointcloud/cloud.js', {});
      expect(octree.url).toBe('https://example.com/pointcloud/r/');
    });

    it('should load metadata from direct cloud.js URL', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(validMetadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/cloud.js');

      expect(fetchMock).toHaveBeenCalledWith('https://example.com/pointcloud/cloud.js', {});
      expect(octree.url).toBe('https://example.com/pointcloud/r/');
    });

    it('should load metadata from metadata.json URL', async () => {
      const metadata2_0: IPotreeMetadata = {
        ...validMetadata,
        version: '2.0',
        pointAttributes: [
          {
            name: 'POSITION_CARTESIAN',
            size: 12,
            elements: 3,
            elementSize: 4,
            type: 'float',
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata2_0),
      });

      const octree = await loader.load('https://example.com/pointcloud/metadata.json');

      expect(fetchMock).toHaveBeenCalledWith('https://example.com/pointcloud/metadata.json', {});
      expect(octree.version).toBe('2.0');
    });

    it('should fall back to metadata.json if cloud.js fails', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Not found')).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(validMetadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://example.com/pointcloud/cloud.js',
        {},
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://example.com/pointcloud/metadata.json',
        {},
      );
      expect(octree.version).toBe('1.7');
    });

    it('should throw error if both cloud.js and metadata.json fail', async () => {
      fetchMock.mockRejectedValue(new Error('Not found'));

      await expect(loader.load('https://example.com/pointcloud/')).rejects.toThrow();
    });

    it('should parse JSONP cloud.js format', async () => {
      const jsonpContent = `Potree.setMetadata(${JSON.stringify(validMetadata)});`;

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => jsonpContent,
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.version).toBe('1.7');
      expect(octree.spacing).toBe(0.1);
    });

    it('should parse var-style cloud.js format', async () => {
      const varContent = `var metadata = ${JSON.stringify(validMetadata)};`;

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => varContent,
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.version).toBe('1.7');
      expect(octree.spacing).toBe(0.1);
    });

    it('should parse plain JSON format', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(validMetadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.version).toBe('1.7');
      expect(octree.spacing).toBe(0.1);
    });

    it('should throw error on non-ok response', async () => {
      fetchMock
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Not Found',
          text: async () => '',
        })
        .mockRejectedValueOnce(
          new Error(
            'Failed to load metadata from https://example.com/pointcloud/metadata.json: Not Found',
          ),
        );

      await expect(loader.load('https://example.com/pointcloud/')).rejects.toThrow();
    });
  });

  describe('parseMetadata()', () => {
    it('should create octree with correct bounding box', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'r',
        boundingBox: {
          lx: -10,
          ly: -20,
          lz: -30,
          ux: 10,
          uy: 20,
          uz: 30,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.boundingBox.min.x).toBe(-10);
      expect(octree.boundingBox.min.y).toBe(-20);
      expect(octree.boundingBox.min.z).toBe(-30);
      expect(octree.boundingBox.max.x).toBe(10);
      expect(octree.boundingBox.max.y).toBe(20);
      expect(octree.boundingBox.max.z).toBe(30);
    });

    it('should use tight bounding box if provided', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'r',
        boundingBox: {
          lx: -10,
          ly: -10,
          lz: -10,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        tightBoundingBox: {
          lx: -5,
          ly: -5,
          lz: -5,
          ux: 5,
          uy: 5,
          uz: 5,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.tightBoundingBox.min.x).toBe(-5);
      expect(octree.tightBoundingBox.min.y).toBe(-5);
      expect(octree.tightBoundingBox.min.z).toBe(-5);
      expect(octree.tightBoundingBox.max.x).toBe(5);
      expect(octree.tightBoundingBox.max.y).toBe(5);
      expect(octree.tightBoundingBox.max.z).toBe(5);
    });

    it('should clone bounding box as tight bounding box if not provided', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'r',
        boundingBox: {
          lx: -10,
          ly: -10,
          lz: -10,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.tightBoundingBox.min.x).toBe(-10);
      expect(octree.tightBoundingBox.max.x).toBe(10);
      // Ensure it's a clone, not the same object
      expect(octree.tightBoundingBox).not.toBe(octree.boundingBox);
    });

    it('should handle octreeDir without trailing slash', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.url).toBe('https://example.com/pointcloud/data/');
    });

    it('should handle octreeDir with trailing slash', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'data/',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.url).toBe('https://example.com/pointcloud/data/');
    });

    it('should set projection to null if not provided', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'r',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.projection).toBeNull();
    });

    it('should preserve projection if provided', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'r',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
        projection: 'EPSG:3857',
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.projection).toBe('EPSG:3857');
    });

    it('should set root to null initially', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'r',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      // Root node is now created with metadata
      expect(octree.root).not.toBeNull();
      expect(octree.root?.name).toBe('r');
      expect(octree.root?.level).toBe(0);
      expect(octree.root?.numPoints).toBe(5000);
    });

    it('should preserve spacing and scale', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'r',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.25,
        scale: 0.0005,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.spacing).toBe(0.25);
      expect(octree.scale).toBe(0.0005);
    });

    it('should parse point attributes correctly', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'r',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/pointcloud/');

      expect(octree.pointAttributes.size).toBe(1);
      expect(octree.pointAttributes.attributes[0].name).toBe('POSITION_CARTESIAN');
    });
  });

  describe('URL construction', () => {
    it('should construct correct URL from directory path', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'octree',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/data');

      expect(octree.url).toBe('https://example.com/data/octree/');
    });

    it('should construct correct URL from cloud.js file', async () => {
      const metadata: IPotreeMetadata = {
        version: '1.7',
        octreeDir: 'octree',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN'],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/data/cloud.js');

      expect(octree.url).toBe('https://example.com/data/octree/');
    });

    it('should construct correct URL from metadata.json file', async () => {
      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'octree',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: [],
        spacing: 0.5,
        scale: 0.001,
        points: 5000,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(metadata),
      });

      const octree = await loader.load('https://example.com/data/metadata.json');

      expect(octree.url).toBe('https://example.com/data/octree/');
    });
  });

  describe('Error handling', () => {
    it('should throw meaningful error on invalid JSON', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => 'invalid json{',
      });

      await expect(loader.load('https://example.com/pointcloud/')).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(loader.load('https://example.com/pointcloud/')).rejects.toThrow('Network error');
    });

    it('should handle malformed JSONP content', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: async () => 'Potree.setMetadata invalid json',
      });

      await expect(loader.load('https://example.com/pointcloud/')).rejects.toThrow();
    });
  });
});
