# Better Potree 开发指南

> 本文档为 AI 辅助开发提供项目上下文和关键技术要点

## 项目概述

Better Potree 是基于 [Potree](https://github.com/potree/potree) 的现代化 WebGL 点云查看器重写版本。

## 规则
1. devtool mcp中读取日志是，限制只读前10条，避免过多日志导致上下文被填满

### 核心特性
- **现代架构**: 模块化设计，清晰的关注点分离
- **TypeScript 优先**: 启用严格模式的完整类型安全
- **Monorepo 结构**: 独立、可测试的包
- **高性能**: 优化的渲染和加载策略
- **可扩展性**: 基于插件的架构

---

## 项目结构

```
better-potree/
├── packages/
│   ├── core/                # 核心点云逻辑 + 类型定义 + 事件系统
│   ├── rendering-three/     # Three.js 渲染实现
│   └── viewer/              # 高级查看器 API + Potree 格式加载器
└── apps/
    └── playground/          # 开发调试环境
```

### 包依赖关系
- `@better-potree/core`: 基础包，无外部依赖
- `@better-potree/rendering-three`: 依赖 core + Three.js
- `@better-potree/viewer`: 依赖 core + rendering-three

---

## 开发命令

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 开发模式（启动 playground）
pnpm dev

# 运行测试
pnpm test

# 测试 UI 界面
pnpm test:ui

# 代码检查和格式化
pnpm lint
pnpm format
```

---

## 关键技术要点

### 1. Potree 点云数据格式

#### 1.1 Potree 2.0 文件结构

Potree 2.0 使用两个主要文件存储点云数据：

**octree.bin**:
- 存储普通节点（type 0）和叶子节点（type 1）的实际点云数据
- 使用 HTTP Range 请求按需加载节点数据

**hierarchy.bin**:
- 存储 proxy 节点（type 2）的层级元数据
- 用于实现延迟加载机制

**节点类型及其数据源**:
```typescript
// type 0: 普通节点 → octree.bin
// type 1: 叶子节点 → octree.bin
// type 2: proxy 节点 → hierarchy.bin

// 正确处理节点数据源
if (node.nodeType === 2) {
  // proxy 节点：从 hierarchy.bin 加载
  const url = `${baseUrl}/hierarchy.bin`;
  const offset = node.hierarchyByteOffset;
  const size = node.hierarchyByteSize;
} else {
  // 普通/叶子节点：从 octree.bin 加载
  const url = `${baseUrl}/octree.bin`;
  const offset = node.byteOffset;
  const size = node.byteSize;
}
```

**⚠️ 常见错误**:
```typescript
// ❌ 错误：所有节点都从 octree.bin 加载
const url = `${baseUrl}/octree.bin`;
const offset = node.byteOffset;  // proxy 节点会加载错误数据！

// ✅ 正确：根据节点类型选择数据源
const isProxyNode = node.nodeType === 2;
const url = isProxyNode ? `${baseUrl}/hierarchy.bin` : `${baseUrl}/octree.bin`;
const offset = isProxyNode ? node.hierarchyByteOffset : node.byteOffset;
const size = isProxyNode ? node.hierarchyByteSize : node.byteSize;
```

---

#### 1.2 交错布局 (Interleaved Layout)

Potree 使用**交错布局**存储点云数据，每个点包含所有属性：

```
示例 (37 bytes/point):
Point 0: [position(12) + intensity(2) + classification(1) + ... + RGB(6)]
Point 1: [position(12) + intensity(2) + classification(1) + ... + RGB(6)]
Point 2: [position(12) + intensity(2) + classification(1) + ... + RGB(6)]
```

---

#### 1.3 属性偏移计算

**核心公式**：读取点 `j` 的属性 `A` 的位置：
```typescript
const offset = attrOffset + j * pointAttributes.byteSize
```

其中：
- `attrOffset`: 属性在**单个点内**的固定偏移量
- `pointAttributes.byteSize`: 单个点的总字节大小
- `j`: 点的索引

**示例**（37 字节/点）：
```typescript
// 假设 RGB 属性在点内的偏移量为 31
const rgbOffset = 31;  // 所有前置属性的总字节数

// 读取第 0 个点的 RGB：offset = 31 + 0 * 37 = 31
// 读取第 1 个点的 RGB：offset = 31 + 1 * 37 = 68
// 读取第 2 个点的 RGB：offset = 31 + 2 * 37 = 105
```

---

#### 1.4 常见错误模式 ❌

```typescript
// ❌ 错误：使用累加的 inOffset
let inOffset = 0;
for (const attr of attributes) {
  for (let j = 0; j < numPoints; j++) {
    // 错误！inOffset 在外层循环累加，导致偏移错误
    view.getUint16(inOffset + j * attr.byteSize);
  }
  inOffset += attr.byteSize * numPoints;
}

// ✅ 正确：使用固定的 attrOffset
for (const attr of attributes) {
  const attrOffset = getAttributeOffset(attr.name, pointAttributes);
  for (let j = 0; j < numPoints; j++) {
    // 正确！attrOffset 是属性在单个点内的固定偏移
    view.getUint16(attrOffset + j * pointAttributes.byteSize);
  }
}
```

---

#### 1.5 参考实现

参考 Potree 原始实现：
- 文件：`src/loader/POCLoader.js`
- 关键代码：`createChildAABB()` 中的属性读取逻辑

---

### 2. Shader 编译要求

#### 2.1 版本指令位置

GLSL 着色器的 `#version` 指令**必须在第一行**：

```glsl
#version 300 es
// ✅ 正确：版本指令在第一行

// 其他代码...
precision highp float;
```

```glsl
// 注释或空行
#version 300 es
// ❌ 错误：版本指令不在第一行，会导致编译失败
```

#### 2.2 相关文件
- `packages/rendering-three/src/shaders/pointcloud.vert.glsl`
- `packages/rendering-three/src/shaders/pointcloud.frag.glsl`
- `packages/rendering-three/src/shaders/edl.*.glsl`

---

### 3. Web Worker 数据传输

#### 3.1 Transferable Objects

使用 `postMessage` 传输大型 `ArrayBuffer` 时需要注意：

```typescript
// ✅ 推荐：不使用 transferables（避免 buffer detached）
self.postMessage({ buffer: arrayBuffer });

// ⚠️ 使用 transferables 会导致 buffer 所有权转移
self.postMessage({ buffer: arrayBuffer }, [arrayBuffer]);
// 之后 arrayBuffer 将不可用（detached）
```

**相关提交**: `dc1fd01 - fix: 移除 Worker transferables 避免 buffer detached`

#### 3.2 相关文件
- `packages/viewer/src/loaders/workers/BinaryDecoderWorker.ts`

---

### 4. HTTP Range 请求

Potree 2.0 使用 HTTP Range 请求加载节点数据：

```typescript
// 支持 Range 请求
fetch(url, {
  headers: {
    'Range': `bytes=${start}-${end}`
  }
})
```

**相关提交**: `9c1190f - fix: 添加 HTTP Range 请求支持`

---

## 最近的关键修复

### 修复 1: Potree 2.0 proxy 节点字节偏移处理 (2025-11-30)

**问题**：
- proxy 节点（type=2）的 byteOffset/byteSize 指向 hierarchy.bin，而不是 octree.bin
- 之前的代码将所有节点的 byteOffset/byteSize 都视为指向 octree.bin，导致 HTTP Range 请求加载错误数据
- 触发 DataView bounds 错误，点云无法正常显示

**根本原因**：

Potree 2.0 的节点数据存储在两个文件中：
- **octree.bin**: 存储普通节点和叶子节点的点云数据
- **hierarchy.bin**: 存储 proxy 节点的层级元数据（用于延迟加载）

不同节点类型的 byteOffset/byteSize 含义不同：
- **type 0/1** (普通/叶子节点): byteOffset/byteSize → octree.bin
- **type 2** (proxy 节点): byteOffset/byteSize → hierarchy.bin

**修复内容** (`ae8e244`):

1. **PotreeLoader.ts**: 正确解析并区分节点类型
   ```typescript
   // proxy 节点：设置 hierarchyByteOffset/hierarchyByteSize
   if (type === 2) {
     node.hierarchyByteOffset = byteOffset;
     node.hierarchyByteSize = byteSize;
   }
   // 普通节点：设置 byteOffset/byteSize
   else {
     node.byteOffset = byteOffset;
     node.byteSize = byteSize;
   }
   ```

2. **StreamingSystem.ts**: 检测并暂时跳过 proxy 节点
   ```typescript
   // 检测 proxy 节点
   if (node.nodeType === 2) {
     console.log(`[StreamingSystem] Skipping proxy node ${node.name} (hierarchy chunk loading not yet implemented)`);
     continue;
   }
   ```

**影响**：
- ✅ 修复了 buffer 大小不匹配导致的 DataView bounds 错误
- ✅ 点云可以正常加载和显示（跳过 proxy 节点）
- ✅ 为后续实现 proxy 节点的 hierarchy chunk 加载奠定基础

**相关文件**：
- `packages/viewer/src/loaders/PotreeLoader.ts`
- `packages/core/src/systems/StreamingSystem.ts`

---

### 修复 2: Potree 2.0 proxy 节点类型定义 (2025-11-25)

**问题**：
- Potree 2.0 点云加载时出现 404 错误
- DataView bounds 错误：元数据中的 `numPoints` 可能与实际 buffer 大小不匹配

**修复 1 - 添加 Potree 2.0 节点类型定义** (`f4c737a`):

Potree 2.0 使用三种节点类型进行分层加载：
- **type 0**: 普通节点（octree.bin 中有数据）
- **type 1**: 叶子节点（octree.bin 中有数据，无子节点）
- **type 2**: proxy 节点（层级未加载，需要从 hierarchy.bin 加载）

在 `IPointCloudOctreeNode` 接口中添加了以下字段：

```typescript
export interface IPointCloudOctreeNode {
  // ...existing fields

  /**
   * Node type (Potree 2.0):
   * - 0: normal node
   * - 1: leaf node
   * - 2: proxy node (需要加载 hierarchy chunk)
   */
  nodeType?: number;

  /**
   * hierarchy.bin 中的字节偏移（proxy 节点）
   */
  hierarchyByteOffset?: number | bigint;

  /**
   * hierarchy.bin 中的字节大小（proxy 节点）
   */
  hierarchyByteSize?: number | bigint;
}
```

**修复 2 - BinaryDecoderWorker 点数计算防止越界** (`e0baac7`):

根本问题：元数据中的 `numPoints` 可能大于实际 buffer 能容纳的点数。

```typescript
// ❌ 错误：直接使用元数据中的 numPoints
const numPoints = event.data.numPoints;

// ✅ 正确：根据实际 buffer 大小计算点数
const bytesPerPoint = pointAttributes.byteSize;
const actualNumPoints = Math.floor(buffer.byteLength / bytesPerPoint);
const metadataNumPoints = event.data.numPoints;

// 使用两者中的较小值，确保不会越界
const numPoints = metadataNumPoints !== undefined
  ? Math.min(metadataNumPoints, actualNumPoints)
  : actualNumPoints;

// 添加不匹配警告
if (metadataNumPoints !== undefined && metadataNumPoints !== actualNumPoints) {
  console.warn(`Point count mismatch: metadata=${metadataNumPoints}, actual=${actualNumPoints}`);
}
```

**影响**：
- ✅ 定义了 Potree 2.0 节点类型系统
- ✅ 为 proxy 节点处理提供了基础接口
- ✅ 修复了点数计算越界问题

**相关文件**：
- `packages/core/src/types/potree.ts`
- `packages/viewer/src/loaders/workers/BinaryDecoderWorker.ts`

---

### 修复 3: BinaryDecoderWorker 属性偏移计算错误 (2025-11-20)

**问题**：
- DataView bounds 错误持续出现
- 根本原因：使用累加的 `inOffset` 导致属性偏移计算错误

**修复**：
1. 引入 `getAttributeOffset()` 函数正确计算属性偏移
2. 修复所有属性读取：使用 `attrOffset + j * pointByteSize`
3. 修复 Normal 解码函数：
   - `decodeSphereMapping()`
   - `decodeOct16Normals()`

**测试覆盖**：
- 添加属性偏移计算测试
- 添加交错缓冲区 RGB 读取测试
- 总计 31 个单元测试全部通过

**相关提交**: `60098d1`

**相关文件**：
- `packages/viewer/src/loaders/workers/BinaryDecoderWorker.ts`
- `packages/viewer/src/loaders/__tests__/BinaryDecoderWorker.test.ts`

---

### 修复 4: ThreeJsRenderer 接口对齐 (2025-11-19)

**问题**：
- `Viewer.ts` 调用 `renderer.render(scene, camera)` 时类型不匹配

**修复**：
- 实现标准的 `render(scene, camera)` 方法
- 移除低级别的 `render(buffer, material, matrix)` 方法
- 删除不需要的 `viewMatrix` 和 `projectionMatrix` 字段

**相关提交**: `1ec6c12`

---

### 修复 5: Shader 编译错误 (早期)

**问题**：
- GLSL 着色器编译失败

**修复**：
- 将 `#version 300 es` 移到文件第一行

**相关文件**：
- `packages/rendering-three/src/shaders/*.glsl`

---

## 测试策略

### 单元测试
```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
pnpm --filter @better-potree/viewer test

# 观察模式
pnpm test -- --watch

# 覆盖率报告
pnpm test -- --coverage
```

### 测试框架
- **Vitest**: 快速的单元测试框架
- **Testing Library**: 组件测试（如需要）

---

## 代码规范

### Linter & Formatter
- **Biome**: 统一的代码检查和格式化工具

### TypeScript 配置
- 启用 `strict` 模式
- 路径别名配置在各包的 `tsconfig.json`

### 命名约定
- 接口：`I` 前缀（如 `IRenderer`）
- 类型：PascalCase（如 `PointAttribute`）
- 枚举：PascalCase（如 `PointAttributeType`）

---

## 调试技巧

### Playground 调试
```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
# 使用浏览器开发者工具调试
```

### Worker 调试
- 在 Chrome DevTools 中查看 Worker 线程
- 使用 `console.log` 输出调试信息（会显示在主线程控制台）

### Shader 调试
- 使用 [Spector.js](https://spector.babylonjs.com/) 捕获 WebGL 调用
- 检查 Three.js 的 `renderer.info` 对象

---

## 性能优化要点

### 1. LOD (Level of Detail)
- 基于八叉树的 LOD 管理
- 优先级队列遍历替代深度优先遍历

### 2. GPU 加速
- GPU 可见性剔除
- 可见性纹理用于 LOD 遍历

### 3. 内存管理
- 基于内存大小的 LRU 缓存自动卸载
- Worker Pool 管理器

---

## 常见问题排查

### 问题 1: DataView bounds 错误
**原因**: 属性偏移计算错误或点数计算错误
**解决**: 参考"属性偏移计算"章节和"修复 1"中的点数计算修复

### 问题 2: Shader 编译失败
**原因**: `#version` 指令位置错误
**解决**: 确保 `#version 300 es` 在文件第一行

### 问题 3: Worker buffer detached
**原因**: 使用了 transferables
**解决**: 移除 `postMessage` 的第二个参数

### 问题 4: 点云加载失败
**可能原因**:
- HTTP Range 请求未支持
- 元数据解析错误
- 属性格式不匹配
- Potree 2.0 proxy 节点未正确处理

**排查步骤**:
1. 检查网络请求（DevTools Network 标签）
2. 检查控制台错误
3. 验证点云文件格式（Potree 1.x vs 2.0）
4. 检查 proxy 节点类型和 hierarchy 加载

---

## 参考资源

### 官方文档
- [Potree](https://github.com/potree/potree)
- [Three.js](https://threejs.org/docs/)

### 项目文档
- `docs/` - 详细的架构和 API 文档
- `plan.md` - 开发路线图
- `PROJECT_STATUS.md` - 项目状态报告

### 相关技术
- [WebGL 2.0 规范](https://www.khronos.org/registry/webgl/specs/latest/2.0/)
- [GLSL ES 3.00 规范](https://www.khronos.org/registry/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)

---

## 提交规范

使用简洁的中文 commit message：

```bash
# 功能
feat: 添加 XXX 功能

# 修复
fix: 修复 XXX 问题

# 文档
docs: 更新 XXX 文档

# 测试
test: 添加 XXX 测试

# 重构
refactor: 重构 XXX 模块

# 性能
perf: 优化 XXX 性能

# 工具
chore: 更新构建配置
```

---

## 开发工作流

1. **拉取最新代码**
   ```bash
   git pull origin main
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **开发和测试**
   ```bash
   pnpm dev      # 启动开发服务器
   pnpm test     # 运行测试
   ```

4. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能"
   ```

5. **推送代码**
   ```bash
   git push origin main
   ```

---

*最后更新: 2025-11-30*
