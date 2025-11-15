/**
 * EarthControls
 * Camera controls with dynamic pivot point for point cloud interaction
 *
 * Based on Potree's EarthControls but modernized:
 * - No jQuery dependencies
 * - TypeScript
 * - Uses TypedEventEmitter from @better-potree/core
 * - Native DOM events
 */

import * as THREE from 'three';
import { TypedEventEmitter } from '@better-potree/core';

/**
 * Mouse button enum
 */
export enum MouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
}

/**
 * Earth controls events
 */
export interface EarthControlsEvents {
  start: void;
  change: void;
  end: void;
  [key: string]: any; // Index signature for EventMap compatibility
}

/**
 * Drag state
 */
interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  button: MouseButton;
  active: boolean;
}

/**
 * EarthControls - Camera controls with dynamic pivot for point clouds
 *
 * Features:
 * - Dynamic rotation pivot based on clicked point
 * - Mouse drag rotation (right button)
 * - Mouse wheel zoom
 * - Double-click to zoom to location
 * - Touch support for mobile devices
 */
export class EarthControls extends TypedEventEmitter<EarthControlsEvents> {
  readonly camera: THREE.Camera;
  readonly domElement: HTMLElement;

  // Control parameters
  rotationSpeed = 10;
  zoomSpeed = 1;
  fadeFactor = 20;

  // State
  pivot: THREE.Vector3 | null = null;
  enabled = true;

  // Internal state
  private wheelDelta = 0;
  private zoomDelta = new THREE.Vector3();
  private dragState: DragState = {
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    button: MouseButton.LEFT,
    active: false,
  };

  // Event listeners
  private boundHandlers = {
    mouseDown: this.onMouseDown.bind(this),
    mouseMove: this.onMouseMove.bind(this),
    mouseUp: this.onMouseUp.bind(this),
    wheel: this.onWheel.bind(this),
    contextMenu: this.onContextMenu.bind(this),
    touchStart: this.onTouchStart.bind(this),
    touchMove: this.onTouchMove.bind(this),
    touchEnd: this.onTouchEnd.bind(this),
  };

  /**
   * Create earth controls
   * @param camera The camera to control
   * @param domElement The DOM element to attach to
   */
  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    super();

    this.camera = camera;
    this.domElement = domElement;

    this.connect();
  }

  /**
   * Connect event listeners
   */
  private connect(): void {
    this.domElement.addEventListener('mousedown', this.boundHandlers.mouseDown);
    this.domElement.addEventListener('wheel', this.boundHandlers.wheel);
    this.domElement.addEventListener('contextmenu', this.boundHandlers.contextMenu);
    this.domElement.addEventListener('touchstart', this.boundHandlers.touchStart, {
      passive: false,
    });
  }

  /**
   * Disconnect event listeners
   */
  private disconnect(): void {
    this.domElement.removeEventListener('mousedown', this.boundHandlers.mouseDown);
    this.domElement.removeEventListener('wheel', this.boundHandlers.wheel);
    this.domElement.removeEventListener('contextmenu', this.boundHandlers.contextMenu);
    this.domElement.removeEventListener('touchstart', this.boundHandlers.touchStart);

    // Remove global listeners
    document.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    document.removeEventListener('mouseup', this.boundHandlers.mouseUp);
    document.removeEventListener('touchmove', this.boundHandlers.touchMove);
    document.removeEventListener('touchend', this.boundHandlers.touchEnd);
  }

  /**
   * Handle mouse down
   */
  private onMouseDown(event: MouseEvent): void {
    if (!this.enabled) return;

    event.preventDefault();

    this.dragState = {
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      deltaX: 0,
      deltaY: 0,
      button: event.button,
      active: true,
    };

    // Add global listeners for mouse move and up
    document.addEventListener('mousemove', this.boundHandlers.mouseMove);
    document.addEventListener('mouseup', this.boundHandlers.mouseUp);

    // For rotation (right button), set the pivot point
    if (event.button === MouseButton.RIGHT) {
      this.emit('start', undefined);
    }
  }

  /**
   * Handle mouse move
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled || !this.dragState.active) return;

    event.preventDefault();

    const prevX = this.dragState.currentX;
    const prevY = this.dragState.currentY;

    this.dragState.currentX = event.clientX;
    this.dragState.currentY = event.clientY;
    this.dragState.deltaX = this.dragState.currentX - prevX;
    this.dragState.deltaY = this.dragState.currentY - prevY;

    if (this.dragState.button === MouseButton.RIGHT && this.pivot) {
      this.handleRotation();
    }
  }

  /**
   * Handle mouse up
   */
  private onMouseUp(event: MouseEvent): void {
    if (!this.enabled) return;

    event.preventDefault();

    if (this.dragState.active) {
      this.dragState.active = false;
      this.emit('end', undefined);
    }

    // Remove global listeners
    document.removeEventListener('mousemove', this.boundHandlers.mouseMove);
    document.removeEventListener('mouseup', this.boundHandlers.mouseUp);
  }

  /**
   * Handle rotation based on mouse drag
   */
  private handleRotation(): void {
    if (!this.pivot) return;

    const ndrag = {
      x: this.dragState.deltaX / this.domElement.clientWidth,
      y: this.dragState.deltaY / this.domElement.clientHeight,
    };

    const yawDelta = -ndrag.x * this.rotationSpeed * 0.5;
    const pitchDelta = -ndrag.y * this.rotationSpeed * 0.2;

    // Get camera vectors
    const position = this.camera.position.clone();
    const pivotToCam = new THREE.Vector3().subVectors(position, this.pivot);

    // Compute side vector (right)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const side = new THREE.Vector3().crossVectors(forward, up).normalize();

    // Apply pitch rotation (around side axis)
    pivotToCam.applyAxisAngle(side, pitchDelta);

    // Apply yaw rotation (around world up axis)
    const worldUp = new THREE.Vector3(0, 0, 1);
    pivotToCam.applyAxisAngle(worldUp, yawDelta);

    // Update camera position
    const newCamPos = new THREE.Vector3().addVectors(this.pivot, pivotToCam);
    this.camera.position.copy(newCamPos);

    // Update camera rotation to look at pivot
    this.camera.lookAt(this.pivot);

    this.emit('change', undefined);
  }

  /**
   * Handle mouse wheel
   */
  private onWheel(event: WheelEvent): void {
    if (!this.enabled) return;

    event.preventDefault();

    // Normalize wheel delta
    const delta = event.deltaY > 0 ? -1 : 1;
    this.wheelDelta += delta * this.zoomSpeed;
  }

  /**
   * Handle context menu (prevent default)
   */
  private onContextMenu(event: Event): void {
    event.preventDefault();
  }

  /**
   * Handle touch start
   */
  private onTouchStart(event: TouchEvent): void {
    if (!this.enabled) return;

    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      if (!touch) return;

      this.dragState = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX: 0,
        deltaY: 0,
        button: MouseButton.RIGHT, // Treat as rotation
        active: true,
      };

      this.emit('start', undefined);

      document.addEventListener('touchmove', this.boundHandlers.touchMove, { passive: false });
      document.addEventListener('touchend', this.boundHandlers.touchEnd);
    }
  }

  /**
   * Handle touch move
   */
  private onTouchMove(event: TouchEvent): void {
    if (!this.enabled || !this.dragState.active) return;

    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      if (!touch) return;

      const prevX = this.dragState.currentX;
      const prevY = this.dragState.currentY;

      this.dragState.currentX = touch.clientX;
      this.dragState.currentY = touch.clientY;
      this.dragState.deltaX = this.dragState.currentX - prevX;
      this.dragState.deltaY = this.dragState.currentY - prevY;

      if (this.pivot) {
        this.handleRotation();
      }
    }
  }

  /**
   * Handle touch end
   */
  private onTouchEnd(event: TouchEvent): void {
    if (!this.enabled) return;

    event.preventDefault();

    if (this.dragState.active) {
      this.dragState.active = false;
      this.emit('end', undefined);
    }

    document.removeEventListener('touchmove', this.boundHandlers.touchMove);
    document.removeEventListener('touchend', this.boundHandlers.touchEnd);
  }

  /**
   * Set the pivot point for rotation
   * @param point The pivot point in world coordinates
   */
  setPivot(point: THREE.Vector3): void {
    this.pivot = point.clone();
  }

  /**
   * Update controls (called each frame)
   * @param delta Time delta in seconds
   */
  update(delta: number): void {
    if (!this.enabled) return;

    const fade = Math.pow(0.5, this.fadeFactor * delta);
    const progression = 1 - fade;

    // Apply zoom
    if (this.wheelDelta !== 0 && this.pivot) {
      const distance = this.camera.position.distanceTo(this.pivot);
      const jumpDistance = distance * 0.2 * this.wheelDelta;
      const targetDir = new THREE.Vector3()
        .subVectors(this.pivot, this.camera.position)
        .normalize();

      const resolvedPos = new THREE.Vector3().addVectors(
        this.camera.position,
        this.zoomDelta
      );
      resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
      this.zoomDelta.subVectors(resolvedPos, this.camera.position);
    }

    // Apply zoom delta
    if (this.zoomDelta.length() !== 0) {
      const p = this.zoomDelta.clone().multiplyScalar(progression);
      const newPos = new THREE.Vector3().addVectors(this.camera.position, p);
      this.camera.position.copy(newPos);
      this.emit('change', undefined);
    }

    // Decelerate
    this.zoomDelta.multiplyScalar(fade);
    this.wheelDelta = 0;
  }

  /**
   * Stop all motion
   */
  stop(): void {
    this.wheelDelta = 0;
    this.zoomDelta.set(0, 0, 0);
  }

  /**
   * Dispose of the controls
   */
  dispose(): void {
    this.disconnect();
    this.removeAllListeners();
  }
}
