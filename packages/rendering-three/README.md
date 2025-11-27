# @better-potree/rendering-three

> 基于 Three.js 和 WebGL2 的高性能点云渲染实现

## 概述

`@better-potree/rendering-three` 是 Better Potree 项目的 **Three.js 渲染实现层**，提供基于 WebGL2 的点云可视化能力。它作为 @better-potree/core 与 Three.js 之间的适配层，实现了功能丰富的点云材质系统和后处理效果。

### 核心定位

- **WebGL2 渲染**：强制使用 WebGL2 上下文，提供现代化的 GPU 渲染能力
- **点云材质系统**：功能丰富的 ShaderMaterial，支持 12+ 种着色模式
- **场景管理**：统一管理点云节点的生命周期和可见性
- **后处理效果**：实现 EDL (Eye-Dome Lighting) 等增强深度感知的渲染技术
- **Three.js 桥接**：实现 @better-potree/core 的 IRenderer 和 IScene 接口

### 技术亮点

- ✅ 完全基于 WebGL2，利用现代 GPU 特性
- ✅ Shader Defines 驱动的零运行时开销特性系统
- ✅ 统一材质 + onBeforeRender Hook 节省内存
- ✅ PCF 软阴影和高质量点渲染（HQ Splat）
- ✅ 自适应点大小和多种点形状支持

## 核心特性

### 多种着色模式（12 种）

- **RGB**: 真实颜色
- **INTENSITY**: 强度渐变
- **CLASSIFICATION**: 分类颜色 (LAS 标准)
- **ELEVATION**: 高程渐变
- **RETURN_NUMBER**: 回波编号
- **NORMAL**: 法线可视化
- **LEVEL_OF_DETAIL**: LOD 层级着色
- **MATCAP**: 材质捕获（物理感）
- **GPS_TIME**: GPS 时间戳
- **POINT_INDEX**: 点索引（调试）
- **COMPOSITE**: 复合模式

### 点大小类型（3 种）

- **FIXED**: 固定像素大小
- **ATTENUATED**: 透视衰减
- **ADAPTIVE**: 自适应（基于八叉树 spacing）

### 点形状（3 种）

- **SQUARE**: 方形（默认）
- **CIRCLE**: 圆形
- **PARABOLOID**: 抛物面（高质量，使用 HQ Splat）

### 高级功能

1. **Clip Box 裁剪** (支持动态数量)
   - ClipTask: NONE/HIGHLIGHT/SHOW_INSIDE/SHOW_OUTSIDE
   - ClipMethod: INSIDE_ANY (OR) / INSIDE_ALL (AND)

2. **Shadow Mapping** (多光源阴影)
   - PCF (Percentage Closer Filtering) 软阴影
   - 3x3 采样核心
   - 动态阴影颜色

3. **属性过滤** (4 种)
   - GPS 时间范围
   - 回波编号范围
   - 回波总数范围
   - 点源 ID 范围

4. **EDL (Eye-Dome Lighting)**
   - 增强点云深度感知
   - 双通道渲染管线
   - 可配置强度和半径

## 系统要求

- **WebGL2 支持**: 浏览器必须支持 WebGL2
- **必需扩展**: `EXT_color_buffer_float` (用于浮点渲染目标)
- **Three.js**: ~0.180.0

## 安装

```bash
npm install @better-potree/rendering-three three
# 或
pnpm add @better-potree/rendering-three three
```

## 快速开始

### 基础示例

```typescript
import * as THREE from 'three';
import {
  ThreeJsRenderer,
  PointCloudScene,
  PointCloudMaterial
} from '@better-potree/rendering-three';

// 1. 创建渲染器（强制使用 WebGL2）
const renderer = new ThreeJsRenderer({
  antialias: true,
  pixelRatio: window.devicePixelRatio
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.getDomElement());

// 2. 创建点云场景
const pointCloudScene = new PointCloudScene();

// 3. 创建材质
const material = new PointCloudMaterial({
  size: 2.0,
  sizeType: PointSizeType.ADAPTIVE,
  colorMode: PointCloudColorMode.RGB,
  shape: PointShape.CIRCLE
});

// 4. 创建相机
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 50;

// 5. 渲染循环
function animate() {
  requestAnimationFrame(animate);
  renderer.render(pointCloudScene, camera);
}
animate();
```

### WebGL2 检测

```typescript
import {
  checkWebGL2Support,
  isWebGL2Available,
  assertWebGL2Available
} from '@better-potree/rendering-three';

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

// 断言检测（不支持会抛出错误）
try {
  assertWebGL2Available();
} catch (error) {
  console.error('WebGL2 required:', error);
}
```

## 核心模块

### 1. ThreeJsRenderer

实现 IRenderer 接口，作为 @better-potree/core 的渲染适配器。

```typescript
import { ThreeJsRenderer } from '@better-potree/rendering-three';

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

// 渲染场景
renderer.render(scene, camera);

// 手动清除
renderer.clear(true, true, true);  // color, depth, stencil

// 获取 WebGL2 上下文
const gl = renderer.getContext();

// 获取 canvas 元素
const canvas = renderer.getDomElement();

// 销毁渲染器
renderer.dispose();
```

**特性**：
- ✅ 强制 WebGL2 上下文
- ✅ `sortObjects = false`（点云不需要排序）
- ✅ `autoClear = false`（手动控制清屏）

### 2. PointCloudMaterial

点云着色器材质，继承自 `THREE.ShaderMaterial`。

```typescript
import { PointCloudMaterial } from '@better-potree/rendering-three';
import { PointCloudColorMode, PointSizeType, PointShape } from '@better-potree/core';

const material = new PointCloudMaterial({
  // 点大小设置
  size: 3.0,
  minSize: 1.0,
  maxSize: 50.0,
  sizeType: PointSizeType.ADAPTIVE,

  // 点形状
  shape: PointShape.CIRCLE,

  // 着色模式
  colorMode: PointCloudColorMode.ELEVATION,

  // 透明度
  opacity: 1.0,

  // 高程范围（用于高程着色）
  elevationRange: [0, 100],

  // 强度范围（用于强度着色）
  intensityRange: [0, 1],

  // 自定义渐变纹理
  gradient: customGradientTexture,

  // 自定义分类查找表
  classificationLUT: customClassificationTexture
});

// 动态切换着色模式
material.colorMode = PointCloudColorMode.INTENSITY;

// 动态切换点大小类型
material.sizeType = PointSizeType.ATTENUATED;

// 动态切换点形状
material.shape = PointShape.PARABOLOID;

// 调整点大小
material.size = 5.0;
```

**Shader Defines 系统**：

当修改 `colorMode`、`sizeType` 或 `shape` 时，材质会通过 defines 触发 shader 重新编译：

```typescript
// 运行时配置
material.colorMode = PointCloudColorMode.ELEVATION;

// 内部实现：清除所有颜色模式 defines
delete this.defines.COLOR_TYPE_RGB;
delete this.defines.COLOR_TYPE_INTENSITY;
// ...

// 设置新 define
this.defines.COLOR_TYPE_ELEVATION = true;
this.needsUpdate = true;  // 触发重编译
```

**优势**：
- ✅ 零分支开销：不使用的代码直接从 shader 中移除
- ✅ 编译器优化：GPU 可以针对特定配置优化

### 3. PointCloudScene

点云场景管理器，继承自 `THREE.Group`。

```typescript
import { PointCloudScene } from '@better-potree/rendering-three';

const scene = new PointCloudScene();

// 添加节点并设置元数据
scene.addNode('r0', geometry, {
  level: 0,
  vnStart: 0,
  pcIndex: 0,
  numPoints: 10000
});

// 更新可见性
const visibleNodeIds = new Set(['r0', 'r1', 'r2']);
scene.updateVisibility(visibleNodeIds);

// 获取统计信息
console.log(`可见点数: ${scene.visiblePointCount}`);
console.log(`节点数: ${scene.nodeCount}`);

// 移除节点并清理资源
scene.removeNode('r0');

// 销毁场景
scene.dispose();
```

**统一材质管理**：

所有节点共享一个 `PointCloudMaterial` 实例，节点级 uniforms 通过 `onBeforeRender` hook 动态更新：

```typescript
// 内部实现示意
points.onBeforeRender = (renderer, scene, camera, geometry, material) => {
  material.uniforms.level.value = nodeMetadata.level;
  material.uniforms.vnStart.value = nodeMetadata.vnStart;
  material.uniforms.pcIndex.value = nodeMetadata.pcIndex;
};
```

**收益**：
- ✅ 内存节省：10,000 个节点只需 1 个材质实例
- ✅ 编译优化：shader 只编译一次

### 4. EDLRenderer

Eye-Dome Lighting 渲染器，增强点云深度感知。

```typescript
import { EDLRenderer } from '@better-potree/rendering-three/effects';

const edlRenderer = new EDLRenderer({
  edlStrength: 0.4,       // 效果强度 (0.0 - 2.0)
  edlRadius: 1.4,         // 采样半径（像素）
  neighbourCount: 8,      // 邻居采样数量
  edlOpacity: 1.0         // 效果不透明度
});

// 在渲染循环中使用
function animate() {
  // 渲染点云到 EDL 渲染目标
  edlRenderer.render(scene, camera, renderer);

  requestAnimationFrame(animate);
}

// 动态调整参数
edlRenderer.setStrength(0.6);
edlRenderer.setRadius(2.0);

// 清理
edlRenderer.dispose();
```

**渲染管线** (双通道)：

1. **Pass 1 - 点云渲染**
   - 渲染到 Float 类型 Render Target
   - Alpha 通道存储对数深度

2. **Pass 2 - EDL 着色**
   - 采样周围 8 个邻居的深度
   - 计算深度差异并生成遮蔽因子
   - 使用 PCF 风格的软化

### 5. Shader 系统

#### 顶点着色器特性

```glsl
// 点大小计算（3 种模式）
#ifdef FIXED_POINT_SIZE
  gl_PointSize = size;
#endif

#ifdef ATTENUATED_POINT_SIZE
  float distance = length(vViewPosition);
  gl_PointSize = size * (1.0 / distance);
#endif

#ifdef ADAPTIVE_POINT_SIZE
  // 基于八叉树 spacing 的自适应大小
  float projectedSize = uOctreeSpacing * size * screenHeight /
                        (2.0 * tan(fov/2.0) * distance);
  gl_PointSize = clamp(projectedSize, minSize, maxSize);
#endif

// 颜色计算（根据 COLOR_TYPE_* defines）
#ifdef COLOR_TYPE_ELEVATION
  float normalized = (worldPos.z - elevationRange.x) /
                     (elevationRange.y - elevationRange.x);
  vColor = texture(gradient, vec2(normalized, 0.5)).rgb;
#endif

// 裁剪判断
#if defined(num_clipboxes)
  // 支持动态数量的裁剪盒
#endif

// 属性过滤
#if defined(clip_gps_enabled)
  if (gpsTime < uFilterGPSTimeRange.x || gpsTime > uFilterGPSTimeRange.y) {
    gl_Position = vec4(0.0, 0.0, 0.0, -1.0);  // 移出裁剪空间
  }
#endif
```

#### 片段着色器特性

```glsl
// 点形状裁剪
#ifdef CIRCLE_POINT_SHAPE
  vec2 center = gl_PointCoord - vec2(0.5);
  if (dot(center, center) > 0.25) discard;
#endif

#ifdef PARABOLOID_POINT_SHAPE
  // 使用 HQ Splat 算法生成平滑的圆形点
#endif

// 阴影计算（PCF）
float calculateShadowVisibility() {
  // 3x3 PCF 采样
  for (int j = 0; j < 9; j++) {
    float shadowDepth = texture(uShadowMap[i], shadowCoord.xy + offsets[j]).r;
    if (shadowCoord.z < shadowDepth + bias) {
      visibleSamples += 1.0;
    }
  }
  return visibleSamples / 9.0;
}

// 对数深度输出（用于 EDL）
float logDepth = log2(gl_FragCoord.z) / log2(far);
fragColor.a = logDepth;
```

### 6. 分类系统

分类颜色和可见性打包到 256x1 纹理：

```typescript
import { ClassificationScheme } from '@better-potree/rendering-three';

const scheme = new ClassificationScheme();

// 设置分类颜色
scheme.setClassColor(2, new THREE.Color(0xff0000));  // 地面 - 红色
scheme.setClassColor(3, new THREE.Color(0x00ff00));  // 低植被 - 绿色

// 设置分类可见性
scheme.setClassVisible(2, true);
scheme.setClassVisible(3, false);

// 应用到材质
material.classificationLUT = scheme.getTexture();
```

**GPU 端查找**：

```glsl
vec4 classInfo = texture(classificationLUT, vec2(classification / 255.0, 0.5));
vec3 color = classInfo.rgb;
float visible = classInfo.a;
if (visible < 0.5) discard;  // 不可见的分类直接丢弃
```

**优势**：
- ✅ 零 CPU 开销：更新分类配置不需要重新上传几何数据
- ✅ 动态切换：实时启用/禁用分类

## 性能优化

### 1. 材质共享

所有节点共享一个材质实例：

```typescript
// ❌ 传统方案：为每个节点创建材质（内存浪费）
for (const node of nodes) {
  const material = new PointCloudMaterial({ level: node.level });
  const points = new THREE.Points(node.geometry, material);
}

// ✅ 优化方案：所有节点共享一个材质
const sharedMaterial = new PointCloudMaterial();
for (const node of nodes) {
  const points = new THREE.Points(node.geometry, sharedMaterial);
  points.onBeforeRender = (renderer, scene, camera, geometry, material) => {
    material.uniforms.level.value = node.level;
  };
}
```

### 2. Shader Defines 消除分支

通过预处理器指令实现零运行时开销的特性切换：

```typescript
// GPU 端：不使用的代码直接从 shader 中移除
#ifdef COLOR_TYPE_RGB
  vColor = rgb;
#endif
#ifdef COLOR_TYPE_INTENSITY
  vColor = texture(gradient, vec2(intensity, 0.5)).rgb;
#endif
```

### 3. 自适应点大小

基于八叉树 spacing 和透视投影的点大小计算：

```glsl
float distance = length(vViewPosition);
float fovFactor = 2.0 * tan(fov / 2.0);
float projectedSize = (uOctreeSpacing * size * screenHeight) / (fovFactor * distance);
gl_PointSize = clamp(projectedSize, minSize, maxSize);
```

**优势**：
- ✅ 视觉一致性：无论相机距离，点云密度感知保持一致
- ✅ 性能优化：远处的点自动变小，减少填充率

### 4. PCF 软阴影

3x3 采样核心的 Percentage Closer Filtering：

```glsl
float visibleSamples = 0.0;
for (int j = 0; j < 9; j++) {
  float shadowDepth = texture(shadowMap, coord + offsets[j]).r;
  if (fragDepth < shadowDepth + bias) {
    visibleSamples += 1.0;
  }
}
float shadowFactor = visibleSamples / 9.0;
```

**效果**：平滑的阴影边缘，避免硬边缘锯齿

## API 参考

### ThreeJsRenderer

```typescript
class ThreeJsRenderer implements IRenderer {
  constructor(config?: ThreeRendererConfig);

  render(scene: IScene, camera: THREE.Camera): void;
  setSize(width: number, height: number): void;
  getDomElement(): HTMLCanvasElement;
  getThreeRenderer(): THREE.WebGLRenderer;
  getContext(): WebGL2RenderingContext;
  clear(color?: boolean, depth?: boolean, stencil?: boolean): void;
  dispose(): void;
}
```

### PointCloudMaterial

```typescript
class PointCloudMaterial extends THREE.ShaderMaterial {
  constructor(config?: PointCloudMaterialConfig);

  // 属性
  size: number;
  minSize: number;
  maxSize: number;
  colorMode: PointCloudColorMode;
  sizeType: PointSizeType;
  shape: PointShape;

  // 方法
  updateScreenSize(width: number, height: number): void;
  updateCamera(camera: THREE.Camera): void;
  updateOctreeSpacing(spacing: number): void;
}
```

### PointCloudScene

```typescript
class PointCloudScene extends THREE.Group implements IScene {
  constructor();

  // 属性
  readonly visiblePointCount: number;
  readonly nodeCount: number;

  // 方法
  addNode(id: string, geometry: THREE.BufferGeometry, metadata: NodeMetadata): void;
  removeNode(id: string): void;
  updateVisibility(visibleNodeIds: Set<string>): void;
  dispose(): void;
}
```

### EDLRenderer

```typescript
class EDLRenderer {
  constructor(config?: EDLConfig);

  render(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void;
  setStrength(strength: number): void;
  setRadius(radius: number): void;
  setOpacity(opacity: number): void;
  dispose(): void;
}
```

## 注意事项

### WebGL2 要求

此包**强制要求** WebGL2 支持。如果浏览器不支持 WebGL2，创建 `ThreeJsRenderer` 时会抛出错误：

```typescript
try {
  const renderer = new ThreeJsRenderer();
} catch (error) {
  console.error('WebGL2 not supported:', error);
  // 显示降级提示
}
```

### Shader 重编译

当修改 `colorMode`、`sizeType` 或 `shape` 时，材质的 shader 定义会改变，触发重新编译。频繁切换这些属性可能影响性能。

### 资源释放

使用完毕后务必调用 `dispose()` 方法释放资源：

```typescript
// 释放场景
scene.dispose();

// 释放渲染器
renderer.dispose();

// 释放 EDL
edlRenderer.dispose();
```

## 开发

```bash
# 构建
pnpm build

# 运行测试
pnpm test

# 清理
pnpm clean
```

## 许可证

BSD-2-Clause

---

**Better Potree** - 现代化的 WebGL 点云查看器
