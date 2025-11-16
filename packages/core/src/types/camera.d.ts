/**
 * Camera interfaces
 *
 * These interfaces define the camera contract for the core library.
 * They use THREE.js math types (Vector3, Matrix4) but not rendering classes.
 */
import type * as THREE from 'three';
/**
 * Camera type enumeration
 */
export declare enum CameraType {
  PERSPECTIVE = 'perspective',
  ORTHOGRAPHIC = 'orthographic',
}
/**
 * Generic camera interface
 * Defines the minimum required camera functionality for point cloud rendering
 */
export interface ICamera {
  /** Camera type */
  readonly type: CameraType;
  /** Position in world space */
  readonly position: THREE.Vector3;
  /** View matrix (inverse of world matrix) */
  readonly matrixWorldInverse: THREE.Matrix4;
  /** Projection matrix */
  readonly projectionMatrix: THREE.Matrix4;
  /** World transformation matrix */
  readonly matrixWorld: THREE.Matrix4;
  /** Near clipping plane distance */
  near: number;
  /** Far clipping plane distance */
  far: number;
  /** Update camera matrices */
  updateMatrixWorld(force?: boolean): void;
  /** Update projection matrix */
  updateProjectionMatrix(): void;
}
/**
 * Perspective camera interface
 */
export interface IPerspectiveCamera extends ICamera {
  readonly type: CameraType.PERSPECTIVE;
  /** Vertical field of view in degrees */
  fov: number;
  /** Aspect ratio (width / height) */
  aspect: number;
}
/**
 * Orthographic camera interface
 */
export interface IOrthographicCamera extends ICamera {
  readonly type: CameraType.ORTHOGRAPHIC;
  /** Left plane distance */
  left: number;
  /** Right plane distance */
  right: number;
  /** Top plane distance */
  top: number;
  /** Bottom plane distance */
  bottom: number;
  /** Zoom factor */
  zoom: number;
}
//# sourceMappingURL=camera.d.ts.map
