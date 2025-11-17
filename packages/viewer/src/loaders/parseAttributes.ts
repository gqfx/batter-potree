/**
 * Parse Potree point attributes from metadata
 */

import type { IPotreeAttributeMetadata, IPotreeMetadata } from '@better-potree/core';
import { PointAttribute, PointAttributeDataType, PointAttributes } from '@better-potree/core';
import { Version } from './Version.js';

/**
 * Parse point attributes from Potree metadata
 */
export function parseAttributes(cloudjs: IPotreeMetadata): PointAttributes {
  const version = new Version(cloudjs.version);

  const replacements: Record<string, string> = {
    COLOR_PACKED: 'rgba',
    RGBA: 'rgba',
    INTENSITY: 'intensity',
    CLASSIFICATION: 'classification',
    GPS_TIME: 'gps-time',
  };

  const replaceOldNames = (old: string): string => {
    return replacements[old] || old;
  };

  const pointAttributes: IPotreeAttributeMetadata[] = [];

  if (version.upTo('1.7')) {
    // Potree 1.x format
    // pointAttributes can be a string (space-separated) or array
    let attributeNames: string[];
    if (typeof cloudjs.pointAttributes === 'string') {
      // Handle space-separated string format
      attributeNames = cloudjs.pointAttributes.trim().split(/\s+/);
    } else if (Array.isArray(cloudjs.pointAttributes)) {
      // For Potree 1.x, should be string array
      attributeNames = cloudjs.pointAttributes.filter(
        (attr): attr is string => typeof attr === 'string',
      );
    } else {
      console.warn('Invalid pointAttributes format:', cloudjs.pointAttributes);
      attributeNames = [];
    }

    for (const attributeName of attributeNames) {
      const oldAttribute = (PointAttribute as any)[attributeName];

      if (oldAttribute) {
        const attribute: IPotreeAttributeMetadata = {
          name: oldAttribute.name,
          size: oldAttribute.byteSize,
          elements: oldAttribute.numElements,
          elementSize: oldAttribute.byteSize / oldAttribute.numElements,
          type: oldAttribute.type.name,
          description: '',
        };

        pointAttributes.push(attribute);
      }
    }
  } else {
    // Potree 2.0+ format
    if (Array.isArray(cloudjs.pointAttributes)) {
      // For Potree 2.0+, should be IPotreeAttributeMetadata[]
      const attrs = cloudjs.pointAttributes.filter(
        (attr): attr is IPotreeAttributeMetadata => typeof attr === 'object' && 'name' in attr,
      );
      pointAttributes.push(...attrs);
    } else {
      console.warn('Invalid pointAttributes format for Potree 2.0+:', cloudjs.pointAttributes);
    }
  }

  const attributes = new PointAttributes();

  const typeConversion: Record<string, PointAttributeDataType> = {
    int8: PointAttributeDataType.INT8,
    int16: PointAttributeDataType.INT16,
    int32: PointAttributeDataType.INT32,
    int64: PointAttributeDataType.INT64,
    uint8: PointAttributeDataType.UINT8,
    uint16: PointAttributeDataType.UINT16,
    uint32: PointAttributeDataType.UINT32,
    uint64: PointAttributeDataType.UINT64,
    double: PointAttributeDataType.DOUBLE,
    float: PointAttributeDataType.FLOAT,
  };

  for (const jsAttribute of pointAttributes) {
    const name = replaceOldNames(jsAttribute.name);
    const type = typeConversion[jsAttribute.type];
    const numElements = jsAttribute.elements;

    if (!type) {
      console.warn(`Unknown attribute type: ${jsAttribute.type}`);
      continue;
    }

    const attribute = new PointAttribute(name, type, numElements);
    if (jsAttribute.description) {
      attribute.description = jsAttribute.description;
    }

    attributes.add(attribute);
  }

  // Check if it has normals
  const hasNormals =
    pointAttributes.find((a) => a.name === 'NormalX') !== undefined &&
    pointAttributes.find((a) => a.name === 'NormalY') !== undefined &&
    pointAttributes.find((a) => a.name === 'NormalZ') !== undefined;

  if (hasNormals) {
    const vector = {
      name: 'NORMAL',
      attributes: ['NormalX', 'NormalY', 'NormalZ'],
    };
    attributes.addVector(vector);
  }

  return attributes;
}
