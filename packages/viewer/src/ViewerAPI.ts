/**
 * ViewerAPI - High-level API methods extending the Viewer class
 *
 * These methods provide convenient access to common viewer operations:
 * - Navigation control
 * - Camera manipulation
 * - Visualization settings
 * - Measurement and annotation tools
 * - Screenshot and export
 */

import * as THREE from 'three';
import { Viewer } from './Viewer.js';
import type { NavigationMode, PointSizeType, PointShape, PointQuality } from '@better-potree/types';

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
  /**
   * Set navigation mode
   * @param mode - Navigation mode (orbit, fly, earth, fps)
   * @param _options - Navigation options
   */
  setNavigation(mode: NavigationMode, _options?: NavigationOptions): void {
    // This will interact with the controls package from Phase 3
    // For now, emit an event to notify listeners
    this.emit('navigation-changed', { mode });

    // TODO: When controls are implemented:
    // this.controls.setMode(mode);
    // if (options) {
    //   this.controls.setOptions(options);
    // }
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
    // TODO: Implement when ClipVolume is available
    this.emit('clip-volume-added', { volume });
  }

  /**
   * Remove a clip volume
   * @param volume - Clip volume to remove
   */
  removeClipVolume(volume: any): void {
    // TODO: Implement when ClipVolume is available
    this.emit('clip-volume-removed', { volume });
  }

  /**
   * Remove all clip volumes
   */
  removeAllClipVolumes(): void {
    // TODO: Implement when ClipVolume is available
    console.log('Removing all clip volumes');
  }

  /**
   * Get all clip volumes
   */
  getClipVolumes(): any[] {
    // TODO: Implement when ClipVolume is available
    return [];
  }

  /**
   * Start measuring
   * @param type - Measurement type
   */
  startMeasuring(type: string): void {
    // This will be implemented by the MeasuringTool in T4.4
    console.log('Starting measurement:', type);
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
   * @param duration - Animation duration in ms
   */
  moveCameraTo(
    position: THREE.Vector3,
    target?: THREE.Vector3,
    duration: number = 0
  ): void {
    const camera = this.getCamera();

    if (duration === 0) {
      // Instant move
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
    } else {
      // TODO: Implement animated camera movement
      console.log('Animated camera movement not yet implemented');
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
   * Enable or disable frustum culling
   */
  setFrustumCulling(enabled: boolean): void {
    // TODO: Implement when visibility culling is ready
    console.log('Frustum culling:', enabled);
  }
}
