# @better-potree/rendering-three

> 基于 Three.js 的点云渲染实现,提供 WebGL2 渲染器、材质系统和可视化辅助工具

## 特性

- **WebGL2 渲染器** - 强制使用 WebGL2 上下文的 Three.js 渲染器实现
- **点云材质** - 功能完整的 ShaderMaterial,支持多种着色模式
- **多种着色模式** - RGB、强度、分类、高程、回波编号、法线、LOD 等
- **灵活的点大小控制** - 固定、衰减、自适应三种点大小类型
- **多种点形状** - 方形、圆形、抛物面点形状
- **可视化辅助工具** - 包围盒、八叉树节点、视锥体、测量、标注等辅助工具
- **完整的类型定义** - 完整的 TypeScript 类型支持

## 安装

```bash
npm install @better-potree/rendering-three three
# 或
pnpm add @better-potree/rendering-three three
```

**注意**: 此包需要 Three.js ~0.180.0 作为 peer dependency。

## 系统要求

- **WebGL2 支持**: 此包需要浏览器支持 WebGL2
- **必需扩展**: `EXT_color_buffer_float` (用于浮点渲染目标)

## 使用方法

### 基础示例

```typescript
import * as THREE from 'three';
import { ThreeJsRenderer, ThreeScene, PointCloudObject3D } from '@better-potree/rendering-three';

// 创建渲染器(强制使用 WebGL2)
const renderer = new ThreeJsRenderer({
  antialias: true,
  pixelRatio: window.devicePixelRatio
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.getDomElement());

// 创建场景
const scene = new ThreeScene();

// 创建点云对象
const pointCloud = new PointCloudObject3D({
  size: 2.0,
  colorMode: PointCloudColorMode.RGB
});

// 更新点云几何数据
const positions = new Float32Array([
  0, 0, 0,
  1, 1, 1,
  2, 2, 2
]);
const colors = new Float32Array([
  1, 0, 0,  // 红色
  0, 1, 0,  // 绿色
  0, 0, 1   // 蓝色
]);
pointCloud.updateGeometry(positions, { colors });

// 添加到场景
scene.add(pointCloud);

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// 渲染循环
function animate() {
  requestAnimationFrame(animate);

  pointCloud.update(camera);
  renderer.render(scene, camera);
}
animate();
```

### WebGL2 检测

```typescript
import { checkWebGL2Support, isWebGL2Available } from '@better-potree/rendering-three';

// 简单检测
if (isWebGL2Available()) {
  console.log('WebGL2 is supported!');
}

// 详细检测
const support = checkWebGL2Support();
if (!support.available) {
  console.error('WebGL2 not available:', support.error);
} else {
  console.log('WebGL2 context:', support.context);
}
```

### 点云材质配置

```typescript
import { PointCloudMaterial } from '@better-potree/rendering-three';
import { PointCloudColorMode, PointSizeType, PointShape } from '@better-potree/types';

const material = new PointCloudMaterial({
  // 点大小设置
  size: 3.0,
  minSize: 1.0,
  maxSize: 50.0,
  sizeType: PointSizeType.ADAPTIVE,  // FIXED | ATTENUATED | ADAPTIVE

  // 点形状
  shape: PointShape.CIRCLE,  // SQUARE | CIRCLE | PARABOLOID

  // 着色模式
  colorMode: PointCloudColorMode.ELEVATION,  // RGB | INTENSITY | CLASSIFICATION | ELEVATION | RETURN_NUMBER | NORMAL | LEVEL_OF_DETAIL

  // 透明度
  opacity: 1.0,

  // 高程范围(用于高程着色)
  elevationRange: [0, 100],

  // 强度范围(用于强度着色)
  intensityRange: [0, 1],

  // EDL (Eye-Dome Lighting)
  useEDL: false,

  // 自定义渐变纹理
  gradient: customGradientTexture,

  // 自定义分类查找表
  classificationLUT: customClassificationTexture
});
```

### 动态切换着色模式

```typescript
const material = pointCloud.getMaterial();

// 切换到强度着色
material.colorMode = PointCloudColorMode.INTENSITY;

// 切换到分类着色
material.colorMode = PointCloudColorMode.CLASSIFICATION;

// 切换点大小类型
material.sizeType = PointSizeType.ATTENUATED;

// 切换点形状
material.shape = PointShape.PARABOLOID;

// 调整点大小
material.size = 5.0;
material.minSize = 2.0;
material.maxSize = 100.0;
```

### 更新点云数据

```typescript
const pointCloud = new PointCloudObject3D();

// 位置数据(必需)
const positions = new Float32Array([...]);

// 可选属性
const attributes = {
  colors: new Float32Array([...]),           // RGB 颜色
  intensities: new Float32Array([...]),      // 强度值
  classifications: new Float32Array([...]),  // 分类编号
  returnNumbers: new Float32Array([...]),    // 回波编号
  numberOfReturns: new Float32Array([...]),  // 回波总数
  normals: new Float32Array([...])           // 法线向量
};

pointCloud.updateGeometry(positions, attributes);

console.log('可见点数:', pointCloud.visiblePointCount);
```

### 点预算管理

```typescript
const pointCloud = new PointCloudObject3D();

// 设置点预算(用于 LOD 控制)
pointCloud.pointBudget = 2_000_000;  // 200万点

// 在更新时可以临时覆盖点预算
pointCloud.update(camera, 1_000_000);  // 使用100万点预算

// 获取当前点预算
console.log('当前点预算:', pointCloud.pointBudget);

// 获取实际可见点数
console.log('可见点数:', pointCloud.visiblePointCount);
```

### 可视化辅助工具

```typescript
import {
  BoundingBoxHelper,
  OctreeNodeHelper,
  FrustumHelper,
  MeasurementHelper,
  AnnotationHelper
} from '@better-potree/rendering-three';

// 包围盒辅助
const bbox = new THREE.Box3(
  new THREE.Vector3(-10, -10, -10),
  new THREE.Vector3(10, 10, 10)
);
const bboxHelper = new BoundingBoxHelper(bbox, 0xffff00);
scene.add(bboxHelper);

// 八叉树节点辅助
const nodeHelper = new OctreeNodeHelper(
  new THREE.Vector3(0, 0, 0),   // min
  new THREE.Vector3(10, 10, 10), // max
  0x00ff00                       // 颜色
);
scene.add(nodeHelper);

// 测量辅助
const measureHelper = new MeasurementHelper();
measureHelper.addPoint(new THREE.Vector3(0, 0, 0), 0xff0000, 0.2);
measureHelper.addPoint(new THREE.Vector3(5, 5, 5), 0xff0000, 0.2);
measureHelper.addLine(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(5, 5, 5),
  0x00ff00
);
scene.add(measureHelper);

// 标注辅助
const annotationHelper = new AnnotationHelper();
const label = annotationHelper.addLabel(
  new THREE.Vector3(0, 5, 0),
  '测量点',
  '#000000',  // 背景色
  '#ffffff'   // 文字色
);
scene.add(annotationHelper);

// 清除测量
measureHelper.clearMeasurements();

// 清除标注
annotationHelper.clearLabels();
```

### 渲染器配置

```typescript
const renderer = new ThreeJsRenderer({
  canvas: customCanvas,           // 自定义 canvas 元素
  antialias: true,                // 抗锯齿
  alpha: false,                   // Alpha 通道
  premultipliedAlpha: false,      // 预乘 Alpha
  preserveDrawingBuffer: false,   // 保留绘制缓冲
  pixelRatio: 2.0                 // 像素比率
});

// 设置渲染器大小
renderer.setSize(1920, 1080);

// 手动清除
renderer.clear(true, true, true);  // color, depth, stencil

// 获取 WebGL2 上下文
const gl = renderer.getContext();

// 控制自动清除
renderer.setAutoClear(false);

// 控制对象排序
renderer.setSortObjects(false);  // 对于点云,通常禁用排序

// 销毁渲染器
renderer.dispose();
```

### 场景管理

```typescript
const scene = new ThreeScene();

// 添加对象
scene.add(pointCloud);
scene.add(light);

// 移除对象
scene.remove(pointCloud);

// 获取底层 Three.js 场景
const threeScene = scene.getThreeScene();

// 清除所有对象
scene.clear();

// 销毁场景
scene.dispose();
```

### 响应式窗口大小

```typescript
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 更新相机
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // 更新渲染器
  renderer.setSize(width, height);

  // 更新点云材质的屏幕尺寸
  pointCloud.updateScreenSize(width, height);
});
```

## API 参考

### 类

#### `ThreeJsRenderer`

WebGL2 渲染器实现。

**构造函数:**
```typescript
constructor(config?: ThreeRendererConfig)
```

**配置选项:**
```typescript
interface ThreeRendererConfig {
  canvas?: HTMLCanvasElement;
  antialias?: boolean;
  alpha?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  pixelRatio?: number;
}
```

**方法:**

##### `render(scene: IScene, camera: THREE.Camera): void`

渲染场景。

**参数:**
- `scene` - 要渲染的场景(必须实现 `IScene` 接口)
- `camera` - Three.js 相机对象

##### `setSize(width: number, height: number): void`

设置渲染器尺寸。

##### `getDomElement(): HTMLCanvasElement`

获取 canvas DOM 元素。

##### `getThreeRenderer(): THREE.WebGLRenderer`

获取底层 Three.js 渲染器实例。

##### `getContext(): WebGL2RenderingContext`

获取 WebGL2 渲染上下文。

##### `clear(color?: boolean, depth?: boolean, stencil?: boolean): void`

清除渲染缓冲。默认全部清除。

##### `dispose(): void`

释放渲染器资源。

---

#### `ThreeScene`

Three.js 场景管理器。

**构造函数:**
```typescript
constructor()
```

**方法:**

##### `add(object: THREE.Object3D): void`

添加对象到场景。

##### `remove(object: THREE.Object3D): void`

从场景移除对象。

##### `getThreeScene(): THREE.Scene`

获取底层 Three.js 场景。

##### `clear(): void`

清除场景中的所有对象。

##### `dispose(): void`

释放场景资源。

---

#### `PointCloudMaterial`

点云着色器材质(继承自 `THREE.ShaderMaterial`)。

**构造函数:**
```typescript
constructor(config?: PointCloudMaterialConfig)
```

**配置选项:**
```typescript
interface PointCloudMaterialConfig {
  size?: number;                        // 点大小(像素)
  minSize?: number;                     // 最小点大小
  maxSize?: number;                     // 最大点大小
  sizeType?: PointSizeType;             // 点大小类型
  shape?: PointShape;                   // 点形状
  colorMode?: PointCloudColorMode;      // 着色模式
  opacity?: number;                     // 透明度
  elevationRange?: [number, number];    // 高程范围
  intensityRange?: [number, number];    // 强度范围
  useEDL?: boolean;                     // 使用 EDL
  gradient?: THREE.Texture;             // 渐变纹理
  classificationLUT?: THREE.Texture;    // 分类查找表
}
```

**属性:**

- `size: number` - 点大小
- `minSize: number` - 最小点大小
- `maxSize: number` - 最大点大小
- `colorMode: PointCloudColorMode` - 着色模式
- `sizeType: PointSizeType` - 点大小类型
- `shape: PointShape` - 点形状

**方法:**

##### `updateScreenSize(width: number, height: number): void`

更新屏幕尺寸 uniform。

##### `updateCamera(camera: THREE.Camera): void`

更新相机相关 uniform(FOV、近远裁剪面等)。

##### `updateOctreeSpacing(spacing: number): void`

更新八叉树间距 uniform(用于自适应点大小)。

---

#### `PointCloudObject3D`

点云 3D 对象(继承自 `THREE.Object3D`)。

**构造函数:**
```typescript
constructor(materialConfig?: PointCloudMaterialConfig)
```

**属性:**

- `pointBudget: number` - 点预算(用于 LOD)
- `visiblePointCount: number` - 可见点数(只读)

**方法:**

##### `getMaterial(): PointCloudMaterial`

获取材质实例。

##### `getGeometry(): THREE.BufferGeometry`

获取几何体实例。

##### `updateGeometry(positions: Float32Array, attributes?: { ... }): void`

更新几何数据。

**参数:**
- `positions` - 位置数组(x, y, z)
- `attributes` - 可选属性:
  - `colors?: Float32Array` - RGB 颜色(r, g, b)
  - `intensities?: Float32Array` - 强度值
  - `classifications?: Float32Array` - 分类编号
  - `returnNumbers?: Float32Array` - 回波编号
  - `numberOfReturns?: Float32Array` - 回波总数
  - `normals?: Float32Array` - 法线向量(x, y, z)

##### `update(camera: THREE.Camera, pointBudget?: number): void`

更新点云对象(更新材质 uniform 等)。

**参数:**
- `camera` - 相机对象
- `pointBudget` - 可选的点预算覆盖值

##### `updateScreenSize(width: number, height: number): void`

更新材质的屏幕尺寸。

##### `updateOctreeSpacing(spacing: number): void`

更新材质的八叉树间距。

##### `dispose(): void`

释放几何体和材质资源。

---

#### 辅助工具类

##### `BoundingBoxHelper`

包围盒可视化辅助工具(继承自 `THREE.Box3Helper`)。

```typescript
constructor(box?: THREE.Box3, color?: THREE.ColorRepresentation)
updateBox(box: THREE.Box3): void
```

##### `OctreeNodeHelper`

八叉树节点可视化辅助工具(继承自 `THREE.LineSegments`)。

```typescript
constructor(min: THREE.Vector3, max: THREE.Vector3, color?: THREE.ColorRepresentation)
updateBounds(min: THREE.Vector3, max: THREE.Vector3): void
```

##### `FrustumHelper`

视锥体可视化辅助工具(继承自 `THREE.LineSegments`)。

```typescript
constructor(camera: THREE.Camera, color?: THREE.ColorRepresentation)
updateFrustum(camera: THREE.Camera): void
```

##### `MeasurementHelper`

测量可视化辅助工具(继承自 `THREE.Group`)。

```typescript
constructor()
addPoint(position: THREE.Vector3, color?: THREE.ColorRepresentation, size?: number): void
addLine(start: THREE.Vector3, end: THREE.Vector3, color?: THREE.ColorRepresentation): void
clearMeasurements(): void
```

##### `AnnotationHelper`

标注可视化辅助工具(继承自 `THREE.Group`)。

```typescript
constructor()
addLabel(position: THREE.Vector3, text: string, backgroundColor?: string, textColor?: string): THREE.Sprite
removeLabel(sprite: THREE.Sprite): void
clearLabels(): void
```

---

### 工具函数

#### WebGL2 检测

##### `isWebGL2Available(): boolean`

检查当前浏览器是否支持 WebGL2。

**返回值:**
- `boolean` - 是否支持 WebGL2

##### `checkWebGL2Support(canvas?: HTMLCanvasElement): WebGL2Support`

详细检查 WebGL2 支持情况。

**参数:**
- `canvas` - 可选的 canvas 元素

**返回值:**
```typescript
interface WebGL2Support {
  available: boolean;
  error?: string;
  context?: WebGL2RenderingContext;
}
```

##### `assertWebGL2Available(): void`

断言 WebGL2 可用,如果不可用则抛出错误。

**抛出:**
- `Error` - 如果 WebGL2 不可用

##### `getWebGL2Capabilities(gl: WebGL2RenderingContext): object`

获取 WebGL2 能力和限制信息。

**返回值:**
包含以下信息的对象:
- `maxTextureSize` - 最大纹理尺寸
- `max3DTextureSize` - 最大 3D 纹理尺寸
- `maxArrayTextureLayers` - 最大数组纹理层数
- `maxVertexAttributes` - 最大顶点属性数
- `vendor` - GPU 厂商
- `renderer` - 渲染器信息
- `version` - WebGL 版本
- 等等...

#### 着色器

##### `getPointCloudVertexShader(): string`

获取点云顶点着色器源码。

##### `getPointCloudFragmentShader(): string`

获取点云片段着色器源码。

---

### 枚举类型

这些类型来自 `@better-potree/types` 包:

#### `PointCloudColorMode`

着色模式:
- `RGB` - RGB 颜色
- `INTENSITY` - 强度
- `CLASSIFICATION` - 分类
- `ELEVATION` - 高程
- `RETURN_NUMBER` - 回波编号
- `NORMAL` - 法线
- `LEVEL_OF_DETAIL` - LOD 级别

#### `PointSizeType`

点大小类型:
- `FIXED` - 固定大小
- `ATTENUATED` - 距离衰减
- `ADAPTIVE` - 自适应(基于八叉树间距)

#### `PointShape`

点形状:
- `SQUARE` - 方形
- `CIRCLE` - 圆形
- `PARABOLOID` - 抛物面

## 着色器系统

此包使用自定义 GLSL 着色器实现点云渲染。着色器通过预处理器定义(`#define`)来控制不同的渲染模式:

### 着色模式定义
- `COLOR_TYPE_RGB` - RGB 颜色模式
- `COLOR_TYPE_INTENSITY` - 强度模式
- `COLOR_TYPE_CLASSIFICATION` - 分类模式
- `COLOR_TYPE_ELEVATION` - 高程模式
- `COLOR_TYPE_RETURN_NUMBER` - 回波编号模式
- `COLOR_TYPE_NORMAL` - 法线模式
- `COLOR_TYPE_LEVEL_OF_DETAIL` - LOD 级别模式

### 点大小定义
- `FIXED_POINT_SIZE` - 固定点大小
- `ATTENUATED_POINT_SIZE` - 衰减点大小
- `ADAPTIVE_POINT_SIZE` - 自适应点大小

### 点形状定义
- `CIRCLE_POINT_SHAPE` - 圆形点
- `PARABOLOID_POINT_SHAPE` - 抛物面点

### EDL 定义
- `USE_EDL` - 启用 Eye-Dome Lighting

## 性能优化建议

1. **点预算管理**: 根据硬件能力设置合理的 `pointBudget`,避免渲染过多点导致性能下降
2. **禁用对象排序**: 对于点云,应禁用 `sortObjects` 以提升性能
3. **手动控制清除**: 禁用 `autoClear` 并手动控制渲染流程可以提升性能
4. **使用自适应点大小**: `PointSizeType.ADAPTIVE` 可以根据距离自动调整点大小,提供更好的视觉效果
5. **合理使用 EDL**: Eye-Dome Lighting 可以提升点云深度感知,但会增加渲染开销
6. **批量更新**: 尽量批量更新几何数据,减少频繁的 `updateGeometry` 调用

## 注意事项

### WebGL2 要求

此包**强制要求** WebGL2 支持。如果浏览器不支持 WebGL2,创建 `ThreeJsRenderer` 时会抛出错误:

```typescript
try {
  const renderer = new ThreeJsRenderer();
} catch (error) {
  console.error('WebGL2 not supported:', error);
  // 显示降级提示
}
```

### 必需扩展

以下 WebGL2 扩展是必需的:
- `EXT_color_buffer_float` - 用于浮点渲染目标

如果扩展不可用,会抛出详细的错误信息。

### Three.js 版本兼容性

此包需要 Three.js ~0.180.0。使用其他版本可能导致 API 不兼容。

### 着色器定义变更

当修改 `colorMode`、`sizeType` 或 `shape` 时,材质的着色器定义会改变,这会触发着色器重新编译。频繁切换这些属性可能影响性能。

### 资源释放

使用完毕后务必调用 `dispose()` 方法释放资源,避免内存泄漏:

```typescript
// 释放点云对象
pointCloud.dispose();

// 释放场景
scene.dispose();

// 释放渲染器
renderer.dispose();

// 释放辅助工具
measureHelper.clearMeasurements();
annotationHelper.clearLabels();
```

## 开发

```bash
# 构建
pnpm build

# 清理
pnpm clean

# 运行测试
pnpm test
```

## 相关包

- `@better-potree/types` - 类型定义
- `@better-potree/core` - 核心八叉树和 LOD 算法
- `@better-potree/controls` - 相机控制
- `@better-potree/viewer` - 高级查看器组件

## License

BSD-2-Clause
