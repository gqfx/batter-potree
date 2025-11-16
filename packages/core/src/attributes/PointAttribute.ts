/**
 * Point attribute data types
 *
 * Migrated from Potree PointAttributes.js
 */

/**
 * Point attribute data types with their sizes in bytes
 */
export enum PointAttributeDataType {
  DOUBLE = 'double',
  FLOAT = 'float',
  INT8 = 'int8',
  UINT8 = 'uint8',
  INT16 = 'int16',
  UINT16 = 'uint16',
  INT32 = 'int32',
  UINT32 = 'uint32',
  INT64 = 'int64',
  UINT64 = 'uint64',
}

/**
 * Data type metadata
 */
export interface PointAttributeType {
  readonly name: string;
  readonly size: number;
  readonly ordinal: number;
}

/**
 * Map of data type enums to their metadata
 */
export const POINT_ATTRIBUTE_TYPES: Record<PointAttributeDataType, PointAttributeType> = {
  [PointAttributeDataType.DOUBLE]: { name: 'double', size: 8, ordinal: 0 },
  [PointAttributeDataType.FLOAT]: { name: 'float', size: 4, ordinal: 1 },
  [PointAttributeDataType.INT8]: { name: 'int8', size: 1, ordinal: 2 },
  [PointAttributeDataType.UINT8]: { name: 'uint8', size: 1, ordinal: 3 },
  [PointAttributeDataType.INT16]: { name: 'int16', size: 2, ordinal: 4 },
  [PointAttributeDataType.UINT16]: { name: 'uint16', size: 2, ordinal: 5 },
  [PointAttributeDataType.INT32]: { name: 'int32', size: 4, ordinal: 6 },
  [PointAttributeDataType.UINT32]: { name: 'uint32', size: 4, ordinal: 7 },
  [PointAttributeDataType.INT64]: { name: 'int64', size: 8, ordinal: 8 },
  [PointAttributeDataType.UINT64]: { name: 'uint64', size: 8, ordinal: 9 },
};

/**
 * Standard point attribute names
 */
export enum PointAttributeName {
  POSITION_CARTESIAN = 'POSITION_CARTESIAN',
  RGBA_PACKED = 'RGBA_PACKED',
  COLOR_PACKED = 'COLOR_PACKED',
  RGB_PACKED = 'RGB_PACKED',
  NORMAL_FLOATS = 'NORMAL_FLOATS',
  INTENSITY = 'INTENSITY',
  CLASSIFICATION = 'CLASSIFICATION',
  NORMAL_SPHEREMAPPED = 'NORMAL_SPHEREMAPPED',
  NORMAL_OCT16 = 'NORMAL_OCT16',
  NORMAL = 'NORMAL',
  RETURN_NUMBER = 'RETURN_NUMBER',
  NUMBER_OF_RETURNS = 'NUMBER_OF_RETURNS',
  SOURCE_ID = 'SOURCE_ID',
  INDICES = 'INDICES',
  SPACING = 'SPACING',
  GPS_TIME = 'GPS_TIME',
}

/**
 * Represents a single point attribute (e.g., position, color, intensity)
 *
 * Migrated from Potree PointAttribute class
 */
export class PointAttribute {
  /** Attribute name */
  public readonly name: string;

  /** Data type */
  public readonly type: PointAttributeType;

  /** Number of elements (e.g., 3 for XYZ position) */
  public readonly numElements: number;

  /** Total size in bytes */
  public readonly byteSize: number;

  /** Human-readable description */
  public description: string;

  /** Value range [min, max] */
  public range: [number, number];

  constructor(name: string, dataType: PointAttributeDataType, numElements: number) {
    this.name = name;
    this.type = POINT_ATTRIBUTE_TYPES[dataType];
    this.numElements = numElements;
    this.byteSize = this.numElements * this.type.size;
    this.description = '';
    this.range = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  }

  /**
   * Standard attributes as static constants (like Potree)
   */

  static readonly POSITION_CARTESIAN = new PointAttribute(
    PointAttributeName.POSITION_CARTESIAN,
    PointAttributeDataType.FLOAT,
    3,
  );

  static readonly RGBA_PACKED = new PointAttribute(
    PointAttributeName.COLOR_PACKED,
    PointAttributeDataType.INT8,
    4,
  );

  static readonly COLOR_PACKED = PointAttribute.RGBA_PACKED;

  static readonly RGB_PACKED = new PointAttribute(
    PointAttributeName.COLOR_PACKED,
    PointAttributeDataType.INT8,
    3,
  );

  static readonly NORMAL_FLOATS = new PointAttribute(
    PointAttributeName.NORMAL_FLOATS,
    PointAttributeDataType.FLOAT,
    3,
  );

  static readonly INTENSITY = new PointAttribute(
    PointAttributeName.INTENSITY,
    PointAttributeDataType.UINT16,
    1,
  );

  static readonly CLASSIFICATION = new PointAttribute(
    PointAttributeName.CLASSIFICATION,
    PointAttributeDataType.UINT8,
    1,
  );

  static readonly NORMAL_SPHEREMAPPED = new PointAttribute(
    PointAttributeName.NORMAL_SPHEREMAPPED,
    PointAttributeDataType.UINT8,
    2,
  );

  static readonly NORMAL_OCT16 = new PointAttribute(
    PointAttributeName.NORMAL_OCT16,
    PointAttributeDataType.UINT8,
    2,
  );

  static readonly NORMAL = new PointAttribute(
    PointAttributeName.NORMAL,
    PointAttributeDataType.FLOAT,
    3,
  );

  static readonly RETURN_NUMBER = new PointAttribute(
    PointAttributeName.RETURN_NUMBER,
    PointAttributeDataType.UINT8,
    1,
  );

  static readonly NUMBER_OF_RETURNS = new PointAttribute(
    PointAttributeName.NUMBER_OF_RETURNS,
    PointAttributeDataType.UINT8,
    1,
  );

  static readonly SOURCE_ID = new PointAttribute(
    PointAttributeName.SOURCE_ID,
    PointAttributeDataType.UINT16,
    1,
  );

  static readonly INDICES = new PointAttribute(
    PointAttributeName.INDICES,
    PointAttributeDataType.UINT32,
    1,
  );

  static readonly SPACING = new PointAttribute(
    PointAttributeName.SPACING,
    PointAttributeDataType.FLOAT,
    1,
  );

  static readonly GPS_TIME = new PointAttribute(
    PointAttributeName.GPS_TIME,
    PointAttributeDataType.DOUBLE,
    1,
  );
}
