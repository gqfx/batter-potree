/**
 * Point attribute data types
 *
 * Migrated from Potree PointAttributes.js
 */
/**
 * Point attribute data types with their sizes in bytes
 */
export var PointAttributeDataType;
(function (PointAttributeDataType) {
    PointAttributeDataType["DOUBLE"] = "double";
    PointAttributeDataType["FLOAT"] = "float";
    PointAttributeDataType["INT8"] = "int8";
    PointAttributeDataType["UINT8"] = "uint8";
    PointAttributeDataType["INT16"] = "int16";
    PointAttributeDataType["UINT16"] = "uint16";
    PointAttributeDataType["INT32"] = "int32";
    PointAttributeDataType["UINT32"] = "uint32";
    PointAttributeDataType["INT64"] = "int64";
    PointAttributeDataType["UINT64"] = "uint64";
})(PointAttributeDataType || (PointAttributeDataType = {}));
/**
 * Map of data type enums to their metadata
 */
export const POINT_ATTRIBUTE_TYPES = {
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
export var PointAttributeName;
(function (PointAttributeName) {
    PointAttributeName["POSITION_CARTESIAN"] = "POSITION_CARTESIAN";
    PointAttributeName["RGBA_PACKED"] = "RGBA_PACKED";
    PointAttributeName["COLOR_PACKED"] = "COLOR_PACKED";
    PointAttributeName["RGB_PACKED"] = "RGB_PACKED";
    PointAttributeName["NORMAL_FLOATS"] = "NORMAL_FLOATS";
    PointAttributeName["INTENSITY"] = "INTENSITY";
    PointAttributeName["CLASSIFICATION"] = "CLASSIFICATION";
    PointAttributeName["NORMAL_SPHEREMAPPED"] = "NORMAL_SPHEREMAPPED";
    PointAttributeName["NORMAL_OCT16"] = "NORMAL_OCT16";
    PointAttributeName["NORMAL"] = "NORMAL";
    PointAttributeName["RETURN_NUMBER"] = "RETURN_NUMBER";
    PointAttributeName["NUMBER_OF_RETURNS"] = "NUMBER_OF_RETURNS";
    PointAttributeName["SOURCE_ID"] = "SOURCE_ID";
    PointAttributeName["INDICES"] = "INDICES";
    PointAttributeName["SPACING"] = "SPACING";
    PointAttributeName["GPS_TIME"] = "GPS_TIME";
})(PointAttributeName || (PointAttributeName = {}));
/**
 * Represents a single point attribute (e.g., position, color, intensity)
 *
 * Migrated from Potree PointAttribute class
 */
export class PointAttribute {
    constructor(name, dataType, numElements) {
        this.name = name;
        this.type = POINT_ATTRIBUTE_TYPES[dataType];
        this.numElements = numElements;
        this.byteSize = this.numElements * this.type.size;
        this.description = '';
        this.range = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    }
}
/**
 * Standard attributes as static constants (like Potree)
 */
PointAttribute.POSITION_CARTESIAN = new PointAttribute(PointAttributeName.POSITION_CARTESIAN, PointAttributeDataType.FLOAT, 3);
PointAttribute.RGBA_PACKED = new PointAttribute(PointAttributeName.COLOR_PACKED, PointAttributeDataType.INT8, 4);
PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;
PointAttribute.RGB_PACKED = new PointAttribute(PointAttributeName.COLOR_PACKED, PointAttributeDataType.INT8, 3);
PointAttribute.NORMAL_FLOATS = new PointAttribute(PointAttributeName.NORMAL_FLOATS, PointAttributeDataType.FLOAT, 3);
PointAttribute.INTENSITY = new PointAttribute(PointAttributeName.INTENSITY, PointAttributeDataType.UINT16, 1);
PointAttribute.CLASSIFICATION = new PointAttribute(PointAttributeName.CLASSIFICATION, PointAttributeDataType.UINT8, 1);
PointAttribute.NORMAL_SPHEREMAPPED = new PointAttribute(PointAttributeName.NORMAL_SPHEREMAPPED, PointAttributeDataType.UINT8, 2);
PointAttribute.NORMAL_OCT16 = new PointAttribute(PointAttributeName.NORMAL_OCT16, PointAttributeDataType.UINT8, 2);
PointAttribute.NORMAL = new PointAttribute(PointAttributeName.NORMAL, PointAttributeDataType.FLOAT, 3);
PointAttribute.RETURN_NUMBER = new PointAttribute(PointAttributeName.RETURN_NUMBER, PointAttributeDataType.UINT8, 1);
PointAttribute.NUMBER_OF_RETURNS = new PointAttribute(PointAttributeName.NUMBER_OF_RETURNS, PointAttributeDataType.UINT8, 1);
PointAttribute.SOURCE_ID = new PointAttribute(PointAttributeName.SOURCE_ID, PointAttributeDataType.UINT16, 1);
PointAttribute.INDICES = new PointAttribute(PointAttributeName.INDICES, PointAttributeDataType.UINT32, 1);
PointAttribute.SPACING = new PointAttribute(PointAttributeName.SPACING, PointAttributeDataType.FLOAT, 1);
PointAttribute.GPS_TIME = new PointAttribute(PointAttributeName.GPS_TIME, PointAttributeDataType.DOUBLE, 1);
//# sourceMappingURL=PointAttribute.js.map