# Better-Potree 架构说明

> 本文档是 `dev_docs/architecture-v8.md` 的精简版，面向开发者和贡献者

## 架构概览

Better-Potree 采用**分层状态管理 + ECS + 八叉树**的架构设计。

```
┌─────────────────────────────────────────────────────────┐
│                   Viewer Layer                          │
│  (@better-potree/viewer: PointCloudViewer, Controls)    │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                 Rendering Layer                         │
│  (@better-potree/rendering-three: ThreeRenderer)        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                    Core Layer                           │
│  (@better-potree/core: Engine, StateCoordinator, ECS)   │
└─────────────────────────────────────────────────────────┘
```

## 核心原则

### 1. 分层状态管理

状态分为两层：

**配置层 (Zustand)**:
- 低频更新（用户操作）
- 不可变数据
- 可序列化、可持久化

**运行时层 (可变)**:
- 高频更新（每帧）
- 可变集合（Set/Map）
- 零 GC 压力

```typescript
// 配置状态
const config = {
  sources: { id: 'pc1', url: '...', visible: true },
  rendering: { pointBudget: 2_000_000 }
};

// 运行时状态
const runtime = {
  visibleNodes: new Set<string>(),
  loadedNodes: new Map<string, Data>()
};
```

### 2. ECS 数据模型

使用 Entity-Component-System 模式组织数据：

```typescript
// Entity: 唯一 ID
const nodeEntity = world.createEntity();

// Component: 数据容器
world.addComponent(nodeEntity, TransformComponent, {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1]
});

// System: 逻辑处理
class LODSystem implements ISystem {
  update(delta: number, world: ECSWorld): void {
    const entities = world.query([TransformComponent, BoundsComponent]);
    // ... LOD 逻辑
  }
}
```

### 3. 八叉树空间分区

点云使用八叉树组织：

```typescript
class OctreeNode {
  name: string;           // 节点名称（如 "r0123"）
  level: number;          // 层级
  boundingBox: BBox;      // 包围盒
  children: string[];     // 子节点名称
  numPoints: number;      // 点数量
  spacing: number;        // 点间距
}
```

## 包结构

### @better-potree/core

核心逻辑包，无依赖。

**职责**:
- 状态管理（配置 + 运行时）
- ECS 系统
- 八叉树管理
- LOD 算法
- 系统调度

**关键模块**:
```
core/
├── config/           # Zustand 配置状态
├── runtime/          # 可变运行时状态
├── ecs/              # ECS 实现
├── octree/           # 八叉树管理
├── lod/              # LOD 选择器
├── scheduler/        # 系统调度器
└── systems/          # 核心系统（Traversal, Streaming）
```

### @better-potree/rendering

渲染抽象层，定义接口。

**职责**:
- 渲染器接口定义
- WebGL 工具函数
- 着色器管理

### @better-potree/rendering-three

Three.js 渲染实现。

**职责**:
- Three.js 渲染器实现
- 材质系统
- EDL 后处理
- 点云几何体

### @better-potree/viewer

高层应用层。

**职责**:
- 用户 API (PointCloudViewer)
- 相机控制（Earth, Orbit, FPS）
- 事件系统
- 点云加载器

## 数据流

```
用户操作
  ↓
ConfigStore 更新 (Zustand)
  ↓
StateCoordinator 同步
  ↓
Runtime + ECS 更新
  ↓
Systems 执行 (LOD, Streaming)
  ↓
OctreeManager 管理节点
  ↓
Renderer 渲染
```

## 关键系统

### LOD 系统

控制节点可见性：

1. **TraversalSystem**: 遍历八叉树，选择候选节点
2. **LODSelector**: 基于屏幕空间误差选择节点
3. **FrustumCuller**: 视锥剔除
4. **PointBudget**: 分配点预算

### 流式加载系统

按需加载节点数据：

1. **StreamingSystem**: 调度加载请求
2. **WorkerPool**: 多线程解码
3. **ResourceManager**: LRU 缓存管理

### 渲染系统

渲染可见节点：

1. **ThreeRenderer**: Three.js 渲染器
2. **EDL**: Eye-Dome Lighting 后处理
3. **MaterialSystem**: 材质管理

## 性能优化

### 1. 高频路径零 GC

```typescript
// 使用可变集合
visibleNodes.clear();
for (const node of newVisible) {
  visibleNodes.add(node);
}

// 避免中间数组
for (const node of octree.traverse()) {
  if (isVisible(node)) process(node);
}
```

### 2. 对象池

```typescript
const pool = new ObjectPool(() => new Vector3());
const v = pool.acquire();
// ... use v ...
pool.release(v);
```

### 3. 批处理渲染

```typescript
// 按材质分组
const batches = groupByMaterial(nodes);
for (const batch of batches) {
  renderer.renderBatch(batch); // 单次 draw call
}
```

## 扩展点

### 添加新系统

```typescript
class MySystem implements ISystem {
  readonly name = 'my-system';
  readonly stage: SystemStage = 'update';
  readonly priority = 100;

  update(delta: number, world: ECSWorld, runtime: Runtime): void {
    // 系统逻辑
  }
}

scheduler.addSystem(new MySystem());
```

### 添加新组件

```typescript
export const MyComponent = {
  name: 'my-component',
  schema: {
    myData: { type: 'f32', default: 0 }
  }
} as const;
```

### 自定义渲染器

```typescript
class MyRenderer implements IRenderer {
  render(nodes: RenderableNode[]): void {
    // 自定义渲染逻辑
  }
}
```

## 测试策略

### 单元测试

- **Core**: ECS, 八叉树, LOD 算法
- **Systems**: 系统逻辑隔离测试
- **Utils**: 工具函数

### 集成测试

- **数据流**: 配置 → 运行时 → 渲染
- **系统协作**: 多系统交互

### 性能测试

- **基准测试**: LOD, ECS, 内存
- **回归测试**: 性能不降级

## 最佳实践

### 1. 保持配置不可变

```typescript
// 好
updateConfig({ pointBudget: 3_000_000 });

// 不好
config.pointBudget = 3_000_000; // 直接修改
```

### 2. 使用类型安全

```typescript
// 使用严格类型
interface Config {
  readonly pointBudget: number;
}

// 避免 any
const data: any = {}; // ❌
const data: PointData = {}; // ✅
```

### 3. 资源清理

```typescript
class MyComponent {
  dispose(): void {
    this.eventEmitter.off('update', this.onUpdate);
    this.buffer = null;
  }
}
```

## 参考资料

- 完整架构文档: `dev_docs/architecture-v8.md`
- 开发计划: `dev_docs/llm-development-plan.md`
- 性能优化: `dev_docs/performance/`
- API 文档: `docs/api/`
