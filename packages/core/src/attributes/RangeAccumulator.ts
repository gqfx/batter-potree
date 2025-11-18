/**
 * 属性范围累积器
 *
 * 跨节点累积点云属性范围（如强度、高程等）
 *
 * @module core/attributes
 * @example
 * ```ts
 * const accumulator = new RangeAccumulator();
 *
 * // 加载节点时累积范围
 * accumulator.addIntensityRange(0, 255);
 * accumulator.addIntensityRange(50, 300);
 * // 结果: [0, 300]
 *
 * // 获取累积范围
 * const intensityRange = accumulator.getIntensityRange();
 * material.uniforms.intensityRange.value = intensityRange;
 * ```
 */

import * as THREE from 'three';

/**
 * 单个属性的范围
 */
interface AttributeRange {
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 累积的节点数 */
  nodeCount: number;
}

/**
 * 属性范围累积器配置
 */
export interface RangeAccumulatorConfig {
  /** 自动重置间隔(毫秒)。0表示不自动重置 */
  autoResetInterval?: number;
}

/**
 * 属性范围累积器
 *
 * 跨节点累积属性范围,用于自动调整渲染参数
 */
export class RangeAccumulator {
  private intensity: AttributeRange = { min: Infinity, max: -Infinity, nodeCount: 0 };
  private elevation: AttributeRange = { min: Infinity, max: -Infinity, nodeCount: 0 };
  private gpsTime: AttributeRange = { min: Infinity, max: -Infinity, nodeCount: 0 };
  private returnNumber: AttributeRange = { min: Infinity, max: -Infinity, nodeCount: 0 };
  private sourceId: AttributeRange = { min: Infinity, max: -Infinity, nodeCount: 0 };

  private lastResetTime = Date.now();
  private autoResetInterval: number;

  /**
   * 创建范围累积器
   *
   * @param config - 配置选项
   */
  constructor(config: RangeAccumulatorConfig = {}) {
    this.autoResetInterval = config.autoResetInterval ?? 0;
  }

  /**
   * 添加强度范围
   *
   * @param min - 最小值
   * @param max - 最大值
   */
  addIntensityRange(min: number, max: number): void {
    this.checkAutoReset();
    this.intensity.min = Math.min(this.intensity.min, min);
    this.intensity.max = Math.max(this.intensity.max, max);
    this.intensity.nodeCount++;
  }

  /**
   * 添加高程范围
   *
   * @param min - 最小值
   * @param max - 最大值
   */
  addElevationRange(min: number, max: number): void {
    this.checkAutoReset();
    this.elevation.min = Math.min(this.elevation.min, min);
    this.elevation.max = Math.max(this.elevation.max, max);
    this.elevation.nodeCount++;
  }

  /**
   * 添加 GPS 时间范围
   *
   * @param min - 最小值
   * @param max - 最大值
   */
  addGPSTimeRange(min: number, max: number): void {
    this.checkAutoReset();
    this.gpsTime.min = Math.min(this.gpsTime.min, min);
    this.gpsTime.max = Math.max(this.gpsTime.max, max);
    this.gpsTime.nodeCount++;
  }

  /**
   * 添加返回值范围
   *
   * @param min - 最小值
   * @param max - 最大值
   */
  addReturnNumberRange(min: number, max: number): void {
    this.checkAutoReset();
    this.returnNumber.min = Math.min(this.returnNumber.min, min);
    this.returnNumber.max = Math.max(this.returnNumber.max, max);
    this.returnNumber.nodeCount++;
  }

  /**
   * 添加点源 ID 范围
   *
   * @param min - 最小值
   * @param max - 最大值
   */
  addSourceIdRange(min: number, max: number): void {
    this.checkAutoReset();
    this.sourceId.min = Math.min(this.sourceId.min, min);
    this.sourceId.max = Math.max(this.sourceId.max, max);
    this.sourceId.nodeCount++;
  }

  /**
   * 从包围盒累积高程范围
   *
   * @param boundingBox - 节点包围盒
   */
  addFromBoundingBox(boundingBox: THREE.Box3): void {
    this.addElevationRange(boundingBox.min.y, boundingBox.max.y);
  }

  /**
   * 获取强度范围
   *
   * @returns THREE.Vector2 [min, max]
   */
  getIntensityRange(): THREE.Vector2 {
    if (this.intensity.nodeCount === 0) {
      return new THREE.Vector2(0, 1);
    }
    return new THREE.Vector2(this.intensity.min, this.intensity.max);
  }

  /**
   * 获取高程范围
   *
   * @returns THREE.Vector2 [min, max]
   */
  getElevationRange(): THREE.Vector2 {
    if (this.elevation.nodeCount === 0) {
      return new THREE.Vector2(0, 1);
    }
    return new THREE.Vector2(this.elevation.min, this.elevation.max);
  }

  /**
   * 获取 GPS 时间范围
   *
   * @returns THREE.Vector2 [min, max]
   */
  getGPSTimeRange(): THREE.Vector2 {
    if (this.gpsTime.nodeCount === 0) {
      return new THREE.Vector2(0, 1);
    }
    return new THREE.Vector2(this.gpsTime.min, this.gpsTime.max);
  }

  /**
   * 获取返回值范围
   *
   * @returns THREE.Vector2 [min, max]
   */
  getReturnNumberRange(): THREE.Vector2 {
    if (this.returnNumber.nodeCount === 0) {
      return new THREE.Vector2(0, 7);
    }
    return new THREE.Vector2(this.returnNumber.min, this.returnNumber.max);
  }

  /**
   * 获取点源 ID 范围
   *
   * @returns THREE.Vector2 [min, max]
   */
  getSourceIdRange(): THREE.Vector2 {
    if (this.sourceId.nodeCount === 0) {
      return new THREE.Vector2(0, 65535);
    }
    return new THREE.Vector2(this.sourceId.min, this.sourceId.max);
  }

  /**
   * 检查范围是否有效
   *
   * @param range - 范围
   * @returns 是否有效
   */
  private isValidRange(range: AttributeRange): boolean {
    return range.nodeCount > 0 && range.min <= range.max;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    intensity: { min: number; max: number; nodeCount: number };
    elevation: { min: number; max: number; nodeCount: number };
    gpsTime: { min: number; max: number; nodeCount: number };
    returnNumber: { min: number; max: number; nodeCount: number };
    sourceId: { min: number; max: number; nodeCount: number };
  } {
    return {
      intensity: { ...this.intensity },
      elevation: { ...this.elevation },
      gpsTime: { ...this.gpsTime },
      returnNumber: { ...this.returnNumber },
      sourceId: { ...this.sourceId },
    };
  }

  /**
   * 检查是否需要自动重置
   */
  private checkAutoReset(): void {
    if (this.autoResetInterval > 0) {
      const now = Date.now();
      if (now - this.lastResetTime > this.autoResetInterval) {
        this.reset();
        this.lastResetTime = now;
      }
    }
  }

  /**
   * 重置所有范围
   */
  reset(): void {
    this.intensity = { min: Infinity, max: -Infinity, nodeCount: 0 };
    this.elevation = { min: Infinity, max: -Infinity, nodeCount: 0 };
    this.gpsTime = { min: Infinity, max: -Infinity, nodeCount: 0 };
    this.returnNumber = { min: Infinity, max: -Infinity, nodeCount: 0 };
    this.sourceId = { min: Infinity, max: -Infinity, nodeCount: 0 };
    this.lastResetTime = Date.now();
  }

  /**
   * 重置特定属性范围
   *
   * @param attribute - 属性名
   */
  resetAttribute(
    attribute: 'intensity' | 'elevation' | 'gpsTime' | 'returnNumber' | 'sourceId',
  ): void {
    this[attribute] = { min: Infinity, max: -Infinity, nodeCount: 0 };
  }

  /**
   * 应用范围到材质 uniform
   *
   * @param uniforms - 材质 uniforms
   *
   * @example
   * ```ts
   * accumulator.applyToUniforms(material.uniforms);
   * ```
   */
  applyToUniforms(
    uniforms: Record<string, { value: unknown }>,
  ): void {
    if (uniforms.intensityRange && this.isValidRange(this.intensity)) {
      uniforms.intensityRange.value = this.getIntensityRange();
    }

    if (uniforms.elevationRange && this.isValidRange(this.elevation)) {
      uniforms.elevationRange.value = this.getElevationRange();
    }

    if (uniforms.uFilterGPSTimeClipRange && this.isValidRange(this.gpsTime)) {
      uniforms.uFilterGPSTimeClipRange.value = this.getGPSTimeRange();
    }

    if (uniforms.uFilterReturnNumberRange && this.isValidRange(this.returnNumber)) {
      uniforms.uFilterReturnNumberRange.value = this.getReturnNumberRange();
    }

    if (uniforms.uFilterPointSourceIDClipRange && this.isValidRange(this.sourceId)) {
      uniforms.uFilterPointSourceIDClipRange.value = this.getSourceIdRange();
    }
  }
}
