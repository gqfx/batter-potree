/**
 * Camera Controls Manager
 *
 * Unified API for managing different camera control modes (orbit, fly, earth, fps).
 * Provides seamless switching between control modes and animated camera transitions.
 *
 * @module controls
 * @example
 * ```typescript
 * const controls = new CameraControlsManager(camera, domElement);
 *
 * // Set control mode
 * controls.setMode('orbit');
 *
 * // Configure options
 * controls.setOptions({
 *   rotateSpeed: 0.5,
 *   enableDamping: true
 * });
 *
 * // Animate camera
 * controls.flyTo(position, target, 1000);
 *
 * // Update in render loop
 * controls.update(deltaTime);
 * ```
 */

import type { NavigationMode } from '@better-potree/core';
import { TypedEventEmitter } from '@better-potree/core';
import * as THREE from 'three';
import { EarthControls } from './EarthControls.js';

/**
 * Camera control options
 */
export interface CameraControlOptions {
  /** Rotation speed multiplier */
  rotateSpeed?: number;
  /** Pan speed multiplier */
  panSpeed?: number;
  /** Zoom speed multiplier */
  zoomSpeed?: number;
  /** Enable damping (inertia) */
  enableDamping?: boolean;
  /** Damping factor */
  dampingFactor?: number;
  /** Enable rotation */
  enableRotation?: boolean;
  /** Enable panning */
  enablePanning?: boolean;
  /** Enable zooming */
  enableZooming?: boolean;
  /** Minimum distance for zoom */
  minDistance?: number;
  /** Maximum distance for zoom */
  maxDistance?: number;
  /** Minimum polar angle (orbit mode) */
  minPolarAngle?: number;
  /** Maximum polar angle (orbit mode) */
  maxPolarAngle?: number;
}

/**
 * Camera animation options
 */
export interface CameraAnimationOptions {
  /** Animation duration in milliseconds */
  duration?: number;
  /** Easing function */
  easing?: (t: number) => number;
  /** Callback on animation complete */
  onComplete?: () => void;
  /** Callback on animation update */
  onUpdate?: (progress: number) => void;
}

/**
 * Camera controls events
 */
export interface CameraControlsEvents {
  /** Fired when control mode changes */
  'mode-changed': { mode: NavigationMode };
  /** Fired when camera starts moving */
  start: void;
  /** Fired when camera is moving */
  change: void;
  /** Fired when camera stops moving */
  end: void;
  /** Fired when animation completes */
  'animation-complete': void;
  [key: string]: any;
}

/**
 * Camera animation state
 */
interface CameraAnimation {
  active: boolean;
  startTime: number;
  duration: number;
  startPosition: THREE.Vector3;
  endPosition: THREE.Vector3;
  startTarget: THREE.Vector3;
  endTarget: THREE.Vector3;
  easing: (t: number) => number;
  onComplete: (() => void) | undefined;
  onUpdate: ((progress: number) => void) | undefined;
}

/**
 * Easing functions
 */
export const Easing = {
  /** Linear easing (no easing) */
  linear: (t: number): number => t,

  /** Quadratic ease in */
  easeInQuad: (t: number): number => t * t,

  /** Quadratic ease out */
  easeOutQuad: (t: number): number => t * (2 - t),

  /** Quadratic ease in/out */
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  /** Cubic ease in/out */
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  /** Smooth step */
  smoothStep: (t: number): number => t * t * (3 - 2 * t),

  /** Smoother step */
  smootherStep: (t: number): number => t * t * t * (t * (t * 6 - 15) + 10),
};

/**
 * Camera Controls Manager
 *
 * Manages different camera control modes and provides unified API.
 */
export class CameraControlsManager extends TypedEventEmitter<CameraControlsEvents> {
  readonly camera: THREE.Camera;
  readonly domElement: HTMLElement;

  // Current mode and controls
  private currentMode: NavigationMode;
  private earthControls: EarthControls | null = null;
  // TODO: Add orbit, fly, fps controls when implemented
  // private orbitControls: OrbitControls | null = null;
  // private flyControls: FlyControls | null = null;
  // private fpsControls: FPSControls | null = null;

  // Options
  private options: CameraControlOptions = {
    rotateSpeed: 1.0,
    panSpeed: 1.0,
    zoomSpeed: 1.0,
    enableDamping: true,
    dampingFactor: 0.05,
    enableRotation: true,
    enablePanning: true,
    enableZooming: true,
    minDistance: 0,
    maxDistance: Infinity,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
  };

  // Animation state
  private animation: CameraAnimation | null = null;

  // Target for look-at
  private target = new THREE.Vector3();

  /**
   * Create camera controls manager
   *
   * @param camera - Camera to control
   * @param domElement - DOM element for event listeners
   * @param initialMode - Initial control mode (default: 'earth')
   */
  constructor(camera: THREE.Camera, domElement: HTMLElement, initialMode: NavigationMode = 'earth' as NavigationMode) {
    super();

    this.camera = camera;
    this.domElement = domElement;
    this.currentMode = initialMode;

    // Initialize with earth controls
    this.initializeControls(initialMode);
  }

  /**
   * Initialize controls for a specific mode
   *
   * @param mode - Control mode
   */
  private initializeControls(mode: NavigationMode): void {
    // Dispose existing controls
    this.disposeCurrentControls();

    switch (mode) {
      case 'earth':
        this.earthControls = new EarthControls(this.camera, this.domElement);
        this.setupControlEvents(this.earthControls);
        break;

      case 'orbit':
        // TODO: Implement OrbitControls
        console.warn('Orbit controls not yet implemented, using earth controls');
        this.earthControls = new EarthControls(this.camera, this.domElement);
        this.setupControlEvents(this.earthControls);
        break;

      case 'fly':
        // TODO: Implement FlyControls
        console.warn('Fly controls not yet implemented, using earth controls');
        this.earthControls = new EarthControls(this.camera, this.domElement);
        this.setupControlEvents(this.earthControls);
        break;

      case 'fps':
        // TODO: Implement FPSControls
        console.warn('FPS controls not yet implemented, using earth controls');
        this.earthControls = new EarthControls(this.camera, this.domElement);
        this.setupControlEvents(this.earthControls);
        break;
    }
  }

  /**
   * Setup event forwarding from controls
   *
   * @param controls - Controls instance
   */
  private setupControlEvents(controls: EarthControls): void {
    controls.on('start', () => this.emit('start', undefined));
    controls.on('change', () => this.emit('change', undefined));
    controls.on('end', () => this.emit('end', undefined));
  }

  /**
   * Dispose current controls
   */
  private disposeCurrentControls(): void {
    if (this.earthControls) {
      this.earthControls.dispose();
      this.earthControls = null;
    }
    // TODO: Dispose other control types
  }

  /**
   * Set camera control mode
   *
   * @param mode - New control mode
   */
  setMode(mode: NavigationMode): void {
    if (this.currentMode === mode) {
      return;
    }

    this.currentMode = mode;
    this.initializeControls(mode);

    this.emit('mode-changed', { mode });
  }

  /**
   * Get current control mode
   *
   * @returns Current mode
   */
  getMode(): NavigationMode {
    return this.currentMode;
  }

  /**
   * Set control options
   *
   * @param options - Options to set
   */
  setOptions(options: CameraControlOptions): void {
    this.options = { ...this.options, ...options };

    // Apply options to current controls
    if (this.earthControls) {
      if (options.rotateSpeed !== undefined) {
        this.earthControls.rotationSpeed = options.rotateSpeed * 10;
      }
      if (options.zoomSpeed !== undefined) {
        this.earthControls.zoomSpeed = options.zoomSpeed;
      }
      if (options.enableRotation !== undefined) {
        this.earthControls.enabled = options.enableRotation;
      }
    }
    // TODO: Apply options to other control types
  }

  /**
   * Get current options
   *
   * @returns Current options
   */
  getOptions(): CameraControlOptions {
    return { ...this.options };
  }

  /**
   * Set camera target (look-at point)
   *
   * @param target - Target position
   */
  setTarget(target: THREE.Vector3): void {
    this.target.copy(target);

    if (this.earthControls) {
      this.earthControls.setPivot(target);
    }
    // TODO: Set target for other control types

    this.camera.lookAt(target);
  }

  /**
   * Get camera target
   *
   * @returns Current target
   */
  getTarget(): THREE.Vector3 {
    return this.target.clone();
  }

  /**
   * Animate camera to position and target
   *
   * @param position - Target position
   * @param target - Target look-at point
   * @param options - Animation options
   */
  flyTo(
    position: THREE.Vector3,
    target: THREE.Vector3,
    options: CameraAnimationOptions = {}
  ): void {
    const duration = options.duration ?? 1000;
    const easing = options.easing ?? Easing.easeInOutCubic;

    // Cancel existing animation
    if (this.animation) {
      if (this.animation.onComplete) {
        this.animation.onComplete();
      }
    }

    // Setup new animation
    this.animation = {
      active: true,
      startTime: performance.now(),
      duration,
      startPosition: this.camera.position.clone(),
      endPosition: position.clone(),
      startTarget: this.target.clone(),
      endTarget: target.clone(),
      easing,
      onComplete: options.onComplete,
      onUpdate: options.onUpdate,
    };

    // Emit start event
    this.emit('start', undefined);
  }

  /**
   * Move camera to position instantly
   *
   * @param position - Target position
   * @param target - Optional target look-at point
   */
  moveTo(position: THREE.Vector3, target?: THREE.Vector3): void {
    this.camera.position.copy(position);

    if (target) {
      this.setTarget(target);
    }

    if (this.camera instanceof THREE.PerspectiveCamera || this.camera instanceof THREE.OrthographicCamera) {
      this.camera.updateProjectionMatrix();
    }

    this.emit('change', undefined);
  }

  /**
   * Stop any active animation
   */
  stopAnimation(): void {
    if (this.animation) {
      if (this.animation.onComplete) {
        this.animation.onComplete();
      }
      this.animation = null;
      this.emit('end', undefined);
    }
  }

  /**
   * Update controls
   *
   * Call this in your render loop.
   *
   * @param deltaTime - Time delta in seconds
   */
  update(deltaTime: number): void {
    // Update animation
    if (this.animation && this.animation.active) {
      const elapsed = performance.now() - this.animation.startTime;
      const progress = Math.min(elapsed / this.animation.duration, 1.0);

      // Apply easing
      const t = this.animation.easing(progress);

      // Interpolate position
      this.camera.position.lerpVectors(
        this.animation.startPosition,
        this.animation.endPosition,
        t
      );

      // Interpolate target
      this.target.lerpVectors(this.animation.startTarget, this.animation.endTarget, t);

      // Look at target
      this.camera.lookAt(this.target);

      // Update pivot for earth controls
      if (this.earthControls) {
        this.earthControls.setPivot(this.target);
      }

      // Emit change event
      this.emit('change', undefined);

      // Call update callback
      if (this.animation.onUpdate) {
        this.animation.onUpdate(progress);
      }

      // Check if animation is complete
      if (progress >= 1.0) {
        const onComplete = this.animation.onComplete;
        this.animation = null;

        this.emit('animation-complete', undefined);
        this.emit('end', undefined);

        if (onComplete) {
          onComplete();
        }
      }
    }

    // Update active controls
    if (this.earthControls) {
      this.earthControls.update(deltaTime);
    }
    // TODO: Update other control types
  }

  /**
   * Enable/disable controls
   *
   * @param enabled - Enable state
   */
  setEnabled(enabled: boolean): void {
    if (this.earthControls) {
      this.earthControls.enabled = enabled;
    }
    // TODO: Enable/disable other control types
  }

  /**
   * Check if controls are enabled
   *
   * @returns True if enabled
   */
  getEnabled(): boolean {
    if (this.earthControls) {
      return this.earthControls.enabled;
    }
    // TODO: Check other control types
    return false;
  }

  /**
   * Reset camera to default position
   *
   * @param position - Default position
   * @param target - Default target
   * @param animated - Whether to animate transition
   */
  reset(
    position = new THREE.Vector3(0, 0, 10),
    target = new THREE.Vector3(0, 0, 0),
    animated = true
  ): void {
    if (animated) {
      this.flyTo(position, target, { duration: 1000 });
    } else {
      this.moveTo(position, target);
    }
  }

  /**
   * Dispose of controls and cleanup
   */
  dispose(): void {
    this.stopAnimation();
    this.disposeCurrentControls();
    this.removeAllListeners();
  }
}
