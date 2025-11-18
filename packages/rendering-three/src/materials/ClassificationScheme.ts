/**
 * 点云分类管理器
 *
 * 管理点云分类颜色和可见性配置
 *
 * @module rendering-three/materials
 * @example
 * ```ts
 * const scheme = new ClassificationScheme();
 *
 * // 设置分类颜色
 * scheme.setClassColor(2, new THREE.Color(0x00ff00)); // 地面为绿色
 *
 * // 设置分类可见性
 * scheme.setClassVisible(7, false); // 隐藏噪声点
 *
 * // 获取纹理用于shader
 * const texture = scheme.getTexture();
 * material.uniforms.classificationLUT.value = texture;
 * ```
 */

import * as THREE from 'three';

/**
 * 单个分类的配置
 */
export interface ClassificationConfig {
  /** 分类颜色 */
  color: THREE.Color;
  /** 是否可见 */
  visible: boolean;
  /** 分类名称(可选) */
  name?: string;
}

/**
 * 默认LAS分类颜色方案
 *
 * 基于 ASPRS 标准分类
 */
const DEFAULT_CLASSIFICATION_COLORS: Record<number, { color: number; name: string }> = {
  0: { color: 0x888888, name: 'Never Classified' },
  1: { color: 0x888888, name: 'Unclassified' },
  2: { color: 0x964b00, name: 'Ground' },
  3: { color: 0x00ff00, name: 'Low Vegetation' },
  4: { color: 0x00aa00, name: 'Medium Vegetation' },
  5: { color: 0x006600, name: 'High Vegetation' },
  6: { color: 0xff0000, name: 'Building' },
  7: { color: 0xff00ff, name: 'Low Point (Noise)' },
  8: { color: 0xff00ff, name: 'Reserved' },
  9: { color: 0x0000ff, name: 'Water' },
  10: { color: 0x00ffff, name: 'Rail' },
  11: { color: 0xaaaaaa, name: 'Road Surface' },
  12: { color: 0xffff00, name: 'Reserved' },
  13: { color: 0xffa500, name: 'Wire - Guard (Shield)' },
  14: { color: 0xff8c00, name: 'Wire - Conductor (Phase)' },
  15: { color: 0xff4500, name: 'Transmission Tower' },
  16: { color: 0x00ff00, name: 'Wire-Structure Connector' },
  17: { color: 0xffc0cb, name: 'Bridge Deck' },
  18: { color: 0xff1493, name: 'High Noise' },
};

/**
 * 点云分类方案
 *
 * 管理分类颜色和可见性
 */
export class ClassificationScheme {
  private classifications = new Map<number, ClassificationConfig>();
  private texture: THREE.DataTexture;
  private needsUpdate = true;

  /**
   * 创建分类方案
   *
   * @param useDefaults - 是否使用默认 LAS 分类颜色
   */
  constructor(useDefaults = true) {
    // 创建 256x1 纹理存储分类信息
    const data = new Uint8Array(256 * 4);
    this.texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;

    if (useDefaults) {
      this.loadDefaultColors();
    } else {
      // 默认所有分类为白色,可见
      for (let i = 0; i < 256; i++) {
        this.classifications.set(i, {
          color: new THREE.Color(1, 1, 1),
          visible: true,
        });
      }
    }

    this.updateTexture();
  }

  /**
   * 加载默认 LAS 分类颜色
   */
  private loadDefaultColors(): void {
    for (let i = 0; i < 256; i++) {
      const defaultClass = DEFAULT_CLASSIFICATION_COLORS[i];
      if (defaultClass) {
        this.classifications.set(i, {
          color: new THREE.Color(defaultClass.color),
          visible: true,
          name: defaultClass.name,
        });
      } else {
        // 未定义的分类使用灰色
        this.classifications.set(i, {
          color: new THREE.Color(0x888888),
          visible: true,
        });
      }
    }
  }

  /**
   * 设置分类颜色
   *
   * @param classId - 分类 ID (0-255)
   * @param color - 颜色
   * @param name - 分类名称(可选)
   *
   * @example
   * ```ts
   * scheme.setClassColor(2, new THREE.Color(0x00ff00), 'Ground');
   * ```
   */
  setClassColor(classId: number, color: THREE.Color, name?: string): void {
    if (classId < 0 || classId > 255) {
      console.warn(`Classification ID ${classId} out of range [0, 255]`);
      return;
    }

    const config = this.classifications.get(classId) ?? {
      color: new THREE.Color(),
      visible: true,
    };

    config.color = color.clone();
    if (name !== undefined) {
      config.name = name;
    }

    this.classifications.set(classId, config);
    this.needsUpdate = true;
  }

  /**
   * 设置分类可见性
   *
   * @param classId - 分类 ID
   * @param visible - 是否可见
   *
   * @example
   * ```ts
   * // 隐藏噪声点
   * scheme.setClassVisible(7, false);
   * scheme.setClassVisible(18, false);
   * ```
   */
  setClassVisible(classId: number, visible: boolean): void {
    if (classId < 0 || classId > 255) {
      console.warn(`Classification ID ${classId} out of range [0, 255]`);
      return;
    }

    const config = this.classifications.get(classId) ?? {
      color: new THREE.Color(1, 1, 1),
      visible: true,
    };

    config.visible = visible;
    this.classifications.set(classId, config);
    this.needsUpdate = true;
  }

  /**
   * 获取分类配置
   *
   * @param classId - 分类 ID
   * @returns 分类配置,如果不存在返回 undefined
   */
  getClassConfig(classId: number): ClassificationConfig | undefined {
    return this.classifications.get(classId);
  }

  /**
   * 批量设置分类可见性
   *
   * @param visibility - 分类 ID 到可见性的映射
   *
   * @example
   * ```ts
   * scheme.setMultipleVisibility({
   *   2: true,  // 显示地面
   *   7: false, // 隐藏低噪声
   *   18: false // 隐藏高噪声
   * });
   * ```
   */
  setMultipleVisibility(visibility: Record<number, boolean>): void {
    for (const [classId, visible] of Object.entries(visibility)) {
      this.setClassVisible(Number(classId), visible);
    }
  }

  /**
   * 批量设置分类颜色
   *
   * @param colors - 分类 ID 到颜色的映射
   */
  setMultipleColors(colors: Record<number, THREE.Color>): void {
    for (const [classId, color] of Object.entries(colors)) {
      this.setClassColor(Number(classId), color);
    }
  }

  /**
   * 重置为默认分类方案
   */
  resetToDefaults(): void {
    this.classifications.clear();
    this.loadDefaultColors();
    this.needsUpdate = true;
  }

  /**
   * 获取分类纹理
   *
   * 纹理格式:
   * - RGBA, 256x1
   * - RGB: 分类颜色 (0-255)
   * - A: 可见性 (255=可见, 0=不可见)
   *
   * @returns 分类 LUT 纹理
   */
  getTexture(): THREE.DataTexture {
    if (this.needsUpdate) {
      this.updateTexture();
    }
    return this.texture;
  }

  /**
   * 更新纹理数据
   *
   * @internal
   */
  private updateTexture(): void {
    const data = this.texture.image.data;

    for (let i = 0; i < 256; i++) {
      const config = this.classifications.get(i);
      const offset = i * 4;

      if (config) {
        // RGB: 颜色 (0-255)
        data[offset] = Math.floor(config.color.r * 255);
        data[offset + 1] = Math.floor(config.color.g * 255);
        data[offset + 2] = Math.floor(config.color.b * 255);

        // A: 可见性
        data[offset + 3] = config.visible ? 255 : 0;
      } else {
        // 默认灰色,可见
        data[offset] = 136;
        data[offset + 1] = 136;
        data[offset + 2] = 136;
        data[offset + 3] = 255;
      }
    }

    this.texture.needsUpdate = true;
    this.needsUpdate = false;
  }

  /**
   * 导出分类方案配置
   *
   * @returns 分类配置对象
   */
  export(): Record<number, ClassificationConfig> {
    const result: Record<number, ClassificationConfig> = {};
    for (const [classId, config] of this.classifications) {
      const exported: ClassificationConfig = {
        color: config.color.clone(),
        visible: config.visible,
      };
      if (config.name !== undefined) {
        exported.name = config.name;
      }
      result[classId] = exported;
    }
    return result;
  }

  /**
   * 导入分类方案配置
   *
   * @param config - 分类配置对象
   */
  import(config: Record<number, ClassificationConfig>): void {
    this.classifications.clear();

    for (const [classId, classConfig] of Object.entries(config)) {
      const imported: ClassificationConfig = {
        color: classConfig.color.clone(),
        visible: classConfig.visible,
      };
      if (classConfig.name !== undefined) {
        imported.name = classConfig.name;
      }
      this.classifications.set(Number(classId), imported);
    }

    this.needsUpdate = true;
  }

  /**
   * 获取所有分类 ID
   *
   * @returns 分类 ID 数组
   */
  getAllClassIds(): number[] {
    return Array.from(this.classifications.keys());
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.texture.dispose();
    this.classifications.clear();
  }
}
