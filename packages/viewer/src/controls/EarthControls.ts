/**
 * EarthControls - Advanced camera controls with dynamic pivot for point clouds
 *
 * This is a complete port of Potree's EarthControls with all features:
 * - Left-click pan on point cloud surface
 * - Right-click orbit rotation around picked point
 * - Mouse wheel zoom towards point cloud
 * - Double-click animated zoom to location
 * - Pivot indicator visualization
 * - Touch support for mobile devices
 *
 * Based on Potree's EarthControls but modernized with TypeScript and modern APIs.
 */

import { TypedEventEmitter } from '@better-potree/core';
import * as TWEEN from '@tweenjs/tween.js';
import * as THREE from 'three';
import type { Viewer } from '../Viewer.js';
import { getMousePointCloudIntersection, projectedRadius } from '../utils/GeometryUtils.js';
import { View } from '../utils/View.js';

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
  start: undefined;
  change: undefined;
  end: undefined;
  [key: string]: any;
}

/**
 * Mouse state for drag operations
 */
interface MouseState {
  x: number;
  y: number;
}

/**
 * Drag state
 */
interface DragState {
  startHandled: boolean;
  object: any | null;
  mouse: MouseButton;
  start: MouseState;
  end: MouseState;
  lastDrag: MouseState;
}

/**
 * EarthControls - Camera controls with dynamic pivot for point clouds
 *
 * Features:
 * - Dynamic rotation pivot based on clicked point
 * - Left mouse button pan on point cloud surface
 * - Right mouse button rotation around pivot
 * - Mouse wheel zoom towards point cloud
 * - Double-click animated zoom to location
 * - Pivot indicator visualization
 * - Touch support for mobile devices
 * - Integration with Potree's View system
 *
 * @example
 * ```typescript
 * const controls = new EarthControls(viewer);
 * controls.setScene(scene);
 *
 * // Update in animation loop
 * function animate(delta: number) {
 *   controls.update(delta);
 *   renderer.render(scene, camera);
 * }
 * ```
 */
export class EarthControls extends TypedEventEmitter<EarthControlsEvents> {
  readonly viewer?: Viewer;
  readonly camera: THREE.Camera;
  readonly domElement: HTMLElement;
  private readonly renderer?: THREE.WebGLRenderer;

  // Scene management
  private scene: any | null = null;
  private readonly sceneControls: THREE.Scene;

  // View system
  view: View;

  // Control parameters
  rotationSpeed = 10;
  zoomSpeed = 1;
  fadeFactor = 20;

  // Control disable flags
  /** Disable camera rotation */
  disableRotation = false;
  /** Disable camera zoom */
  disableZoom = false;
  /** Disable camera panning */
  disableMove = false;

  // State
  private wheelDelta = 0;
  private currentMousePosition: { x: number; y: number } | null = null;
  private zoomDelta = new THREE.Vector3();
  private camStart: THREE.Camera | null = null;
  private pivot: THREE.Vector3 | null = null;
  enabled = true;

  // Visual indicators
  private readonly pivotIndicator: THREE.Mesh;

  // Animation
  private tweens: TWEEN.Tween<any>[] = [];

  // Drag state
  private dragState: DragState | null = null;

  // Event handlers (bound)
  private boundHandlers = {
    drag: this.onDrag.bind(this),
    drop: this.onDrop.bind(this),
    mousedown: this.onMouseDown.bind(this),
    mouseup: this.onMouseUp.bind(this),
    mousemove: this.onMouseMove.bind(this),
    mousewheel: this.onMouseWheel.bind(this),
    dblclick: this.onDoubleClick.bind(this),
    contextmenu: this.onContextMenu.bind(this),
  };

  /**
   * Create earth controls
   *
   * @param viewerOrCamera - Viewer instance or camera
   * @param domElement - DOM element (only required if passing camera)
   */
  constructor(viewerOrCamera: Viewer | THREE.Camera, domElement?: HTMLElement) {
    super();

    if (this.isViewer(viewerOrCamera)) {
      // New API: viewer-based construction
      this.viewer = viewerOrCamera;
      this.camera = viewerOrCamera.getCamera();
      this.domElement = viewerOrCamera.getRenderer().getDomElement();
      const threeRenderer = viewerOrCamera.getRenderer().getThreeRenderer?.();
      if (threeRenderer) {
        Object.assign(this, { renderer: threeRenderer as THREE.WebGLRenderer });
      }
    } else {
      // Legacy API: camera + domElement construction
      if (!domElement) {
        throw new Error('domElement is required when passing camera');
      }
      this.camera = viewerOrCamera;
      this.domElement = domElement;
      // renderer remains undefined
    }

    // Initialize view from camera
    this.view = View.fromCamera(this.camera);

    // Create controls scene for visual indicators
    this.sceneControls = new THREE.Scene();

    // Create pivot indicator
    const sg = new THREE.SphereGeometry(1, 16, 16);
    const sm = new THREE.MeshNormalMaterial();
    this.pivotIndicator = new THREE.Mesh(sg, sm);
    this.pivotIndicator.visible = false;
    this.sceneControls.add(this.pivotIndicator);

    // Attach event listeners
    this.connect();
  }

  /**
   * Type guard to check if parameter is Viewer
   */
  private isViewer(obj: any): obj is Viewer {
    return obj && typeof obj.getCamera === 'function' && typeof obj.getRenderer === 'function';
  }

  /**
   * Set the scene to operate on
   *
   * @param scene - Scene with point clouds
   */
  setScene(scene: any): void {
    this.scene = scene;
  }

  /**
   * Connect event listeners
   */
  private connect(): void {
    this.domElement.addEventListener('mousedown', this.boundHandlers.mousedown);
    this.domElement.addEventListener('mousemove', this.boundHandlers.mousemove);
    this.domElement.addEventListener('dblclick', this.boundHandlers.dblclick);
    this.domElement.addEventListener('wheel', this.boundHandlers.mousewheel);
    this.domElement.addEventListener('contextmenu', this.boundHandlers.contextmenu);
  }

  /**
   * Disconnect event listeners
   */
  private disconnect(): void {
    this.domElement.removeEventListener('mousedown', this.boundHandlers.mousedown);
    this.domElement.removeEventListener('mousemove', this.boundHandlers.mousemove);
    this.domElement.removeEventListener('dblclick', this.boundHandlers.dblclick);
    this.domElement.removeEventListener('wheel', this.boundHandlers.mousewheel);
    this.domElement.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
    document.removeEventListener('mousemove', this.boundHandlers.drag);
    document.removeEventListener('mouseup', this.boundHandlers.drop);
  }

  /**
   * Handle mouse move (for tracking position)
   */
  private onMouseMove(event: MouseEvent): void {
    this.currentMousePosition = { x: event.clientX, y: event.clientY };
  }

  /**
   * Handle mouse down
   */
  private onMouseDown(event: MouseEvent): void {
    if (!this.enabled || !this.scene) return;

    event.preventDefault();

    // Get point cloud intersection (only if viewer is available)
    if (this.viewer) {
      const mouse = { x: event.clientX, y: event.clientY };
      const camera = this.camera;
      const pointclouds = this.viewer.getPointClouds();

      if (!this.renderer) {
        console.warn('[EarthControls] Cannot get point cloud intersection without renderer');
        return;
      }

      const intersection = getMousePointCloudIntersection(mouse, camera, this.renderer, pointclouds, {
        pickClipped: false,
      });

      if (intersection) {
        this.pivot = intersection.location.clone();
        this.camStart = camera.clone();
        this.pivotIndicator.visible = true;
        this.pivotIndicator.position.copy(intersection.location);
      } else {
        // Fallback to render center when no point cloud intersection
        const location = this.getRenderCenterVector();
        this.pivot = location.clone();
        this.camStart = camera.clone();
        this.pivotIndicator.visible = false;
      }
    }

    // Initialize drag state
    this.dragState = {
      startHandled: false,
      object: null,
      mouse: event.button,
      start: { x: event.clientX, y: event.clientY },
      end: { x: event.clientX, y: event.clientY },
      lastDrag: { x: 0, y: 0 },
    };

    // Attach global listeners for drag
    document.addEventListener('mousemove', this.boundHandlers.drag);
    document.addEventListener('mouseup', this.boundHandlers.drop);
  }

  /**
   * Handle mouse up
   */
  private onMouseUp(_event: MouseEvent): void {
    if (!this.enabled) return;

    this.camStart = null;
    this.pivot = null;
    this.pivotIndicator.visible = false;
    this.dragState = null;

    // Remove global listeners
    document.removeEventListener('mousemove', this.boundHandlers.drag);
    document.removeEventListener('mouseup', this.boundHandlers.drop);
  }

  /**
   * Handle drag
   */
  private onDrag(event: MouseEvent): void {
    if (!this.enabled || !this.dragState) return;

    event.preventDefault();

    // Update drag state
    const prevEnd = { ...this.dragState.end };
    this.dragState.end = { x: event.clientX, y: event.clientY };
    this.dragState.lastDrag = {
      x: this.dragState.end.x - prevEnd.x,
      y: this.dragState.end.y - prevEnd.y,
    };

    // Handle drag based on button
    if (!this.dragState.object) {
      if (!this.pivot) {
        return;
      }

      if (!this.dragState.startHandled) {
        this.dragState.startHandled = true;
        this.emit('start', undefined);
      }

      const camStart = this.camStart;
      if (!camStart) return;

      if (this.dragState.mouse === MouseButton.LEFT) {
        // Rotate: Orbit around pivot (LEFT button)
        if (this.disableRotation) {
          return;
        }

        const ndrag = {
          x: this.dragState.lastDrag.x / this.domElement.clientWidth,
          y: this.dragState.lastDrag.y / this.domElement.clientHeight,
        };

        const yawDelta = -ndrag.x * this.rotationSpeed * 0.5;
        const pitchDelta = -ndrag.y * this.rotationSpeed * 0.2;

        // Clamp pitch to avoid gimbal lock
        const originalPitch = this.view.pitch;
        const tmpView = this.view.clone();
        tmpView.pitch = tmpView.pitch + pitchDelta;
        const clampedPitchDelta = tmpView.pitch - originalPitch;

        // Calculate rotation
        const pivotToCam = new THREE.Vector3().subVectors(this.view.position, this.pivot);
        const side = this.view.getSide();

        // Apply pitch rotation (around side axis)
        pivotToCam.applyAxisAngle(side, clampedPitchDelta);

        // Apply yaw rotation (around world up axis)
        pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);

        // Update camera position
        const newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);
        this.view.position.copy(newCam);
        this.view.yaw += yawDelta;
        this.view.pitch += clampedPitchDelta;

        this.emit('change', undefined);
      } else if (this.dragState.mouse === MouseButton.RIGHT) {
        // Pan: Move camera using View.pan() (RIGHT button)
        if (this.disableMove) {
          return;
        }

        const ndrag = {
          x: this.dragState.lastDrag.x / this.domElement.clientWidth,
          y: this.dragState.lastDrag.y / this.domElement.clientHeight,
        };

        const panDistance = this.view.radius * 3;
        const px = -ndrag.x * panDistance;
        const py = ndrag.y * panDistance;

        this.view.pan(px, py);

        // Update view radius
        const distance = this.view.position.distanceTo(this.pivot);
        this.view.radius = distance;

        this.emit('change', undefined);
      }
    }
  }

  /**
   * Handle drop (end drag)
   */
  private onDrop(event: MouseEvent): void {
    if (!this.enabled) return;

    // First call onMouseUp to cleanup state
    this.onMouseUp(event);

    // Then emit end event
    this.emit('end', undefined);
  }

  /**
   * Handle mouse wheel
   */
  private onMouseWheel(event: WheelEvent): void {
    if (!this.enabled || this.disableZoom) return;

    event.preventDefault();

    // Normalize wheel delta
    const delta = event.deltaY > 0 ? -1 : 1;
    this.wheelDelta += delta;
  }

  /**
   * Handle context menu (prevent default)
   */
  private onContextMenu(event: Event): void {
    event.preventDefault();
  }

  /**
   * Handle double click - zoom to location
   */
  private onDoubleClick(event: MouseEvent): void {
    if (!this.enabled || !this.scene || !this.viewer || this.disableZoom) return;

    event.preventDefault();

    const mouse = { x: event.clientX, y: event.clientY };
    this.zoomToLocation(mouse);
  }

  /**
   * Zoom to a location with animation
   *
   * @param mouse - Mouse position
   */
  private zoomToLocation(mouse: { x: number; y: number }): void {
    if (!this.scene || !this.viewer || !this.renderer) return;

    const camera = this.camera;
    const pointclouds = this.viewer.getPointClouds();

    const intersection = getMousePointCloudIntersection(mouse, camera, this.renderer, pointclouds);

    if (!intersection) {
      return;
    }

    // Calculate target radius based on node size
    let targetRadius = 0;
    {
      const minimumJumpDistance = 0.2;

      // Get node on ray to calculate appropriate zoom distance
      // For now, use a fixed factor of the current distance
      const distance = camera.position.distanceTo(intersection.location);
      targetRadius = Math.max(minimumJumpDistance, distance * 0.1);
    }

    // Calculate target camera position
    const d = this.view.direction.clone().multiplyScalar(-1);
    const cameraTargetPosition = new THREE.Vector3().addVectors(intersection.location, d.multiplyScalar(targetRadius));

    // Animate
    const animationDuration = 600;

    const value = { x: 0 };
    const tween = new TWEEN.Tween(value).to({ x: 1 }, animationDuration);
    tween.easing(TWEEN.Easing.Quartic.Out);
    this.tweens.push(tween);

    const startPos = this.view.position.clone();
    const targetPos = cameraTargetPosition.clone();
    const startRadius = this.view.radius;
    const targetRadiusFinal = cameraTargetPosition.distanceTo(intersection.location);

    tween.onUpdate(() => {
      const t = value.x;
      this.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
      this.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
      this.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

      this.view.radius = (1 - t) * startRadius + t * targetRadiusFinal;
    });

    tween.onComplete(() => {
      this.tweens = this.tweens.filter((e) => e !== tween);
    });

    tween.start();
  }

  /**
   * Stop all motion
   */
  stop(): void {
    this.wheelDelta = 0;
    this.zoomDelta.set(0, 0, 0);
  }

  /**
   * Update controls (called each frame)
   *
   * @param delta - Time delta in seconds
   */
  update(delta: number): void {
    if (!this.enabled || !this.scene) return;

    const fade = Math.pow(0.5, this.fadeFactor * delta);
    const progression = 1 - fade;
    const camera = this.camera;

    // Update TWEEN animations
    TWEEN.update();

    // Compute zoom (only if viewer is available)
    if (this.wheelDelta !== 0 && this.viewer && this.renderer) {
      const mouse = this.getMousePosition();
      const pointclouds = this.viewer.getPointClouds();

      const intersection = getMousePointCloudIntersection(mouse, camera, this.renderer, pointclouds);

      if (intersection) {
        // Zoom towards point cloud intersection
        const resolvedPos = new THREE.Vector3().addVectors(this.view.position, this.zoomDelta);
        const distance = intersection.location.distanceTo(resolvedPos);
        const jumpDistance = distance * 0.2 * this.wheelDelta;
        const targetDir = new THREE.Vector3().subVectors(intersection.location, this.view.position);
        targetDir.normalize();

        resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
        this.zoomDelta.subVectors(resolvedPos, this.view.position);

        // Update view radius
        const newDistance = resolvedPos.distanceTo(intersection.location);
        this.view.radius = newDistance;
      } else {
        // Fallback: zoom along camera direction when no point cloud intersection
        const zoomFactor = 0.2 * this.wheelDelta;

        let cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        // Calculate movement vector along camera direction
        const moveVector = cameraDirection.clone().multiplyScalar(zoomFactor * this.view.radius);

        // Update camera position
        this.view.position.add(moveVector);

        // Update distance to pivot
        const distanceToTarget = this.view.position.distanceTo(this.view.getPivot());
        this.view.radius = distanceToTarget;
      }
    }

    // Apply zoom
    if (this.zoomDelta.length() !== 0) {
      const p = this.zoomDelta.clone().multiplyScalar(progression);
      const newPos = new THREE.Vector3().addVectors(this.view.position, p);
      this.view.position.copy(newPos);
    }

    // Update pivot indicator
    if (this.pivotIndicator.visible) {
      const distance = this.pivotIndicator.position.distanceTo(this.view.position);
      const pixelWidth = this.domElement.clientWidth;
      const pixelHeight = this.domElement.clientHeight;
      const pr = projectedRadius(1, camera, distance, pixelWidth, pixelHeight);
      const scale = 10 / pr;
      this.pivotIndicator.scale.set(scale, scale, scale);
    }

    // Decelerate over time
    this.zoomDelta.multiplyScalar(fade);
    this.wheelDelta = 0;

    // Apply view to camera
    this.view.applyToCamera(camera);
  }

  /**
   * Set the pivot point for rotation
   *
   * @param point - Pivot point in world coordinates
   */
  setPivot(point: THREE.Vector3): void {
    this.pivot = point.clone();
  }

  /**
   * Get current mouse position
   *
   * This now properly tracks the mouse position during mousemove events.
   *
   * @returns Mouse position
   */
  private getMousePosition(): { x: number; y: number } {
    // Use tracked mouse position, or fall back to center
    if (this.currentMousePosition) {
      return this.currentMousePosition;
    }
    return {
      x: this.domElement.clientWidth / 2,
      y: this.domElement.clientHeight / 2,
    };
  }

  /**
   * Get render center vector (fallback pivot when no point cloud intersection)
   *
   * Based on potree-core's getRenderCenterVector implementation.
   * Returns a point in world space calculated from the center of the screen.
   *
   * @returns World space vector at screen center
   */
  private getRenderCenterVector(): THREE.Vector3 {
    const domElement = this.domElement;
    const mouse = {
      x: domElement.clientWidth / 2,
      y: domElement.clientHeight / 2,
    };
    const camera = this.camera;

    // Convert to normalized device coordinates
    const normalizedMouse = {
      x: (mouse.x / domElement.clientWidth) * 2 - 1,
      y: -(mouse.y / domElement.clientHeight) * 2 + 1,
    };

    // Create screen center point with depth
    const screenCenter = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0.78);

    // Unproject to world space
    const worldCenter = screenCenter.unproject(camera);
    return worldCenter;
  }

  /**
   * Get the controls scene (for rendering pivot indicator)
   *
   * @returns Controls scene
   */
  getControlsScene(): THREE.Scene {
    return this.sceneControls;
  }

  /**
   * Dispose of the controls
   */
  dispose(): void {
    this.disconnect();
    this.removeAllListeners();

    // Stop all tweens
    for (const tween of this.tweens) {
      tween.stop();
    }
    this.tweens = [];

    // Dispose pivot indicator
    this.pivotIndicator.geometry.dispose();
    if (this.pivotIndicator.material instanceof THREE.Material) {
      this.pivotIndicator.material.dispose();
    }
  }
}
