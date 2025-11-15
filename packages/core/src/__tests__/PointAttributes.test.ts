/**
 * Unit tests for PointAttributes
 */

import { describe, it, expect } from 'vitest';
import { PointAttributes } from '../attributes/PointAttributes';
import { PointAttribute, PointAttributeName } from '../attributes/PointAttribute';

describe('PointAttributes', () => {
  describe('Constructor', () => {
    it('should create an empty collection', () => {
      const attrs = new PointAttributes();

      expect(attrs.attributes).toEqual([]);
      expect(attrs.size).toBe(0);
      expect(attrs.byteSize).toBe(0);
      expect(attrs.vectors).toEqual([]);
    });

    it('should create from attribute name array', () => {
      const attrs = new PointAttributes([
        'POSITION_CARTESIAN',
        'RGBA_PACKED',
        'INTENSITY',
      ]);

      expect(attrs.size).toBe(3);
      expect(attrs.attributes[0]).toBe(PointAttribute.POSITION_CARTESIAN);
      expect(attrs.attributes[1]).toBe(PointAttribute.RGBA_PACKED);
      expect(attrs.attributes[2]).toBe(PointAttribute.INTENSITY);
    });

    it('should calculate correct total byte size', () => {
      const attrs = new PointAttributes([
        'POSITION_CARTESIAN', // 12 bytes (3 * float)
        'RGBA_PACKED', // 4 bytes (4 * int8)
        'INTENSITY', // 2 bytes (1 * uint16)
      ]);

      expect(attrs.byteSize).toBe(18); // 12 + 4 + 2
    });

    it('should ignore unknown attribute names', () => {
      const attrs = new PointAttributes([
        'POSITION_CARTESIAN',
        'UNKNOWN_ATTRIBUTE',
        'INTENSITY',
      ]);

      expect(attrs.size).toBe(2);
      expect(attrs.byteSize).toBe(14); // 12 + 2
    });
  });

  describe('add()', () => {
    it('should add an attribute to the collection', () => {
      const attrs = new PointAttributes();
      attrs.add(PointAttribute.POSITION_CARTESIAN);

      expect(attrs.size).toBe(1);
      expect(attrs.attributes[0]).toBe(PointAttribute.POSITION_CARTESIAN);
      expect(attrs.byteSize).toBe(12);
    });

    it('should update size and byteSize when adding attributes', () => {
      const attrs = new PointAttributes();

      attrs.add(PointAttribute.POSITION_CARTESIAN); // 12 bytes
      expect(attrs.size).toBe(1);
      expect(attrs.byteSize).toBe(12);

      attrs.add(PointAttribute.INTENSITY); // 2 bytes
      expect(attrs.size).toBe(2);
      expect(attrs.byteSize).toBe(14);

      attrs.add(PointAttribute.CLASSIFICATION); // 1 byte
      expect(attrs.size).toBe(3);
      expect(attrs.byteSize).toBe(15);
    });
  });

  describe('addVector()', () => {
    it('should add a vector to the collection', () => {
      const attrs = new PointAttributes();
      const vector = { x: 1, y: 2, z: 3 };

      attrs.addVector(vector);

      expect(attrs.vectors).toContain(vector);
      expect(attrs.vectors.length).toBe(1);
    });
  });

  describe('hasNormals()', () => {
    it('should return false for collection without normals', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'INTENSITY']);

      expect(attrs.hasNormals()).toBe(false);
    });

    it('should return true for NORMAL_FLOATS', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'NORMAL_FLOATS']);

      expect(attrs.hasNormals()).toBe(true);
    });

    it('should return true for NORMAL_SPHEREMAPPED', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'NORMAL_SPHEREMAPPED']);

      expect(attrs.hasNormals()).toBe(true);
    });

    it('should return true for NORMAL_OCT16', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'NORMAL_OCT16']);

      expect(attrs.hasNormals()).toBe(true);
    });

    it('should return true for NORMAL', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'NORMAL']);

      expect(attrs.hasNormals()).toBe(true);
    });
  });

  describe('hasAttribute()', () => {
    it('should return true for existing attribute', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'INTENSITY']);

      expect(attrs.hasAttribute(PointAttributeName.POSITION_CARTESIAN)).toBe(true);
      expect(attrs.hasAttribute(PointAttributeName.INTENSITY)).toBe(true);
    });

    it('should return false for non-existing attribute', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN']);

      expect(attrs.hasAttribute(PointAttributeName.INTENSITY)).toBe(false);
      expect(attrs.hasAttribute(PointAttributeName.CLASSIFICATION)).toBe(false);
    });
  });

  describe('getAttribute()', () => {
    it('should return the attribute if found', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'INTENSITY']);

      const attr = attrs.getAttribute(PointAttributeName.INTENSITY);
      expect(attr).toBe(PointAttribute.INTENSITY);
    });

    it('should return undefined if not found', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN']);

      const attr = attrs.getAttribute(PointAttributeName.INTENSITY);
      expect(attr).toBeUndefined();
    });
  });

  describe('getAttributeOffset()', () => {
    it('should return correct byte offset for first attribute', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'INTENSITY']);

      expect(attrs.getAttributeOffset(PointAttributeName.POSITION_CARTESIAN)).toBe(0);
    });

    it('should return correct byte offset for second attribute', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN', 'INTENSITY']);

      // POSITION_CARTESIAN is 12 bytes, so INTENSITY starts at offset 12
      expect(attrs.getAttributeOffset(PointAttributeName.INTENSITY)).toBe(12);
    });

    it('should return correct byte offset for multiple attributes', () => {
      const attrs = new PointAttributes([
        'POSITION_CARTESIAN', // 0: 12 bytes
        'RGBA_PACKED', // 12: 4 bytes
        'INTENSITY', // 16: 2 bytes
        'CLASSIFICATION', // 18: 1 byte
      ]);

      expect(attrs.getAttributeOffset(PointAttributeName.POSITION_CARTESIAN)).toBe(0);
      expect(attrs.getAttributeOffset(PointAttributeName.COLOR_PACKED)).toBe(12);
      expect(attrs.getAttributeOffset(PointAttributeName.INTENSITY)).toBe(16);
      expect(attrs.getAttributeOffset(PointAttributeName.CLASSIFICATION)).toBe(18);
    });

    it('should return -1 for non-existing attribute', () => {
      const attrs = new PointAttributes(['POSITION_CARTESIAN']);

      expect(attrs.getAttributeOffset(PointAttributeName.INTENSITY)).toBe(-1);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle typical point cloud with position, color, and intensity', () => {
      const attrs = new PointAttributes([
        'POSITION_CARTESIAN',
        'RGB_PACKED',
        'INTENSITY',
      ]);

      expect(attrs.size).toBe(3);
      expect(attrs.byteSize).toBe(17); // 12 + 3 + 2
      expect(attrs.hasNormals()).toBe(false);
    });

    it('should handle LiDAR point cloud with all common attributes', () => {
      const attrs = new PointAttributes([
        'POSITION_CARTESIAN',
        'RGB_PACKED',
        'INTENSITY',
        'CLASSIFICATION',
        'RETURN_NUMBER',
        'NUMBER_OF_RETURNS',
        'GPS_TIME',
      ]);

      expect(attrs.size).toBe(7);
      // 12 (pos) + 3 (rgb) + 2 (intensity) + 1 (class) + 1 (return) + 1 (num returns) + 8 (gps) = 28
      expect(attrs.byteSize).toBe(28);
    });

    it('should handle point cloud with normals', () => {
      const attrs = new PointAttributes([
        'POSITION_CARTESIAN',
        'NORMAL_FLOATS',
        'RGB_PACKED',
      ]);

      expect(attrs.size).toBe(3);
      expect(attrs.byteSize).toBe(27); // 12 + 12 + 3
      expect(attrs.hasNormals()).toBe(true);
    });
  });
});
