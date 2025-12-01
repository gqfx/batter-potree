/**
 * Parse Potree 2.0 point attributes from metadata
 */

import type { IPotreeAttributeMetadata, IPotreeMetadata } from '@better-potree/core';
import { PointAttribute, PointAttributeDataType, PointAttributes } from '@better-potree/core';

/**
 * Parse point attributes from Potree 2.0 metadata
 */
export function parseAttributes(metadata: IPotreeMetadata): PointAttributes {
  const replacements: Record<string, string> = {
    COLOR_PACKED: 'rgba',
    RGBA: 'rgba',
    RGB: 'rgb',
    INTENSITY: 'intensity',
    CLASSIFICATION: 'classification',
    GPS_TIME: 'gps-time',
    'gps-time': 'gps-time',
    position: 'POSITION_CARTESIAN',
    'return number': 'return_number',
    'number of returns': 'number_of_returns',
    'classification flags': 'classification_flags',
    'user data': 'user_data',
    'scan angle': 'scan_angle',
    'point source id': 'point_source_id',
  };

  const replaceOldNames = (old: string): string => {
    return replacements[old] || old;
  };

  // Potree 2.0: attributes are in metadata.attributes or metadata.pointAttributes
  const attributeSource = metadata.attributes || metadata.pointAttributes;
  const pointAttributes: IPotreeAttributeMetadata[] = [];

  if (Array.isArray(attributeSource)) {
    const attrs = attributeSource.filter(
      (attr): attr is IPotreeAttributeMetadata => typeof attr === 'object' && 'name' in attr,
    );
    pointAttributes.push(...attrs);
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
    // Potree 2.0 uses 'numElements' or 'elements' (both are supported)
    const numElements = jsAttribute.numElements ?? jsAttribute.elements;

    if (!type) {
      console.warn(`Unknown attribute type: ${jsAttribute.type}`);
      continue;
    }

    if (numElements === undefined) {
      console.warn(`Missing numElements/elements for attribute: ${jsAttribute.name}`);
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
