/**
 * ViewerAPI - High-level API methods extending the Viewer class
 *
 * These methods provide convenient access to common viewer operations:
 * - Navigation control
 * - Camera manipulation
 * - Visualization settings
 * - Measurement and annotation tools
 * - Screenshot and export
 * - EDL (Eye-Dome Lighting) effects
 * - Clipping tools
 */

import type { MeasurementType, NavigationMode, PointQuality, PointShape, PointSizeType } from '@better-potree/core';
import * as THREE from 'three';
import { CameraControlsManager, type CameraAnimationOptions } from './controls/index.js';
import { EDLEffect } from './effects/index.js';
import { AdvancedClipTool, type ClipVolume } from './tools/AdvancedClipTool.js';
import { AdvancedMeasurementTool, type MeasurementResult } from './tools/AdvancedMeasurementTool.js';
import { Viewer } from './Viewer.js';

/**
 * Navigation options
 */
export interface NavigationOptions {
  /** Speed multiplier */
  speed?: number;
  /** Enable rotation */
  enableRotation?: boolean;
  /** Enable panning */
  enablePanning?: boolean;
  /** Enable zooming */
  enableZooming?: boolean;
}

/**
 * Fit to screen options
 */
export interface FitToScreenOptions {
  /** Padding factor (0-1) */
  padding?: number;
  /** Animation duration in ms */
  duration?: number;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Image format */
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** JPEG quality (0-1) */
  quality?: number;
}

/**
 * Extended Viewer class with high-level API methods
 */
export class ViewerAPI extends Viewer {
  // Advanced tools and effects
  private cameraControls: CameraControlsManager | undefined;
  private edlEffect: EDLEffect | undefined;
  private measurementTool: AdvancedMeasurementTool | undefined;
  private clipTool: AdvancedClipTool | undefined;

  /**
   * Initialize advanced features
   *
   * Call this after the viewer is constructed to enable advanced features.
   *
   * @example
   * ```typescript
   * const viewer = new ViewerAPI(config);
   * viewer.initializeAdvancedFeatures();
   * ```
   */
  initializeAdvancedFeatures(): void {
    const renderer = this.getRenderer().getThreeRenderer?.();
    const scene = this.getScene().getThreeScene?.();
    const camera = this.getCamera();

    if (!renderer || !scene) {
      console.warn('[ViewerAPI] Advanced features require Three.js renderer and scene');
      return;
    }

    // Initialize camera controls
    const container = this.getRenderer().getDomElement().parentElement;
    if (container) {
      this.cameraControls = new CameraControlsManager(camera, container);
    }

    // Initialize EDL effect
    this.edlEffect = new EDLEffect(renderer, scene, camera, this.getEDLConfig());

    // Initialize measurement tool
    this.measurementTool = new AdvancedMeasurementTool(scene, camera, container || document.body);

    // Initialize clip tool
    this.clipTool = new AdvancedClipTool(scene);

    console.log('[ViewerAPI] Advanced features initialized');
  }
  /**
   * Set navigation mode
   * @param mode - Navigation mode (orbit, fly, earth, fps)
   * @param options - Navigation options
   */
  setNavigation(mode: NavigationMode, options?: NavigationOptions): void {
    if (this.cameraControls) {
      this.cameraControls.setMode(mode);

      if (options) {
        const controlOptions: {
          rotateSpeed?: number;
          enableRotation?: boolean;
          enablePanning?: boolean;
          enableZooming?: boolean;
        } = {};

        if (options.speed !== undefined) controlOptions.rotateSpeed = options.speed;
        if (options.enableRotation !== undefined) controlOptions.enableRotation = options.enableRotation;
        if (options.enablePanning !== undefined) controlOptions.enablePanning = options.enablePanning;
        if (options.enableZooming !== undefined) controlOptions.enableZooming = options.enableZooming;

        this.cameraControls.setOptions(controlOptions);
      }

      this.emit('navigation-changed', { mode });
    } else {
      console.warn('[ViewerAPI] Camera controls not initialized. Call initializeAdvancedFeatures() first.');
      this.emit('navigation-changed', { mode });
    }
  }

  /**
   * Fit camera to view all point clouds (or specific one)
   * @param _pointCloud - Optional specific point cloud to fit to
   * @param options - Fit options
   */
  fitToScreen(_pointCloud?: any, options?: FitToScreenOptions): void {
    const clouds = _pointCloud ? [_pointCloud] : this.getPointClouds();
    if (clouds.length === 0) {
      console.warn('No point clouds to fit to screen');
      return;
    }

    // Calculate bounding box of all clouds
    const boundingBox = new THREE.Box3();
    for (const _cloud of clouds) {
      // TODO: When PointCloud has boundingBox property:
      // boundingBox.union(cloud.boundingBox);
    }

    if (boundingBox.isEmpty()) {
      return;
    }

    // Calculate center and size
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Calculate camera distance
    const camera = this.getCamera();
    if (camera instanceof THREE.PerspectiveCamera) {
      const padding = options?.padding ?? 1.2;
      const fov = camera.fov * (Math.PI / 180);
      const distance = (maxDim / 2 / Math.tan(fov / 2)) * padding;

      // Set camera position
      const direction = camera.position.clone().sub(center).normalize();
      camera.position.copy(center).add(direction.multiplyScalar(distance));
      camera.lookAt(center);
      camera.updateProjectionMatrix();

      // Emit camera changed event
      this.emit('camera-changed', {
        camera,
        position: camera.position,
        target: center,
      });
    }
  }

  /**
   * Set point size type
   */
  setPointSizeType(type: PointSizeType): void {
    // TODO: Implement when material system is ready
    console.log('Setting point size type to:', type);
  }

  /**
   * Set point shape
   */
  setPointShape(shape: PointShape): void {
    // TODO: Implement when material system is ready
    console.log('Setting point shape to:', shape);
  }

  /**
   * Set point quality
   */
  setPointQuality(quality: PointQuality): void {
    // TODO: Implement when material system is ready
    console.log('Setting point quality to:', quality);
  }

  /**
   * Add a clip volume
   * @param volume - Clip volume to add
   */
  addClipVolume(volume: any): void {
    if (!this.clipTool) {
      console.warn('[ViewerAPI] Clip tool not initialized. Call initializeAdvancedFeatures() first.');
      this.emit('clip-volume-added', { volume });
      return;
    }

    // Determine volume type and add appropriately
    if (volume instanceof THREE.Box3) {
      const id = this.clipTool.addBoxClip(volume);
      this.emit('clip-volume-added', { volume: { ...volume, id, type: 'box' } });
    } else if (volume instanceof THREE.Plane) {
      const id = this.clipTool.addPlaneClip(volume);
      this.emit('clip-volume-added', { volume: { ...volume, id, type: 'plane' } });
    } else if (volume instanceof THREE.Sphere) {
      const id = this.clipTool.addSphereClip(volume);
      this.emit('clip-volume-added', { volume: { ...volume, id, type: 'sphere' } });
    } else {
      console.warn('[ViewerAPI] Unknown clip volume type');
      this.emit('clip-volume-added', { volume });
    }
  }

  /**
   * Remove a clip volume
   * @param volume - Clip volume ID or reference
   */
  removeClipVolume(volume: string | any): void {
    if (!this.clipTool) {
      console.warn('[ViewerAPI] Clip tool not initialized.');
      this.emit('clip-volume-removed', { volume });
      return;
    }

    const id = typeof volume === 'string' ? volume : volume.id;
    this.clipTool.removeClip(id);
    this.emit('clip-volume-removed', { volume: id });
  }

  /**
   * Remove all clip volumes
   */
  removeAllClipVolumes(): void {
    if (!this.clipTool) {
      console.warn('[ViewerAPI] Clip tool not initialized.');
      return;
    }

    this.clipTool.clearAllClips();
    console.log('[ViewerAPI] All clip volumes removed');
  }

  /**
   * Get all clip volumes
   */
  getClipVolumes(): ClipVolume[] {
    if (!this.clipTool) {
      console.warn('[ViewerAPI] Clip tool not initialized.');
      return [];
    }

    return this.clipTool.getAllClips();
  }

  /**
   * Enable/disable clip volume
   *
   * @param id - Clip volume ID
   * @param enabled - Enable state
   */
  setClipVolumeEnabled(id: string, enabled: boolean): void {
    if (!this.clipTool) {
      console.warn('[ViewerAPI] Clip tool not initialized.');
      return;
    }

    this.clipTool.setClipEnabled(id, enabled);
  }

  /**
   * Invert clip volume
   *
   * @param id - Clip volume ID
   * @param inverted - Invert state
   */
  setClipVolumeInverted(id: string, inverted: boolean): void {
    if (!this.clipTool) {
      console.warn('[ViewerAPI] Clip tool not initialized.');
      return;
    }

    this.clipTool.setClipInverted(id, inverted);
  }

  /**
   * Start measuring
   * @param type - Measurement type
   */
  startMeasuring(type: MeasurementType): void {
    if (!this.measurementTool) {
      console.warn('[ViewerAPI] Measurement tool not initialized. Call initializeAdvancedFeatures() first.');
      console.log('Starting measurement:', type);
      return;
    }

    this.measurementTool.startMeasurement(type);
  }

  /**
   * Add measurement point
   *
   * Call this from raycasting or user interaction to add points to the current measurement.
   *
   * @param point - 3D point
   */
  addMeasurementPoint(point: THREE.Vector3): void {
    if (!this.measurementTool) {
      console.warn('[ViewerAPI] Measurement tool not initialized.');
      return;
    }

    this.measurementTool.addPoint(point);
  }

  /**
   * Complete current measurement
   */
  completeMeasurement(): void {
    if (!this.measurementTool) {
      console.warn('[ViewerAPI] Measurement tool not initialized.');
      return;
    }

    this.measurementTool.completeMeasurement();
  }

  /**
   * Cancel current measurement
   */
  cancelMeasurement(): void {
    if (!this.measurementTool) {
      console.warn('[ViewerAPI] Measurement tool not initialized.');
      return;
    }

    this.measurementTool.cancel();
  }

  /**
   * Get all measurements
   *
   * @returns Array of measurement results
   */
  getMeasurements(): MeasurementResult[] {
    if (!this.measurementTool) {
      console.warn('[ViewerAPI] Measurement tool not initialized.');
      return [];
    }

    return this.measurementTool.getAllMeasurements();
  }

  /**
   * Remove a measurement
   *
   * @param id - Measurement ID
   */
  removeMeasurement(id: string): void {
    if (!this.measurementTool) {
      console.warn('[ViewerAPI] Measurement tool not initialized.');
      return;
    }

    this.measurementTool.removeMeasurement(id);
  }

  /**
   * Clear all measurements
   */
  clearAllMeasurements(): void {
    if (!this.measurementTool) {
      console.warn('[ViewerAPI] Measurement tool not initialized.');
      return;
    }

    this.measurementTool.clearAllMeasurements();
  }

  /**
   * Check if measurement is active
   *
   * @returns True if a measurement is in progress
   */
  isMeasuring(): boolean {
    if (!this.measurementTool) {
      return false;
    }

    return this.measurementTool.getIsActive();
  }

  /**
   * Take a screenshot
   * @param options - Screenshot options
   * @returns Data URL of the screenshot
   */
  screenshot(options?: ScreenshotOptions): string {
    const renderer = this.getRenderer();
    const threeRenderer = renderer.getThreeRenderer?.();

    if (!threeRenderer) {
      throw new Error('Screenshot requires Three.js renderer');
    }

    // Get current size
    const currentSize = new THREE.Vector2();
    threeRenderer.getSize(currentSize);

    // Render at requested size if different
    if (options?.width || options?.height) {
      const width = options.width ?? currentSize.x;
      const height = options.height ?? currentSize.y;

      renderer.setSize(width, height);
      this.render();
    }

    // Get screenshot
    const canvas = renderer.getDomElement();
    const format = options?.format ?? 'image/png';
    const quality = options?.quality ?? 0.92;
    const dataUrl = canvas.toDataURL(format, quality);

    // Restore original size if changed
    if (options?.width || options?.height) {
      renderer.setSize(currentSize.x, currentSize.y);
      this.render();
    }

    return dataUrl;
  }

  /**
   * Download a screenshot
   * @param filename - Filename for the download
   * @param options - Screenshot options
   */
  downloadScreenshot(filename: string = 'screenshot.png', options?: ScreenshotOptions): void {
    const dataUrl = this.screenshot(options);

    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  /**
   * Move camera to position
   * @param position - Target position
   * @param target - Look at target
   * @param options - Animation options (duration, easing, etc.)
   */
  moveCameraTo(position: THREE.Vector3, target?: THREE.Vector3, options?: CameraAnimationOptions): void {
    if (this.cameraControls) {
      const duration = options?.duration ?? 0;

      if (duration === 0) {
        // Instant move
        this.cameraControls.moveTo(position, target);
      } else {
        // Animated move
        this.cameraControls.flyTo(position, target || new THREE.Vector3(), options);
      }

      this.emit('camera-changed', {
        camera: this.getCamera(),
        position: this.getCamera().position,
        target: target ?? new THREE.Vector3(),
      });
    } else {
      // Fallback to direct camera manipulation
      const camera = this.getCamera();

      camera.position.copy(position);
      if (target) {
        camera.lookAt(target);
      }
      if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
        camera.updateProjectionMatrix();
      }

      this.emit('camera-changed', {
        camera,
        position: camera.position,
        target: target ?? new THREE.Vector3(),
      });
    }
  }

  /**
   * Set field of view (for perspective camera)
   */
  setFOV(fov: number): void {
    const camera = this.getCamera();
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  /**
   * Get field of view (for perspective camera)
   */
  getFOV(): number | undefined {
    const camera = this.getCamera();
    if (camera instanceof THREE.PerspectiveCamera) {
      return camera.fov;
    }
    return undefined;
  }

  /**
   * Show or hide bounding boxes
   */
  setShowBoundingBox(show: boolean): void {
    // TODO: Implement when PointCloud has bounding box visualization
    console.log('Show bounding box:', show);
  }

  /**
   * Set minimum node size (LOD parameter)
   */
  setMinNodeSize(size: number): void {
    // TODO: Implement when LOD system is ready
    console.log('Setting min node size:', size);
  }

  /**
   * Enable or disable EDL (Eye-Dome Lighting)
   *
   * @param enabled - Enable state
   */
  setEDLEnabled(enabled: boolean): void {
    if (this.edlEffect) {
      this.edlEffect.setEnabled(enabled);
    }

    // Call parent method to update config
    super.setEDLEnabled(enabled);
  }

  /**
   * Set EDL radius
   *
   * @param radius - EDL radius (typically 1.0 - 3.0)
   */
  setEDLRadius(radius: number): void {
    if (this.edlEffect) {
      this.edlEffect.setRadius(radius);
    }
  }

  /**
   * Set EDL strength
   *
   * @param strength - EDL strength (typically 0.1 - 1.0)
   */
  setEDLStrength(strength: number): void {
    if (this.edlEffect) {
      this.edlEffect.setStrength(strength);
    }
  }

  /**
   * Set EDL opacity
   *
   * @param opacity - EDL opacity (0.0 - 1.0)
   */
  setEDLOpacity(opacity: number): void {
    if (this.edlEffect) {
      this.edlEffect.setOpacity(opacity);
    }
  }

  /**
   * Override render to use EDL effect if enabled
   */
  override render(): void {
    if (this.edlEffect && this.edlEffect.getEnabled()) {
      this.edlEffect.render();
    } else {
      super.render();
    }
  }

  /**
   * Override destroy to cleanup advanced features
   */
  override destroy(): void {
    // Dispose camera controls
    if (this.cameraControls) {
      this.cameraControls.dispose();
      this.cameraControls = undefined;
    }

    // Dispose EDL effect
    if (this.edlEffect) {
      this.edlEffect.dispose();
      this.edlEffect = undefined;
    }

    // Dispose measurement tool
    if (this.measurementTool) {
      this.measurementTool.dispose();
      this.measurementTool = undefined;
    }

    // Dispose clip tool
    if (this.clipTool) {
      this.clipTool.dispose();
      this.clipTool = undefined;
    }

    // Call parent destroy
    super.destroy();

    console.log('[ViewerAPI] Advanced features disposed');
  }
}
