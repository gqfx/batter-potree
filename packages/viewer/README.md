# @better-potree/viewer

高级查看器 API，是 better-potree 库的核心组件，提供了简单易用的接口来加载、渲染和交互点云数据。

## 功能特性

- **点云管理** - 加载、移除和管理多个点云实例
- **渲染控制** - 点预算、点大小、EDL（Eye-Dome Lighting）等渲染参数配置
- **相机操作** - 相机移动、视野控制、自动适配场景
- **事件系统** - 基于类型安全的事件系统，监听点云加载、渲染更新等事件
- **动画循环** - 内置请求动画帧循环，自动更新和渲染
- **响应式** - 自动处理窗口大小调整
- **截屏功能** - 支持自定义分辨率和格式的截屏导出
- **依赖注入** - 通过接口注入渲染器和场景，支持不同实现

## 安装

```bash
pnpm add @better-potree/viewer
```

## 快速开始

### 基础示例

```typescript
import { ViewerAPI } from '@better-potree/viewer';
import { ThreeRenderer } from '@better-potree/rendering-three';
import { ThreeScene } from '@better-potree/rendering-three';

// 创建查看器
const viewer = new ViewerAPI({
  container: document.getElementById('viewer-container')!,
  renderer: new ThreeRenderer(),
  scene: new ThreeScene(),
  pointBudget: 1_000_000,
  pointSize: 1.5,
  edlEnabled: true,
  backgroundColor: 0x000000,
});

// 监听事件
viewer.on('pointcloud-loaded', ({ pointCloud, name }) => {
  console.log(`点云已加载: ${name}`);
  viewer.fitToScreen(pointCloud);
});

// 加载点云（需要 loader 支持）
// const pointCloud = await viewer.load('path/to/cloud.json');

// 启动动画循环
viewer.startAnimation();

// 清理
// viewer.destroy();
```

### 配置选项

```typescript
import { ViewerAPI } from '@better-potree/viewer';
import type { ViewerConfig } from '@better-potree/viewer';

const config: ViewerConfig = {
  container: document.getElementById('viewer')!,
  renderer: new ThreeRenderer(),
  scene: new ThreeScene(),

  // 可选配置
  camera: customCamera,           // 自定义相机
  pointBudget: 2_000_000,        // 每帧最大点数
  pointSize: 2.0,                // 点大小
  fov: 60,                       // 视野角度

  // EDL 配置
  edlEnabled: true,              // 启用 EDL
  edlRadius: 1.4,                // EDL 半径
  edlStrength: 0.4,              // EDL 强度

  backgroundColor: 0x202020,     // 背景色
  showStats: false,              // 显示统计信息
};

const viewer = new ViewerAPI(config);
```

## API 参考

### 类

#### `Viewer`

核心查看器类，管理点云的加载、渲染和交互。

**构造函数:**

```typescript
constructor(config: ViewerConfig)
```

**参数:**
- `config` - 查看器配置对象，详见 `ViewerConfig` 接口

**示例:**

```typescript
const viewer = new Viewer({
  container: document.getElementById('viewer')!,
  renderer: new ThreeRenderer(),
  scene: new ThreeScene(),
});
```

#### `ViewerAPI`

扩展的查看器类，提供更多高级 API 方法。继承自 `Viewer`。

**构造函数:**

```typescript
constructor(config: ViewerConfig)
```

**示例:**

```typescript
const viewer = new ViewerAPI({
  container: document.getElementById('viewer')!,
  renderer: new ThreeRenderer(),
  scene: new ThreeScene(),
});
```

### 主要方法

#### 点云管理

##### `load(url: string, name?: string): Promise<IPointCloudOctree>`

加载点云数据。

**参数:**
- `url` - 点云元数据 URL
- `name` - 可选的点云名称

**返回值:**
- `Promise<IPointCloudOctree>` - 加载的点云对象

**注意:** 此功能需要 loader 系统支持（Phase 3 实现）。

**示例:**

```typescript
try {
  const pointCloud = await viewer.load('cloud.json', 'my-cloud');
  console.log('点云已加载');
} catch (error) {
  console.error('加载失败:', error);
}
```

##### `remove(pointCloud: IPointCloudOctree | string): void`

移除点云。

**参数:**
- `pointCloud` - 点云对象或名称

**示例:**

```typescript
viewer.remove('my-cloud');
// 或
viewer.remove(pointCloudObject);
```

##### `getPointClouds(): IPointCloudOctree[]`

获取所有已加载的点云。

**返回值:**
- `IPointCloudOctree[]` - 点云数组

**示例:**

```typescript
const clouds = viewer.getPointClouds();
console.log(`已加载 ${clouds.length} 个点云`);
```

##### `getPointCloud(name: string): IPointCloudOctree | undefined`

根据名称获取点云。

**参数:**
- `name` - 点云名称

**返回值:**
- `IPointCloudOctree | undefined` - 点云对象或 undefined

**示例:**

```typescript
const cloud = viewer.getPointCloud('my-cloud');
if (cloud) {
  console.log('找到点云');
}
```

#### 渲染控制

##### `setPointBudget(budget: number): void`

设置点预算（每帧渲染的最大点数）。

**参数:**
- `budget` - 点预算值（最小 100,000）

**示例:**

```typescript
viewer.setPointBudget(2_000_000);
```

##### `getPointBudget(): number`

获取当前点预算。

**返回值:**
- `number` - 点预算值

##### `setPointSize(size: number): void`

设置点大小。

**参数:**
- `size` - 点大小（最小 0.1）

**示例:**

```typescript
viewer.setPointSize(2.5);
```

##### `getPointSize(): number`

获取当前点大小。

**返回值:**
- `number` - 点大小值

##### `setBackground(color: THREE.ColorRepresentation): void`

设置背景颜色。

**参数:**
- `color` - Three.js 颜色表示（数字、字符串或 Color 对象）

**示例:**

```typescript
viewer.setBackground(0xff0000);      // 红色
viewer.setBackground('#00ff00');     // 绿色
viewer.setBackground('blue');        // 蓝色
```

##### `getBackground(): THREE.Color`

获取当前背景颜色。

**返回值:**
- `THREE.Color` - 背景颜色对象

#### EDL（Eye-Dome Lighting）

##### `setEDLEnabled(enabled: boolean): void`

启用或禁用 EDL。

**参数:**
- `enabled` - 是否启用 EDL

**示例:**

```typescript
viewer.setEDLEnabled(true);
```

##### `setEDLConfig(config: Partial<EDLConfig>): void`

设置 EDL 配置。

**参数:**
- `config` - EDL 配置对象（可部分配置）

**示例:**

```typescript
viewer.setEDLConfig({
  enabled: true,
  radius: 2.0,
  strength: 0.6,
});
```

##### `getEDLConfig(): EDLConfig`

获取当前 EDL 配置。

**返回值:**
- `EDLConfig` - EDL 配置对象

#### 相机操作 (ViewerAPI)

##### `moveCameraTo(position: THREE.Vector3, target?: THREE.Vector3, duration?: number): void`

移动相机到指定位置。

**参数:**
- `position` - 目标位置
- `target` - 可选的观察目标
- `duration` - 动画时长（毫秒），0 表示立即移动

**示例:**

```typescript
const position = new THREE.Vector3(10, 10, 10);
const target = new THREE.Vector3(0, 0, 0);

// 立即移动
viewer.moveCameraTo(position, target, 0);

// 动画移动（暂未实现）
// viewer.moveCameraTo(position, target, 1000);
```

##### `setFOV(fov: number): void`

设置透视相机的视野角度。

**参数:**
- `fov` - 视野角度（度）

**示例:**

```typescript
viewer.setFOV(75);
```

##### `getFOV(): number | undefined`

获取透视相机的视野角度。

**返回值:**
- `number | undefined` - 视野角度或 undefined（非透视相机）

##### `fitToScreen(pointCloud?: any, options?: FitToScreenOptions): void`

将相机调整到适合查看所有（或指定）点云的位置。

**参数:**
- `pointCloud` - 可选的特定点云
- `options` - 适配选项

**示例:**

```typescript
// 适配所有点云
viewer.fitToScreen();

// 适配特定点云，自定义边距
viewer.fitToScreen(pointCloud, {
  padding: 1.5,
  duration: 1000,
});
```

##### `setNavigation(mode: NavigationMode, options?: NavigationOptions): void`

设置导航模式。

**参数:**
- `mode` - 导航模式 ('orbit' | 'fly' | 'earth' | 'fps')
- `options` - 导航选项

**示例:**

```typescript
viewer.setNavigation('orbit', {
  speed: 1.5,
  enableRotation: true,
  enablePanning: true,
  enableZooming: true,
});
```

#### 截屏功能 (ViewerAPI)

##### `screenshot(options?: ScreenshotOptions): string`

生成截屏并返回 data URL。

**参数:**
- `options` - 截屏选项

**返回值:**
- `string` - 图片的 data URL

**示例:**

```typescript
// 默认配置（PNG，当前分辨率）
const dataUrl = viewer.screenshot();

// 自定义分辨率和格式
const dataUrl = viewer.screenshot({
  width: 1920,
  height: 1080,
  format: 'image/jpeg',
  quality: 0.9,
});
```

##### `downloadScreenshot(filename?: string, options?: ScreenshotOptions): void`

下载截屏到本地。

**参数:**
- `filename` - 文件名（默认 'screenshot.png'）
- `options` - 截屏选项

**示例:**

```typescript
viewer.downloadScreenshot('my-scene.png', {
  width: 2560,
  height: 1440,
  format: 'image/png',
});
```

#### 渲染循环

##### `render(): void`

渲染单帧。

**示例:**

```typescript
viewer.render();
```

##### `startAnimation(): void`

启动动画循环。

**示例:**

```typescript
viewer.startAnimation();
```

##### `stopAnimation(): void`

停止动画循环。

**示例:**

```typescript
viewer.stopAnimation();
```

#### 访问器方法

##### `getCamera(): THREE.Camera`

获取相机对象。

**返回值:**
- `THREE.Camera` - 相机对象

##### `getScene(): IScene`

获取场景对象。

**返回值:**
- `IScene` - 场景对象

##### `getRenderer(): IRenderer`

获取渲染器对象。

**返回值:**
- `IRenderer` - 渲染器对象

#### 生命周期

##### `destroy(): void`

销毁查看器并清理所有资源。

**示例:**

```typescript
viewer.destroy();
```

### 接口和类型

#### `ViewerConfig`

查看器配置接口。

```typescript
interface ViewerConfig {
  container: HTMLElement;           // 容器元素
  renderer: IRenderer;              // 渲染器实现
  scene: IScene;                    // 场景实现
  camera?: THREE.Camera;            // 可选的自定义相机
  pointBudget?: number;             // 点预算（默认 1,000,000）
  pointSize?: number;               // 点大小（默认 1.0）
  fov?: number;                     // 视野角度（默认 60）
  edlEnabled?: boolean;             // EDL 启用（默认 true）
  edlRadius?: number;               // EDL 半径（默认 1.4）
  edlStrength?: number;             // EDL 强度（默认 0.4）
  backgroundColor?: THREE.ColorRepresentation;  // 背景色（默认 0x000000）
  showStats?: boolean;              // 显示统计信息（默认 false）
}
```

#### `NavigationOptions`

导航选项接口。

```typescript
interface NavigationOptions {
  speed?: number;                   // 速度倍数
  enableRotation?: boolean;         // 启用旋转
  enablePanning?: boolean;          // 启用平移
  enableZooming?: boolean;          // 启用缩放
}
```

#### `FitToScreenOptions`

适配屏幕选项接口。

```typescript
interface FitToScreenOptions {
  padding?: number;                 // 边距系数（0-1）
  duration?: number;                // 动画时长（毫秒）
}
```

#### `ScreenshotOptions`

截屏选项接口。

```typescript
interface ScreenshotOptions {
  width?: number;                   // 宽度（像素）
  height?: number;                  // 高度（像素）
  format?: 'image/png' | 'image/jpeg' | 'image/webp';  // 图片格式
  quality?: number;                 // JPEG 质量（0-1）
}
```

### 事件

查看器使用类型安全的事件系统。所有事件都可以通过 `on` 方法订阅。

#### `pointcloud-loaded`

点云加载完成时触发。

```typescript
viewer.on('pointcloud-loaded', ({ pointCloud, name }) => {
  console.log(`已加载点云: ${name}`);
});
```

#### `pointcloud-removed`

点云移除时触发。

```typescript
viewer.on('pointcloud-removed', ({ pointCloud, name }) => {
  console.log(`已移除点云: ${name}`);
});
```

#### `camera-changed`

相机变化时触发。

```typescript
viewer.on('camera-changed', ({ camera, position, target }) => {
  console.log('相机位置:', position);
});
```

#### `navigation-changed`

导航模式变化时触发。

```typescript
viewer.on('navigation-changed', ({ mode }) => {
  console.log('导航模式:', mode);
});
```

#### `point-budget-changed`

点预算变化时触发。

```typescript
viewer.on('point-budget-changed', ({ budget }) => {
  console.log('点预算:', budget);
});
```

#### `point-size-changed`

点大小变化时触发。

```typescript
viewer.on('point-size-changed', ({ size }) => {
  console.log('点大小:', size);
});
```

#### `background-changed`

背景颜色变化时触发。

```typescript
viewer.on('background-changed', ({ color }) => {
  console.log('背景色:', color.getHexString());
});
```

#### `edl-changed`

EDL 配置变化时触发。

```typescript
viewer.on('edl-changed', ({ enabled, radius, strength }) => {
  console.log('EDL 配置已更新');
});
```

#### `update`

每帧更新前触发（在渲染之前）。

```typescript
viewer.on('update', ({ deltaTime, timestamp }) => {
  // 更新逻辑
});
```

#### `render`

每帧渲染后触发。

```typescript
viewer.on('render', ({ deltaTime, timestamp }) => {
  // 渲染后逻辑
});
```

#### `destroy`

查看器销毁时触发。

```typescript
viewer.on('destroy', () => {
  console.log('查看器已销毁');
});
```

## 使用示例

### 完整示例

```typescript
import { ViewerAPI } from '@better-potree/viewer';
import { ThreeRenderer, ThreeScene } from '@better-potree/rendering-three';
import * as THREE from 'three';

// 创建查看器
const viewer = new ViewerAPI({
  container: document.getElementById('viewer')!,
  renderer: new ThreeRenderer(),
  scene: new ThreeScene(),
  pointBudget: 1_500_000,
  pointSize: 1.5,
  fov: 75,
  edlEnabled: true,
  edlRadius: 1.4,
  edlStrength: 0.4,
  backgroundColor: 0x303030,
});

// 配置事件监听
viewer.on('pointcloud-loaded', ({ pointCloud, name }) => {
  console.log(`点云 ${name} 加载完成`);

  // 自动适配视图
  viewer.fitToScreen(pointCloud, { padding: 1.2 });
});

viewer.on('update', ({ deltaTime }) => {
  // 自定义更新逻辑
});

viewer.on('render', ({ deltaTime }) => {
  // 渲染后处理
});

// 加载点云
async function loadPointCloud() {
  try {
    const cloud = await viewer.load('data/cloud.json', 'main-cloud');
    console.log('加载成功');
  } catch (error) {
    console.error('加载失败:', error);
  }
}

// 启动渲染循环
viewer.startAnimation();

// UI 控制
document.getElementById('btn-screenshot')?.addEventListener('click', () => {
  viewer.downloadScreenshot('scene.png', {
    width: 1920,
    height: 1080,
  });
});

document.getElementById('slider-point-size')?.addEventListener('input', (e) => {
  const size = parseFloat((e.target as HTMLInputElement).value);
  viewer.setPointSize(size);
});

document.getElementById('slider-point-budget')?.addEventListener('input', (e) => {
  const budget = parseInt((e.target as HTMLInputElement).value);
  viewer.setPointBudget(budget);
});

// 清理
window.addEventListener('beforeunload', () => {
  viewer.destroy();
});
```

### 自定义相机控制

```typescript
import { ViewerAPI } from '@better-potree/viewer';
import * as THREE from 'three';

const viewer = new ViewerAPI({
  container: document.getElementById('viewer')!,
  renderer: new ThreeRenderer(),
  scene: new ThreeScene(),
});

// 设置导航模式
viewer.setNavigation('orbit', {
  speed: 1.0,
  enableRotation: true,
  enablePanning: true,
  enableZooming: true,
});

// 移动到预设位置
const positions = {
  front: new THREE.Vector3(0, 0, 100),
  top: new THREE.Vector3(0, 100, 0),
  side: new THREE.Vector3(100, 0, 0),
};

const target = new THREE.Vector3(0, 0, 0);

// 切换视角
function setView(view: 'front' | 'top' | 'side') {
  viewer.moveCameraTo(positions[view], target, 0);
}

setView('front');
```

### 动态调整渲染参数

```typescript
import { ViewerAPI } from '@better-potree/viewer';

const viewer = new ViewerAPI({
  container: document.getElementById('viewer')!,
  renderer: new ThreeRenderer(),
  scene: new ThreeScene(),
});

// 根据性能动态调整点预算
let fps = 60;
viewer.on('render', ({ deltaTime }) => {
  fps = 1000 / deltaTime;

  if (fps < 30) {
    // 降低点预算以提高性能
    const currentBudget = viewer.getPointBudget();
    viewer.setPointBudget(Math.max(100_000, currentBudget * 0.9));
  } else if (fps > 55) {
    // 提高点预算以改善质量
    const currentBudget = viewer.getPointBudget();
    viewer.setPointBudget(Math.min(5_000_000, currentBudget * 1.1));
  }
});
```

### 响应式布局处理

```typescript
import { ViewerAPI } from '@better-potree/viewer';

const viewer = new ViewerAPI({
  container: document.getElementById('viewer')!,
  renderer: new ThreeRenderer(),
  scene: new ThreeScene(),
});

// 查看器内部已处理 window resize 事件
// 但如果需要自定义响应逻辑：
window.addEventListener('resize', () => {
  // 查看器会自动更新相机和渲染器尺寸
  // 可以在这里添加额外的响应逻辑

  const container = document.getElementById('viewer')!;
  console.log(`容器尺寸: ${container.clientWidth}x${container.clientHeight}`);
});
```

## 依赖关系

此包依赖以下 better-potree 包：

- `@better-potree/types` - 类型定义
- `@better-potree/utils` - 工具函数（包括事件系统）
- `@better-potree/core` - 核心功能
- `@better-potree/rendering-three` - Three.js 渲染实现
- `@better-potree/loaders` - 加载器集合
- `@better-potree/loader-potree` - Potree 格式加载器
- `@better-potree/controls` - 相机控制
- `@better-potree/tools` - 工具集

## 对等依赖

- `three` ~0.180.0

## 重要说明

1. **点云加载**: `load()` 方法需要完整的 loader 系统支持（Phase 3 实现）
2. **渲染器要求**: 截屏功能需要 Three.js WebGL 渲染器
3. **事件清理**: 使用 `destroy()` 方法可以自动清理所有事件监听器
4. **性能优化**: 通过调整 `pointBudget` 可以平衡渲染质量和性能
5. **EDL 效果**: Eye-Dome Lighting 可以显著提升深度感知，建议启用
6. **响应式**: 查看器会自动处理窗口大小调整，无需手动干预

## 开发

```bash
# 构建
pnpm build

# 运行测试
pnpm test

# 清理
pnpm clean
```

## License

BSD-2-Clause
