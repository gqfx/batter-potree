/**
 * Unit tests for PointAttribute
 */

import { describe, it, expect } from 'vitest';
import {
  PointAttribute,
  PointAttributeDataType,
  PointAttributeName,
  POINT_ATTRIBUTE_TYPES,
} from '../attributes/PointAttribute';

describe('PointAttribute', () => {
  describe('Data Types', () => {
    it('should have correct byte sizes for all data types', () => {
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.DOUBLE].size).toBe(
        8,
      );
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.FLOAT].size).toBe(4);
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.INT8].size).toBe(1);
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.UINT8].size).toBe(1);
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.INT16].size).toBe(2);
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.UINT16].size).toBe(
        2,
      );
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.INT32].size).toBe(4);
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.UINT32].size).toBe(
        4,
      );
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.INT64].size).toBe(8);
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.UINT64].size).toBe(
        8,
      );
    });

    it('should have correct ordinals for all data types', () => {
      expect(
        POINT_ATTRIBUTE_TYPES[PointAttributeDataType.DOUBLE].ordinal,
      ).toBe(0);
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.FLOAT].ordinal).toBe(
        1,
      );
      expect(POINT_ATTRIBUTE_TYPES[PointAttributeDataType.INT8].ordinal).toBe(
        2,
      );
    });
  });

  describe('Constructor', () => {
    it('should create a custom attribute with correct properties', () => {
      const attr = new PointAttribute(
        'CustomAttribute',
        PointAttributeDataType.FLOAT,
        3,
      );

      expect(attr.name).toBe('CustomAttribute');
      expect(attr.numElements).toBe(3);
      expect(attr.byteSize).toBe(12); // 3 * 4 bytes
      expect(attr.type.name).toBe('float');
      expect(attr.type.size).toBe(4);
    });

    it('should initialize with default range', () => {
      const attr = new PointAttribute(
        'Test',
        PointAttributeDataType.UINT8,
        1,
      );

      expect(attr.range).toEqual([
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ]);
    });

    it('should initialize with empty description', () => {
      const attr = new PointAttribute(
        'Test',
        PointAttributeDataType.UINT8,
        1,
      );

      expect(attr.description).toBe('');
    });
  });

  describe('Standard Attributes', () => {
    it('should have POSITION_CARTESIAN with 3 float elements', () => {
      const attr = PointAttribute.POSITION_CARTESIAN;

      expect(attr.name).toBe(PointAttributeName.POSITION_CARTESIAN);
      expect(attr.numElements).toBe(3);
      expect(attr.byteSize).toBe(12); // 3 * 4 bytes
      expect(attr.type.name).toBe('float');
    });

    it('should have RGBA_PACKED with 4 int8 elements', () => {
      const attr = PointAttribute.RGBA_PACKED;

      expect(attr.name).toBe(PointAttributeName.COLOR_PACKED);
      expect(attr.numElements).toBe(4);
      expect(attr.byteSize).toBe(4); // 4 * 1 byte
      expect(attr.type.name).toBe('int8');
    });

    it('should have INTENSITY with 1 uint16 element', () => {
      const attr = PointAttribute.INTENSITY;

      expect(attr.name).toBe(PointAttributeName.INTENSITY);
      expect(attr.numElements).toBe(1);
      expect(attr.byteSize).toBe(2); // 1 * 2 bytes
      expect(attr.type.name).toBe('uint16');
    });

    it('should have CLASSIFICATION with 1 uint8 element', () => {
      const attr = PointAttribute.CLASSIFICATION;

      expect(attr.name).toBe(PointAttributeName.CLASSIFICATION);
      expect(attr.numElements).toBe(1);
      expect(attr.byteSize).toBe(1); // 1 * 1 byte
      expect(attr.type.name).toBe('uint8');
    });

    it('should have GPS_TIME with 1 double element', () => {
      const attr = PointAttribute.GPS_TIME;

      expect(attr.name).toBe(PointAttributeName.GPS_TIME);
      expect(attr.numElements).toBe(1);
      expect(attr.byteSize).toBe(8); // 1 * 8 bytes
      expect(attr.type.name).toBe('double');
    });

    it('should have COLOR_PACKED as alias for RGBA_PACKED', () => {
      expect(PointAttribute.COLOR_PACKED).toBe(PointAttribute.RGBA_PACKED);
    });
  });

  describe('Normal Attributes', () => {
    it('should have NORMAL_FLOATS with 3 float elements', () => {
      const attr = PointAttribute.NORMAL_FLOATS;

      expect(attr.name).toBe(PointAttributeName.NORMAL_FLOATS);
      expect(attr.numElements).toBe(3);
      expect(attr.byteSize).toBe(12); // 3 * 4 bytes
    });

    it('should have NORMAL_SPHEREMAPPED with 2 uint8 elements', () => {
      const attr = PointAttribute.NORMAL_SPHEREMAPPED;

      expect(attr.numElements).toBe(2);
      expect(attr.byteSize).toBe(2); // 2 * 1 byte
    });

    it('should have NORMAL_OCT16 with 2 uint8 elements', () => {
      const attr = PointAttribute.NORMAL_OCT16;

      expect(attr.numElements).toBe(2);
      expect(attr.byteSize).toBe(2); // 2 * 1 byte
    });
  });

  describe('LiDAR Attributes', () => {
    it('should have RETURN_NUMBER with 1 uint8 element', () => {
      const attr = PointAttribute.RETURN_NUMBER;

      expect(attr.name).toBe(PointAttributeName.RETURN_NUMBER);
      expect(attr.numElements).toBe(1);
      expect(attr.byteSize).toBe(1);
    });

    it('should have NUMBER_OF_RETURNS with 1 uint8 element', () => {
      const attr = PointAttribute.NUMBER_OF_RETURNS;

      expect(attr.name).toBe(PointAttributeName.NUMBER_OF_RETURNS);
      expect(attr.numElements).toBe(1);
      expect(attr.byteSize).toBe(1);
    });

    it('should have SOURCE_ID with 1 uint16 element', () => {
      const attr = PointAttribute.SOURCE_ID;

      expect(attr.name).toBe(PointAttributeName.SOURCE_ID);
      expect(attr.numElements).toBe(1);
      expect(attr.byteSize).toBe(2);
    });
  });
});
