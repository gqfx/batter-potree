# @better-potree/core

> Better Potree 的核心基础包，提供框架无关的点云渲染核心能力

## 概述

`@better-potree/core` 是 Better Potree 项目的基础核心包，提供了**零渲染依赖**的纯逻辑层。它专注于点云渲染引擎的核心算法和数据结构，作为整个 monorepo 的基础，被 `@better-potree/rendering-three` 和 `@better-potree/viewer` 依赖。

### 核心定位

- **数据结构定义**：八叉树、点属性、LOD 节点等核心数据结构
- **类型系统**：完整的 TypeScript 类型定义，为其他包提供类型安全保障
- **算法实现**：LOD 选择、视锥剔除、点预算管理等核心算法
- **状态管理**：基于 Zustand 的配置状态管理和运行时状态管理
- **系统架构**：ECS（Entity-Component-System）架构和系统调度器
- **资源管理**：LRU 缓存、Worker Pool、内存管理等

## 核心特性

### 双层状态架构

采用创新的 **Config + Runtime** 双层状态架构：

- **Config 层**：不可变、可序列化、低频更新（用户配置）
- **Runtime 层**：可变、不可序列化、高频更新（每帧状态）
- **StateCoordinator**：单向同步 Config → Runtime

**优势**：
- ✅ 零 GC 压力的运行时状态更新
- ✅ 清晰的关注点分离
- ✅ 支持配置持久化和快照

### 系统架构

基于 ECS（Entity-Component-System）架构：

- **ECS World**：轻量级 ECS 实现，专为点云场景优化
- **System Scheduler**：管理和调度所有系统的执行顺序
- **TraversalSystem**：LOD 遍历系统（650+ 行）
- **StreamingSystem**：数据流式加载系统（600+ 行）

**系统阶段**：INPUT (0) → UPDATE (100) → RENDER (200) → CLEANUP (300)

### 高性能资源管理

- **LRU 缓存策略**：基于内存大小自动卸载最久未使用的节点
- **精确内存计算**：遍历 BufferGeometry 的所有属性和索引
- **Worker Pool**：管理多个 Web Worker 实例，支持并行数据解码
- **点预算管理**：控制每帧渲染点数，平衡性能和质量

### 完整的类型系统

- **严格模式**：启用 TypeScript strict 模式
- **接口优先**：使用接口（`I` 前缀）定义契约
- **泛型约束**：广泛使用泛型保证类型安全
- **类型安全的事件系统**：基于 eventemitter3 的强类型事件发射器

## 安装

```bash
npm install @better-potree/core
# 或
pnpm add @better-potree/core
```

## 快速开始

### 基础示例

```typescript
import * as THREE from 'three';
import {
  PointCloudOctree,
  PointAttributes,
  PointAttribute,
  SystemScheduler,
  TraversalSystem,
  StreamingSystem,
} from '@better-potree/core';

// 1. 创建点属性配置
const pointAttributes = new PointAttributes([
  PointAttribute.POSITION_CARTESIAN,
  PointAttribute.RGB_PACKED,
  PointAttribute.INTENSITY
]);

// 2. 创建点云八叉树
const boundingBox = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(100, 100, 100)
);

const octree = new PointCloudOctree(
  boundingBox,
  1.0,  // 基础间距
  pointAttributes
);

// 3. 配置渲染参数
octree.pointBudget = 1_000_000;
octree.minimumNodePixelSize = 150;

// 4. 创建系统调度器
const scheduler = new SystemScheduler();

// 5. 添加系统
const traversalSystem = new TraversalSystem({
  pointBudget: 1_000_000,
  minScreenSize: 1.0
});

const streamingSystem = new StreamingSystem({
  maxConcurrentLoads: 8
});

scheduler.addSystem(traversalSystem);
scheduler.addSystem(streamingSystem);

// 6. 在渲染循环中更新
function render() {
  const deltaTime = 16; // ms
  scheduler.update(deltaTime);

  // 获取可见节点
  const result = traversalSystem.getLastResult();
  console.log(`可见节点数: ${result.visibleNodes.length}`);

  requestAnimationFrame(render);
}

render();
```

## 核心模块

### 1. 点属性系统

```typescript
import { PointAttribute, PointAttributes, PointAttributeDataType } from '@better-potree/core';

// 使用标准预定义属性
const positionAttr = PointAttribute.POSITION_CARTESIAN;
console.log(positionAttr.byteSize); // 12 (3 个 float，每个 4 字节)

// 创建自定义属性
const customAttr = new PointAttribute(
  'CustomData',
  PointAttributeDataType.FLOAT,
  3  // 3 个元素
);

// 管理属性集合
const attributes = new PointAttributes();
attributes.add(PointAttribute.POSITION_CARTESIAN);
attributes.add(PointAttribute.RGB_PACKED);
attributes.add(PointAttribute.INTENSITY);

console.log(attributes.byteSize);  // 总字节大小
console.log(attributes.getAttributeOffset('INTENSITY'));  // 属性偏移
```

**重要**：Potree 使用**交错布局**存储点数据，每个点包含所有属性：

```
Point 0: [position(12) + intensity(2) + RGB(6) + ...]
Point 1: [position(12) + intensity(2) + RGB(6) + ...]
```

读取点 j 的属性 A 的位置公式：

```typescript
const offset = attrOffset + j * pointAttributes.byteSize
```

### 2. 八叉树系统

```typescript
import { OctreeNode, PointCloudOctree } from '@better-potree/core';

// 创建根节点
const rootBox = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(100, 100, 100)
);
const rootNode = new OctreeNode('r', rootBox, 1.0, 0);

// 创建子节点 (八叉树索引 0-7)
const child0 = rootNode.createChild(0);  // 名称: 'r0'
const child1 = rootNode.createChild(1);  // 名称: 'r1'

// 计算子节点边界框
const childBox = OctreeNode.computeChildBoundingBox(rootBox, 0);

// 遍历八叉树
octree.traverse((node) => {
  console.log(`节点 ${node.name}: ${node.numPoints} 个点`);
});
```

**八分位索引模式**：
```
0: -X, -Y, -Z    4: -X, -Y, +Z
1: +X, -Y, -Z    5: +X, -Y, +Z
2: -X, +Y, -Z    6: -X, +Y, +Z
3: +X, +Y, -Z    7: +X, +Y, +Z
```

### 3. LOD 选择和遍历

```typescript
import { LODSelector, TraversalSystem } from '@better-potree/core';

const params = {
  cameraPosition: new THREE.Vector3(50, 50, 50),
  screenWidth: 1920,
  screenHeight: 1080,
  fov: 60,
  minimumNodePixelSize: 150
};

// 计算节点的屏幕像素半径
const pixelRadius = LODSelector.calculateScreenPixelRadius(node, params);

// 判断节点是否应该渲染
const shouldRender = LODSelector.shouldRender(node, params);

// 计算加载优先级 (返回值越大优先级越高)
const priority = LODSelector.calculatePriority(node, params);
```

**TraversalSystem** 使用 **BinaryHeap 优先级队列** 实现最优遍历：
1. 计算节点的屏幕空间投影大小作为优先级
2. 从根节点开始，将子节点加入优先队列
3. 每次弹出优先级最高的节点
4. 当点预算用尽时停止遍历

### 4. 资源管理

```typescript
import { NodeResourceManager } from '@better-potree/core';

const resourceManager = new NodeResourceManager({
  memoryLimit: 500 * 1024 * 1024,  // 500MB
  cleanupThreshold: 0.9             // 90%
});

// 注册节点资源
resourceManager.register('node-id', geometry);

// 标记节点为已使用（更新 LRU）
resourceManager.touch('node-id');

// 获取缓存统计
const stats = resourceManager.getStats();
console.log(`命中率: ${stats.hitRate}`);
console.log(`内存使用: ${stats.memoryUsage} bytes`);

// 手动释放内存
resourceManager.freeMemory(400 * 1024 * 1024); // 释放至 400MB
```

**LRU 缓存特性**：
- ✅ 双向链表 + HashMap 实现 O(1) 访问和更新
- ✅ 精确计算 BufferGeometry 的内存大小
- ✅ 自动调用 Three.js 的 `geometry.dispose()` 释放 GPU 资源

### 5. 状态管理

```typescript
import { ConfigStore, Runtime, StateCoordinator } from '@better-potree/core';

// Config 层（不可变状态）
const configStore = ConfigStore.create();

// 添加数据源
configStore.getState().addSource({
  id: 'cloud1',
  url: 'cloud.json',
  visible: true
});

// Runtime 层（可变状态）
const runtime = new Runtime();
runtime.camera = camera;
runtime.visibleNodes = new Set(['r', 'r0', 'r1']);

// StateCoordinator（状态协调器）
const coordinator = new StateCoordinator({
  configStore,
  runtime,
  ecsWorld,
  octreeManager
});

coordinator.start(); // 开始监听 Config 变更并同步到 Runtime
```

### 6. 系统调度器

```typescript
import { SystemScheduler, SystemStage } from '@better-potree/core';

const scheduler = new SystemScheduler({
  errorHandler: (error, systemName) => {
    console.error(`系统 ${systemName} 错误:`, error);
  }
});

// 添加系统（按阶段分组）
scheduler.addSystem(traversalSystem, {
  stage: SystemStage.UPDATE,
  priority: 100
});

scheduler.addSystem(streamingSystem, {
  stage: SystemStage.UPDATE,
  priority: 50
});

// 启动调度器
scheduler.start();

// 在渲染循环中更新
function render() {
  scheduler.update(16); // deltaTime in ms
  requestAnimationFrame(render);
}

// 停止并清理
scheduler.stop();
scheduler.dispose();
```

**系统阶段执行顺序**：
1. **INPUT** (0)：输入处理
2. **UPDATE** (100)：逻辑更新（LOD 遍历、流式加载）
3. **RENDER** (200)：渲染
4. **CLEANUP** (300)：清理

### 7. Worker Pool

```typescript
import { WorkerPool, createDecoderWorkerPool } from '@better-potree/core';

// 创建 Worker Pool
const workerPool = createDecoderWorkerPool({
  workerCount: navigator.hardwareConcurrency - 1,
  workerScript: '/workers/BinaryDecoderWorker.js'
});

// 执行任务
const result = await workerPool.execute({
  buffer: arrayBuffer,
  pointAttributes: attributes,
  numPoints: 10000
});

console.log(`解码完成: ${result.numPoints} 个点`);

// 清理
workerPool.dispose();
```

### 8. 类型安全的事件系统

```typescript
import { TypedEventEmitter } from '@better-potree/core';
import type { PointCloudEvents } from '@better-potree/core';

const emitter = new TypedEventEmitter<PointCloudEvents>();

// 订阅事件 (完全类型安全)
emitter.on('node-loaded', (data) => {
  console.log(`节点 ${data.node.name} 已加载`);
  console.log(`点云: ${data.pointCloud.name}`);
});

// 一次性事件监听
emitter.once('visibility-changed', (data) => {
  console.log(`可见性: ${data.visible}`);
});

// 发射事件
emitter.emit('node-loaded', {
  node: someNode,
  pointCloud: someOctree
});
```

## 架构亮点

### 1. 双层状态架构的优势

传统单一状态管理在高频更新场景下存在性能问题：
- ❌ 不可变更新导致大量对象创建
- ❌ 序列化/反序列化开销
- ❌ 状态订阅通知开销

Better Potree 的双层架构解决方案：
- ✅ Config 层：不可变、可序列化、低频更新
- ✅ Runtime 层：可变、不可序列化、高频更新
- ✅ 零 GC 压力的运行时状态更新

### 2. 优先级队列驱动的 LOD 遍历

使用 BinaryHeap 实现最优优先遍历：
- ✅ 确保最重要的节点优先加载
- ✅ 避免深度优先遍历的盲目性
- ✅ 提高渲染质量

### 3. 系统调度器的错误隔离

每个系统的 `update()` 方法被 try-catch 包裹：
- ✅ 单个系统崩溃不影响其他系统
- ✅ 提高系统健壮性
- ✅ 便于调试和错误追踪

### 4. LRU 缓存的精确内存计算

遍历 `BufferGeometry` 的所有属性和索引，累加字节数：
- ✅ 精确的内存预算管理
- ✅ 避免内存泄漏
- ✅ 支持动态内存调整

## API 参考

### 核心类

#### `PointCloudOctree`

基于八叉树的分层 LOD 点云。

```typescript
constructor(
  boundingBox: THREE.Box3,
  spacing: number,
  pointAttributes: PointAttributes,
  offset?: THREE.Vector3
)
```

**属性**：
- `root: OctreeNode` - 八叉树的根节点
- `boundingBox: THREE.Box3` - 整个点云的边界框
- `pointBudget: number` - 最大渲染点数
- `minimumNodePixelSize: number` - LOD 选择的最小节点像素大小
- `visibleNodes: OctreeNode[]` - 可见节点列表
- `numVisiblePoints: number` - 可见点数量

**方法**：
- `findNode(name: string): OctreeNode | null` - 通过名称查找节点
- `getNodesAtLevel(level: number): OctreeNode[]` - 获取特定层级的所有节点
- `traverse(callback: (node: OctreeNode) => void): void` - 遍历八叉树
- `getTotalPoints(): number` - 获取总点数
- `dispose(): void` - 释放资源

#### `OctreeNode`

八叉树层级结构中的节点。

```typescript
constructor(
  name: string,
  boundingBox: THREE.Box3,
  spacing: number,
  level?: number
)
```

**属性**：
- `name: string` - 节点名称 (例如: "r", "r0", "r01")
- `children: (OctreeNode | null)[]` - 子节点数组（最多 8 个）
- `boundingBox: THREE.Box3` - 局部空间中的边界框
- `boundingSphere: THREE.Sphere` - 边界球
- `level: number` - 八叉树层级
- `numPoints: number` - 此节点中的点数
- `spacing: number` - 此层级的点间距
- `geometry: THREE.BufferGeometry | null` - 几何数据
- `loaded: boolean` - 几何数据是否已加载

**方法**：
- `getChild(index: number): OctreeNode | null` - 获取子节点
- `setChild(index: number, child: OctreeNode): void` - 设置子节点
- `createChild(index: number): OctreeNode` - 创建子节点
- `getChildren(): OctreeNode[]` - 获取所有非空子节点
- `isLeaf(): boolean` - 检查是否为叶节点
- `static computeChildBoundingBox(parentBox: THREE.Box3, index: number): THREE.Box3` - 计算子边界框

#### `PointAttributes`

管理点云的点属性集合。

```typescript
constructor(pointAttributeNames?: string[])
```

**属性**：
- `attributes: PointAttribute[]` - 属性数组
- `byteSize: number` - 每个点的总字节大小
- `size: number` - 属性数量

**方法**：
- `add(pointAttribute: PointAttribute): void` - 添加属性
- `hasNormals(): boolean` - 检查是否包含法线
- `hasAttribute(name: string): boolean` - 检查是否包含特定属性
- `getAttribute(name: string): PointAttribute | undefined` - 获取属性
- `getAttributeOffset(name: string): number` - 获取属性的字节偏移量

#### `SystemScheduler`

系统调度器，管理所有系统的执行顺序。

```typescript
constructor(config?: {
  errorHandler?: (error: Error, systemName: string) => void;
})
```

**方法**：
- `addSystem(system: ISystem, config?: { stage?: SystemStage; priority?: number }): void` - 添加系统
- `removeSystem(system: ISystem): void` - 移除系统
- `start(): void` - 启动调度器
- `stop(): void` - 停止调度器
- `update(deltaTime: number): void` - 更新所有系统
- `dispose(): void` - 清理资源

#### `NodeResourceManager`

节点资源管理器，使用 LRU 缓存策略。

```typescript
constructor(config?: {
  memoryLimit?: number;
  cleanupThreshold?: number;
})
```

**方法**：
- `register(id: string, geometry: THREE.BufferGeometry): void` - 注册节点资源
- `touch(id: string): void` - 标记节点为已使用
- `freeMemory(targetMemory: number): void` - 释放内存至目标限制
- `getStats(): CacheStats` - 获取缓存统计

## 依赖关系

### 外部依赖

```json
{
  "dependencies": {
    "eventemitter3": "^5.0.1",  // 事件系统
    "zustand": "^5.0.8"         // 状态管理
  },
  "peerDependencies": {
    "three": "~0.180.0"         // Three.js（类型依赖）
  }
}
```

**依赖说明**：
- **eventemitter3**：提供高性能的事件发射器基础
- **zustand**：提供简洁的 store 模式，支持订阅和不可变更新
- **three**：仅作为类型依赖，保持 Core 包的框架无关性

## 测试

```bash
# 运行测试
pnpm test

# 观察模式
pnpm test -- --watch

# 覆盖率报告
pnpm test -- --coverage
```

**测试覆盖**：
- ✅ ECS 系统测试
- ✅ 状态协调器测试
- ✅ 配置 Store 测试
- ✅ Worker Pool 测试
- ✅ 资源管理器测试
- ✅ 系统调度器测试

## 构建

```bash
# 构建所有包
pnpm build

# 仅构建 core
pnpm --filter @better-potree/core build
```

## 注意事项

1. **Potree 格式兼容**：完全支持 Potree 1.x 和 2.0 格式
2. **交错布局**：正确处理 Potree 的交错属性布局
3. **内存管理**：使用 LRU 缓存自动管理内存
4. **点预算**：应该在每个渲染帧开始时使用 `reset()` 重置
5. **资源清理**：在不再需要时记得调用 `dispose()` 清理资源

## 许可证

BSD-2-Clause

---

**Better Potree** - 现代化的 WebGL 点云查看器
