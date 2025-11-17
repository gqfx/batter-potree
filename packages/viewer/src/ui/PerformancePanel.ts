/**
 * 性能面板 UI 组件
 *
 * 显示实时性能指标（FPS、点数、内存等）
 *
 * @module ui
 * @example
 * ```ts
 * const panel = new PerformancePanel(viewer);
 * panel.show();
 *
 * // 更新统计
 * panel.update();
 *
 * // 隐藏
 * panel.hide();
 * ```
 */

import type { PointCloudViewer } from '../PointCloudViewer.js';

/**
 * 性能面板配置
 */
export interface PerformancePanelConfig {
  /** 容器元素（可选，默认添加到 body） */
  readonly container?: HTMLElement;
  /** 位置 */
  readonly position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** 更新间隔（毫秒） */
  readonly updateInterval?: number;
}

/**
 * 性能面板
 *
 * 显示实时性能统计信息
 */
export class PerformancePanel {
  private viewer: PointCloudViewer;
  private config: Required<PerformancePanelConfig>;
  private element: HTMLElement | null = null;
  private updateIntervalId: number | null = null;

  /**
   * 创建性能面板
   *
   * @param viewer - 点云查看器
   * @param config - 配置选项
   */
  constructor(viewer: PointCloudViewer, config: PerformancePanelConfig = {}) {
    this.viewer = viewer;
    this.config = {
      container: config.container ?? document.body,
      position: config.position ?? 'top-left',
      updateInterval: config.updateInterval ?? 100,
    };
  }

  /**
   * 显示面板
   */
  show(): void {
    if (this.element) return;

    this.element = this.createElement();
    this.config.container.appendChild(this.element);

    // 开始自动更新
    this.updateIntervalId = window.setInterval(() => {
      this.update();
    }, this.config.updateInterval);

    this.update();
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    if (!this.element) return;

    if (this.updateIntervalId !== null) {
      clearInterval(this.updateIntervalId);
      this.updateIntervalId = null;
    }

    this.config.container.removeChild(this.element);
    this.element = null;
  }

  /**
   * 更新统计信息
   */
  update(): void {
    if (!this.element) return;

    const stats = this.viewer.getStats();

    const fpsElement = this.element.querySelector('[data-stat="fps"]');
    const pointsElement = this.element.querySelector('[data-stat="points"]');
    const loadedElement = this.element.querySelector('[data-stat="loaded"]');
    const pendingElement = this.element.querySelector('[data-stat="pending"]');

    if (fpsElement) fpsElement.textContent = `${stats.fps}`;
    if (pointsElement) pointsElement.textContent = this.formatNumber(stats.visiblePoints);
    if (loadedElement) loadedElement.textContent = `${stats.loadedNodes}`;
    if (pendingElement) pendingElement.textContent = `${stats.pendingLoads}`;
  }

  /**
   * 销毁面板
   */
  dispose(): void {
    this.hide();
  }

  /**
   * 创建 DOM 元素
   */
  private createElement(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'bp-performance-panel';
    div.style.cssText = this.getPositionStyles();

    div.innerHTML = `
      <div style="background: rgba(0,0,0,0.7); color: #fff; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px;">
        <div style="margin-bottom: 5px; font-weight: bold;">Performance</div>
        <div>FPS: <span data-stat="fps">0</span></div>
        <div>Points: <span data-stat="points">0</span></div>
        <div>Loaded: <span data-stat="loaded">0</span></div>
        <div>Pending: <span data-stat="pending">0</span></div>
      </div>
    `;

    return div;
  }

  /**
   * 获取位置样式
   */
  private getPositionStyles(): string {
    const base = 'position: absolute; z-index: 1000;';

    switch (this.config.position) {
      case 'top-left':
        return `${base} top: 10px; left: 10px;`;
      case 'top-right':
        return `${base} top: 10px; right: 10px;`;
      case 'bottom-left':
        return `${base} bottom: 10px; left: 10px;`;
      case 'bottom-right':
        return `${base} bottom: 10px; right: 10px;`;
    }
  }

  /**
   * 格式化数字
   */
  private formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return `${num}`;
  }
}
