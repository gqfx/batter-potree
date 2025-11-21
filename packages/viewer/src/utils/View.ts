/**
 * View - Camera view state management
 * Based on Potree's View class
 */

import * as THREE from 'three';

/**
 * View manages the camera's position and orientation using
 * a yaw-pitch-radius representation instead of direct quaternions.
 *
 * This provides more intuitive control for orbit-style navigation.
 */
export class View {
  /** Camera position in world space */
  position: THREE.Vector3;

  /** Viewing direction (forward vector) */
  direction: THREE.Vector3;

  /** Distance from pivot point (for orbit controls) */
  radius: number;

  /** Horizontal rotation angle in radians */
  yaw: number;

  /** Vertical rotation angle in radians */
  pitch: number;

  /**
   * Create a new View
   *
   * @param position - Initial camera position
   * @param yaw - Initial yaw angle in radians (default: 0)
   * @param pitch - Initial pitch angle in radians (default: 0)
   * @param radius - Initial distance from pivot (default: 10)
   */
  constructor(
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 10),
    yaw = 0,
    pitch = 0,
    radius = 10,
  ) {
    this.position = position.clone();
    this.direction = new THREE.Vector3(0, 0, -1);
    this.yaw = yaw;
    this.pitch = pitch;
    this.radius = radius;
    this.updateDirection();
  }

  /**
   * Update direction vector based on yaw and pitch
   */
  private updateDirection(): void {
    // Convert yaw-pitch to direction vector
    this.direction.x = Math.cos(this.pitch) * Math.sin(this.yaw);
    this.direction.y = Math.cos(this.pitch) * Math.cos(this.yaw);
    this.direction.z = Math.sin(this.pitch);
    this.direction.normalize();
  }

  /**
   * Get the pivot point (camera target)
   *
   * @returns Pivot point in world space
   */
  getPivot(): THREE.Vector3 {
    return new THREE.Vector3().addVectors(this.position, this.direction.clone().multiplyScalar(this.radius));
  }

  /**
   * Get the side vector (right direction)
   *
   * @returns Side vector
   */
  getSide(): THREE.Vector3 {
    const up = new THREE.Vector3(0, 0, 1);
    const forward = this.direction.clone();
    const side = new THREE.Vector3().crossVectors(forward, up);
    side.normalize();
    return side;
  }

  /**
   * Get the up vector
   *
   * @returns Up vector
   */
  getUp(): THREE.Vector3 {
    const forward = this.direction.clone();
    const side = this.getSide();
    const up = new THREE.Vector3().crossVectors(side, forward);
    up.normalize();
    return up;
  }

  /**
   * Apply this view to a Three.js camera
   *
   * @param camera - Camera to update
   */
  applyToCamera(camera: THREE.Camera): void {
    camera.position.copy(this.position);

    // Calculate target point
    const target = this.getPivot();
    camera.lookAt(target);

    camera.updateMatrix();
    camera.updateMatrixWorld(true);
  }

  /**
   * Extract view from a Three.js camera
   *
   * @param camera - Camera to extract from
   * @returns New View instance
   */
  static fromCamera(camera: THREE.Camera): View {
    const position = camera.position.clone();

    // Get forward direction
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);

    // Calculate yaw and pitch from direction
    const yaw = Math.atan2(direction.x, direction.y);
    const pitch = Math.asin(direction.z);

    // Default radius
    const radius = 10;

    const view = new View(position, yaw, pitch, radius);
    view.direction.copy(direction);

    return view;
  }

  /**
   * Clone this view
   *
   * @returns New View instance with same values
   */
  clone(): View {
    return new View(this.position.clone(), this.yaw, this.pitch, this.radius);
  }

  /**
   * Copy values from another view
   *
   * @param source - View to copy from
   */
  copy(source: View): void {
    this.position.copy(source.position);
    this.direction.copy(source.direction);
    this.yaw = source.yaw;
    this.pitch = source.pitch;
    this.radius = source.radius;
  }
}
