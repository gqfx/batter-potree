/**
 * 渲染系统抽象基类
 *
 * 定义了渲染系统的核心接口和生命周期，继承自 @better-potree/core 的 ISystem。
 *
 * @example
 * ```ts
 * class ThreeRenderSystem extends RenderSystem {
 *   private renderer: THREE.WebGLRenderer;
 *
 *   constructor(renderer: THREE.WebGLRenderer) {
 *     super('three-render');
 *     this.renderer = renderer;
 *   }
 *
 *   protected onRender(deltaTime: number): void {
 *     // 执行渲染逻辑
 *     this.renderer.render(this.scene, this.camera);
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

import type { IRenderer } from '../interfaces/IRenderer';
import type { IMaterial } from '../interfaces/IMaterial';
import type { IBuffer } from '../interfaces/IBuffer';
import type { Matrix4 } from '../types/common';

/**
 * 系统阶段枚举（与 core 包保持一致）
 */
export enum SystemStage {
  /** 初始化阶段 */
  INIT = 0,
  /** 更新阶段 */
  UPDATE = 100,
  /** 渲染阶段 */
  RENDER = 200,
  /** 清理阶段 */
  CLEANUP = 300,
}

/**
 * 系统接口（与 core 包保持一致）
 */
export interface ISystem {
  /** 系统名称 */
  readonly name: string;
  /** 系统阶段 */
  readonly stage: SystemStage;
  /** 优先级（同阶段内的相对顺序，默认 0） */
  readonly priority?: number;
  /** 更新方法 */
  update(deltaTime: number): void;
  /** 销毁方法 */
  destroy?(): void;
}

/**
 * 渲染对象
 */
export interface RenderObject {
  /** 几何缓冲区 */
  readonly buffer: IBuffer;
  /** 材质 */
  readonly material: IMaterial;
  /** 模型矩阵 */
  readonly modelMatrix: Matrix4;
  /** 是否可见 */
  readonly visible: boolean;
  /** 渲染顺序（用于透明对象排序） */
  readonly renderOrder?: number;
}

/**
 * 渲染队列
 */
export interface RenderQueue {
  /** 不透明对象 */
  readonly opaque: readonly RenderObject[];
  /** 透明对象 */
  readonly transparent: readonly RenderObject[];
}

/**
 * 渲染系统配置
 */
export interface RenderSystemConfig {
  /** 是否启用自动清除 */
  readonly autoClear?: boolean;
  /** 是否启用视锥体剔除 */
  readonly frustumCulling?: boolean;
  /** 是否启用深度排序 */
  readonly depthSort?: boolean;
}

/**
 * 渲染系统抽象基类
 *
 * 提供了渲染系统的基础框架，包括：
 * - 渲染队列管理
 * - 渲染对象的增删改查
 * - 渲染循环控制
 * - 资源管理
 *
 * 子类需要实现 `onRender` 方法来执行具体的渲染逻辑。
 */
export abstract class RenderSystem implements ISystem {
  readonly name: string;
  readonly stage = SystemStage.RENDER;
  readonly priority = 0;

  protected renderer: IRenderer;
  protected config: RenderSystemConfig;
  protected renderQueue: RenderQueue;
  protected isInitialized = false;

  /**
   * 创建渲染系统
   *
   * @param name - 系统名称
   * @param renderer - 渲染器实例
   * @param config - 系统配置
   */
  constructor(
    name: string,
    renderer: IRenderer,
    config: RenderSystemConfig = {}
  ) {
    this.name = name;
    this.renderer = renderer;
    this.config = {
      autoClear: true,
      frustumCulling: true,
      depthSort: true,
      ...config,
    };
    this.renderQueue = {
      opaque: [],
      transparent: [],
    };
  }

  /**
   * 初始化渲染系统
   */
  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.onInitialize();
    this.isInitialized = true;
  }

  /**
   * 更新渲染系统（系统调度器调用）
   *
   * @param deltaTime - 距离上一帧的时间（秒）
   */
  update(deltaTime: number): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    this.onBeforeRender(deltaTime);
    this.onRender(deltaTime);
    this.onAfterRender(deltaTime);
  }

  /**
   * 添加渲染对象
   *
   * @param object - 渲染对象
   */
  addRenderObject(object: RenderObject): void {
    const queue = object.material.getOptions().transparent
      ? (this.renderQueue.transparent as RenderObject[])
      : (this.renderQueue.opaque as RenderObject[]);

    queue.push(object);
  }

  /**
   * 移除渲染对象
   *
   * @param object - 渲染对象
   */
  removeRenderObject(object: RenderObject): void {
    const opaqueIndex = this.renderQueue.opaque.indexOf(object);
    if (opaqueIndex !== -1) {
      (this.renderQueue.opaque as RenderObject[]).splice(opaqueIndex, 1);
      return;
    }

    const transparentIndex = this.renderQueue.transparent.indexOf(object);
    if (transparentIndex !== -1) {
      (this.renderQueue.transparent as RenderObject[]).splice(
        transparentIndex,
        1
      );
    }
  }

  /**
   * 清空渲染队列
   */
  clearRenderQueue(): void {
    (this.renderQueue.opaque as RenderObject[]).length = 0;
    (this.renderQueue.transparent as RenderObject[]).length = 0;
  }

  /**
   * 获取渲染器
   *
   * @returns 渲染器实例
   */
  getRenderer(): IRenderer {
    return this.renderer;
  }

  /**
   * 销毁渲染系统
   */
  destroy(): void {
    this.clearRenderQueue();
    this.onDestroy();
    this.isInitialized = false;
  }

  /**
   * 初始化钩子（子类可重写）
   */
  protected onInitialize(): void {
    // 子类实现
  }

  /**
   * 渲染前钩子（子类可重写）
   *
   * @param _deltaTime - 距离上一帧的时间（秒）
   */
  protected onBeforeRender(_deltaTime: number): void {
    // 子类实现
    if (this.config.autoClear) {
      this.renderer.clear(true, true, false);
    }
  }

  /**
   * 渲染钩子（子类必须实现）
   *
   * @param deltaTime - 距离上一帧的时间（秒）
   */
  protected abstract onRender(deltaTime: number): void;

  /**
   * 渲染后钩子（子类可重写）
   *
   * @param _deltaTime - 距离上一帧的时间（秒）
   */
  protected onAfterRender(_deltaTime: number): void {
    // 子类实现
  }

  /**
   * 销毁钩子（子类可重写）
   */
  protected onDestroy(): void {
    // 子类实现
  }

  /**
   * 排序渲染队列
   *
   * 不透明对象按深度从前到后排序（减少 overdraw）
   * 透明对象按深度从后到前排序（正确的混合顺序）
   */
  protected sortRenderQueue(): void {
    if (!this.config.depthSort) {
      return;
    }

    const viewMatrix = this.renderer.getViewMatrix();

    // 不透明对象：前到后
    (this.renderQueue.opaque as RenderObject[]).sort((a, b) => {
      const depthA = this.computeDepth(a.modelMatrix, viewMatrix);
      const depthB = this.computeDepth(b.modelMatrix, viewMatrix);
      return depthA - depthB;
    });

    // 透明对象：后到前
    (this.renderQueue.transparent as RenderObject[]).sort((a, b) => {
      const depthA = this.computeDepth(a.modelMatrix, viewMatrix);
      const depthB = this.computeDepth(b.modelMatrix, viewMatrix);
      return depthB - depthA;
    });
  }

  /**
   * 计算对象的深度（视空间中的 Z 值）
   *
   * @param modelMatrix - 模型矩阵
   * @param viewMatrix - 视图矩阵
   * @returns 深度值
   */
  protected computeDepth(modelMatrix: Matrix4, viewMatrix: Matrix4): number {
    // 提取模型矩阵中的位置（最后一列的 xyz）
    const x = modelMatrix[12];
    const y = modelMatrix[13];
    const z = modelMatrix[14];

    // 应用视图矩阵变换到视空间
    const viewZ =
      viewMatrix[2] * x + viewMatrix[6] * y + viewMatrix[10] * z + viewMatrix[14];

    return viewZ;
  }
}
