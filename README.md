# Better Potree

> 现代化的 WebGL 点云查看器，基于 [Potree](https://github.com/potree/potree) 重写

## 概述

Better Potree 是 Potree 点云查看器的完全重写版本，专注于：

- **现代架构**：清晰的模块化设计，关注点分离
- **TypeScript 优先**：完整的类型安全，启用严格模式
- **Monorepo 结构**：独立、可测试的包
- **高性能**：优化的渲染和加载策略
- **可扩展性**：基于插件的架构，易于定制
- **开发者体验**：完整的文档、测试和工具链

## 项目结构

```
better-potree/
├── packages/
│   ├── core/               # 核心逻辑（零渲染依赖）
│   ├── rendering-three/    # Three.js 渲染实现
│   └── viewer/             # 高级查看器 API
└── apps/
    └── playground/         # 开发调试环境
```

### 包依赖关系

```
@better-potree/viewer
  ├── @better-potree/core (核心逻辑)
  │     └── 提供：TypedEventEmitter, SystemScheduler,
  │                TraversalSystem, StreamingSystem
  │
  └── @better-potree/rendering-three (Three.js 实现)
        └── 提供：ThreeRenderer, PointCloudMaterial,
                   PointCloudScene, EDLRenderer
```

## 核心特性

### 🚀 高性能渲染

- **WebGL2 渲染**：强制使用 WebGL2，利用现代 GPU 特性
- **LOD 管理**：优先级队列驱动的 LOD 遍历，确保最重要的节点优先加载
- **流式加载**：最多支持 8 个并发加载，Worker Pool 并行解码
- **内存管理**：LRU 缓存策略，自动管理 GPU 内存（默认 500MB）
- **点预算控制**：每帧最大渲染点数控制，平衡性能和质量

### 📦 Potree 格式完整支持

- ✅ Potree 1.x 格式（cloud.js）
- ✅ Potree 2.0 格式（metadata.json）
- ✅ Proxy 节点支持（三种节点类型：normal/leaf/proxy）
- ✅ HTTP Range 请求支持（按需加载节点数据）
- ✅ Hierarchy.bin 层级加载
- ✅ 交错布局正确处理

### 🎨 丰富的材质系统

**12+ 种着色模式**：
- RGB、INTENSITY、CLASSIFICATION、ELEVATION
- RETURN_NUMBER、NORMAL、LEVEL_OF_DETAIL、MATCAP
- GPS_TIME、POINT_INDEX、COMPOSITE

**3 种点大小类型**：
- FIXED（固定）、ATTENUATED（衰减）、ADAPTIVE（自适应）

**3 种点形状**：
- SQUARE（方形）、CIRCLE（圆形）、PARABOLOID（高质量 HQ Splat）

### 🔧 高级功能

- **Eye-Dome Lighting (EDL)**：增强深度感知
- **Clip Box 裁剪**：支持动态数量的裁剪盒
- **Shadow Mapping**：PCF 软阴影，多光源支持
- **属性过滤**：GPS 时间、回波编号、点源 ID 等
- **EarthControls**：Potree 风格的相机控制

## 快速开始

### 环境要求

- Node.js >= 20.0.0
- pnpm >= 8.0.0
- 浏览器支持 WebGL2

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/better-potree.git
cd better-potree

# 安装依赖
pnpm install

# 构建所有包
pnpm build
```

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
  enableWorkerDecoding: true
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

## 包说明

### [@better-potree/core](./packages/core)

> 核心基础包，提供框架无关的点云渲染核心能力

**核心特性**：
- 双层状态架构（Config + Runtime）
- ECS 系统架构（Entity-Component-System）
- 系统调度器（TraversalSystem, StreamingSystem）
- LRU 缓存和资源管理
- Worker Pool 管理
- 类型安全的事件系统

**关键技术**：
- ✅ 零渲染依赖，框架无关
- ✅ 优先级队列驱动的 LOD 遍历
- ✅ 精确的内存计算和管理
- ✅ 错误隔离的系统调度

[查看完整文档 →](./packages/core/README.md)

### [@better-potree/rendering-three](./packages/rendering-three)

> 基于 Three.js 和 WebGL2 的高性能点云渲染实现

**核心特性**：
- 强制 WebGL2 上下文
- 功能丰富的点云材质系统（12+ 种着色模式）
- Eye-Dome Lighting (EDL) 后处理
- PCF 软阴影和高质量点渲染

**关键技术**：
- ✅ Shader Defines 驱动的零运行时开销特性系统
- ✅ 统一材质 + onBeforeRender Hook 节省内存
- ✅ 自适应点大小和多种点形状支持
- ✅ 分类系统纹理化（零 CPU 开销）

[查看完整文档 →](./packages/rendering-three/README.md)

### [@better-potree/viewer](./packages/viewer)

> 开箱即用的点云查看器 API，提供完整的点云可视化解决方案

**核心特性**：
- Potree 1.x 和 2.0 完整支持
- Worker Pool 并行解码
- EarthControls 相机控制
- 完整的事件系统

**关键技术**：
- ✅ 正确处理 Potree 交错布局
- ✅ Proxy 节点支持（Potree 2.0）
- ✅ 防止越界的点数计算
- ✅ 移除 Transferables 避免 buffer detached

[查看完整文档 →](./packages/viewer/README.md)

## 开发

### 运行 Playground

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

### 测试

```bash
# 运行所有测试
pnpm test

# 运行测试 UI
pnpm test:ui

# 生成覆盖率报告
pnpm test -- --coverage
```

### 代码检查

```bash
# Lint
pnpm lint

# 格式化
pnpm format
```

## 架构亮点

### 1. 双层状态架构

**问题**：传统单一状态管理在高频更新场景下存在性能问题
- ❌ 不可变更新导致大量对象创建
- ❌ 序列化/反序列化开销

**解决方案**：
- ✅ Config 层：不可变、可序列化、低频更新
- ✅ Runtime 层：可变、不可序列化、高频更新
- ✅ 零 GC 压力的运行时状态更新

### 2. 优先级队列驱动的 LOD 遍历

使用 BinaryHeap 实现最优优先遍历：
- ✅ 确保最重要的节点优先加载
- ✅ 避免深度优先遍历的盲目性
- ✅ 提高渲染质量

### 3. Shader Defines 驱动的特性系统

通过预处理器指令实现零运行时开销的特性切换：
- ✅ 零分支开销：不使用的代码直接从 shader 中移除
- ✅ 编译器优化：GPU 可以针对特定配置优化

### 4. 统一材质管理

所有节点共享一个材质实例，节点级 uniforms 通过 onBeforeRender hook 动态更新：
- ✅ 内存节省：10,000 个节点只需 1 个材质实例
- ✅ 编译优化：shader 只编译一次

## 性能优化技术

1. **材质共享**：所有节点共享一个材质实例
2. **Shader Defines 消除分支**：通过预处理器指令
3. **自适应点大小**：基于八叉树 spacing 和透视投影
4. **PCF 软阴影**：3x3 采样核心的平滑阴影
5. **LRU 缓存**：自动管理 GPU 内存
6. **Worker Pool**：并行解码，充分利用多核 CPU

## 关键修复

### 1. Potree 2.0 Proxy 节点支持（2025-11-25）

添加了 Potree 2.0 的三种节点类型支持：
- type 0: 普通节点
- type 1: 叶子节点
- type 2: proxy 节点（需要从 hierarchy.bin 加载）

```typescript
interface IPointCloudOctreeNode {
  nodeType?: number;
  hierarchyByteOffset?: number | bigint;
  hierarchyByteSize?: number | bigint;
}
```

### 2. 点数计算修复（2025-11-25）

防止 DataView bounds 错误：

```typescript
const actualNumPoints = Math.floor(buffer.byteLength / bytesPerPoint);
const numPoints = metadataNumPoints !== undefined
  ? Math.min(metadataNumPoints, actualNumPoints)
  : actualNumPoints;
```

### 3. 交错布局属性偏移计算（2025-11-20）

正确处理 Potree 的交错属性布局：

```typescript
const attrOffset = getAttributeOffset('RGB');  // 固定偏移
const offset = attrOffset + j * pointByteSize; // 点索引 * 总字节数
```

## 测试覆盖

- ✅ ECS 系统测试
- ✅ 状态协调器测试
- ✅ Worker Pool 测试
- ✅ 资源管理器测试
- ✅ 系统调度器测试
- ✅ 材质和渲染测试
- ✅ 加载器测试

## 贡献

欢迎贡献！请在提交 PR 前阅读我们的贡献指南。

## 许可证

BSD-2-Clause - 详见 [LICENSE](./LICENSE)

本项目基于 Markus Schütz 的 [Potree](https://github.com/potree/potree)。

## 致谢

- [Potree](https://github.com/potree/potree) - 原始的点云查看器
- [Three.js](https://threejs.org/) - 3D 渲染库
- 所有贡献者和支持者

---

**Better Potree** - 现代化的 WebGL 点云查看器
