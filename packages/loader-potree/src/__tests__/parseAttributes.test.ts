/**
 * Unit tests for parseAttributes
 */

import { PointAttributeDataType } from '@better-potree/core';
import type { IPotreeAttributeMetadata, IPotreeMetadata } from '@better-potree/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseAttributes } from '../parseAttributes';

describe('parseAttributes', () => {
  describe('Potree 1.x format', () => {
    it('should parse basic position attribute', () => {
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
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(1);
      expect(attributes.byteSize).toBe(12); // 3 floats
      expect(attributes.attributes[0].name).toBe('POSITION_CARTESIAN');
    });

    it('should parse multiple attributes', () => {
      const metadata: IPotreeMetadata = {
        version: '1.6',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: ['POSITION_CARTESIAN', 'COLOR_PACKED', 'INTENSITY'],
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(3);
      expect(attributes.attributes[0].name).toBe('POSITION_CARTESIAN');
      expect(attributes.attributes[1].name).toBe('rgba');
      expect(attributes.attributes[2].name).toBe('intensity');
    });

    it('should handle old attribute names with replacements', () => {
      const metadata: IPotreeMetadata = {
        version: '1.5',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        // Use the actual static property names that exist in PointAttribute
        pointAttributes: ['POSITION_CARTESIAN', 'RGBA_PACKED'],
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(2);
      expect(attributes.attributes[0].name).toBe('POSITION_CARTESIAN');
      expect(attributes.attributes[1].name).toBe('rgba');
    });

    it('should skip unknown attributes in 1.x format', () => {
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
        pointAttributes: ['POSITION_CARTESIAN', 'UNKNOWN_ATTRIBUTE', 'INTENSITY'],
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      // Should skip UNKNOWN_ATTRIBUTE
      expect(attributes.size).toBe(2);
      expect(attributes.attributes[0].name).toBe('POSITION_CARTESIAN');
      expect(attributes.attributes[1].name).toBe('intensity');
    });
  });

  describe('Potree 2.0+ format', () => {
    it('should parse Potree 2.0 attribute metadata', () => {
      const attributeMetadata: IPotreeAttributeMetadata[] = [
        {
          name: 'POSITION_CARTESIAN',
          size: 12,
          elements: 3,
          elementSize: 4,
          type: 'float',
          description: 'Position',
        },
        {
          name: 'rgba',
          size: 4,
          elements: 4,
          elementSize: 1,
          type: 'uint8',
          description: 'Color',
        },
      ];

      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: attributeMetadata,
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(2);
      expect(attributes.attributes[0].name).toBe('POSITION_CARTESIAN');
      expect(attributes.attributes[1].name).toBe('rgba');
      expect(attributes.attributes[1].numElements).toBe(4);
    });

    it('should handle all data types correctly', () => {
      const attributeMetadata: IPotreeAttributeMetadata[] = [
        { name: 'attr_int8', size: 1, elements: 1, elementSize: 1, type: 'int8' },
        { name: 'attr_uint8', size: 1, elements: 1, elementSize: 1, type: 'uint8' },
        { name: 'attr_int16', size: 2, elements: 1, elementSize: 2, type: 'int16' },
        { name: 'attr_uint16', size: 2, elements: 1, elementSize: 2, type: 'uint16' },
        { name: 'attr_int32', size: 4, elements: 1, elementSize: 4, type: 'int32' },
        { name: 'attr_uint32', size: 4, elements: 1, elementSize: 4, type: 'uint32' },
        { name: 'attr_int64', size: 8, elements: 1, elementSize: 8, type: 'int64' },
        { name: 'attr_uint64', size: 8, elements: 1, elementSize: 8, type: 'uint64' },
        { name: 'attr_float', size: 4, elements: 1, elementSize: 4, type: 'float' },
        { name: 'attr_double', size: 8, elements: 1, elementSize: 8, type: 'double' },
      ];

      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: attributeMetadata,
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(10);
      expect(attributes.attributes[0].type.name).toBe('int8');
      expect(attributes.attributes[1].type.name).toBe('uint8');
      expect(attributes.attributes[2].type.name).toBe('int16');
      expect(attributes.attributes[3].type.name).toBe('uint16');
      expect(attributes.attributes[4].type.name).toBe('int32');
      expect(attributes.attributes[5].type.name).toBe('uint32');
      expect(attributes.attributes[6].type.name).toBe('int64');
      expect(attributes.attributes[7].type.name).toBe('uint64');
      expect(attributes.attributes[8].type.name).toBe('float');
      expect(attributes.attributes[9].type.name).toBe('double');
    });

    it('should skip unknown data types with warning', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const attributeMetadata: IPotreeAttributeMetadata[] = [
        {
          name: 'POSITION_CARTESIAN',
          size: 12,
          elements: 3,
          elementSize: 4,
          type: 'float',
        },
        {
          name: 'unknown_type',
          size: 4,
          elements: 1,
          elementSize: 4,
          type: 'invalid_type',
        },
        {
          name: 'intensity',
          size: 2,
          elements: 1,
          elementSize: 2,
          type: 'uint16',
        },
      ];

      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: attributeMetadata,
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(2); // Should skip the invalid type
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown attribute type: invalid_type');

      consoleWarnSpy.mockRestore();
    });

    it('should preserve descriptions for attributes', () => {
      const attributeMetadata: IPotreeAttributeMetadata[] = [
        {
          name: 'POSITION_CARTESIAN',
          size: 12,
          elements: 3,
          elementSize: 4,
          type: 'float',
          description: 'XYZ Position',
        },
        {
          name: 'intensity',
          size: 2,
          elements: 1,
          elementSize: 2,
          type: 'uint16',
          description: 'Laser intensity',
        },
      ];

      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: attributeMetadata,
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.attributes[0].description).toBe('XYZ Position');
      expect(attributes.attributes[1].description).toBe('Laser intensity');
    });
  });

  describe('Normal vectors', () => {
    it('should detect and add NORMAL vector for NormalX/Y/Z attributes', () => {
      const attributeMetadata: IPotreeAttributeMetadata[] = [
        {
          name: 'POSITION_CARTESIAN',
          size: 12,
          elements: 3,
          elementSize: 4,
          type: 'float',
        },
        {
          name: 'NormalX',
          size: 4,
          elements: 1,
          elementSize: 4,
          type: 'float',
        },
        {
          name: 'NormalY',
          size: 4,
          elements: 1,
          elementSize: 4,
          type: 'float',
        },
        {
          name: 'NormalZ',
          size: 4,
          elements: 1,
          elementSize: 4,
          type: 'float',
        },
      ];

      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: attributeMetadata,
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(4);
      expect(attributes.vectors.length).toBe(1);
      expect(attributes.vectors[0].name).toBe('NORMAL');
      expect(attributes.vectors[0].attributes).toEqual(['NormalX', 'NormalY', 'NormalZ']);
    });

    it('should not add NORMAL vector if only partial normal attributes exist', () => {
      const attributeMetadata: IPotreeAttributeMetadata[] = [
        {
          name: 'POSITION_CARTESIAN',
          size: 12,
          elements: 3,
          elementSize: 4,
          type: 'float',
        },
        {
          name: 'NormalX',
          size: 4,
          elements: 1,
          elementSize: 4,
          type: 'float',
        },
        {
          name: 'NormalY',
          size: 4,
          elements: 1,
          elementSize: 4,
          type: 'float',
        },
      ];

      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: attributeMetadata,
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.vectors.length).toBe(0);
    });

    it('should not add NORMAL vector if no normal attributes exist', () => {
      const attributeMetadata: IPotreeAttributeMetadata[] = [
        {
          name: 'POSITION_CARTESIAN',
          size: 12,
          elements: 3,
          elementSize: 4,
          type: 'float',
        },
        {
          name: 'rgba',
          size: 4,
          elements: 4,
          elementSize: 1,
          type: 'uint8',
        },
      ];

      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: attributeMetadata,
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.vectors.length).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty attribute list for Potree 1.x', () => {
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
        pointAttributes: [],
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(0);
      expect(attributes.byteSize).toBe(0);
    });

    it('should handle empty attribute list for Potree 2.0', () => {
      const metadata: IPotreeMetadata = {
        version: '2.0',
        octreeDir: 'data',
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
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(0);
      expect(attributes.byteSize).toBe(0);
    });

    it('should handle version exactly 1.7', () => {
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
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(1);
    });

    it('should handle version 1.8 as Potree 2.0 format', () => {
      const attributeMetadata: IPotreeAttributeMetadata[] = [
        {
          name: 'POSITION_CARTESIAN',
          size: 12,
          elements: 3,
          elementSize: 4,
          type: 'float',
        },
      ];

      const metadata: IPotreeMetadata = {
        version: '1.8',
        octreeDir: 'data',
        boundingBox: {
          lx: 0,
          ly: 0,
          lz: 0,
          ux: 10,
          uy: 10,
          uz: 10,
        },
        pointAttributes: attributeMetadata,
        spacing: 0.5,
        scale: 0.001,
        points: 1000,
      };

      const attributes = parseAttributes(metadata);

      expect(attributes.size).toBe(1);
    });
  });
});
