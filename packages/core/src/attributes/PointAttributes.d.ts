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
export declare class PointAttributes {
  /** Array of attributes */
  readonly attributes: PointAttribute[];
  /** Total size in bytes per point */
  byteSize: number;
  /** Number of attributes */
  size: number;
  /** Additional vector attributes (custom) */
  readonly vectors: unknown[];
  constructor(pointAttributeNames?: string[]);
  /**
   * Get a standard attribute by name
   */
  private getStandardAttribute;
  /**
   * Add a point attribute to the collection
   */
  add(pointAttribute: PointAttribute): void;
  /**
   * Add a vector attribute (for custom attributes)
   */
  addVector(vector: unknown): void;
  /**
   * Check if this collection contains normal attributes
   */
  hasNormals(): boolean;
  /**
   * Check if this collection contains a specific attribute
   */
  hasAttribute(name: string): boolean;
  /**
   * Get an attribute by name
   */
  getAttribute(name: string): PointAttribute | undefined;
  /**
   * Get the byte offset of an attribute
   * Returns -1 if the attribute is not found
   */
  getAttributeOffset(name: string): number;
}
//# sourceMappingURL=PointAttributes.d.ts.map
