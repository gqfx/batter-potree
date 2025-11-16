/**
 * Common type definitions
 */
// Re-export all type modules
export * from './camera.js';
export * from './loader.js';
export * from './potree.js';
export * from './renderer.js';
/**
 * Navigation modes
 */
export var NavigationMode;
(function (NavigationMode) {
    NavigationMode["ORBIT"] = "orbit";
    NavigationMode["FLY"] = "fly";
    NavigationMode["EARTH"] = "earth";
    NavigationMode["FPS"] = "fps";
})(NavigationMode || (NavigationMode = {}));
/**
 * Point size types
 */
export var PointSizeType;
(function (PointSizeType) {
    PointSizeType["FIXED"] = "fixed";
    PointSizeType["ATTENUATED"] = "attenuated";
    PointSizeType["ADAPTIVE"] = "adaptive";
})(PointSizeType || (PointSizeType = {}));
/**
 * Point shape types
 */
export var PointShape;
(function (PointShape) {
    PointShape["SQUARE"] = "square";
    PointShape["CIRCLE"] = "circle";
    PointShape["PARABOLOID"] = "paraboloid";
})(PointShape || (PointShape = {}));
/**
 * Point cloud quality types
 */
export var PointQuality;
(function (PointQuality) {
    PointQuality["SQUARES"] = "squares";
    PointQuality["CIRCLES"] = "circles";
    PointQuality["INTERPOLATION"] = "interpolation";
    PointQuality["HQ_SPLATS"] = "hq_splats";
})(PointQuality || (PointQuality = {}));
/**
 * Measurement types
 */
export var MeasurementType;
(function (MeasurementType) {
    MeasurementType["POINT"] = "point";
    MeasurementType["DISTANCE"] = "distance";
    MeasurementType["AREA"] = "area";
    MeasurementType["VOLUME"] = "volume";
    MeasurementType["ANGLE"] = "angle";
    MeasurementType["HEIGHT"] = "height";
    MeasurementType["CIRCLE"] = "circle";
    MeasurementType["AZIMUTH"] = "azimuth";
})(MeasurementType || (MeasurementType = {}));
/**
 * Clip volume types
 */
export var ClipVolumeType;
(function (ClipVolumeType) {
    ClipVolumeType["BOX"] = "box";
    ClipVolumeType["SPHERE"] = "sphere";
    ClipVolumeType["POLYGON"] = "polygon";
})(ClipVolumeType || (ClipVolumeType = {}));
/**
 * Clip mode
 */
export var ClipMode;
(function (ClipMode) {
    ClipMode["DISABLED"] = "disabled";
    ClipMode["CLIP_OUTSIDE"] = "clip_outside";
    ClipMode["HIGHLIGHT_INSIDE"] = "highlight_inside";
})(ClipMode || (ClipMode = {}));
/**
 * Point cloud visualization mode
 */
export var PointCloudColorMode;
(function (PointCloudColorMode) {
    PointCloudColorMode["RGB"] = "RGB";
    PointCloudColorMode["INTENSITY"] = "INTENSITY";
    PointCloudColorMode["CLASSIFICATION"] = "CLASSIFICATION";
    PointCloudColorMode["ELEVATION"] = "ELEVATION";
    PointCloudColorMode["LEVEL_OF_DETAIL"] = "LEVEL_OF_DETAIL";
    PointCloudColorMode["RETURN_NUMBER"] = "RETURN_NUMBER";
    PointCloudColorMode["SOURCE_ID"] = "SOURCE_ID";
    PointCloudColorMode["NORMAL"] = "NORMAL";
})(PointCloudColorMode || (PointCloudColorMode = {}));
//# sourceMappingURL=index.js.map