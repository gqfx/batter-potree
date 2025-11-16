/**
 * Three.js 渲染系统实现
 *
 * 提供基于 Three.js 的渲染系统，继承自 @better-potree/rendering 的 RenderSystem。
 *
 * @example
 * ```ts
 * import { ThreeRenderSystem } from '@better-potree/rendering-three';
 * import * as THREE from 'three';
 *
 * const canvas = document.getElementById('canvas') as HTMLCanvasElement;
 * const renderer = new ThreeJsRenderer({ canvas });
 * const renderSystem = new ThreeRenderSystem(renderer);
 *
 * // 添加到系统调度器
 * scheduler.addSystem(renderSystem);
 * ```
 *
 * @packageDocumentation
 */

import { RenderSystem } from '@better-potree/rendering';
import type { IRenderer, RenderSystemConfig } from '@better-potree/rendering';
import * as THREE from 'three';

/**
 * Three.js 渲染系统配置
 */
export interface ThreeRenderSystemConfig extends RenderSystemConfig {
  /** Three.js 场景实例 */
  readonly scene?: THREE.Scene;
  /** Three.js 相机实例 */
  readonly camera?: THREE.Camera;
}

/**
 * Three.js 渲染系统
 *
 * 继承自抽象的 RenderSystem，实现了具体的 Three.js 渲染逻辑。
 *
 * @remarks
 * 该系统负责：
 * - 管理 Three.js 的场景和相机
 * - 执行每帧的渲染调用
 * - 处理渲染队列中的对象
 * - 提供 Three.js 特定的渲染优化
 */
export class ThreeRenderSystem extends RenderSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  /**
   * 创建 Three.js 渲染系统
   *
   * @param renderer - 渲染器实例
   * @param config - 系统配置
   */
  constructor(renderer: IRenderer, config: ThreeRenderSystemConfig = {}) {
    super('three-render', renderer, config);

    // 初始化场景和相机
    this.scene = config.scene || new THREE.Scene();
    this.camera = config.camera || new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  }

  /**
   * 获取 Three.js 场景
   *
   * @returns Three.js 场景实例
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * 设置 Three.js 场景
   *
   * @param scene - Three.js 场景实例
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * 获取 Three.js 相机
   *
   * @returns Three.js 相机实例
   */
  getCamera(): THREE.Camera {
    return this.camera;
  }

  /**
   * 设置 Three.js 相机
   *
   * @param camera - Three.js 相机实例
   */
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  /**
   * 初始化钩子
   *
   * @override
   */
  protected onInitialize(): void {
    // Three.js 特定的初始化逻辑
    super.onInitialize();
  }

  /**
   * 执行渲染
   *
   * @param _deltaTime - 距离上一帧的时间（秒）
   * @override
   */
  protected onRender(_deltaTime: number): void {
    // 排序渲染队列（如果启用）
    if (this.config.depthSort) {
      this.sortRenderQueue();
    }

    // 更新相机矩阵
    this.camera.updateMatrixWorld();

    // 将视图和投影矩阵同步到渲染器
    const viewMatrix = this.camera.matrixWorldInverse.elements;
    const projectionMatrix = (this.camera as THREE.PerspectiveCamera).projectionMatrix
      .elements;

    this.renderer.setViewMatrix(viewMatrix as any);
    this.renderer.setProjectionMatrix(projectionMatrix as any);

    // 渲染不透明对象
    for (const object of this.renderQueue.opaque) {
      if (!object.visible) continue;
      this.renderer.render(object.buffer, object.material, object.modelMatrix);
    }

    // 渲染透明对象
    for (const object of this.renderQueue.transparent) {
      if (!object.visible) continue;
      this.renderer.render(object.buffer, object.material, object.modelMatrix);
    }
  }

  /**
   * 销毁钩子
   *
   * @override
   */
  protected onDestroy(): void {
    // 清理 Three.js 资源
    this.scene.clear();
    super.onDestroy();
  }
}
