/**
 * 体积测量工具
 *
 * 提供点云体积测量功能，通过测量框采样点云高程数据并计算体积
 *
 * @module tools
 * @example
 * ```ts
 * const tool = new VolumeTool(viewer);
 *
 * // 设置测量框
 * const min = new THREE.Vector3(-10, -10, -5);
 * const max = new THREE.Vector3(10, 10, 5);
 * tool.setMeasurementBox(min, max);
 *
 * // 计算体积
 * const result = await tool.calculateVolume();
 * console.log('Volume:', result.volume);
 * console.log('Cut:', result.cut, 'Fill:', result.fill);
 * ```
 */

import * as THREE from 'three';
import type { Viewer } from '../Viewer.js';

/**
 * 体积测量结果
 */
export interface VolumeResult {
  /** 总体积 (立方米) */
  readonly volume: number;
  /** 挖方体积 (cut - 高于基准面的体积) */
  readonly cut: number;
  /** 填方体积 (fill - 低于基准面的体积) */
  readonly fill: number;
  /** 测量框范围 */
  readonly boundingBox: THREE.Box3;
  /** 采样点数量 */
  readonly sampleCount: number;
  /** 基准高度 (如果设置) */
  readonly baseHeight?: number;
}

/**
 * 体积测量工具配置
 */
export interface VolumeToolConfig {
  /** 测量框颜色 */
  readonly boxColor?: THREE.ColorRepresentation;
  /** 测量框透明度 */
  readonly boxOpacity?: number;
  /** 网格分辨率 (米) */
  readonly gridResolution?: number;
  /** 基准高度 (可选，用于计算挖填方) */
  readonly baseHeight?: number;
  /** 是否显示测量框 */
  readonly showBox?: boolean;
}

/**
 * 体积测量工具
 *
 * 通过创建测量框并对点云进行网格采样来计算体积
 */
export class VolumeTool {
  // @ts-expect-error - viewer will be used in future implementations
  private _viewer: Viewer;
  private config: Required<VolumeToolConfig>;

  // 测量框
  private boundingBox: THREE.Box3 | null = null;
  private boxHelper: THREE.Box3Helper | null = null;

  // 可视化对象
  private visualGroup: THREE.Group;

  /**
   * 创建体积测量工具
   *
   * @param viewer - Viewer 实例
   * @param config - 配置选项
   */
  constructor(viewer: Viewer, config: VolumeToolConfig = {}) {
    this._viewer = viewer;
    this.config = {
      boxColor: config.boxColor ?? 0x00ff00,
      boxOpacity: config.boxOpacity ?? 0.3,
      gridResolution: config.gridResolution ?? 1.0,
      baseHeight: config.baseHeight ?? 0,
      showBox: config.showBox ?? true,
    };

    this.visualGroup = new THREE.Group();
    this.visualGroup.name = 'VolumeTool';
  }

  /**
   * 开始测量
   *
   * 激活工具并准备接收用户输入
   */
  startMeasurement(): void {
    console.log('Volume measurement started. Define measurement box.');
    this.clearVisualization();
  }

  /**
   * 设置测量框
   *
   * @param min - 最小点
   * @param max - 最大点
   */
  setMeasurementBox(min: THREE.Vector3, max: THREE.Vector3): void {
    this.boundingBox = new THREE.Box3(min.clone(), max.clone());
    this.updateVisualization();
  }

  /**
   * 设置测量框（Box3）
   *
   * @param box - 包围盒
   */
  setBox(box: THREE.Box3): void {
    this.boundingBox = box.clone();
    this.updateVisualization();
  }

  /**
   * 计算体积
   *
   * 使用网格采样方法计算测量框内的体积
   *
   * @returns 体积测量结果
   * @throws {Error} 如果未设置测量框
   */
  async calculateVolume(): Promise<VolumeResult> {
    if (!this.boundingBox) {
      throw new Error('Measurement box not set. Call setMeasurementBox() first.');
    }

    const gridResolution = this.config.gridResolution;
    const baseHeight = this.config.baseHeight;

    // 计算网格尺寸
    const boxSize = new THREE.Vector3();
    this.boundingBox.getSize(boxSize);

    const gridCountX = Math.ceil(boxSize.x / gridResolution);
    const gridCountY = Math.ceil(boxSize.y / gridResolution);

    let totalVolume = 0;
    let cutVolume = 0;
    let fillVolume = 0;
    let sampleCount = 0;

    // 网格采样
    for (let ix = 0; ix < gridCountX; ix++) {
      for (let iy = 0; iy < gridCountY; iy++) {
        // 计算网格单元中心
        const x =
          this.boundingBox.min.x + (ix + 0.5) * gridResolution;
        const y =
          this.boundingBox.min.y + (iy + 0.5) * gridResolution;

        // 采样该网格单元的高度
        const height = await this.sampleHeight(x, y);

        if (height !== null) {
          sampleCount++;

          // 计算该网格单元的体积
          const cellArea = gridResolution * gridResolution;
          const cellHeight = height - this.boundingBox.min.z;
          const cellVolume = cellArea * cellHeight;

          totalVolume += cellVolume;

          // 计算挖填方
          const heightDiff = height - baseHeight;
          if (heightDiff > 0) {
            cutVolume += cellArea * heightDiff;
          } else {
            fillVolume += cellArea * Math.abs(heightDiff);
          }
        }
      }
    }

    return {
      volume: totalVolume,
      cut: cutVolume,
      fill: fillVolume,
      boundingBox: this.boundingBox.clone(),
      sampleCount,
      baseHeight,
    };
  }

  /**
   * 采样指定位置的高度
   *
   * 通过光线投射获取点云在 (x, y) 位置的高度
   *
   * @param x - X 坐标
   * @param y - Y 坐标
   * @returns 高度值，如果未找到点云则返回 null
   */
  private async sampleHeight(x: number, y: number): Promise<number | null> {
    if (!this.boundingBox) return null;

    // 创建从上往下的射线
    const origin = new THREE.Vector3(
      x,
      y,
      this.boundingBox.max.z + 1000
    );
    const direction = new THREE.Vector3(0, 0, -1);
    // @ts-expect-error - raycaster will be used when raycast is implemented
    const raycaster = new THREE.Raycaster(origin, direction);

    // TODO: 实现点云射线检测
    // 当前返回测量框底部高度作为占位符
    // 真实实现需要与点云进行射线检测
    // const intersects = this.viewer.raycastPointClouds(raycaster);
    // if (intersects.length > 0) {
    //   return intersects[0].point.z;
    // }

    // 占位符: 返回测量框的中间高度
    return (this.boundingBox.min.z + this.boundingBox.max.z) / 2;
  }

  /**
   * 更新可视化
   */
  private updateVisualization(): void {
    this.clearVisualization();

    if (!this.boundingBox || !this.config.showBox) {
      return;
    }

    // 创建测量框可视化
    this.boxHelper = new THREE.Box3Helper(
      this.boundingBox,
      new THREE.Color(this.config.boxColor)
    );
    this.visualGroup.add(this.boxHelper);

    // 创建半透明框
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshBasicMaterial({
      color: this.config.boxColor,
      transparent: true,
      opacity: this.config.boxOpacity,
      depthTest: true,
      depthWrite: false,
    });

    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    this.boundingBox.getCenter(center);
    this.boundingBox.getSize(size);

    boxMesh.position.copy(center);
    boxMesh.scale.copy(size);
    this.visualGroup.add(boxMesh);

    // TODO: 将可视化组添加到 Viewer 场景
    // this.viewer.scene.add(this.visualGroup);
  }

  /**
   * 清除可视化
   */
  private clearVisualization(): void {
    if (this.boxHelper) {
      this.visualGroup.remove(this.boxHelper);
      this.boxHelper = null;
    }

    // 清除所有子对象
    while (this.visualGroup.children.length > 0) {
      this.visualGroup.remove(this.visualGroup.children[0]!);
    }

    // TODO: 从 Viewer 场景移除
    // this.viewer.scene.remove(this.visualGroup);
  }

  /**
   * 设置网格分辨率
   *
   * @param resolution - 网格分辨率（米）
   */
  setGridResolution(resolution: number): void {
    this.config = {
      ...this.config,
      gridResolution: Math.max(0.1, resolution),
    };
  }

  /**
   * 设置基准高度
   *
   * @param height - 基准高度
   */
  setBaseHeight(height: number): void {
    this.config = {
      ...this.config,
      baseHeight: height,
    };
  }

  /**
   * 获取测量框
   *
   * @returns 当前测量框，如果未设置则返回 null
   */
  getMeasurementBox(): THREE.Box3 | null {
    return this.boundingBox ? this.boundingBox.clone() : null;
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
    this.clearVisualization();
    this.boundingBox = null;
  }
}
