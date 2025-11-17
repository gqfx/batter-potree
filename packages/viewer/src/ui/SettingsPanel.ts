/**
 * 设置面板 UI 组件
 *
 * 提供点云渲染参数的交互式控制
 *
 * @module ui
 * @example
 * ```ts
 * const panel = new SettingsPanel(viewer);
 * panel.show();
 * ```
 */

import type { PointCloudViewer } from '../PointCloudViewer.js';

/**
 * 设置面板配置
 */
export interface SettingsPanelConfig {
  /** 容器元素（可选，默认添加到 body） */
  readonly container?: HTMLElement;
  /** 位置 */
  readonly position?: 'left' | 'right';
}

/**
 * 设置面板
 *
 * 提供参数控制界面
 */
export class SettingsPanel {
  private viewer: PointCloudViewer;
  private config: Required<SettingsPanelConfig>;
  private element: HTMLElement | null = null;

  /**
   * 创建设置面板
   *
   * @param viewer - 点云查看器
   * @param config - 配置选项
   */
  constructor(viewer: PointCloudViewer, config: SettingsPanelConfig = {}) {
    this.viewer = viewer;
    this.config = {
      container: config.container ?? document.body,
      position: config.position ?? 'right',
    };
  }

  /**
   * 显示面板
   */
  show(): void {
    if (this.element) return;

    this.element = this.createElement();
    this.config.container.appendChild(this.element);

    this.setupEventListeners();
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    if (!this.element) return;

    this.config.container.removeChild(this.element);
    this.element = null;
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
    div.className = 'bp-settings-panel';
    div.style.cssText = this.getPositionStyles();

    div.innerHTML = `
      <div style="background: rgba(0,0,0,0.8); color: #fff; padding: 15px; border-radius: 4px; font-family: sans-serif; font-size: 12px; width: 200px;">
        <div style="margin-bottom: 10px; font-weight: bold; font-size: 14px;">Settings</div>

        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">Point Budget</label>
          <input type="range" data-setting="pointBudget" min="100000" max="5000000" step="100000" value="1000000" style="width: 100%;">
          <span data-value="pointBudget">1M</span>
        </div>

        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">Point Size</label>
          <input type="range" data-setting="pointSize" min="0.1" max="10" step="0.1" value="1" style="width: 100%;">
          <span data-value="pointSize">1.0</span>
        </div>

        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px;">Auto Rotate</label>
          <input type="checkbox" data-setting="autoRotate">
        </div>
      </div>
    `;

    return div;
  }

  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    if (!this.element) return;

    // Point Budget slider
    const budgetSlider = this.element.querySelector(
      '[data-setting="pointBudget"]',
    ) as HTMLInputElement;
    const budgetValue = this.element.querySelector('[data-value="pointBudget"]');
    if (budgetSlider && budgetValue) {
      budgetSlider.addEventListener('input', () => {
        const value = parseInt(budgetSlider.value, 10);
        this.viewer.setPointBudget(value);
        budgetValue.textContent = this.formatNumber(value);
      });
    }

    // Point Size slider (placeholder - would need material access)
    const sizeSlider = this.element.querySelector('[data-setting="pointSize"]') as HTMLInputElement;
    const sizeValue = this.element.querySelector('[data-value="pointSize"]');
    if (sizeSlider && sizeValue) {
      sizeSlider.addEventListener('input', () => {
        const value = parseFloat(sizeSlider.value);
        sizeValue.textContent = value.toFixed(1);
        // Would update material here
      });
    }
  }

  /**
   * 获取位置样式
   */
  private getPositionStyles(): string {
    const base = 'position: absolute; top: 10px; z-index: 1000;';

    switch (this.config.position) {
      case 'left':
        return `${base} left: 10px;`;
      case 'right':
        return `${base} right: 10px;`;
    }
  }

  /**
   * 格式化数字
   */
  private formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(0)}K`;
    }
    return `${num}`;
  }
}
