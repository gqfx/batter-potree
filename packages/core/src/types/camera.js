/**
 * Camera interfaces
 *
 * These interfaces define the camera contract for the core library.
 * They use THREE.js math types (Vector3, Matrix4) but not rendering classes.
 */
/**
 * Camera type enumeration
 */
export var CameraType;
(function (CameraType) {
    CameraType["PERSPECTIVE"] = "perspective";
    CameraType["ORTHOGRAPHIC"] = "orthographic";
})(CameraType || (CameraType = {}));
//# sourceMappingURL=camera.js.map