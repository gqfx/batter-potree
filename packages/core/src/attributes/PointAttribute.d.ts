/**
 * Point attribute data types
 *
 * Migrated from Potree PointAttributes.js
 */
/**
 * Point attribute data types with their sizes in bytes
 */
export declare enum PointAttributeDataType {
    DOUBLE = "double",
    FLOAT = "float",
    INT8 = "int8",
    UINT8 = "uint8",
    INT16 = "int16",
    UINT16 = "uint16",
    INT32 = "int32",
    UINT32 = "uint32",
    INT64 = "int64",
    UINT64 = "uint64"
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
export declare const POINT_ATTRIBUTE_TYPES: Record<PointAttributeDataType, PointAttributeType>;
/**
 * Standard point attribute names
 */
export declare enum PointAttributeName {
    POSITION_CARTESIAN = "POSITION_CARTESIAN",
    RGBA_PACKED = "RGBA_PACKED",
    COLOR_PACKED = "COLOR_PACKED",
    RGB_PACKED = "RGB_PACKED",
    NORMAL_FLOATS = "NORMAL_FLOATS",
    INTENSITY = "INTENSITY",
    CLASSIFICATION = "CLASSIFICATION",
    NORMAL_SPHEREMAPPED = "NORMAL_SPHEREMAPPED",
    NORMAL_OCT16 = "NORMAL_OCT16",
    NORMAL = "NORMAL",
    RETURN_NUMBER = "RETURN_NUMBER",
    NUMBER_OF_RETURNS = "NUMBER_OF_RETURNS",
    SOURCE_ID = "SOURCE_ID",
    INDICES = "INDICES",
    SPACING = "SPACING",
    GPS_TIME = "GPS_TIME"
}
/**
 * Represents a single point attribute (e.g., position, color, intensity)
 *
 * Migrated from Potree PointAttribute class
 */
export declare class PointAttribute {
    /** Attribute name */
    readonly name: string;
    /** Data type */
    readonly type: PointAttributeType;
    /** Number of elements (e.g., 3 for XYZ position) */
    readonly numElements: number;
    /** Total size in bytes */
    readonly byteSize: number;
    /** Human-readable description */
    description: string;
    /** Value range [min, max] */
    range: [number, number];
    constructor(name: string, dataType: PointAttributeDataType, numElements: number);
    /**
     * Standard attributes as static constants (like Potree)
     */
    static readonly POSITION_CARTESIAN: PointAttribute;
    static readonly RGBA_PACKED: PointAttribute;
    static readonly COLOR_PACKED: PointAttribute;
    static readonly RGB_PACKED: PointAttribute;
    static readonly NORMAL_FLOATS: PointAttribute;
    static readonly INTENSITY: PointAttribute;
    static readonly CLASSIFICATION: PointAttribute;
    static readonly NORMAL_SPHEREMAPPED: PointAttribute;
    static readonly NORMAL_OCT16: PointAttribute;
    static readonly NORMAL: PointAttribute;
    static readonly RETURN_NUMBER: PointAttribute;
    static readonly NUMBER_OF_RETURNS: PointAttribute;
    static readonly SOURCE_ID: PointAttribute;
    static readonly INDICES: PointAttribute;
    static readonly SPACING: PointAttribute;
    static readonly GPS_TIME: PointAttribute;
}
//# sourceMappingURL=PointAttribute.d.ts.map