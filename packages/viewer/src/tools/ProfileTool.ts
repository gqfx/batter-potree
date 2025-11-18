/**
 * 高程剖面工具
 *
 * 沿用户绘制的剖面线采样点云高程数据，生成高程剖面图
 *
 * @module tools
 * @example
 * ```ts
 * const tool = new ProfileTool(viewer);
 *
 * // 设置剖面线
 * const points = [
 *   new THREE.Vector3(0, 0, 0),
 *   new THREE.Vector3(100, 0, 0),
 *   new THREE.Vector3(100, 100, 0)
 * ];
 * tool.setProfileLine(points);
 *
 * // 采样剖面
 * const profile = await tool.sampleProfile(1.0);
 * console.log('Profile data:', profile);
 *
 * // 导出数据
 * const csv = tool.exportProfile();
 * ```
 */

import * as THREE from 'three';
import type { Viewer } from '../Viewer.js';

/**
 * 剖面点数据
 */
export interface ProfilePoint {
  /** 沿剖面线的距离 (从起点开始) */
  readonly distance: number;
  /** 高程值 */
  readonly elevation: number;
  /** 3D 世界坐标 */
  readonly position: THREE.Vector3;
}

/**
 * 剖面数据
 */
export interface ProfileData {
  /** 剖面点数组 */
  readonly points: readonly ProfilePoint[];
  /** 总长度 */
  readonly totalLength: number;
  /** 最小高程 */
  readonly minElevation: number;
  /** 最大高程 */
  readonly maxElevation: number;
  /** 高程范围 */
  readonly elevationRange: number;
}

/**
 * 剖面工具配置
 */
export interface ProfileToolConfig {
  /** 剖面线颜色 */
  readonly lineColor?: THREE.ColorRepresentation;
  /** 剖面线宽度 */
  readonly lineWidth?: number;
  /** 标记点颜色 */
  readonly markerColor?: THREE.ColorRepresentation;
  /** 标记点大小 */
  readonly markerSize?: number;
  /** 默认采样分辨率 (米) */
  readonly defaultResolution?: number;
  /** 剖面宽度 (用于采样范围) */
  readonly profileWidth?: number;
  /** 是否显示剖面线 */
  readonly showLine?: boolean;
}

/**
 * 剖面段
 */
interface ProfileSegment {
  readonly start: THREE.Vector3;
  readonly end: THREE.Vector3;
  readonly length: number;
  readonly direction: THREE.Vector3;
}

/**
 * 高程剖面工具
 *
 * 沿指定路径采样点云高程并生成剖面数据
 */
export class ProfileTool {
  // @ts-expect-error - viewer will be used in future implementations
  private _viewer: Viewer;
  private config: Required<ProfileToolConfig>;

  // 剖面线控制点
  private controlPoints: THREE.Vector3[] = [];
  private segments: ProfileSegment[] = [];

  // 采样数据
  private profileData: ProfileData | null = null;

  // 可视化对象
  private visualGroup: THREE.Group;
  private lineObject: THREE.Line | null = null;
  private markerObjects: THREE.Mesh[] = [];

  /**
   * 创建高程剖面工具
   *
   * @param viewer - Viewer 实例
   * @param config - 配置选项
   */
  constructor(viewer: Viewer, config: ProfileToolConfig = {}) {
    this._viewer = viewer;
    this.config = {
      lineColor: config.lineColor ?? 0xff0000,
      lineWidth: config.lineWidth ?? 2,
      markerColor: config.markerColor ?? 0xff0000,
      markerSize: config.markerSize ?? 0.4,
      defaultResolution: config.defaultResolution ?? 1.0,
      profileWidth: config.profileWidth ?? 1.0,
      showLine: config.showLine ?? true,
    };

    this.visualGroup = new THREE.Group();
    this.visualGroup.name = 'ProfileTool';
  }

  /**
   * 设置剖面线
   *
   * @param points - 剖面线控制点数组
   * @throws {Error} 如果点数少于 2 个
   */
  setProfileLine(points: THREE.Vector3[]): void {
    if (points.length < 2) {
      throw new Error('Profile line requires at least 2 points.');
    }

    this.controlPoints = points.map((p) => p.clone());
    this.updateSegments();
    this.updateVisualization();
  }

  /**
   * 添加控制点
   *
   * @param point - 3D 点
   */
  addPoint(point: THREE.Vector3): void {
    this.controlPoints.push(point.clone());
    this.updateSegments();
    this.updateVisualization();
  }

  /**
   * 移除控制点
   *
   * @param index - 点索引
   * @throws {Error} 如果索引无效
   */
  removePoint(index: number): void {
    if (index < 0 || index >= this.controlPoints.length) {
      throw new Error(`Invalid point index: ${index}`);
    }

    this.controlPoints.splice(index, 1);
    this.updateSegments();
    this.updateVisualization();
  }

  /**
   * 更新控制点位置
   *
   * @param index - 点索引
   * @param position - 新位置
   * @throws {Error} 如果索引无效
   */
  updatePoint(index: number, position: THREE.Vector3): void {
    if (index < 0 || index >= this.controlPoints.length) {
      throw new Error(`Invalid point index: ${index}`);
    }

    this.controlPoints[index] = position.clone();
    this.updateSegments();
    this.updateVisualization();
  }

  /**
   * 采样剖面
   *
   * 沿剖面线以指定分辨率采样点云高程
   *
   * @param resolution - 采样分辨率（米），默认使用配置值
   * @returns 剖面数据
   * @throws {Error} 如果剖面线未设置
   */
  async sampleProfile(resolution?: number): Promise<ProfileData> {
    if (this.controlPoints.length < 2) {
      throw new Error('Profile line not set. Call setProfileLine() first.');
    }

    const sampleResolution = resolution ?? this.config.defaultResolution;
    const points: ProfilePoint[] = [];

    let cumulativeDistance = 0;
    let minElevation = Infinity;
    let maxElevation = -Infinity;

    // 对每个线段采样
    for (const segment of this.segments) {
      const segmentSamples = Math.ceil(segment.length / sampleResolution);

      for (let i = 0; i <= segmentSamples; i++) {
        const t = i / segmentSamples;
        const samplePos = new THREE.Vector3().lerpVectors(
          segment.start,
          segment.end,
          t
        );

        // 采样该位置的高程
        const elevation = await this.sampleElevation(samplePos);

        if (elevation !== null) {
          const distance = cumulativeDistance + t * segment.length;

          points.push({
            distance,
            elevation,
            position: samplePos.clone(),
          });

          minElevation = Math.min(minElevation, elevation);
          maxElevation = Math.max(maxElevation, elevation);
        }
      }

      cumulativeDistance += segment.length;
    }

    this.profileData = {
      points,
      totalLength: cumulativeDistance,
      minElevation,
      maxElevation,
      elevationRange: maxElevation - minElevation,
    };

    return this.profileData;
  }

  /**
   * 采样指定位置的高程
   *
   * 通过垂直射线投射获取点云高程
   *
   * @param position - 采样位置
   * @returns 高程值，如果未找到点云则返回 null
   */
  private async sampleElevation(
    position: THREE.Vector3
  ): Promise<number | null> {
    // TODO: 实现点云射线检测
    // 当前返回位置的 Z 值作为占位符
    // 真实实现需要与点云进行射线检测：
    //
    // const origin = new THREE.Vector3(position.x, position.y, 10000);
    // const direction = new THREE.Vector3(0, 0, -1);
    // const raycaster = new THREE.Raycaster(origin, direction);
    // const intersects = this._viewer.raycastPointClouds(raycaster);
    // if (intersects.length > 0) {
    //   return intersects[0].point.z;
    // }

    // 占位符: 返回原始位置的 Z 值
    return position.z;
  }

  /**
   * 导出剖面数据为 CSV 格式
   *
   * @returns CSV 字符串
   * @throws {Error} 如果尚未采样剖面
   */
  exportProfile(): string {
    if (!this.profileData) {
      throw new Error('No profile data. Call sampleProfile() first.');
    }

    const lines: string[] = [
      'Distance (m),Elevation (m),X,Y,Z',
    ];

    for (const point of this.profileData.points) {
      const line = [
        point.distance.toFixed(3),
        point.elevation.toFixed(3),
        point.position.x.toFixed(3),
        point.position.y.toFixed(3),
        point.position.z.toFixed(3),
      ].join(',');
      lines.push(line);
    }

    return lines.join('\n');
  }

  /**
   * 导出剖面数据为 JSON 格式
   *
   * @returns JSON 字符串
   * @throws {Error} 如果尚未采样剖面
   */
  exportProfileJSON(): string {
    if (!this.profileData) {
      throw new Error('No profile data. Call sampleProfile() first.');
    }

    return JSON.stringify(this.profileData, null, 2);
  }

  /**
   * 获取剖面数据
   *
   * @returns 剖面数据，如果尚未采样则返回 null
   */
  getProfileData(): ProfileData | null {
    return this.profileData;
  }

  /**
   * 获取控制点
   *
   * @returns 控制点数组的副本
   */
  getControlPoints(): THREE.Vector3[] {
    return this.controlPoints.map((p) => p.clone());
  }

  /**
   * 获取剖面线总长度
   *
   * @returns 总长度（米）
   */
  getTotalLength(): number {
    return this.segments.reduce((sum, seg) => sum + seg.length, 0);
  }

  /**
   * 更新线段信息
   */
  private updateSegments(): void {
    this.segments = [];

    for (let i = 0; i < this.controlPoints.length - 1; i++) {
      const start = this.controlPoints[i]!;
      const end = this.controlPoints[i + 1]!;
      const direction = new THREE.Vector3()
        .subVectors(end, start)
        .normalize();
      const length = start.distanceTo(end);

      this.segments.push({
        start: start.clone(),
        end: end.clone(),
        length,
        direction,
      });
    }
  }

  /**
   * 更新可视化
   */
  private updateVisualization(): void {
    this.clearVisualization();

    if (!this.config.showLine || this.controlPoints.length < 2) {
      return;
    }

    // 创建剖面线
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(
      this.controlPoints
    );
    const lineMaterial = new THREE.LineBasicMaterial({
      color: this.config.lineColor,
      linewidth: this.config.lineWidth,
      transparent: true,
      opacity: 0.8,
      depthTest: false,
    });

    this.lineObject = new THREE.Line(lineGeometry, lineMaterial);
    this.visualGroup.add(this.lineObject);

    // 创建控制点标记
    const markerGeometry = new THREE.SphereGeometry(
      this.config.markerSize,
      16,
      16
    );
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: this.config.markerColor,
      depthTest: false,
      depthWrite: false,
    });

    for (const point of this.controlPoints) {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(point);
      this.visualGroup.add(marker);
      this.markerObjects.push(marker);
    }

    // TODO: 将可视化组添加到 Viewer 场景
    // this.viewer.scene.add(this.visualGroup);
  }

  /**
   * 清除可视化
   */
  private clearVisualization(): void {
    if (this.lineObject) {
      this.visualGroup.remove(this.lineObject);
      this.lineObject.geometry.dispose();
      (this.lineObject.material as THREE.Material).dispose();
      this.lineObject = null;
    }

    for (const marker of this.markerObjects) {
      this.visualGroup.remove(marker);
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
    }
    this.markerObjects = [];

    // TODO: 从 Viewer 场景移除
    // this.viewer.scene.remove(this.visualGroup);
  }

  /**
   * 设置剖面宽度
   *
   * @param width - 剖面宽度（米）
   */
  setProfileWidth(width: number): void {
    // 创建新的配置对象以避免修改只读属性
    this.config = {
      ...this.config,
      profileWidth: Math.max(0.1, width),
    };
  }

  /**
   * 清除剖面线
   */
  clear(): void {
    this.controlPoints = [];
    this.segments = [];
    this.profileData = null;
    this.clearVisualization();
  }

  /**
   * 获取可视化组
   *
   * @returns THREE.Group 对象
   */
  getVisualization(): THREE.Group {
    return this.visualGroup;
  }

  /**
   * 销毁工具
   *
   * 清理所有资源和可视化对象
   */
  dispose(): void {
    this.clear();
  }
}
