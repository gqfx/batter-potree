# @better-potree/viewer

> 开箱即用的点云查看器 API，提供完整的点云可视化解决方案

## 概述

`@better-potree/viewer` 是 Better Potree 项目的**高级查看器 API 包**，提供开箱即用的点云可视化解决方案。它将底层的 core 和 rendering-three 能力封装成简单易用的 API，开发者无需理解复杂的 LOD 遍历和流式加载机制即可实现专业的点云应用。

### 核心定位

- **高级封装层**：将底层能力封装成简单易用的 API
- **完整解决方案**：集成点云加载、LOD 遍历、流式加载、渲染等完整流程
- **开发者友好**：提供事件驱动、类型安全的 API 接口
- **可扩展架构**：通过依赖注入支持不同的渲染器和场景实现

### 核心价值

1. **简化开发**：开发者无需理解复杂的 LOD 遍历和流式加载机制
2. **完整集成**：将 TraversalSystem、StreamingSystem、PotreeLoader 无缝集成
3. **即插即用**：提供 ViewerAPI 高级 API，包含相机控制、工具等高级功能
4. **生产就绪**：包含完整的事件系统、错误处理、资源清理

## 核心特性

### Potree 格式完整支持

- ✅ Potree 1.x 格式（cloud.js）
- ✅ Potree 2.0 格式（metadata.json）
- ✅ Proxy 节点支持（三种节点类型：normal/leaf/proxy）
- ✅ HTTP Range 请求支持（按需加载节点数据）
- ✅ Hierarchy.bin 层级加载

### 高性能加载和渲染

- ✅ Worker Pool 并行解码（默认使用 CPU 核心数 - 1）
- ✅ 优先级队列驱动的 LOD 遍历
- ✅ 流式加载系统（最多支持 8 个并发加载）
- ✅ 自动内存管理（LRU 缓存策略）
- ✅ 点预算管理（每帧最大渲染点数控制）

### 交错布局正确处理

关键修复：正确处理 Potree 的交错属性布局

```
Point 0: [position(12) + intensity(2) + RGB(6) + ...]
Point 1: [position(12) + intensity(2) + RGB(6) + ...]
```

**核心公式**：读取点 j 的属性 A 的位置
```typescript
const offset = attrOffset + j * pointAttributes.byteSize
```

### 相机控制系统

- **EarthControls**：Potree 风格的相机控制
  - 动态旋转轴心（基于点云表面）
  - 左键平移、右键旋转、滚轮缩放
  - 双击动画缩放
  - 轴心指示器可视化
  - 支持 View 系统（Potree 平移和 pitch 限制）

### 事件驱动架构

类型安全的事件系统：
- `pointcloud-loaded` - 点云加载完成
- `node-loaded` - 节点加载完成
- `camera-changed` - 相机变化
- `render` - 每帧渲染后

## 安装

```bash
npm install @better-potree/viewer
# 或
pnpm add @better-potree/viewer
```

## 快速开始

### 基础示例

```typescript
import { Viewer } from '@better-potree/viewer';
import { ThreeJsRenderer, PointCloudScene } from '@better-potree/rendering-three';
import { PotreeLoader } from '@better-potree/viewer';

// 1. 创建渲染器和场景
const renderer = new ThreeJsRenderer();
const scene = new PointCloudScene();

// 2. 创建查看器
const viewer = new Viewer({
  renderer,
  scene,
  pointBudget: 1_000_000,
  enableWorkerDecoding: true  // 启用 Worker 解码
});

// 3. 创建加载器
const loader = new PotreeLoader({
  workerPool: viewer.getWorkerPool()
});

// 4. 加载点云
const octree = await loader.load('path/to/cloud.json');
viewer.addPointCloud(octree, 'my-cloud');

// 5. 监听事件
viewer.on('pointcloud-loaded', ({ pointCloud, name }) => {
  console.log(`点云 ${name} 加载完成`);
});

// 6. 启动渲染循环
viewer.startAnimation();
```

### 使用 ViewerAPI（推荐）

```typescript
import { ViewerAPI } from '@better-potree/viewer';
import { ThreeJsRenderer, PointCloudScene } from '@better-potree/rendering-three';

const viewer = new ViewerAPI({
  renderer: new ThreeJsRenderer(),
  scene: new PointCloudScene(),
  pointBudget: 1_500_000,
  edlEnabled: true
});

// 监听加载完成
viewer.on('pointcloud-loaded', ({ pointCloud }) => {
  viewer.fitToScreen(pointCloud);  // 自动适配视图
});

// 加载点云
await viewer.load('cloud.json', 'main-cloud');

// 启动渲染
viewer.startAnimation();
```

## 核心模块

### 1. Viewer 类（核心）

```typescript
import { Viewer } from '@better-potree/viewer';

const viewer = new Viewer({
  renderer,
  scene,
  camera,                      // 可选，自定义相机
  pointBudget: 1_000_000,     // 点预算
  enableWorkerDecoding: true,  // 启用 Worker 解码
  maxConcurrentLoads: 8       // 最大并发加载数
});

// 添加点云
viewer.addPointCloud(octree, 'cloud1');

// 移除点云
viewer.remove('cloud1');

// 获取点云
const cloud = viewer.getPointCloud('cloud1');
const allClouds = viewer.getPointClouds();

// 渲染循环
viewer.startAnimation();
viewer.stopAnimation();
viewer.render();  // 手动渲染

// 清理
viewer.destroy();
```

**系统整合**：
```typescript
// Viewer 内部整合了完整的系统栈
this.scheduler.addSystem(this.streamingSystem);
this.scheduler.addSystem(this.traversalSystem);

// 连接系统：Traversal → Streaming
private updateVisibleNodes(): void {
  const result = this.traversalSystem.getLastResult();

  for (const visibleNode of result.visibleNodes) {
    if (!node.loaded && !node.loading) {
      this.streamingSystem.requestLoad(octree, node, priority);
    }
  }
}
```

### 2. PotreeLoader 类

```typescript
import { PotreeLoader } from '@better-potree/viewer';

const loader = new PotreeLoader({
  workerPool,                 // Worker Pool
  customFileLoader            // 可选，自定义文件加载器（用于本地文件系统）
});

// 加载 Potree 点云
const octree = await loader.load('cloud.json');

// 支持的格式
// - Potree 1.x: cloud.js
// - Potree 2.0: metadata.json
```

**版本兼容**：
```typescript
// 自动检测版本
const version = new Version(metadata.version);

if (version.upTo('1.7')) {
  // Potree 1.x 处理
} else {
  // Potree 2.0+ 处理
}
```

**Proxy 节点支持**：
```typescript
// Potree 2.0 三种节点类型
interface IPointCloudOctreeNode {
  nodeType?: number;  // 0: normal, 1: leaf, 2: proxy
  hierarchyByteOffset?: number | bigint;
  hierarchyByteSize?: number | bigint;
}
```

### 3. BinaryDecoderWorker

在 Web Worker 中解码 Potree 二进制数据。

**关键修复**（参考 CLAUDE.md）：

1. **交错布局处理**：
```typescript
// ✅ 正确的属性偏移计算
const getAttributeOffset = (attrName: string): number => {
  let offset = 0;
  for (const attr of pointAttributes.attributes) {
    if (attr.name === attrName) return offset;
    offset += attr.byteSize;
  }
  return 0;
};

// 读取属性
const attrOffset = getAttributeOffset('RGB');
for (let j = 0; j < numPoints; j++) {
  const offset = attrOffset + j * pointAttributes.byteSize;
  // 读取数据...
}
```

2. **点数计算修复**：
```typescript
// ✅ 防止越界的点数计算
const actualNumPoints = Math.floor(buffer.byteLength / bytesPerPoint);
const numPoints = metadataNumPoints !== undefined
  ? Math.min(metadataNumPoints, actualNumPoints)
  : actualNumPoints;

// 添加不匹配警告
if (metadataNumPoints !== undefined && metadataNumPoints !== actualNumPoints) {
  console.warn(`Point count mismatch: metadata=${metadataNumPoints}, actual=${actualNumPoints}`);
}
```

### 4. EarthControls（相机控制）

```typescript
import { EarthControls } from '@better-potree/viewer';

const controls = new EarthControls(viewer, camera, domElement);

// 启用/禁用控制
controls.enabled = true;

// 设置轴心
controls.pivot.copy(new THREE.Vector3(0, 0, 0));

// 显示/隐藏轴心指示器
controls.showPivotIndicator = true;

// 清理
controls.dispose();
```

**特性**：
- ✅ 动态旋转轴心（基于射线检测点云表面）
- ✅ 左键平移、右键旋转、滚轮缩放
- ✅ 双击动画缩放
- ✅ 触摸支持
- ✅ 集成 View 系统（Potree 平移和 pitch 限制）

### 5. WorkerPool 管理

```typescript
import { WorkerPool } from '@better-potree/viewer';

const workerPool = new WorkerPool({
  workerCount: navigator.hardwareConcurrency - 1,
  workerScript: '/workers/BinaryDecoderWorker.js'
});

// 执行任务
const result = await workerPool.execute({
  buffer: arrayBuffer,
  pointAttributes: attributes,
  numPoints: 10000
});

// 清理
workerPool.dispose();
```

**特性**：
- ✅ 任务队列管理
- ✅ Worker 繁忙状态跟踪
- ✅ 自动任务分配
- ✅ 错误处理和重试

## 事件系统

### 主要事件

```typescript
// 点云加载完成
viewer.on('pointcloud-loaded', ({ pointCloud, name }) => {
  console.log(`加载完成: ${name}`);
});

// 节点加载完成
viewer.on('node-loaded', ({ pointCloud, node, data }) => {
  console.log(`节点 ${node.name} 加载完成`);
});

// 相机变化
viewer.on('camera-changed', ({ camera, position, target }) => {
  console.log('相机位置:', position);
});

// 渲染帧
viewer.on('render', ({ deltaTime, timestamp }) => {
  // 每帧回调
});
```

## 关键技术实现

### 1. Potree 格式兼容

**HTTP Range 请求支持**：
```typescript
fetch(url, {
  headers: {
    'Range': `bytes=${start}-${end}`
  }
})
```

**Proxy 节点加载**：
```typescript
// type 0: 普通节点（octree.bin 中有数据）
// type 1: 叶子节点（octree.bin 中有数据，无子节点）
// type 2: proxy 节点（需要从 hierarchy.bin 加载）
if (node.nodeType === 2) {
  await loadHierarchyChunk(node.hierarchyByteOffset, node.hierarchyByteSize);
}
```

### 2. Worker Pool 并行解码

**并发策略**：
- 默认 Worker 数量：`navigator.hardwareConcurrency - 1`
- 任务队列缓冲
- 自动任务分配

**移除 Transferables**（关键修复）：
```typescript
// ❌ 错误：使用 transferables 导致 buffer detached
self.postMessage({ buffer: arrayBuffer }, [arrayBuffer]);

// ✅ 正确：不使用 transferables
self.postMessage({ buffer: arrayBuffer });
```

### 3. LOD 加载策略

**防止过度加载**：
```typescript
const MAX_LOADS_PER_FRAME_PER_CLOUD = 5;

// 收集未加载节点并按优先级排序
const unloadedNodes = visibleNodes
  .filter(vn => !vn.node.loaded && !vn.node.loading)
  .map(vn => ({ node: vn.node, priority: vn.priority }))
  .sort((a, b) => b.priority - a.priority);

// 只请求前 N 个节点
const nodesToLoad = unloadedNodes.slice(0, MAX_LOADS_PER_FRAME_PER_CLOUD);
```

## API 参考

### Viewer

```typescript
class Viewer {
  constructor(config: ViewerConfig);

  // 点云管理
  addPointCloud(octree: IPointCloudOctree, name: string): void;
  remove(pointCloud: IPointCloudOctree | string): void;
  getPointCloud(name: string): IPointCloudOctree | undefined;
  getPointClouds(): IPointCloudOctree[];

  // 渲染循环
  startAnimation(): void;
  stopAnimation(): void;
  render(): void;

  // 访问器
  getCamera(): THREE.Camera;
  getScene(): IScene;
  getRenderer(): IRenderer;
  getWorkerPool(): WorkerPool;

  // 生命周期
  destroy(): void;
}
```

### PotreeLoader

```typescript
class PotreeLoader {
  constructor(config?: {
    workerPool?: WorkerPool;
    customFileLoader?: (url: string) => Promise<ArrayBuffer | string>;
  });

  load(url: string): Promise<IPointCloudOctree>;
}
```

### EarthControls

```typescript
class EarthControls {
  constructor(viewer: Viewer, camera: THREE.Camera, domElement: HTMLElement);

  enabled: boolean;
  pivot: THREE.Vector3;
  showPivotIndicator: boolean;

  dispose(): void;
}
```

## 性能优化建议

1. **Worker Pool 大小**：根据 CPU 核心数调整 Worker 数量
2. **点预算管理**：根据硬件能力设置合理的 pointBudget
3. **并发加载控制**：调整 maxConcurrentLoads 避免网络拥塞
4. **内存限制**：配置 LRU 缓存的内存限制（默认 500MB）

## 注意事项

### 1. Potree 格式兼容性

- ✅ Potree 1.x：cloud.js
- ✅ Potree 2.0：metadata.json
- ✅ 支持所有标准 Potree 属性

### 2. Worker 相关

- Worker 脚本路径必须正确
- Worker 数量建议为 CPU 核心数 - 1
- 不要使用 transferables（会导致 buffer detached）

### 3. 内存管理

- 使用 LRU 缓存自动管理内存
- 默认内存限制：500MB
- 不再需要的点云应调用 `remove()` 清理

### 4. 资源清理

```typescript
// 清理查看器
viewer.destroy();

// 内部会自动：
// 1. 停止动画
// 2. 移除所有点云（包括几何体清理）
// 3. 销毁系统
// 4. 清理 Worker Pool
// 5. 清理渲染器
// 6. 移除事件监听器
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
