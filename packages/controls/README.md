# @better-potree/controls

> 为 better-potree 提供相机控制功能的包,支持基于动态旋转中心的点云交互

## 特性

- **动态旋转中心** - 基于点击点设置旋转中心,实现更自然的点云查看体验
- **鼠标拖拽旋转** - 支持右键拖拽进行相机旋转
- **滚轮缩放** - 平滑的滚轮缩放动画,带渐变效果
- **触摸支持** - 完整的移动设备触摸控制支持
- **事件系统** - 基于 TypedEventEmitter 的类型安全事件系统
- **现代化实现** - TypeScript 编写,无 jQuery 依赖,使用原生 DOM 事件
- **可配置参数** - 灵活的旋转速度、缩放速度和渐变因子配置

## 安装

```bash
npm install @better-potree/controls
# 或
pnpm add @better-potree/controls
```

## 依赖

该包需要以下 peer dependencies:

- `three`: ~0.180.0

## 使用

### 基础示例

```typescript
import * as THREE from 'three';
import { EarthControls } from '@better-potree/controls';

// 创建场景、相机和渲染器
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 10);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 创建控制器
const controls = new EarthControls(camera, renderer.domElement);

// 设置旋转中心点(例如,点云中的某个点)
controls.setPivot(new THREE.Vector3(0, 0, 0));

// 监听事件
controls.on('change', () => {
  console.log('Camera changed');
});

controls.on('start', () => {
  console.log('Interaction started');
});

controls.on('end', () => {
  console.log('Interaction ended');
});

// 在渲染循环中更新控制器
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  controls.update(delta);

  renderer.render(scene, camera);
}

animate();
```

### 高级用法

#### 自定义控制参数

```typescript
const controls = new EarthControls(camera, renderer.domElement);

// 调整旋转速度(默认: 10)
controls.rotationSpeed = 15;

// 调整缩放速度(默认: 1)
controls.zoomSpeed = 2;

// 调整渐变因子,控制缩放动画的平滑度(默认: 20)
controls.fadeFactor = 30;
```

#### 启用/禁用控制器

```typescript
// 禁用控制器
controls.enabled = false;

// 重新启用
controls.enabled = true;
```

#### 停止所有运动

```typescript
// 立即停止所有缩放和动画
controls.stop();
```

#### 动态更新旋转中心

```typescript
// 根据鼠标点击的点云点更新旋转中心
function onPointCloudClick(event: MouseEvent) {
  // 假设通过射线投射获取了交点
  const intersectionPoint = getIntersectionPoint(event);

  if (intersectionPoint) {
    controls.setPivot(intersectionPoint);
  }
}
```

#### 清理资源

```typescript
// 在组件卸载或场景销毁时调用
controls.dispose();
```

## API 参考

### 类

#### `EarthControls`

基于动态旋转中心的相机控制器,专为点云查看设计。

**构造函数:**

```typescript
constructor(camera: THREE.Camera, domElement: HTMLElement)
```

**参数:**
- `camera` - 要控制的 Three.js 相机
- `domElement` - 要附加事件监听器的 DOM 元素(通常是渲染器的 canvas 元素)

**属性:**

##### `camera: THREE.Camera` (只读)

被控制的相机实例。

##### `domElement: HTMLElement` (只读)

附加事件监听器的 DOM 元素。

##### `rotationSpeed: number`

旋转速度系数。默认值: `10`

##### `zoomSpeed: number`

缩放速度系数。默认值: `1`

##### `fadeFactor: number`

缩放动画的渐变因子,值越大动画越快停止。默认值: `20`

##### `pivot: THREE.Vector3 | null`

当前旋转中心点的世界坐标。默认值: `null`

##### `enabled: boolean`

控制器是否启用。默认值: `true`

**方法:**

##### `setPivot(point: THREE.Vector3): void`

设置旋转中心点。

**参数:**
- `point` - 世界坐标系中的旋转中心点

**示例:**
```typescript
controls.setPivot(new THREE.Vector3(5, 5, 5));
```

##### `update(delta: number): void`

更新控制器状态,应在每帧渲染循环中调用。

**参数:**
- `delta` - 自上一帧以来的时间增量(秒)

**示例:**
```typescript
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  controls.update(delta);

  renderer.render(scene, camera);
}
```

##### `stop(): void`

立即停止所有运动(缩放和动画)。

**示例:**
```typescript
controls.stop();
```

##### `dispose(): void`

清理控制器,移除所有事件监听器。在销毁场景或组件卸载时调用。

**示例:**
```typescript
controls.dispose();
```

**事件:**

控制器继承自 `TypedEventEmitter<EarthControlsEvents>`,支持以下事件:

##### `'start'`

当用户开始交互(鼠标按下或触摸开始)时触发。

```typescript
controls.on('start', () => {
  console.log('Interaction started');
});
```

##### `'change'`

当相机位置或朝向发生变化时触发。

```typescript
controls.on('change', () => {
  console.log('Camera changed');
  renderer.render(scene, camera);
});
```

##### `'end'`

当用户结束交互(鼠标释放或触摸结束)时触发。

```typescript
controls.on('end', () => {
  console.log('Interaction ended');
});
```

### 枚举

#### `MouseButton`

鼠标按钮枚举,用于识别鼠标按键。

```typescript
enum MouseButton {
  LEFT = 0,    // 左键
  MIDDLE = 1,  // 中键
  RIGHT = 2,   // 右键
}
```

### 类型

#### `EarthControlsEvents`

控制器事件映射接口。

```typescript
interface EarthControlsEvents {
  start: void;
  change: void;
  end: void;
}
```

## 交互说明

### 鼠标控制

- **右键拖拽** - 围绕旋转中心旋转相机
- **滚轮滚动** - 向旋转中心缩放(向上缩小,向下放大)
- **右键菜单** - 已禁用以避免干扰控制

### 触摸控制

- **单指拖拽** - 围绕旋转中心旋转相机(等同于鼠标右键拖拽)
- **多点触摸** - 当前版本忽略多点触摸

## 工作原理

### 旋转机制

EarthControls 使用动态旋转中心(pivot point)实现旋转:

1. 通过 `setPivot()` 设置旋转中心
2. 用户拖拽鼠标时,相机围绕该中心点旋转
3. 旋转过程中保持相机到旋转中心的距离不变
4. 相机始终朝向旋转中心

旋转计算基于以下步骤:
- 计算相机相对于旋转中心的向量
- 应用俯仰角旋转(围绕相机的侧向轴)
- 应用偏航角旋转(围绕世界的上方向轴,Z轴)
- 更新相机位置并使其朝向旋转中心

### 缩放机制

缩放通过滚轮事件实现,特点:

1. 缩放方向始终朝向旋转中心
2. 缩放距离与当前相机到旋转中心的距离成正比
3. 使用渐变因子实现平滑的缩放动画
4. 每帧通过 `update()` 方法逐步应用缩放增量

## 注意事项

- **必须设置旋转中心**: 旋转和缩放功能需要先通过 `setPivot()` 设置旋转中心点
- **每帧调用 update()**: 为了实现平滑的缩放动画,必须在渲染循环中调用 `update(delta)`
- **Three.js 版本**: 该包需要 Three.js ~0.180.0
- **记得清理资源**: 在销毁场景时调用 `dispose()` 以避免内存泄漏
- **坐标系**: 使用 Z 轴作为世界上方向(适用于地理/测量数据)

## 与 Potree 的区别

该实现基于 Potree 的 EarthControls,但进行了现代化改造:

- **无 jQuery 依赖** - 使用原生 DOM API
- **TypeScript** - 完整的类型安全支持
- **现代事件系统** - 基于 TypedEventEmitter
- **更清晰的 API** - 简化的方法和属性命名
- **更好的资源管理** - 提供 dispose() 方法进行清理

## 开发

### 运行测试

```bash
pnpm test
```

### 构建

```bash
pnpm build
```

### 清理

```bash
pnpm clean
```

## 许可证

BSD-2-Clause

本包是 better-potree monorepo 的一部分。
