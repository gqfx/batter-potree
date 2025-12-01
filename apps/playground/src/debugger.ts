/**
 * Debug System for Better Potree Playground
 *
 * 提供详细的日志记录和问题诊断功能
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export enum LogCategory {
  INIT = 'INIT',           // 初始化相关
  LOADER = 'LOADER',       // 点云加载相关
  RENDER = 'RENDER',       // 渲染相关
  TRAVERSAL = 'TRAVERSAL', // 遍历系统相关
  STREAMING = 'STREAMING', // 流式加载相关
  NETWORK = 'NETWORK',     // 网络请求相关
  VIEWER = 'VIEWER',       // Viewer API 相关
  CAMERA = 'CAMERA',       // 相机和控制器相关
  PERFORMANCE = 'PERF',    // 性能监控
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  stack?: string;
}

interface DebugStats {
  // 点云加载统计
  totalPointClouds: number;
  loadedNodes: number;
  visibleNodes: number;
  visiblePoints: number;

  // 性能统计
  fps: number;
  frameTime: number;
  renderTime: number;

  // 网络统计
  pendingRequests: number;
  completedRequests: number;
  failedRequests: number;
  totalBytesLoaded: number;

  // 相机统计
  cameraPosition: { x: number; y: number; z: number };
  cameraDistance: number;
}

class DebugSystem {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private logLevel: LogLevel = LogLevel.DEBUG;
  private enabledCategories: Set<LogCategory> = new Set(Object.values(LogCategory));
  private stats: DebugStats = this.getEmptyStats();

  // UI 元素
  private debugPanel: HTMLElement | null = null;
  private isVisible = false;

  // 性能监控
  private frameStartTime = 0;
  private frameTimes: number[] = [];

  constructor() {
    this.createDebugPanel();
    this.setupKeyboardShortcuts();
  }

  private getEmptyStats(): DebugStats {
    return {
      totalPointClouds: 0,
      loadedNodes: 0,
      visibleNodes: 0,
      visiblePoints: 0,
      fps: 0,
      frameTime: 0,
      renderTime: 0,
      pendingRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      totalBytesLoaded: 0,
      cameraPosition: { x: 0, y: 0, z: 0 },
      cameraDistance: 0,
    };
  }

  /**
   * 创建调试面板 UI
   */
  private createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 400px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      overflow-y: auto;
      z-index: 10000;
      display: none;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    `;

    panel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #444; padding-bottom: 8px;">
        <h3 style="margin: 0; color: #4CAF50;">🐛 Debug Panel</h3>
        <div>
          <button id="debug-clear-logs" style="margin-right: 5px; padding: 2px 8px; cursor: pointer; background: #555; color: #fff; border: none; border-radius: 3px;">清空</button>
          <button id="debug-export-logs" style="margin-right: 5px; padding: 2px 8px; cursor: pointer; background: #555; color: #fff; border: none; border-radius: 3px;">导出</button>
          <button id="debug-close" style="padding: 2px 8px; cursor: pointer; background: #d32f2f; color: #fff; border: none; border-radius: 3px;">关闭</button>
        </div>
      </div>

      <div id="debug-stats" style="margin-bottom: 10px; padding: 8px; background: rgba(255, 255, 255, 0.05); border-radius: 3px;">
        <div style="font-weight: bold; margin-bottom: 5px; color: #FFD700;">📊 实时统计</div>
        <div id="debug-stats-content" style="font-size: 11px; line-height: 1.5;"></div>
      </div>

      <div style="margin-bottom: 10px;">
        <div style="font-weight: bold; margin-bottom: 5px; color: #FFD700;">🔧 日志过滤</div>
        <div id="debug-filters" style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 5px;"></div>
        <div style="display: flex; gap: 5px;">
          <select id="debug-level" style="flex: 1; padding: 3px; background: #333; color: #fff; border: 1px solid #555; border-radius: 3px;">
            <option value="0">DEBUG</option>
            <option value="1">INFO</option>
            <option value="2">WARN</option>
            <option value="3">ERROR</option>
          </select>
        </div>
      </div>

      <div id="debug-logs" style="max-height: 400px; overflow-y: auto; font-size: 11px; line-height: 1.4;"></div>

      <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #444; font-size: 10px; color: #888;">
        按 Ctrl+D 或 Cmd+D 切换调试面板 | 共 <span id="debug-log-count">0</span> 条日志
      </div>
    `;

    document.body.appendChild(panel);
    this.debugPanel = panel;

    // 设置事件监听
    document.getElementById('debug-close')?.addEventListener('click', () => this.hide());
    document.getElementById('debug-clear-logs')?.addEventListener('click', () => this.clearLogs());
    document.getElementById('debug-export-logs')?.addEventListener('click', () => this.exportLogs());
    document.getElementById('debug-level')?.addEventListener('change', (e) => {
      this.logLevel = parseInt((e.target as HTMLSelectElement).value);
      this.renderLogs();
    });

    // 创建分类过滤按钮
    this.createCategoryFilters();
  }

  /**
   * 创建日志分类过滤按钮
   */
  private createCategoryFilters() {
    const container = document.getElementById('debug-filters');
    if (!container) return;

    Object.values(LogCategory).forEach(category => {
      const button = document.createElement('button');
      button.textContent = category;
      button.style.cssText = `
        padding: 3px 8px;
        font-size: 10px;
        cursor: pointer;
        background: #4CAF50;
        color: #fff;
        border: none;
        border-radius: 3px;
        transition: background 0.2s;
      `;
      button.dataset.category = category;

      button.addEventListener('click', () => {
        if (this.enabledCategories.has(category)) {
          this.enabledCategories.delete(category);
          button.style.background = '#555';
        } else {
          this.enabledCategories.add(category);
          button.style.background = '#4CAF50';
        }
        this.renderLogs();
      });

      container.appendChild(button);
    });
  }

  /**
   * 设置键盘快捷键
   */
  private setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl+D 或 Cmd+D 切换调试面板
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * 记录日志
   */
  log(level: LogLevel, category: LogCategory, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: performance.now(),
      level,
      category,
      message,
      data,
    };

    // 如果是错误，捕获堆栈
    if (level === LogLevel.ERROR) {
      const stack = new Error().stack;
      if (stack !== undefined) {
        entry.stack = stack;
      }
    }

    this.logs.push(entry);

    // 限制日志数量
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 同时输出到浏览器控制台
    this.logToConsole(entry);

    // 更新 UI
    if (this.isVisible) {
      this.renderLogs();
    }
  }

  /**
   * 输出到浏览器控制台
   */
  private logToConsole(entry: LogEntry) {
    const prefix = `[${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data || '');
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  /**
   * 便捷方法
   */
  debug(category: LogCategory, message: string, data?: any) {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: LogCategory, message: string, data?: any) {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any) {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: LogCategory, message: string, data?: any) {
    this.log(LogLevel.ERROR, category, message, data);
  }

  /**
   * 更新统计信息
   */
  updateStats(stats: Partial<DebugStats>) {
    this.stats = { ...this.stats, ...stats };
    if (this.isVisible) {
      this.renderStats();
    }
  }

  /**
   * 渲染统计信息
   */
  private renderStats() {
    const container = document.getElementById('debug-stats-content');
    if (!container) return;

    const s = this.stats;
    container.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px;">
        <div><strong>FPS:</strong> ${s.fps}</div>
        <div><strong>帧时间:</strong> ${s.frameTime.toFixed(2)}ms</div>
        <div><strong>点云数:</strong> ${s.totalPointClouds}</div>
        <div><strong>可见节点:</strong> ${s.visibleNodes}</div>
        <div><strong>可见点:</strong> ${s.visiblePoints.toLocaleString()}</div>
        <div><strong>已加载节点:</strong> ${s.loadedNodes}</div>
        <div><strong>网络请求:</strong> ${s.pendingRequests}/${s.completedRequests}</div>
        <div><strong>失败请求:</strong> ${s.failedRequests}</div>
        <div><strong>已加载:</strong> ${(s.totalBytesLoaded / 1024 / 1024).toFixed(2)}MB</div>
        <div style="grid-column: 1 / -1;"><strong>相机:</strong> (${s.cameraPosition.x.toFixed(1)}, ${s.cameraPosition.y.toFixed(1)}, ${s.cameraPosition.z.toFixed(1)})</div>
      </div>
    `;
  }

  /**
   * 渲染日志
   */
  private renderLogs() {
    const container = document.getElementById('debug-logs');
    const countElement = document.getElementById('debug-log-count');
    if (!container) return;

    // 过滤日志
    const filteredLogs = this.logs.filter(
      log => log.level >= this.logLevel && this.enabledCategories.has(log.category)
    );

    if (countElement) {
      countElement.textContent = filteredLogs.length.toString();
    }

    // 渲染日志（最新的在上面）
    container.innerHTML = filteredLogs
      .slice()
      .reverse()
      .map(log => this.formatLogEntry(log))
      .join('');

    // 自动滚动到顶部
    container.scrollTop = 0;
  }

  /**
   * 格式化单条日志
   */
  private formatLogEntry(log: LogEntry): string {
    const levelColors = {
      [LogLevel.DEBUG]: '#888',
      [LogLevel.INFO]: '#4CAF50',
      [LogLevel.WARN]: '#FF9800',
      [LogLevel.ERROR]: '#f44336',
    };

    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
    };

    const timeStr = (log.timestamp / 1000).toFixed(3);
    const color = levelColors[log.level];
    const levelName = levelNames[log.level];

    let dataStr = '';
    if (log.data !== undefined) {
      try {
        dataStr = `<div style="margin-left: 10px; color: #aaa; font-size: 10px;">${JSON.stringify(log.data, null, 2)}</div>`;
      } catch {
        dataStr = `<div style="margin-left: 10px; color: #aaa; font-size: 10px;">${String(log.data)}</div>`;
      }
    }

    return `
      <div style="margin-bottom: 5px; padding: 5px; background: rgba(255,255,255,0.02); border-left: 3px solid ${color}; border-radius: 2px;">
        <div>
          <span style="color: #666;">[${timeStr}s]</span>
          <span style="color: ${color}; font-weight: bold;">[${levelName}]</span>
          <span style="color: #FFD700;">[${log.category}]</span>
          <span style="color: #fff;">${this.escapeHtml(log.message)}</span>
        </div>
        ${dataStr}
      </div>
    `;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = [];
    this.renderLogs();
  }

  /**
   * 导出日志
   */
  exportLogs() {
    const data = {
      exportTime: new Date().toISOString(),
      stats: this.stats,
      logs: this.logs,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `better-potree-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.info(LogCategory.INIT, '日志已导出');
  }

  /**
   * 显示/隐藏调试面板
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    if (this.debugPanel) {
      this.debugPanel.style.display = 'block';
      this.isVisible = true;
      this.renderLogs();
      this.renderStats();
    }
  }

  hide() {
    if (this.debugPanel) {
      this.debugPanel.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * 开始性能帧测量
   */
  startFrame() {
    this.frameStartTime = performance.now();
  }

  /**
   * 结束性能帧测量
   */
  endFrame() {
    const frameTime = performance.now() - this.frameStartTime;
    this.frameTimes.push(frameTime);

    // 保持最近 60 帧
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    // 计算平均 FPS
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;

    this.updateStats({
      fps,
      frameTime: avgFrameTime,
    });
  }
}

// 创建全局调试实例
export const debugSystem = new DebugSystem();

// 导出到 window 对象以便在控制台访问
if (typeof window !== 'undefined') {
  (window as any).debug = debugSystem;
}
