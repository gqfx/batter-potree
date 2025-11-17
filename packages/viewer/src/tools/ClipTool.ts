/**
 * 裁剪工具
 *
 * 提供点云裁剪功能（裁剪框、裁剪平面）
 *
 * @module tools
 * @example
 * ```ts
 * const tool = new ClipTool(viewer);
 *
 * // 添加裁剪框
 * tool.addClipBox(new THREE.Box3(...));
 *
 * // 清除所有裁剪
 * tool.clearClips();
 * ```
 */

import type * as THREE from 'three';
import type { PointCloudViewer } from '../PointCloudViewer.js';

/**
 * 裁剪类型
 */
export type ClipType = 'box' | 'plane' | 'sphere';

/**
 * 裁剪体
 */
export interface ClipVolume {
  /** 唯一 ID */
  readonly id: string;
  /** 裁剪类型 */
  readonly type: ClipType;
  /** 是否启用 */
  enabled: boolean;
  /** 是否反转（保留外部而非内部） */
  inverted: boolean;
}

/**
 * 裁剪工具配置
 */
export interface ClipToolConfig {
  /** 裁剪框可视化颜色 */
  readonly boxColor?: THREE.ColorRepresentation;
  /** 裁剪框可视化透明度 */
  readonly boxOpacity?: number;
}

/**
 * 裁剪工具
 *
 * 管理点云的裁剪体（占位符实现）
 */
export class ClipTool {
  private clipVolumes: Map<string, ClipVolume> = new Map();
  private nextId = 0;

  /**
   * 创建裁剪工具
   *
   * @param _viewer - 点云查看器（保留用于未来扩展）
   * @param _config - 配置选项（保留用于未来扩展）
   */
  constructor(_viewer: PointCloudViewer, _config: ClipToolConfig = {}) {
    // 占位符实现 - 将在Phase 3中完善
  }

  /**
   * 添加裁剪框
   *
   * @param box - 裁剪框
   * @returns 裁剪体 ID
   */
  addClipBox(box: THREE.Box3): string {
    const id = `clip-box-${this.nextId++}`;

    const volume: ClipVolume = {
      id,
      type: 'box',
      enabled: true,
      inverted: false,
    };

    this.clipVolumes.set(id, volume);
    console.log(`Added clip box: ${id}`, box);

    return id;
  }

  /**
   * 添加裁剪平面
   *
   * @param plane - 裁剪平面
   * @returns 裁剪体 ID
   */
  addClipPlane(plane: THREE.Plane): string {
    const id = `clip-plane-${this.nextId++}`;

    const volume: ClipVolume = {
      id,
      type: 'plane',
      enabled: true,
      inverted: false,
    };

    this.clipVolumes.set(id, volume);
    console.log(`Added clip plane: ${id}`, plane);

    return id;
  }

  /**
   * 添加裁剪球
   *
   * @param sphere - 裁剪球
   * @returns 裁剪体 ID
   */
  addClipSphere(sphere: THREE.Sphere): string {
    const id = `clip-sphere-${this.nextId++}`;

    const volume: ClipVolume = {
      id,
      type: 'sphere',
      enabled: true,
      inverted: false,
    };

    this.clipVolumes.set(id, volume);
    console.log(`Added clip sphere: ${id}`, sphere);

    return id;
  }

  /**
   * 移除裁剪体
   *
   * @param id - 裁剪体 ID
   */
  removeClip(id: string): void {
    this.clipVolumes.delete(id);
  }

  /**
   * 启用/禁用裁剪体
   *
   * @param id - 裁剪体 ID
   * @param enabled - 是否启用
   */
  setClipEnabled(id: string, enabled: boolean): void {
    const volume = this.clipVolumes.get(id);
    if (volume) {
      volume.enabled = enabled;
    }
  }

  /**
   * 反转裁剪体
   *
   * @param id - 裁剪体 ID
   * @param inverted - 是否反转
   */
  setClipInverted(id: string, inverted: boolean): void {
    const volume = this.clipVolumes.get(id);
    if (volume) {
      volume.inverted = inverted;
    }
  }

  /**
   * 清除所有裁剪体
   */
  clearClips(): void {
    this.clipVolumes.clear();
  }

  /**
   * 获取所有裁剪体
   *
   * @returns 裁剪体数组
   */
  getClipVolumes(): ClipVolume[] {
    return Array.from(this.clipVolumes.values());
  }

  /**
   * 获取裁剪体数量
   */
  getClipCount(): number {
    return this.clipVolumes.size;
  }

  /**
   * 销毁工具
   */
  dispose(): void {
    this.clearClips();
  }
}
