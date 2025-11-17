/**
 * 测量工具
 *
 * 提供点云距离和面积测量功能
 *
 * @module tools
 * @example
 * ```ts
 * const tool = new MeasurementTool(viewer);
 * tool.startDistanceMeasurement();
 *
 * // 监听测量完成
 * tool.onMeasurementComplete((result) => {
 *   console.log('Distance:', result.distance);
 * });
 * ```
 */

import type * as THREE from 'three';
import type { PointCloudViewer } from '../PointCloudViewer.js';

/**
 * 测量类型
 */
export type MeasurementType = 'distance' | 'area' | 'volume' | 'angle';

/**
 * 测量结果
 */
export interface MeasurementResult {
  /** 测量类型 */
  readonly type: MeasurementType;
  /** 测量点 */
  readonly points: readonly THREE.Vector3[];
  /** 距离（仅 distance 类型） */
  readonly distance?: number;
  /** 面积（仅 area 类型） */
  readonly area?: number;
  /** 体积（仅 volume 类型） */
  readonly volume?: number;
  /** 角度（仅 angle 类型） */
  readonly angle?: number;
}

/**
 * 测量工具配置
 */
export interface MeasurementToolConfig {
  /** 测量线颜色 */
  readonly lineColor?: THREE.ColorRepresentation;
  /** 测量点颜色 */
  readonly pointColor?: THREE.ColorRepresentation;
  /** 线宽 */
  readonly lineWidth?: number;
}

/**
 * 测量工具
 *
 * 提供交互式测量功能（占位符实现）
 */
export class MeasurementTool {
  private isActive = false;
  private currentType: MeasurementType | null = null;
  private points: THREE.Vector3[] = [];
  private onCompleteCallback?: (result: MeasurementResult) => void;

  /**
   * 创建测量工具
   *
   * @param _viewer - 点云查看器（保留用于未来扩展）
   * @param _config - 配置选项（保留用于未来扩展）
   */
  constructor(_viewer: PointCloudViewer, _config: MeasurementToolConfig = {}) {
    // 占位符实现 - 将在Phase 3中完善
  }

  /**
   * 开始距离测量
   */
  startDistanceMeasurement(): void {
    this.currentType = 'distance';
    this.isActive = true;
    this.points = [];
    console.log('Distance measurement started. Click two points to measure.');
  }

  /**
   * 开始面积测量
   */
  startAreaMeasurement(): void {
    this.currentType = 'area';
    this.isActive = true;
    this.points = [];
    console.log('Area measurement started. Click points to define polygon.');
  }

  /**
   * 取消当前测量
   */
  cancel(): void {
    this.isActive = false;
    this.currentType = null;
    this.points = [];
  }

  /**
   * 设置测量完成回调
   *
   * @param callback - 回调函数
   */
  onMeasurementComplete(callback: (result: MeasurementResult) => void): void {
    this.onCompleteCallback = callback;
  }

  /**
   * 添加测量点
   *
   * @param point - 3D 点
   */
  addPoint(point: THREE.Vector3): void {
    if (!this.isActive) return;

    this.points.push(point.clone());

    if (this.currentType === 'distance' && this.points.length === 2) {
      this.completeMeasurement();
    }
  }

  /**
   * 完成当前测量
   */
  completeMeasurement(): void {
    if (!this.isActive || !this.currentType) return;

    const result = this.calculateResult();

    if (this.onCompleteCallback) {
      this.onCompleteCallback(result);
    }

    this.cancel();
  }

  /**
   * 计算测量结果
   */
  private calculateResult(): MeasurementResult {
    switch (this.currentType) {
      case 'distance':
        return {
          type: 'distance',
          points: this.points,
          distance: this.calculateDistance(),
        };
      case 'area':
        return {
          type: 'area',
          points: this.points,
          area: this.calculateArea(),
        };
      default:
        return {
          type: this.currentType || 'distance',
          points: this.points,
        };
    }
  }

  /**
   * 计算距离
   */
  private calculateDistance(): number {
    if (this.points.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < this.points.length; i++) {
      const prevPoint = this.points[i - 1];
      const currPoint = this.points[i];
      if (prevPoint && currPoint) {
        totalDistance += prevPoint.distanceTo(currPoint);
      }
    }
    return totalDistance;
  }

  /**
   * 计算面积（占位符）
   */
  private calculateArea(): number {
    // 简化的面积计算
    if (this.points.length < 3) return 0;

    // 使用 Shoelace 公式计算平面多边形面积
    let area = 0;
    const n = this.points.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const pi = this.points[i];
      const pj = this.points[j];
      if (pi && pj) {
        area += pi.x * pj.y;
        area -= pj.x * pi.y;
      }
    }
    return Math.abs(area) / 2;
  }

  /**
   * 是否激活
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * 销毁工具
   */
  dispose(): void {
    this.cancel();
    delete this.onCompleteCallback;
  }
}
