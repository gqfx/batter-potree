# Potree 现代化迁移计划 (Project "better-potree") - 最终确认版

本文档为将现有 Potree 库迁移到一个基于现代技术栈（TypeScript、Rsbuild、模块化架构）的新项目 "better-potree" 提供了一份经过优化的、可执行的任务计划。

## 0. 项目背景与关键决策

### 0.1 项目来源
- **原始项目**: Potree (https://github.com/potree/potree)
- **原始代码位置**: `D:\coding\libs\potree`
- **新项目位置**: `D:\coding\opensource\better-potree`
- **不保留原 Potree 的 git 历史**，从零开始构建新项目

### 0.2 关键架构决策

#### 数学库选择
**决策**: `@better-potree/core` 直接依赖并使用 Three.js 的数学类型

**理由**:
- Three.js 的数学库（`Vector3`, `Matrix4`, `Box3`, `Frustum` 等）成熟稳定
- 避免重复造轮子，节省开发时间
- 在渲染层和核心层之间无需进行数学类型转换
- 性能优异

**影响**:
- `@better-potree/core` 会依赖 `three` 包
- 但仍然不依赖 Three.js 的渲染类（`Scene`, `Renderer`, `Camera` 等具体实现）
- 只依赖纯数据结构和数学运算

**替代方案**（已否决）:
- 完全自己实现数学库：工作量大，收益低
- 使用 `gl-matrix`：需要在核心层和渲染层之间转换，增加复杂度

#### 事件系统选择
**决策**: 使用成熟的第三方事件库 `eventemitter3`，而非自己实现

**理由**:
- `eventemitter3` 是经过实战检验的库（~2KB，性能优异）
- TypeScript 友好，类型安全
- 功能完善（once, removeAllListeners 等）
- 社区成熟，维护活跃

**实施方式**:
- 在 `@better-potree/core` 中封装 `TypedEventEmitter` 类
- 提供类型安全的事件接口
- 可参考原 Potree 的 `EventDispatcher.js` 进行 API 设计

#### WebGL 版本选择
**决策**: 强制使用 WebGL2，不支持则报错（不降级到 WebGL1）

**理由**:
- WebGL2 支持更现代的 GLSL 3.00 ES 语法
- 更好的性能和功能
- 现代浏览器（Chrome 56+, Firefox 51+, Safari 15+）已普遍支持
- 简化着色器代码，避免多版本维护

**影响**:
- 需要在初始化时检测 WebGL2 支持
- 不支持时提供清晰的错误信息
- 旧浏览器用户无法使用

#### 相机控制器选择
**决策**: 迁移并改进 Potree 自己的控制器实现（而非使用 Three.js 官方控制器）

**理由**:
- Potree 的控制器支持**动态旋转中心**（根据鼠标点击的点云位置自动调整）
- Three.js 官方的 `OrbitControls` 是固定旋转中心，用户体验不佳
- Potree 的 `EarthControls` 和 `OrbitControls` 更适合点云场景
- 更好的缩放和平移行为

**实施**:
- 迁移 Potree 的 `EarthControls` 到 `@better-potree/controls`
- 迁移 Potree 的 `OrbitControls` 到 `@better-potree/controls`
- 迁移 `FirstPersonControls`（可选）
- 重构为 TypeScript，移除对 jQuery 的依赖
- 保留核心的动态旋转中心逻辑

**原始代码位置**:
- `D:\coding\libs\potree\src\navigation\EarthControls.js`
- `D:\coding\libs\potree\src\navigation\OrbitControls.js`
- `D:\coding\libs\potree\src\navigation\FirstPersonControls.js`

### 0.3 向后兼容策略

**数据格式兼容**: ✅ 必须
- 能加载原 Potree 生成的点云数据（1.x 和 2.0 格式）
- 支持标准的 Potree 目录结构和文件格式

**API 兼容**: ❌ 不兼容
- 新 API 更现代、更简洁
- 完全摒弃 jQuery 风格
- 采用事件驱动和依赖注入

**浏览器兼容**:
- Chrome 90+
- Firefox 88+
- Safari 15+
- Edge 90+
- 不支持 IE 11

## 核心变更
*   **聚焦核心**: 暂时移除 Cesium 的集成计划，以降低初期复杂性，确保核心库和 Three.js 渲染层的稳定。
*   **强化测试**: 在计划的各个关键阶段，将单元测试作为强制性的产出物，确保重构质量。暂不进行端到端测试。

## 1. 核心目标

*   **技术栈升级**:
    - 全面采用 TypeScript (严格模式) 以增强代码的健壮性和可维护性
    - 使用最新版 `Rsbuild` (基于 Rspack) 作为构建工具
    - 将 Three.js 升级到 **r180** 版本
    - 使用 **WebGL2** 作为渲染后端
    - Node.js 20+ 运行环境
    - 使用 Biome 进行代码格式化和检查

*   **架构现代化**:
    - 实现严格的分层与模块化架构
    - 核心数据逻辑使用 Three.js 自带的数学库（`THREE.Vector3`、`THREE.Matrix4` 等）
    - 渲染引擎、数据加载器和用户界面完全解耦
    - 核心库不依赖任何特定的前端框架

*   **API 驱动**:
    - **废弃所有对 jQuery 和 jQuery UI 的直接和间接依赖**
    - 通过定义清晰、稳定的面向对象 API
    - 实现丰富的事件通知系统
    - 支持与外部 UI 框架的通信

*   **可扩展性**:
    - 为未来集成 3D Gaussian Splatting 做准备
    - 支持更多点云格式（COPC、EPT 等）
    - 预留适配其他渲染引擎的空间
## 2. 技术决策

### 2.1 依赖版本
- **Three.js**: `~0.180.0` (只允许补丁版本更新，保持 API 稳定)
- **Node.js**: 20+
- **包管理器**: pnpm

### 2.2 构建产物
每个包输出三种格式：
- **ESM** (ES Modules，现代浏览器和构建工具)
- **CJS** (CommonJS，Node.js 环境)
- **UMD** (Universal Module Definition，浏览器直接引用)
- **Source Map**: 生产环境不生成

### 2.3 开发工具
- **代码规范**: Biome (格式化 + 检查)
- **测试框架**: Vitest (仅单元测试)
- **文档生成**: TypeDoc
- **Git Hooks**: 暂不配置

### 2.4 着色器处理
- GLSL 文件以字符串形式导入（不使用 `?raw` 后缀，而是配置 Rsbuild）
- 使用 GLSL 3.00 ES 语法 (WebGL2)
- 着色器版本声明：`#version 300 es`
- 使用 `in/out` 关键字替代 `attribute/varying`
- 需要检测 WebGL2 支持，不支持则报错（不降级）

### 2.5 许可证
- 使用 BSD-2-Clause (与原 Potree 保持一致)

### 2.6 发布策略
- 所有包都发布到 npm
- 使用 `@better-potree/` 命名空间
- 方便高级用户按需引入

### 2.7 Web Worker 处理
- 使用 Rsbuild 的 Worker 打包支持
- Worker 文件使用 `?worker` 后缀导入
- 使用 Transferable Objects 优化性能
- 实现 Worker 池管理并发请求
- Worker 数量默认为 `navigator.hardwareConcurrency` 或 4

## 3. 模块划分

```
@better-potree/types          # 共享类型定义和接口
@better-potree/core           # 核心数据结构和算法 (依赖 Three.js 数学库，包含事件系统)
@better-potree/rendering-three # Three.js 渲染适配层
@better-potree/loader-potree  # Potree 格式加载器
@better-potree/controls       # 相机控制器（迁移 Potree 控制器）
@better-potree/tools          # 测量、裁剪等交互工具
@better-potree/viewer         # 顶层 API 封装
@better-potree/playground     # 示例和开发调试
```

**说明**:
- `types`: 定义所有包共享的 TypeScript 接口和类型（包括加载器接口）
- `core`: 核心库，包含八叉树、LOD、事件系统等，依赖 Three.js 数学库
- `rendering-three`: Three.js 渲染适配，包含材质、着色器、渲染器封装
- `loader-potree`: Potree 格式的具体实现，包含 Worker 解码逻辑和内部工具（Version 类等）
- `controls`: 迁移 Potree 的控制器（EarthControls、OrbitControls、FirstPersonControls），保留动态旋转中心特性
- `tools`: 测量、裁剪等交互工具，通过公共 API 与 Viewer 交互
- `viewer`: 顶层 API，提供简洁的使用接口
- `playground`: 开发调试环境，包含示例页面

**架构优化说明**:
- ✅ **已移除 `@better-potree/loaders` 包**：加载器接口已整合到 `@better-potree/types`，避免冗余层级
- ✅ **已移除 `@better-potree/utils` 包**：工具函数已迁移到使用它们的包内部
  - `TypedEventEmitter` → `@better-potree/core`
  - `Version` 类 → `@better-potree/loader-potree`
- **理由**：
  1. 接口定义应在 `types` 包，保持最底层依赖
  2. 工具函数按实际使用位置就近放置，减少包间依赖
  3. 简化架构，降低维护成本

## 4. 建议角色分工

*   **项目负责人/架构师**: 负责整体技术选型、架构设计、任务拆分和进度把控。主导关键接口的设计和代码审查。
*   **核心库工程师**: 负责 `@better-potree/core` 模块的开发，专注于数据结构（如八叉树）和核心算法（如视锥剔除、LOD选择）的 TypeScript 重构，并编写**高质量的单元测试**。
*   **渲染工程师 (Three.js)**: 负责 `@better-potree/rendering-three` 的实现，处理所有与 Three.js 相关的渲染逻辑，包括着色器升级、材质系统对接和场景对象管理。
*   **工具与应用工程师**: 负责 `controls`、`tools` 模块的迁移和重构，以及最终 `viewer` API 的封装。同时负责编写示例应用，验证 API 的可用性和 UI 的解耦。
## 5. 详细迁移计划 (分阶段执行)

### **阶段 0: 项目启动与基础建设 (预计: 1 周)**

**目标**: 搭建全新的、基于 `Rsbuild` 的 Monorepo 开发环境，为后续的代码迁移铺平道路。

**完成标准**:
- ✅ 所有包能通过 `pnpm install` 安装依赖
- ✅ `pnpm run build` 能成功构建所有包
- ✅ `pnpm run test` 能在 `@better-potree/core` 中跑通一个示例测试
- ✅ Biome 能正常格式化和检查代码
- ✅ 在 `packages/playground` 中能启动开发服务器并看到一个空白页面

| 任务 ID | 任务描述 | 负责人 | 产出物 | 备注 |
| --- | --- | --- | --- | --- |
| **T0.1** | **初始化 pnpm workspace** | 架构师 | - `pnpm-workspace.yaml`<br>- 根目录 `package.json`<br>- `.gitignore` | 使用 `pnpm`，不保留原 Potree git 历史 |
| **T0.2** | **配置 TypeScript** | 架构师 | - 根目录 `tsconfig.json` (strict 模式)<br>- 配置 paths 别名 | 目标 ES2020+，模块系统 ESNext |
| **T0.3** | **配置 Biome** | 架构师 | - `biome.json` 配置文件<br>- package.json 中的 lint 和 format 脚本 | 统一代码风格 |
| **T0.4** | **创建模块包结构** | 架构师 | - `packages/` 目录下所有模块文件夹<br>- 每个模块的 `package.json` 和 `tsconfig.json`<br>- 每个模块的 `src/index.ts` | 模块包括: `types`, `utils`, `core`, `rendering-three`, `loaders`, `loader-potree`, `controls`, `tools`, `viewer`, `playground`<br>每个包的 `package.json` 需配置 ESM/CJS/UMD 导出 |
| **T0.5** | **配置 Rsbuild** | 架构师 | - 根目录 `rsbuild.config.ts`<br>- 支持 TypeScript、GLSL 文件导入<br>- 支持 Web Worker 打包<br>- 多格式输出 (ESM/CJS/UMD) | 确保开发热更新和生产构建都正常 |
| **T0.6** | **安装核心依赖** | 架构师 | - `three@~0.180.0`<br>- `@types/three`<br>- `eventemitter3`（用于事件系统）<br>- 可选的 `gl-matrix` | 完全废弃旧的 `libs` 文件夹<br>所有依赖通过 npm 安装 |
| **T0.7** | **配置 Vitest** | 架构师 | - Vitest 配置文件<br>- 在 `@better-potree/core` 中的 "Hello World" 测试 | 确保测试环境在 Monorepo 中运行 |
| **T0.8** | **配置 TypeDoc** | 架构师 | - TypeDoc 配置文件<br>- 文档生成脚本 | 为 API 文档做准备 |
| **T0.9** | **创建 playground** | 架构师 | - `packages/playground` 基础 HTML<br>- 开发服务器配置<br>- 能启动并显示空白页 | 用于开发调试和示例 |
| **T0.10** | **配置许可证和 README** | 架构师 | - LICENSE (BSD-2-Clause)<br>- 简单的根目录 README.md | 基本项目信息 |
### **阶段 1: 核心逻辑剥离与重构 (`@better-potree/core`) (预计: 3-4 周)**

**目标**: 构建核心逻辑库，使用 Three.js 数学库，专注于数据结构和算法。

**完成标准**:
- ✅ `@better-potree/core` 包包含所有核心数据结构和算法
- ✅ 该包可以依赖 Three.js 的数学类型（`Vector3`, `Matrix4` 等），但不依赖渲染相关的类（`Scene`, `Renderer` 等）
- ✅ 不依赖 DOM
- ✅ 核心逻辑拥有高覆盖率的单元测试报告

| 任务 ID | 任务描述 | 负责人 | 产出物 | 依赖 |
| --- | --- | --- | --- | --- |
| **T1.0** | **定义共享类型与接口** | 架构师 | - `@better-potree/types` 中的核心接口：<br>`IRenderer`, `ISceneManager`, `ICamera` 等 | T0.4 |
| **T1.1** | **重构点云属性** | 核心工程师 | - `PointAttribute`, `PointAttributes` 类<br>- **[测试]** 单元测试 | T0.7 |

**原始代码参考**: `D:\coding\libs\potree\src\loader\PointAttributes.js`
| **T1.2** | **重构八叉树数据结构** | 核心工程师 | - `OctreeNode`, `PointCloudOctree` 类<br>- 使用 `THREE.Vector3`, `THREE.Box3` 等<br>- **[测试]** 结构和基本操作的单元测试 | T1.1 |

**原始代码参考**:
- `D:\coding\libs\potree\src\PointCloudOctree.js`
- `D:\coding\libs\potree\src\PointCloudOctreeGeometry.js`
| **T1.3** | **迁移核心调度算法** | 核心工程师 | - 视锥剔除算法<br>- LOD 选择算法<br>- 点预算管理<br>- **[测试]** 算法单元测试 | T1.2 |

**原始代码参考**: `D:\coding\libs\potree\src\PotreeRenderer.js` 中的 `updateVisibility()` 方法
| **T1.4** | **定义纯数据场景模型** | 核心工程师 | - `PointCloud`, `Annotation`, `Measurement` 等数据模型<br>- **[测试]** 模型数据正确性测试 | T1.2 |

**原始代码参考**:
- `D:\coding\libs\potree\src\Annotation.js`
- `D:\coding\libs\potree\src\utils\Measure.js`
| **T1.5** | **集成事件分发器** | 核心工程师 | - 安装 `eventemitter3`<br>- 封装 `TypedEventEmitter<TEventMap>` 类<br>- 定义核心事件类型<br>- **[测试]** 事件注册、触发、移除测试 | T0.4 |

**原始代码参考**: `D:\coding\libs\potree\src\EventDispatcher.js`（参考 API 设计，但使用成熟库替代）

**事件库选择**: 使用 `eventemitter3` 而非自己实现
- 轻量（~2KB）、高性能
- TypeScript 友好
- 功能完善（once、removeAllListeners 等）

**阶段 1 里程碑**:
1. 拥有一个 `@better-potree/core` 包，它包含了所有核心数据结构和算法
2. 该包依赖 Three.js 的数学库（`THREE.Vector3`, `THREE.Matrix4` 等），但不依赖渲染类（`THREE.Scene`, `THREE.Renderer` 等）
3. 不依赖 DOM
4. 核心逻辑拥有高覆盖率的单元测试报告（>80%）
5. 使用 `eventemitter3` 实现类型安全的事件系统
### **阶段 2: Three.js 渲染适配层 (`@better-potree/rendering-three`) (预计: 3-4 周)**

**目标**: 让核心模块中的数据结构能够通过 Three.js r180 + WebGL2 渲染出来。

**完成标准**:
- ✅ 能够程序化创建 `@better-potree/core` 中的 `PointCloudOctree` 对象
- ✅ 将其传递给 `@better-potree/rendering-three` 的渲染器
- ✅ 在屏幕上看到点云
- ✅ 能通过代码控制其外观
- ✅ 使用 WebGL2 渲染，不支持则报错

| 任务 ID | 任务描述 | 负责人 | 产出物 | 依赖 |
| --- | --- | --- | --- | --- |
| **T2.1** | **实现 WebGL2 检测** | 渲染(Three) | - WebGL2 支持检测函数<br>- 不支持时的错误提示 | - |
| **T2.2** | **实现 Three.js 渲染器封装** | 渲染(Three) | - `ThreeJsRenderer` 类<br>- 实现 `IRenderer`, `ISceneManager` 接口<br>- 封装 `THREE.WebGLRenderer` 和 `THREE.Scene`<br>- 强制使用 WebGL2 | T1.0, T2.1 |
| **T2.3** | **升级与迁移着色器** | 渲染(Three) | - GLSL 3.00 ES 语法的顶点和片元着色器<br>- 使用 `in/out` 关键字<br>- 着色器文件以字符串导入 | T2.2 |

**原始代码参考**: `D:\coding\libs\potree\src\materials\shaders\` 目录下的着色器文件
| **T2.4** | **实现点云材质** | 渲染(Three) | - `PointCloudMaterial` 类<br>- 继承 `THREE.ShaderMaterial`<br>- 动态更新 uniforms | T2.3 |

**原始代码参考**: `D:\coding\libs\potree\src\materials\PointCloudMaterial.js`
| **T2.5** | **创建点云可视化对象** | 渲染(Three) | - `PointCloudObject3D` 类<br>- 继承 `THREE.Object3D`<br>- 管理 `THREE.Points` 对象 | T1.2, T2.4 |
| **T2.6** | **重写 LOD 更新与渲染逻辑** | 渲染(Three) | - `PointCloudObject3D.update()` 方法<br>- 调用核心算法<br>- 更新 `THREE.BufferGeometry` | T1.3, T2.5 |
| **T2.7** | **创建辅助对象可视化** | 渲染(Three) | - `MeasureHelper`, `AnnotationHelper` 等<br>- 监听核心对象数据变化<br>- 创建/更新 Three.js 可视化对象 | T1.4 |

**阶段 2 里程碑**:
1. 能够在 WebGL2 环境下渲染点云，并通过代码控制其外观
2. 着色器使用 GLSL 3.00 ES 语法
3. LOD 系统正常工作
4. 能在 playground 中验证渲染效果
5. 不支持 WebGL2 的浏览器会显示明确的错误信息

### **阶段 3: 加载器与控制器重构 (预计: 2-3 周)**

**目标**: 实现数据加载和用户交互，形成一个基本可用的查看器。

**完成标准**:
- ✅ 能加载真实的 Potree 点云数据（1.x 和 2.0 格式）
- ✅ Worker 正确解码二进制数据
- ✅ 相机控制器流畅工作
- ✅ 完整的加载到渲染流程跑通

| 任务 ID | 任务描述 | 负责人 | 产出物 | 依赖 |
| --- | --- | --- | --- | --- |
| **T3.1** | **重构 Potree 加载器** | 工具工程师 | - `@better-potree/loader-potree` 模块，能解析数据并填充 `core` 的数据结构 | T1.3 |

**原始代码参考**:
- `D:\coding\libs\potree\src\loader\POCLoader.js`
- `D:\coding\libs\potree\src\modules\loader\2.0\OctreeLoader.js`

| **T3.2** | **重构 Worker 逻辑** | 工具工程师 | - 更新 `BinaryDecoderWorker`，返回纯 ArrayBuffer 和解析信息<br>- 使用 Transferable Objects 优化<br>- 实现 Worker 池管理 | T3.1 |

**原始代码参考**: `D:\coding\libs\potree\src\workers\BinaryDecoderWorker.js`

**Worker 处理**: 使用 Rsbuild 的 `?worker` 后缀导入，Worker 池默认数量为 `navigator.hardwareConcurrency` 或 4
| **T3.3** | **重构相机控制器** | 工具工程师 | - 迁移 Potree 的 `EarthControls` 和 `OrbitControls`<br>- 重构为 TypeScript<br>- 保留动态旋转中心逻辑<br>- 移除 jQuery 依赖 | T1.0 |

**原始代码参考**:
- `D:\coding\libs\potree\src\navigation\EarthControls.js` ⭐ 主要控制器
- `D:\coding\libs\potree\src\navigation\OrbitControls.js`
- `D:\coding\libs\potree\src\navigation\FirstPersonControls.js` (可选)

**实施策略**: 迁移 Potree 自己的控制器，**保留动态旋转中心**特性（根据点击的点云位置自动调整旋转中心），这是 Three.js 官方 OrbitControls 不具备的重要功能

**关键特性**:
- 动态 pivot（旋转中心）
- 更好的缩放行为
- 适合点云场景的交互逻辑

**阶段 3 里程碑**:
1. 能加载真实的 Potree 点云数据
2. Worker 解码性能良好（使用 Transferable Objects）
3. 相机控制流畅（60fps），支持动态旋转中心
4. 从加载到渲染的完整流程跑通

### **阶段 4: API 封装与 UI 彻底解耦 (预计: 2 周)**

**目标**: 封装一个简洁的顶层 API，并创建无 UI 依赖的示例来验证解耦。

**完成标准**:
- ✅ `Viewer` 类提供完整的公共 API
- ✅ 所有工具通过公共 API 与 Viewer 交互
- ✅ 无 UI 示例证明完全解耦
- ✅ 代码中无任何 jQuery 依赖

| 任务 ID | 任务描述 | 负责人 | 产出物 | 依赖 |
| --- | --- | --- | --- | --- |
| **T4.1** | **创建 Viewer 主类** | 架构师/工具 | - `@better-potree/viewer` 模块及其 `Viewer` 类，通过依赖注入接收渲染器实例 | T1.6, T2.1, T3.1 |
| **T4.2** | **封装高级 API** | 架构师/工具 | - `viewer.load()`, `viewer.setPointBudget()`, `viewer.setNavigation()` 等易于使用的公共方法 | T4.1 |
| **T4.3** | **分析并映射旧 UI 功能** | 工具工程师 | - `UI_MIGRATION.md` 映射文档<br>- 列出所有旧 UI 控件及其对应的新 API<br>- 识别隐式业务逻辑 | (分析旧代码) |

**原始代码参考**:
- `D:\coding\libs\potree\examples\` 中的示例页面
- jQuery UI 相关的 HTML 和 JavaScript 文件

**重点**: 识别旧 UI 中可能存在的隐式业务逻辑，确保在新 API 中体现
| **T4.4** | **实现工具模块 (`@better-potree/tools`)** | 工具工程师 | - `MeasuringTool`, `ClippingTool` 等工具类，它们完全通过公共 API 和事件系统与 `Viewer` 核心交互 | T1.5, T2.6, T4.1 |

**原始代码参考**:
- `D:\coding\libs\potree\src\utils\MeasuringTool.js`
- `D:\coding\libs\potree\src\utils\ClippingTool.js`
- `D:\coding\libs\potree\src\utils\Volume.js`
| **T4.5** | **编写第一个无 UI 示例** | 工具工程师 | - `no-ui-example.html`<br>- 通过原生 JS 和简单 HTML 实现所有功能<br>- 无任何 jQuery 或 UI 框架依赖 | T4.4 |

**验证重点**:
- 所有功能都能通过调用 API 实现
- 无需依赖任何 UI 框架
- 代码清晰易懂

**阶段 4 里程碑**:
1.   拥有一个可通过 `npm` 安装的 `better-potree` 库。
2.   开发者可以用几行代码加载并显示点云，并通过调用 API 来控制它。
3.   **所有旧的 HTML 和 jQuery UI 代码被彻底移除。** 这是项目现代化的关键证明。
### **阶段 5: 新功能集成与未来展望 (在核心稳定后)**
**目标**: 扩展库的功能，集成 3DGS 等前沿技术，并提供更好的生态支持。
**依赖**: https://github.com/sparkjsdev/spark

| 任务 ID | 任务描述 | 负责人 | 产出物 | 依赖 |
| --- | --- | --- | --- | --- |
| **T5.1** | **调研与集成 3DGS** | 渲染(Three) | - 新的 `@better-potree/loader-gs` 模块 - `@better-potree/rendering-three` 中对 GS 的渲染支持 | 阶段 1-4 完成 |
| **T5.2** | **开发其他加载器** | 工具工程师 | - 独立的 `@better-potree/loader-ept`, `@better-potree/loader-copc` 等 npm 包 | T3.1 |
| **T5.3** | **开发 UI 适配器 (可选)** | 工具工程师 | - 独立的 `@better-potree/react`, `@better-potree/vue` 包，提供封装好的组件和 Hooks | 阶段 1-4 完成 |
## 6. 风险评估与应对策略

### 6.1 Three.js r180 + WebGL2 兼容性 (高风险)
**风险**:
- Three.js r180 API 与旧版差异巨大
- WebGL2 着色器语法需要完全重写
- 可能导致渲染层开发超预期

**应对**:
- 在阶段 0 完成后立即进行技术验证 (PoC)
- 使用 Three.js r180 实现最简化的点云渲染器
- 重点测试：自定义着色器、BufferGeometry 更新、性能
- 验证 WebGL2 检测和降级策略

### 6.2 Rsbuild 工具链熟悉度 (中风险)
**风险**:
- Monorepo 配置复杂
- Web Worker 打包可能遇到问题
- 多格式输出 (ESM/CJS/UMD) 配置

**应对**:
- 阶段 0 安排专门时间学习
- 必须确保包含 Web Worker 的项目能正常开发和构建
- 验证热更新和生产构建

### 6.3 重构范围蔓延 (中风险)
**风险**:
- 不断发现新的耦合点
- 旧 jQuery UI 代码中的隐式业务逻辑容易遗漏
- 功能缺失

**应对**:
- 严格遵守"由内而外"的迁移顺序
- T4.3 分析旧 UI 功能时格外仔细
- 所有交互逻辑明确映射到新 API 或事件
- 核心层单元测试覆盖率达标前禁止引入渲染代码

### 6.4 数学库依赖决策的影响 (低风险)
**风险**:
- 使用 Three.js 数学库使 core 依赖 Three.js
- 可能影响未来适配其他渲染引擎

**应对**:
- 在 `@better-potree/types` 中定义数学类型接口
- 如果未来需要适配其他渲染引擎，可以创建适配层
- 当前阶段优先开发速度和稳定性

