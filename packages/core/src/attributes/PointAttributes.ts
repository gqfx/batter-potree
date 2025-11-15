/**
 * Collection of point attributes
 *
 * Migrated from Potree PointAttributes class
 */

import { PointAttribute } from './PointAttribute.js';

/**
 * Manages a collection of point attributes for a point cloud
 *
 * This class maintains the list of attributes and calculates the total byte size
 * needed to store a single point's data.
 */
export class PointAttributes {
  /** Array of attributes */
  public readonly attributes: PointAttribute[];

  /** Total size in bytes per point */
  public byteSize: number;

  /** Number of attributes */
  public size: number;

  /** Additional vector attributes (custom) */
  public readonly vectors: unknown[];

  constructor(pointAttributeNames?: string[]) {
    this.attributes = [];
    this.byteSize = 0;
    this.size = 0;
    this.vectors = [];

    if (pointAttributeNames) {
      for (const attributeName of pointAttributeNames) {
        const attribute = this.getStandardAttribute(attributeName);
        if (attribute) {
          this.add(attribute);
        }
      }
    }
  }

  /**
   * Get a standard attribute by name
   */
  private getStandardAttribute(name: string): PointAttribute | null {
    // Map string names to static PointAttribute instances
    const standardAttributes: Record<string, PointAttribute> = {
      POSITION_CARTESIAN: PointAttribute.POSITION_CARTESIAN,
      RGBA_PACKED: PointAttribute.RGBA_PACKED,
      COLOR_PACKED: PointAttribute.COLOR_PACKED,
      RGB_PACKED: PointAttribute.RGB_PACKED,
      NORMAL_FLOATS: PointAttribute.NORMAL_FLOATS,
      INTENSITY: PointAttribute.INTENSITY,
      CLASSIFICATION: PointAttribute.CLASSIFICATION,
      NORMAL_SPHEREMAPPED: PointAttribute.NORMAL_SPHEREMAPPED,
      NORMAL_OCT16: PointAttribute.NORMAL_OCT16,
      NORMAL: PointAttribute.NORMAL,
      RETURN_NUMBER: PointAttribute.RETURN_NUMBER,
      NUMBER_OF_RETURNS: PointAttribute.NUMBER_OF_RETURNS,
      SOURCE_ID: PointAttribute.SOURCE_ID,
      INDICES: PointAttribute.INDICES,
      SPACING: PointAttribute.SPACING,
      GPS_TIME: PointAttribute.GPS_TIME,
    };

    return standardAttributes[name] || null;
  }

  /**
   * Add a point attribute to the collection
   */
  add(pointAttribute: PointAttribute): void {
    this.attributes.push(pointAttribute);
    this.byteSize += pointAttribute.byteSize;
    this.size++;
  }

  /**
   * Add a vector attribute (for custom attributes)
   */
  addVector(vector: unknown): void {
    this.vectors.push(vector);
  }

  /**
   * Check if this collection contains normal attributes
   */
  hasNormals(): boolean {
    for (const pointAttribute of this.attributes) {
      if (
        pointAttribute === PointAttribute.NORMAL_SPHEREMAPPED ||
        pointAttribute === PointAttribute.NORMAL_FLOATS ||
        pointAttribute === PointAttribute.NORMAL ||
        pointAttribute === PointAttribute.NORMAL_OCT16
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if this collection contains a specific attribute
   */
  hasAttribute(name: string): boolean {
    return this.attributes.some((attr) => attr.name === name);
  }

  /**
   * Get an attribute by name
   */
  getAttribute(name: string): PointAttribute | undefined {
    return this.attributes.find((attr) => attr.name === name);
  }

  /**
   * Get the byte offset of an attribute
   * Returns -1 if the attribute is not found
   */
  getAttributeOffset(name: string): number {
    let offset = 0;
    for (const attr of this.attributes) {
      if (attr.name === name) {
        return offset;
      }
      offset += attr.byteSize;
    }
    return -1;
  }
}
