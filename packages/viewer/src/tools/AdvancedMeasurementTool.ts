/**
 * Advanced Measurement Tool
 *
 * Provides comprehensive measurement capabilities for point clouds:
 * - Distance (2D/3D)
 * - Area (polygon)
 * - Volume (convex hull or bounding box)
 * - Angle
 * - Height (vertical distance)
 *
 * @module tools
 * @example
 * ```typescript
 * const tool = new AdvancedMeasurementTool(viewer, scene, camera);
 *
 * // Start distance measurement
 * tool.startMeasurement('distance');
 *
 * // Listen for results
 * tool.on('measurement-complete', (result) => {
 *   console.log(`Distance: ${result.distance}m`);
 * });
 *
 * // Add point (e.g., from raycaster)
 * tool.addPoint(intersectionPoint);
 * ```
 */

import { MeasurementType, TypedEventEmitter } from '@better-potree/core';
import * as THREE from 'three';

/**
 * Measurement result
 */
export interface MeasurementResult {
  /** Measurement type */
  readonly type: MeasurementType;
  /** Measurement ID */
  readonly id: string;
  /** Measurement points */
  readonly points: readonly THREE.Vector3[];
  /** Distance (for distance/height measurements) */
  readonly distance?: number;
  /** Area (for area measurements) */
  readonly area?: number;
  /** Volume (for volume measurements) */
  readonly volume?: number;
  /** Angle in radians (for angle measurements) */
  readonly angle?: number;
  /** Angle in degrees (for angle measurements) */
  readonly angleDegrees?: number;
}

/**
 * Measurement tool configuration
 */
export interface MeasurementToolConfig {
  /** Line color */
  readonly lineColor?: THREE.ColorRepresentation;
  /** Line width */
  readonly lineWidth?: number;
  /** Point color */
  readonly pointColor?: THREE.ColorRepresentation;
  /** Point size */
  readonly pointSize?: number;
  /** Label color */
  readonly labelColor?: string;
  /** Label font size */
  readonly labelFontSize?: number;
  /** Show labels */
  readonly showLabels?: boolean;
}

/**
 * Measurement tool events
 */
export interface MeasurementToolEvents {
  /** Fired when measurement starts */
  'measurement-started': { type: MeasurementType };
  /** Fired when point is added */
  'point-added': { point: THREE.Vector3; index: number };
  /** Fired when measurement completes */
  'measurement-complete': MeasurementResult;
  /** Fired when measurement is cancelled */
  'measurement-cancelled': undefined;
  [key: string]: any;
}

/**
 * Measurement visualization
 */
interface MeasurementVisualization {
  points: THREE.Points;
  lines: THREE.Line;
  labels: HTMLElement[];
}

/**
 * Advanced Measurement Tool
 *
 * Provides interactive measurement tools for point clouds.
 */
export class AdvancedMeasurementTool extends TypedEventEmitter<MeasurementToolEvents> {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  // State
  private isActive = false;
  private currentType: MeasurementType | null = null;
  private currentPoints: THREE.Vector3[] = [];
  private nextId = 0;

  // Visualization
  private visualization: MeasurementVisualization | null = null;
  private labelContainer: HTMLElement | null = null;

  // Configuration
  private config: Required<MeasurementToolConfig>;

  // Completed measurements
  private measurements = new Map<string, MeasurementResult>();

  /**
   * Create measurement tool
   *
   * @param scene - Three.js scene for visualization
   * @param camera - Camera for label positioning
   * @param domElement - DOM element for label overlays
   * @param config - Tool configuration
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    domElement: HTMLElement,
    config: MeasurementToolConfig = {}
  ) {
    super();

    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.config = {
      lineColor: config.lineColor ?? 0x00ff00,
      lineWidth: config.lineWidth ?? 2,
      pointColor: config.pointColor ?? 0xff0000,
      pointSize: config.pointSize ?? 8,
      labelColor: config.labelColor ?? '#ffffff',
      labelFontSize: config.labelFontSize ?? 14,
      showLabels: config.showLabels ?? true,
    };

    // Create label container
    this.createLabelContainer();
  }

  /**
   * Create container for measurement labels
   */
  private createLabelContainer(): void {
    this.labelContainer = document.createElement('div');
    this.labelContainer.style.position = 'absolute';
    this.labelContainer.style.top = '0';
    this.labelContainer.style.left = '0';
    this.labelContainer.style.pointerEvents = 'none';
    this.labelContainer.style.zIndex = '1000';
    this.domElement.appendChild(this.labelContainer);
  }

  /**
   * Start a new measurement
   *
   * @param type - Measurement type
   */
  startMeasurement(type: MeasurementType): void {
    // Cancel any active measurement
    if (this.isActive) {
      this.cancel();
    }

    this.isActive = true;
    this.currentType = type;
    this.currentPoints = [];

    this.emit('measurement-started', { type });
  }

  /**
   * Add a measurement point
   *
   * @param point - 3D point from raycasting or user input
   */
  addPoint(point: THREE.Vector3): void {
    if (!this.isActive || !this.currentType) {
      return;
    }

    this.currentPoints.push(point.clone());

    this.emit('point-added', {
      point: point.clone(),
      index: this.currentPoints.length - 1,
    });

    // Update visualization
    this.updateVisualization();

    // Auto-complete for certain measurement types
    this.checkAutoComplete();
  }

  /**
   * Check if measurement should auto-complete
   */
  private checkAutoComplete(): void {
    if (!this.currentType) return;

    const typeStr = typeof this.currentType === 'string' ? this.currentType : this.currentType;

    switch (typeStr) {
      case 'point':
      case MeasurementType.POINT:
        if (this.currentPoints.length === 1) {
          this.completeMeasurement();
        }
        break;

      case 'distance':
      case 'height':
      case MeasurementType.DISTANCE:
      case MeasurementType.HEIGHT:
        if (this.currentPoints.length === 2) {
          this.completeMeasurement();
        }
        break;

      case 'angle':
      case MeasurementType.ANGLE:
        if (this.currentPoints.length === 3) {
          this.completeMeasurement();
        }
        break;

      // Area and volume require manual completion
    }
  }

  /**
   * Complete current measurement
   */
  completeMeasurement(): void {
    if (!this.isActive || !this.currentType) {
      return;
    }

    if (this.currentPoints.length === 0) {
      return;
    }

    const result = this.calculateResult();
    const id = `measurement-${this.nextId++}`;

    const finalResult: MeasurementResult = {
      ...result,
      id,
    };

    this.measurements.set(id, finalResult);
    this.emit('measurement-complete', finalResult);

    // Reset state
    this.isActive = false;
    this.currentType = null;
    this.currentPoints = [];
    this.clearVisualization();
  }

  /**
   * Cancel current measurement
   */
  cancel(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.currentType = null;
    this.currentPoints = [];
    this.clearVisualization();

    this.emit('measurement-cancelled', undefined);
  }

  /**
   * Calculate measurement result
   *
   * @returns Measurement result
   */
  private calculateResult(): Omit<MeasurementResult, 'id'> {
    if (!this.currentType) {
      throw new Error('No measurement type');
    }

    const points = [...this.currentPoints];

    switch (this.currentType) {
      case 'point':
      case MeasurementType.POINT:
        return {
          type: MeasurementType.POINT,
          points,
        };

      case 'distance':
      case MeasurementType.DISTANCE:
        return {
          type: MeasurementType.DISTANCE,
          points,
          distance: this.calculateDistance(points),
        };

      case 'height':
      case MeasurementType.HEIGHT:
        return {
          type: MeasurementType.HEIGHT,
          points,
          distance: this.calculateHeight(points),
        };

      case 'area':
      case MeasurementType.AREA:
        return {
          type: MeasurementType.AREA,
          points,
          area: this.calculateArea(points),
        };

      case 'volume':
      case MeasurementType.VOLUME:
        return {
          type: MeasurementType.VOLUME,
          points,
          volume: this.calculateVolume(points),
        };

      case 'angle':
      case MeasurementType.ANGLE:
        return {
          type: MeasurementType.ANGLE,
          points,
          angle: this.calculateAngle(points),
          angleDegrees: this.calculateAngle(points) * (180 / Math.PI),
        };

      default:
        return {
          type: this.currentType,
          points,
        };
    }
  }

  /**
   * Calculate total distance along points
   *
   * @param points - Array of points
   * @returns Total distance
   */
  private calculateDistance(points: readonly THREE.Vector3[]): number {
    if (points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (prev && curr) {
        totalDistance += prev.distanceTo(curr);
      }
    }
    return totalDistance;
  }

  /**
   * Calculate vertical distance (height)
   *
   * @param points - Array of points (should be 2)
   * @returns Vertical distance
   */
  private calculateHeight(points: readonly THREE.Vector3[]): number {
    if (points.length < 2) return 0;

    const p1 = points[0];
    const p2 = points[1];

    if (!p1 || !p2) return 0;

    return Math.abs(p2.z - p1.z);
  }

  /**
   * Calculate area of polygon
   *
   * Uses Shoelace formula for 3D polygon.
   *
   * @param points - Array of points defining polygon
   * @returns Area
   */
  private calculateArea(points: readonly THREE.Vector3[]): number {
    if (points.length < 3) return 0;

    // Calculate normal of the polygon
    const normal = new THREE.Vector3();
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const p1 = points[i];
      const p2 = points[j];
      if (p1 && p2) {
        normal.x += (p1.y - p2.y) * (p1.z + p2.z);
        normal.y += (p1.z - p2.z) * (p1.x + p2.x);
        normal.z += (p1.x - p2.x) * (p1.y + p2.y);
      }
    }

    const area = normal.length() / 2;
    return area;
  }

  /**
   * Calculate volume of convex hull
   *
   * Simplified calculation using axis-aligned bounding box.
   *
   * @param points - Array of points
   * @returns Volume
   */
  private calculateVolume(points: readonly THREE.Vector3[]): number {
    if (points.length < 4) return 0;

    // Calculate bounding box
    const box = new THREE.Box3();
    for (const point of points) {
      box.expandByPoint(point);
    }

    const size = box.getSize(new THREE.Vector3());
    return size.x * size.y * size.z;
  }

  /**
   * Calculate angle between three points
   *
   * @param points - Array of 3 points [p1, vertex, p2]
   * @returns Angle in radians
   */
  private calculateAngle(points: readonly THREE.Vector3[]): number {
    if (points.length < 3) return 0;

    const p1 = points[0];
    const vertex = points[1];
    const p2 = points[2];

    if (!p1 || !vertex || !p2) return 0;

    // Vectors from vertex
    const v1 = new THREE.Vector3().subVectors(p1, vertex).normalize();
    const v2 = new THREE.Vector3().subVectors(p2, vertex).normalize();

    // Angle between vectors
    const angle = Math.acos(THREE.MathUtils.clamp(v1.dot(v2), -1, 1));

    return angle;
  }

  /**
   * Update measurement visualization
   */
  private updateVisualization(): void {
    if (!this.isActive) return;

    this.clearVisualization();

    if (this.currentPoints.length === 0) return;

    // Create geometry for points
    const pointsGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.currentPoints.length * 3);

    this.currentPoints.forEach((point, i) => {
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
    });

    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Create points material
    const pointsMaterial = new THREE.PointsMaterial({
      color: this.config.pointColor,
      size: this.config.pointSize,
      sizeAttenuation: false,
    });

    const pointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);

    // Create geometry for lines
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      color: this.config.lineColor,
      linewidth: this.config.lineWidth,
    });

    const lineMesh = new THREE.Line(lineGeometry, lineMaterial);

    // Add to scene
    this.scene.add(pointsMesh);
    this.scene.add(lineMesh);

    this.visualization = {
      points: pointsMesh,
      lines: lineMesh,
      labels: [],
    };

    // Create labels
    if (this.config.showLabels) {
      this.updateLabels();
    }
  }

  /**
   * Update measurement labels
   */
  private updateLabels(): void {
    if (!this.labelContainer || !this.visualization) return;

    // Clear existing labels
    this.visualization.labels.forEach((label) => label.remove());
    this.visualization.labels = [];

    // Add distance labels between points
    if (this.currentPoints.length >= 2) {
      for (let i = 1; i < this.currentPoints.length; i++) {
        const p1 = this.currentPoints[i - 1];
        const p2 = this.currentPoints[i];

        if (!p1 || !p2) continue;

        const distance = p1.distanceTo(p2);
        const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

        const label = this.createLabel(`${distance.toFixed(2)}m`, midpoint);
        this.visualization.labels.push(label);
      }
    }
  }

  /**
   * Create a label element
   *
   * @param text - Label text
   * @param position - 3D position
   * @returns Label element
   */
  private createLabel(text: string, position: THREE.Vector3): HTMLElement {
    const label = document.createElement('div');
    label.textContent = text;
    label.style.position = 'absolute';
    label.style.color = this.config.labelColor;
    label.style.fontSize = `${this.config.labelFontSize}px`;
    label.style.fontFamily = 'monospace';
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '3px';
    label.style.pointerEvents = 'none';
    label.style.whiteSpace = 'nowrap';

    // Update position (will be updated each frame)
    this.updateLabelPosition(label, position);

    if (this.labelContainer) {
      this.labelContainer.appendChild(label);
    }

    return label;
  }

  /**
   * Update label position based on 3D position
   *
   * @param label - Label element
   * @param position - 3D position
   */
  private updateLabelPosition(label: HTMLElement, position: THREE.Vector3): void {
    const vector = position.clone();
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * this.domElement.clientWidth;
    const y = (-(vector.y * 0.5) + 0.5) * this.domElement.clientHeight;

    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  }

  /**
   * Clear current visualization
   */
  private clearVisualization(): void {
    if (!this.visualization) return;

    this.scene.remove(this.visualization.points);
    this.scene.remove(this.visualization.lines);

    this.visualization.points.geometry.dispose();
    (this.visualization.points.material as THREE.Material).dispose();
    this.visualization.lines.geometry.dispose();
    (this.visualization.lines.material as THREE.Material).dispose();

    this.visualization.labels.forEach((label) => label.remove());

    this.visualization = null;
  }

  /**
   * Get measurement by ID
   *
   * @param id - Measurement ID
   * @returns Measurement result or undefined
   */
  getMeasurement(id: string): MeasurementResult | undefined {
    return this.measurements.get(id);
  }

  /**
   * Get all measurements
   *
   * @returns Array of all measurements
   */
  getAllMeasurements(): MeasurementResult[] {
    return Array.from(this.measurements.values());
  }

  /**
   * Remove measurement by ID
   *
   * @param id - Measurement ID
   */
  removeMeasurement(id: string): void {
    this.measurements.delete(id);
  }

  /**
   * Clear all measurements
   */
  clearAllMeasurements(): void {
    this.measurements.clear();
  }

  /**
   * Check if tool is active
   *
   * @returns True if active
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current measurement type
   *
   * @returns Current type or null
   */
  getCurrentType(): MeasurementType | null {
    return this.currentType;
  }

  /**
   * Dispose tool and cleanup
   */
  dispose(): void {
    this.cancel();
    this.clearAllMeasurements();

    if (this.labelContainer) {
      this.labelContainer.remove();
      this.labelContainer = null;
    }

    this.removeAllListeners();
  }
}
