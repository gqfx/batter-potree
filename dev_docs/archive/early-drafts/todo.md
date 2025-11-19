# Better Potree - 详细任务清单

本文档为 better-potree 项目提供详细的、可执行的任务清单，明确每个任务的具体内容和完成标准。

## 项目背景

- **原始项目**: Potree (https://github.com/potree/potree)
- **原始代码位置**: `D:\coding\libs\potree`
- **新项目位置**: `D:\coding\opensource\better-potree`
- **不保留** 原 Potree 的 git 历史

## 关键决策摘要

1. **数学库**: `@better-potree/core` 直接使用 Three.js 数学库（`THREE.Vector3`, `THREE.Matrix4` 等）
2. **事件系统**: 使用 `eventemitter3` 而非自己实现
3. **WebGL 版本**: 强制 WebGL2，不支持则报错（不降级到 WebGL1）
4. **相机控制器**: 迁移 Potree 自己的控制器（支持动态旋转中心）
5. **向后兼容**: 数据格式兼容（Potree 1.x 和 2.0），API 不兼容
6. **浏览器支持**: Chrome 90+, Firefox 88+, Safari 15+, Edge 90+

---

## 阶段 0: 项目启动与基础建设

### T0.1 初始化 pnpm workspace

**具体内容**:
1. 创建 `pnpm-workspace.yaml` 文件，配置 workspace 包路径
2. 创建根目录 `package.json`，包含：
   - 项目名称、版本、描述
   - private: true
   - engines 字段指定 Node.js 20+
   - workspaces 配置（如果需要）
3. 创建/更新 `.gitignore` 文件，包含：
   - `node_modules/`
   - `dist/`
   - `.rsbuild/`
   - `*.log`
   - `.DS_Store`
   - IDE 相关文件

**完成标准**:
- ✅ `pnpm-workspace.yaml` 正确配置 `packages/*` 路径
- ✅ 根 `package.json` 存在且配置正确
- ✅ `.gitignore` 包含所有必要的忽略规则
- ✅ 运行 `pnpm install` 不报错

**验证命令**:
```bash
pnpm install
```

---

### T0.2 配置 TypeScript

**具体内容**:
1. 在根目录创建 `tsconfig.json`，配置：
   - `"strict": true` 开启严格模式
   - `"target": "ES2020"` 或更高
   - `"module": "ESNext"`
   - `"moduleResolution": "bundler"`
   - `"esModuleInterop": true`
   - `"skipLibCheck": true`
   - `"resolveJsonModule": true`
   - 配置 `paths` 别名，例如：
     ```json
     "paths": {
       "@better-potree/types": ["./packages/types/src"],
       "@better-potree/core": ["./packages/core/src"]
     }
     ```
2. 安装 TypeScript 依赖：
   - `typescript@latest`

**完成标准**:
- ✅ `tsconfig.json` 存在且配置正确
- ✅ strict 模式已启用
- ✅ paths 别名配置完整
- ✅ 运行 `pnpm tsc --noEmit` 不报错

**验证命令**:
```bash
pnpm add -Dw typescript
pnpm tsc --version
pnpm tsc --noEmit
```

---

### T0.3 配置 Biome

**具体内容**:
1. 安装 Biome：
   - `@biomejs/biome@latest`
2. 创建 `biome.json` 配置文件，包含：
   - 格式化规则（缩进、引号、分号等）
   - Lint 规则
   - 文件忽略规则
3. 在根 `package.json` 中添加脚本：
   ```json
   "scripts": {
     "lint": "biome check .",
     "format": "biome format --write .",
     "check": "biome check --apply ."
   }
   ```

**完成标准**:
- ✅ `biome.json` 存在且配置合理
- ✅ 运行 `pnpm lint` 可以检查代码
- ✅ 运行 `pnpm format` 可以格式化代码
- ✅ Biome 能正确识别 TypeScript 文件

**验证命令**:
```bash
pnpm add -Dw @biomejs/biome
pnpm lint
pnpm format
```

---

### T0.4 创建模块包结构

**具体内容**:
1. 创建 `packages/` 目录
2. 为以下每个模块创建文件夹和基础文件：
   - `types`
   - `core`
   - `rendering-three`
   - `loader-potree`
   - `controls`
   - `tools`
   - `viewer`
   - `playground`

3. 每个包（除 playground）包含：
   - `package.json`：
     ```json
     {
       "name": "@better-potree/[包名]",
       "version": "0.0.1",
       "type": "module",
       "main": "./dist/index.cjs",
       "module": "./dist/index.js",
       "types": "./dist/index.d.ts",
       "exports": {
         ".": {
           "import": "./dist/index.js",
           "require": "./dist/index.cjs",
           "types": "./dist/index.d.ts"
         }
       },
       "scripts": {
         "build": "rsbuild build",
         "dev": "rsbuild dev"
       }
     }
     ```
   - `tsconfig.json`：继承根配置
   - `src/index.ts`：空文件或简单的导出
   - `README.md`：包的简要说明

4. `playground` 包配置为应用类型，不需要构建产物配置

**完成标准**:
- ✅ 所有模块文件夹已创建
- ✅ 每个包都有 `package.json`、`tsconfig.json`、`src/index.ts`
- ✅ 包名使用 `@better-potree/` 命名空间
- ✅ 所有包的 package.json 配置正确（ESM/CJS/UMD 导出）

**验证命令**:
```bash
ls -la packages/
pnpm install
```

---

### T0.5 配置 Rsbuild

**具体内容**:
1. 安装 Rsbuild 相关依赖：
   - `@rsbuild/core@latest`
   - `@rsbuild/plugin-typescript`
   - 可能需要的其他插件

2. 在根目录创建 `rsbuild.config.ts`，配置：
   - TypeScript 支持
   - GLSL 文件导入（使用字符串加载）
   - Web Worker 打包支持
   - 多格式输出（ESM/CJS/UMD）
   - Source map 配置（生产环境禁用）
   - 开发服务器配置

3. 为每个库包创建 `rsbuild.config.ts`（或在根配置中统一处理）

**完成标准**:
- ✅ Rsbuild 配置文件存在且正确
- ✅ 支持 TypeScript 编译
- ✅ 支持 GLSL 文件作为字符串导入
- ✅ 配置了 Web Worker 打包策略
- ✅ 能输出 ESM、CJS、UMD 三种格式
- ✅ 开发服务器能正常启动并支持热更新
- ✅ 生产构建不生成 source map

**验证命令**:
```bash
pnpm add -Dw @rsbuild/core @rsbuild/plugin-typescript
pnpm --filter @better-potree/core build
```

---

### T0.6 安装核心依赖

**具体内容**:
1. 在根目录安装共享依赖：
   ```bash
   pnpm add three@~0.180.0
   pnpm add -D @types/three
   pnpm add eventemitter3
   pnpm add -D @types/eventemitter3
   ```

2. 说明：
   - `three@~0.180.0`：只允许补丁版本更新，避免 API 破坏性变更
   - `eventemitter3`：用于实现类型安全的事件系统
   - 可选：`gl-matrix` 用于不足的数学运算（如果 Three.js 数学库不够）

3. 在 `@better-potree/core` 的 `package.json` 中添加 peerDependencies：
   ```json
   "peerDependencies": {
     "three": "~0.180.0",
     "eventemitter3": "^5.0.0"
   }
   ```

**完成标准**:
- ✅ Three.js ~0.180.x 已安装
- ✅ @types/three 已安装
- ✅ eventemitter3 已安装
- ✅ 核心包正确声明了 peerDependencies
- ✅ 能在代码中 import Three.js 和 eventemitter3 且类型正确

**验证命令**:
```bash
pnpm list three
pnpm list @types/three
pnpm list eventemitter3
```

---

### T0.7 配置 Vitest

**具体内容**:
1. 安装 Vitest 依赖：
   ```bash
   pnpm add -Dw vitest @vitest/ui
   ```

2. 在根目录创建 `vitest.config.ts`：
   ```typescript
   import { defineConfig } from 'vitest/config'

   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html']
       }
     }
   })
   ```

3. 在 `@better-potree/core` 中创建测试文件：
   - `src/__tests__/hello.test.ts`：
     ```typescript
     import { describe, it, expect } from 'vitest'

     describe('Hello World', () => {
       it('should pass', () => {
         expect(1 + 1).toBe(2)
       })
     })
     ```

4. 在根 `package.json` 添加测试脚本：
   ```json
   "scripts": {
     "test": "vitest",
     "test:ui": "vitest --ui",
     "test:coverage": "vitest --coverage"
   }
   ```

**完成标准**:
- ✅ Vitest 配置文件存在
- ✅ `@better-potree/core` 中有至少一个测试文件
- ✅ 运行 `pnpm test` 能执行测试且通过
- ✅ 测试覆盖率报告能生成

**验证命令**:
```bash
pnpm test
pnpm test:ui
```

---

### T0.8 配置 TypeDoc

**具体内容**:
1. 安装 TypeDoc：
   ```bash
   pnpm add -Dw typedoc
   ```

2. 在根目录创建 `typedoc.json`：
   ```json
   {
     "entryPoints": ["./packages/*/src/index.ts"],
     "out": "docs",
     "excludePrivate": true,
     "excludeProtected": false,
     "includeVersion": true
   }
   ```

3. 在根 `package.json` 添加文档生成脚本：
   ```json
   "scripts": {
     "docs": "typedoc"
   }
   ```

**完成标准**:
- ✅ TypeDoc 配置文件存在
- ✅ 运行 `pnpm docs` 能生成文档
- ✅ 文档输出到 `docs/` 目录
- ✅ 文档包含所有包的 API

**验证命令**:
```bash
pnpm docs
```

---

### T0.9 创建 playground

**具体内容**:
1. 在 `packages/playground` 创建基础结构：
   ```
   playground/
   ├── package.json
   ├── rsbuild.config.ts
   ├── src/
   │   ├── index.html
   │   ├── main.ts
   │   └── style.css
   └── tsconfig.json
   ```

2. `package.json` 配置：
   ```json
   {
     "name": "@better-potree/playground",
     "version": "0.0.1",
     "private": true,
     "scripts": {
       "dev": "rsbuild dev",
       "build": "rsbuild build",
       "preview": "rsbuild preview"
     }
   }
   ```

3. `index.html` 创建基础 HTML 结构：
   ```html
   <!DOCTYPE html>
   <html lang="zh-CN">
   <head>
     <meta charset="UTF-8">
     <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <title>Better Potree Playground</title>
   </head>
   <body>
     <div id="app">
       <h1>Better Potree Playground</h1>
       <canvas id="canvas"></canvas>
     </div>
     <script type="module" src="./main.ts"></script>
   </body>
   </html>
   ```

4. `main.ts` 创建入口文件：
   ```typescript
   import './style.css'

   console.log('Better Potree Playground')
   ```

5. 配置开发服务器和构建

**完成标准**:
- ✅ playground 包结构完整
- ✅ 运行 `pnpm --filter @better-potree/playground dev` 能启动开发服务器
- ✅ 浏览器打开能看到页面（即使是空白页）
- ✅ 热更新正常工作

**验证命令**:
```bash
pnpm --filter @better-potree/playground dev
```

---

### T0.10 配置许可证和 README

**具体内容**:
1. 在根目录创建 `LICENSE` 文件，内容为 BSD-2-Clause 许可证文本

2. 在根目录创建 `README.md`，包含：
   - 项目名称和简介
   - 主要特性
   - 安装说明（暂时可以简单说明）
   - 基本使用示例（TODO）
   - 开发指南（如何构建、测试）
   - 许可证信息
   - 贡献指南（可选）

3. 内容示例：
   ```markdown
   # Better Potree

   现代化的 WebGL 点云渲染库，基于 TypeScript + Three.js r180 + Rsbuild 构建。

   ## 特性

   - 🚀 使用 TypeScript 严格模式，类型安全
   - ⚡️ 基于 Rsbuild 的极速构建
   - 🎨 Three.js r180 + WebGL2 渲染
   - 📦 模块化架构，按需引入
   - 🧪 完善的单元测试

   ## 开发

   ```bash
   # 安装依赖
   pnpm install

   # 运行测试
   pnpm test

   # 构建所有包
   pnpm build

   # 启动 playground
   pnpm --filter @better-potree/playground dev
   ```

   ## 许可证

   BSD-2-Clause
   ```

**完成标准**:
- ✅ LICENSE 文件存在且内容为 BSD-2-Clause
- ✅ README.md 存在且包含项目基本信息
- ✅ README 中的命令可以正常执行

**验证**:
- 手动检查文件内容

---

## 阶段 0 验收标准总结

完成阶段 0 后，必须满足以下所有条件：

1. **依赖安装**: `pnpm install` 成功，无错误
2. **构建**: `pnpm build` 能成功构建所有库包
3. **测试**: `pnpm test` 能在 `@better-potree/core` 中跑通测试
4. **代码检查**: `pnpm lint` 和 `pnpm format` 正常工作
5. **开发服务器**: `pnpm --filter @better-potree/playground dev` 能启动，浏览器可访问

**最终验证清单**:
```bash
# 1. 清理并重新安装
rm -rf node_modules packages/*/node_modules
pnpm install

# 2. 运行 lint
pnpm lint

# 3. 运行测试
pnpm test

# 4. 构建所有包
pnpm build

# 5. 启动 playground
pnpm --filter @better-potree/playground dev
# 在浏览器打开 http://localhost:3000（或配置的端口）

# 6. 生成文档
pnpm docs
```

---

## 阶段 1: 核心逻辑剥离与重构

### T1.0 定义共享类型与接口

**具体内容**:
1. 在 `@better-potree/types/src/` 中创建以下接口文件：

   - `renderer.ts`：
     ```typescript
     export interface IRenderer {
       render(scene: unknown, camera: unknown): void
       setSize(width: number, height: number): void
       dispose(): void
     }

     export interface ISceneManager {
       add(object: unknown): void
       remove(object: unknown): void
       clear(): void
     }
     ```

   - `camera.ts`：
     ```typescript
     import * as THREE from 'three'

     export interface ICamera {
       position: THREE.Vector3
       getWorldDirection(target: THREE.Vector3): THREE.Vector3
       updateProjectionMatrix(): void
     }
     ```

   - `loader.ts`：
     ```typescript
     export interface ILoader<T> {
       load(url: string, onProgress?: (progress: number) => void): Promise<T>
     }
     ```

2. 在 `src/index.ts` 中导出所有接口

**完成标准**:
- ✅ 所有核心接口已定义
- ✅ 接口文档注释完整
- ✅ 类型导出正确
- ✅ 能被其他包正确引用

**验证**:
```typescript
// 在其他包中测试导入
import type { IRenderer, ICamera } from '@better-potree/types'
```

---

### T1.1 重构点云属性

**原始代码参考**: `D:\coding\libs\potree\src\loader\PointAttributes.js`

**具体内容**:
1. 在 `@better-potree/core/src/` 创建 `attributes/` 目录

2. 实现 `PointAttribute` 类：
   ```typescript
   export enum PointAttributeType {
     POSITION = 'POSITION',
     COLOR = 'COLOR',
     INTENSITY = 'INTENSITY',
     CLASSIFICATION = 'CLASSIFICATION',
     NORMAL = 'NORMAL'
   }

   export class PointAttribute {
     name: string
     type: PointAttributeType
     numElements: number
     byteSize: number

     constructor(name: string, type: PointAttributeType, numElements: number)
   }
   ```

3. 实现 `PointAttributes` 类（管理多个属性）

4. 编写单元测试：
   - 测试属性创建
   - 测试属性查找
   - 测试属性字节大小计算

**完成标准**:
- ✅ `PointAttribute` 类实现完整
- ✅ `PointAttributes` 类实现完整
- ✅ 单元测试覆盖率 > 80%
- ✅ 所有测试通过

**验证命令**:
```bash
pnpm --filter @better-potree/core test
```

---

### T1.2 重构八叉树数据结构

**原始代码参考**:
- `D:\coding\libs\potree\src\PointCloudOctree.js`
- `D:\coding\libs\potree\src\PointCloudOctreeGeometry.js`

**具体内容**:
1. 在 `@better-potree/core/src/octree/` 创建：

   - `OctreeNode.ts`：
     ```typescript
     import * as THREE from 'three'

     export class OctreeNode {
       name: string
       boundingBox: THREE.Box3
       level: number
       children: (OctreeNode | null)[]
       loaded: boolean

       constructor(name: string, boundingBox: THREE.Box3, level: number)

       isLeaf(): boolean
       getNumPoints(): number
     }
     ```

   - `PointCloudOctree.ts`：
     ```typescript
     import * as THREE from 'three'
     import { OctreeNode } from './OctreeNode'

     export class PointCloudOctree {
       root: OctreeNode
       boundingBox: THREE.Box3
       pointBudget: number

       constructor(root: OctreeNode, boundingBox: THREE.Box3)

       getVisibleNodes(camera: THREE.Camera, pointBudget: number): OctreeNode[]
     }
     ```

2. 编写单元测试：
   - 测试节点创建和层级关系
   - 测试包围盒计算
   - 测试节点可见性判断（基础版）

**完成标准**:
- ✅ `OctreeNode` 类实现完整
- ✅ `PointCloudOctree` 类实现完整
- ✅ 使用 Three.js 的 `Vector3`, `Box3` 等
- ✅ 不依赖渲染相关的 Three.js 类
- ✅ 单元测试覆盖率 > 80%

**验证命令**:
```bash
pnpm --filter @better-potree/core test octree
```

---

### T1.3 迁移核心调度算法

**原始代码参考**: `D:\coding\libs\potree\src\PotreeRenderer.js` 中的 `updateVisibility()` 方法

**具体内容**:
1. 在 `@better-potree/core/src/lod/` 创建：

   - `FrustumCuller.ts`：实现视锥剔除
     ```typescript
     import * as THREE from 'three'
     import { OctreeNode } from '../octree/OctreeNode'

     export class FrustumCuller {
       cull(nodes: OctreeNode[], camera: THREE.Camera): OctreeNode[]
     }
     ```

   - `LODSelector.ts`：实现 LOD 选择
     ```typescript
     export class LODSelector {
       selectNodes(
         root: OctreeNode,
         camera: THREE.Camera,
         pointBudget: number
       ): OctreeNode[]
     }
     ```

   - `PointBudget.ts`：点预算管理
     ```typescript
     export class PointBudget {
       total: number
       used: number

       canAllocate(points: number): boolean
       allocate(points: number): void
       reset(): void
     }
     ```

2. 从原 Potree 迁移算法逻辑（参考 `src/PotreeRenderer.js` 中的 `updateVisibility` 等）

3. 编写详细的单元测试：
   - 不同相机位置的视锥剔除
   - LOD 层级选择逻辑
   - 点预算分配策略

**完成标准**:
- ✅ 视锥剔除算法实现正确
- ✅ LOD 选择算法实现正确
- ✅ 点预算管理实现正确
- ✅ 算法性能满足要求（可以先简单测试）
- ✅ 单元测试覆盖率 > 80%

**验证命令**:
```bash
pnpm --filter @better-potree/core test lod
```

---

### T1.4 定义纯数据场景模型

**原始代码参考**:
- `D:\coding\libs\potree\src\Annotation.js`
- `D:\coding\libs\potree\src\utils\Measure.js`

**具体内容**:
1. 在 `@better-potree/core/src/scene/` 创建：

   - `PointCloud.ts`：
     ```typescript
     import { PointCloudOctree } from '../octree/PointCloudOctree'

     export class PointCloud {
       name: string
       octree: PointCloudOctree
       visible: boolean
       pointSize: number

       constructor(name: string, octree: PointCloudOctree)
     }
     ```

   - `Annotation.ts`：
     ```typescript
     import * as THREE from 'three'

     export class Annotation {
       position: THREE.Vector3
       title: string
       description: string

       constructor(position: THREE.Vector3, title: string)
     }
     ```

   - `Measurement.ts`：
     ```typescript
     import * as THREE from 'three'

     export enum MeasurementType {
       DISTANCE = 'DISTANCE',
       AREA = 'AREA',
       VOLUME = 'VOLUME'
     }

     export class Measurement {
       type: MeasurementType
       points: THREE.Vector3[]

       getValue(): number
     }
     ```

2. 编写单元测试

**完成标准**:
- ✅ 所有数据模型类实现完整
- ✅ 纯数据结构，不包含渲染逻辑
- ✅ 单元测试验证数据正确性

**验证命令**:
```bash
pnpm --filter @better-potree/core test scene
```

---

### T1.5 集成事件分发器

**原始代码参考**: `D:\coding\libs\potree\src\EventDispatcher.js`（仅参考 API 设计，使用成熟库替代自己实现）

**具体内容**:
1. 调研并选择合适的事件库：
   - **eventemitter3**：轻量、高性能、TypeScript 友好
     - 大小：~2KB
     - 类型安全
     - 广泛使用
   - **mitt**：极简、微型（<200 bytes）
     - 更轻量
     - API 更简单
     - TypeScript 原生支持

   **推荐使用 eventemitter3**，原因：
   - 功能更完善（支持 once、removeAllListeners 等）
   - 性能优异
   - 社区成熟

2. 安装依赖：
   ```bash
   pnpm add eventemitter3
   pnpm add -D @types/eventemitter3
   ```

3. 在 `@better-potree/core/src/events/` 创建封装：

   - `EventEmitter.ts`：
     ```typescript
     import EventEmitter from 'eventemitter3'

     /**
      * 定义事件映射类型
      * 示例：
      * interface MyEvents {
      *   load: (progress: number) => void
      *   error: (error: Error) => void
      * }
      */
     export type EventMap = Record<string, (...args: any[]) => void>

     /**
      * 类型安全的事件发射器包装
      */
     export class TypedEventEmitter<TEventMap extends EventMap> {
       private emitter: EventEmitter

       constructor() {
         this.emitter = new EventEmitter()
       }

       on<K extends keyof TEventMap>(
         event: K,
         listener: TEventMap[K]
       ): this {
         this.emitter.on(event as string, listener as any)
         return this
       }

       once<K extends keyof TEventMap>(
         event: K,
         listener: TEventMap[K]
       ): this {
         this.emitter.once(event as string, listener as any)
         return this
       }

       off<K extends keyof TEventMap>(
         event: K,
         listener: TEventMap[K]
       ): this {
         this.emitter.off(event as string, listener as any)
         return this
       }

       emit<K extends keyof TEventMap>(
         event: K,
         ...args: Parameters<TEventMap[K]>
       ): boolean {
         return this.emitter.emit(event as string, ...args)
       }

       removeAllListeners<K extends keyof TEventMap>(event?: K): this {
         if (event) {
           this.emitter.removeAllListeners(event as string)
         } else {
           this.emitter.removeAllListeners()
         }
         return this
       }

       listenerCount<K extends keyof TEventMap>(event: K): number {
         return this.emitter.listenerCount(event as string)
       }
     }
     ```

   - `types.ts`：定义核心事件类型
     ```typescript
     // 点云事件
     export interface PointCloudEvents {
       'visibility-changed': (visible: boolean) => void
       'points-loaded': (count: number) => void
       'lod-changed': (level: number) => void
     }

     // 加载器事件
     export interface LoaderEvents {
       'load-progress': (progress: number) => void
       'load-complete': () => void
       'load-error': (error: Error) => void
     }

     // 测量事件
     export interface MeasurementEvents {
       'point-added': (index: number) => void
       'point-removed': (index: number) => void
       'measurement-changed': (value: number) => void
     }
     ```

4. 在需要事件功能的类中使用：
   ```typescript
   import { TypedEventEmitter } from './events/EventEmitter'
   import type { PointCloudEvents } from './events/types'

   export class PointCloud extends TypedEventEmitter<PointCloudEvents> {
     constructor() {
       super()
     }

     setVisible(visible: boolean): void {
       this.visible = visible
       this.emit('visibility-changed', visible)
     }
   }
   ```

5. 编写单元测试：
   - 测试事件注册和触发
   - 测试 once 只触发一次
   - 测试事件移除
   - 测试移除所有监听器
   - 测试类型安全（TypeScript 编译时检查）

**完成标准**:
- ✅ eventemitter3 已安装和配置
- ✅ `TypedEventEmitter` 封装类实现完整
- ✅ 核心事件类型已定义
- ✅ 类型安全：错误的事件名或参数会在编译时报错
- ✅ 单元测试覆盖所有场景
- ✅ 测试覆盖率 > 90%

**验证命令**:
```bash
pnpm --filter @better-potree/core add eventemitter3
pnpm --filter @better-potree/core test events
```

---

### T1.5 实现事件分发器（旧版本，已废弃）

~~**具体内容**:~~
~~1. 在 `@better-potree/core/src/events/` 创建：~~

   - `EventDispatcher.ts`：
     ```typescript
     type EventHandler<T = unknown> = (event: T) => void

     export class EventDispatcher<EventMap extends Record<string, unknown>> {
       private listeners: Map<keyof EventMap, Set<EventHandler>>

       addEventListener<K extends keyof EventMap>(
         type: K,
         listener: EventHandler<EventMap[K]>
       ): void

       removeEventListener<K extends keyof EventMap>(
         type: K,
         listener: EventHandler<EventMap[K]>
       ): void

       dispatchEvent<K extends keyof EventMap>(
         type: K,
         event: EventMap[K]
       ): void

       removeAllListeners(): void
     }
     ```

2. 定义常用事件类型（在 `@better-potree/types` 中）

3. 编写单元测试：
   - 事件注册
   - 事件触发
   - 事件移除
   - 多个监听器
   - 移除所有监听器

**完成标准**:
- ✅ `EventDispatcher` 类型安全
- ✅ 支持泛型事件类型
- ✅ 单元测试覆盖所有场景
- ✅ 测试覆盖率 100%

**验证命令**:
```bash
pnpm --filter @better-potree/core test events
```

---

## 阶段 1 验收标准

完成阶段 1 后，必须满足：

1. **包完整性**: `@better-potree/core` 包含所有核心数据结构
2. **依赖正确**: 依赖 Three.js 数学库，但不依赖渲染类
3. **无 DOM 依赖**: 代码中不出现 `document`、`window` 等
4. **测试覆盖**: 整体测试覆盖率 > 80%
5. **构建成功**: `pnpm --filter @better-potree/core build` 成功

**验证清单**:
```bash
# 运行所有测试
pnpm --filter @better-potree/core test

# 检查测试覆盖率
pnpm --filter @better-potree/core test:coverage

# 构建
pnpm --filter @better-potree/core build

# 检查导出
pnpm --filter @better-potree/core exec tsc --noEmit
```

---

## 阶段 2: Three.js 渲染适配层

### T2.1 实现 WebGL2 检测

**具体内容**:
1. 在 `@better-potree/rendering-three/src/utils/` 创建 `webgl2.ts`：
   ```typescript
   export function isWebGL2Available(): boolean {
     try {
       const canvas = document.createElement('canvas')
       return !!(
         window.WebGL2RenderingContext &&
         canvas.getContext('webgl2')
       )
     } catch {
       return false
     }
   }

   export function checkWebGL2Support(): void {
     if (!isWebGL2Available()) {
       throw new Error(
         'WebGL2 is not supported in this browser. ' +
         'Better Potree requires WebGL2 to function.'
       )
     }
   }
   ```

**完成标准**:
- ✅ WebGL2 检测函数实现
- ✅ 不支持时抛出清晰的错误信息
- ✅ 能在浏览器环境正确执行

**验证**:
在 playground 中调用并测试

---

### T2.2 实现 Three.js 渲染器封装

**具体内容**:
1. 在 `@better-potree/rendering-three/src/` 创建：

   - `ThreeJsRenderer.ts`：
     ```typescript
     import * as THREE from 'three'
     import type { IRenderer, ISceneManager } from '@better-potree/types'
     import { checkWebGL2Support } from './utils/webgl2'

     export class ThreeJsRenderer implements IRenderer, ISceneManager {
       renderer: THREE.WebGLRenderer
       scene: THREE.Scene

       constructor(canvas: HTMLCanvasElement) {
         checkWebGL2Support()

         this.renderer = new THREE.WebGLRenderer({
           canvas,
           context: canvas.getContext('webgl2')!
         })

         this.scene = new THREE.Scene()
       }

       render(camera: THREE.Camera): void {
         this.renderer.render(this.scene, camera)
       }

       setSize(width: number, height: number): void {
         this.renderer.setSize(width, height)
       }

       add(object: THREE.Object3D): void {
         this.scene.add(object)
       }

       remove(object: THREE.Object3D): void {
         this.scene.remove(object)
       }

       dispose(): void {
         this.renderer.dispose()
       }
     }
     ```

**完成标准**:
- ✅ 正确封装 `THREE.WebGLRenderer`
- ✅ 强制使用 WebGL2 context
- ✅ 实现 `IRenderer` 和 `ISceneManager` 接口
- ✅ 在 playground 中能渲染简单场景

**验证**:
在 playground 中创建渲染器并渲染一个立方体

---

### T2.3 升级与迁移着色器

**原始代码参考**: `D:\coding\libs\potree\src\materials\shaders\` 目录下的着色器文件

**具体内容**:
1. 在 `@better-potree/rendering-three/src/shaders/` 创建：

   - `pointcloud.vert.glsl`（GLSL 3.00 ES）：
     ```glsl
     #version 300 es
     precision highp float;

     in vec3 position;
     in vec3 color;

     out vec3 vColor;

     uniform mat4 modelViewMatrix;
     uniform mat4 projectionMatrix;
     uniform float pointSize;

     void main() {
       vColor = color;
       vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
       gl_Position = projectionMatrix * mvPosition;
       gl_PointSize = pointSize;
     }
     ```

   - `pointcloud.frag.glsl`：
     ```glsl
     #version 300 es
     precision highp float;

     in vec3 vColor;
     out vec4 fragColor;

     void main() {
       fragColor = vec4(vColor, 1.0);
     }
     ```

2. 配置 Rsbuild 支持 `.glsl` 文件导入为字符串

3. 从原 Potree 迁移更复杂的着色器（渐进）

**完成标准**:
- ✅ 着色器使用 GLSL 3.00 ES 语法
- ✅ 使用 `in/out` 而非 `attribute/varying`
- ✅ 着色器能正确编译
- ✅ 在 playground 中能看到着色效果

**验证**:
在 playground 中渲染点云并验证着色器

---

### T2.4 实现点云材质

**原始代码参考**: `D:\coding\libs\potree\src\materials\PointCloudMaterial.js`

**具体内容**:
1. 在 `@better-potree/rendering-three/src/materials/` 创建：

   - `PointCloudMaterial.ts`：
     ```typescript
     import * as THREE from 'three'
     import vertexShader from '../shaders/pointcloud.vert.glsl'
     import fragmentShader from '../shaders/pointcloud.frag.glsl'

     export interface PointCloudMaterialParameters {
       pointSize?: number
       // 其他参数...
     }

     export class PointCloudMaterial extends THREE.ShaderMaterial {
       constructor(params: PointCloudMaterialParameters = {}) {
         super({
           vertexShader,
           fragmentShader,
           uniforms: {
             pointSize: { value: params.pointSize || 1.0 }
           }
         })
       }

       setPointSize(size: number): void {
         this.uniforms.pointSize.value = size
       }
     }
     ```

**完成标准**:
- ✅ 继承 `THREE.ShaderMaterial`
- ✅ 正确加载着色器代码
- ✅ 提供 uniform 更新方法
- ✅ 在 playground 中能正常使用

**验证**:
在 playground 中创建材质并应用到点云

---

### T2.5 创建点云可视化对象

**具体内容**:
1. 在 `@better-potree/rendering-three/src/objects/` 创建：

   - `PointCloudObject3D.ts`：
     ```typescript
     import * as THREE from 'three'
     import type { PointCloudOctree } from '@better-potree/core'
     import { PointCloudMaterial } from '../materials/PointCloudMaterial'

     export class PointCloudObject3D extends THREE.Object3D {
       octree: PointCloudOctree
       points: THREE.Points
       material: PointCloudMaterial

       constructor(octree: PointCloudOctree) {
         super()
         this.octree = octree
         this.material = new PointCloudMaterial()

         // 创建 THREE.Points 对象
         const geometry = new THREE.BufferGeometry()
         this.points = new THREE.Points(geometry, this.material)
         this.add(this.points)
       }

       updateGeometry(positions: Float32Array, colors: Float32Array): void {
         const geometry = this.points.geometry
         geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
         geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
       }
     }
     ```

**完成标准**:
- ✅ 继承 `THREE.Object3D`
- ✅ 管理 `THREE.Points` 对象
- ✅ 提供几何体更新方法
- ✅ 在 playground 中能显示点云

**验证**:
在 playground 中创建并显示简单点云

---

### T2.6 重写 LOD 更新与渲染逻辑

**具体内容**:
1. 在 `PointCloudObject3D` 中添加 `update` 方法：
   ```typescript
   update(camera: THREE.Camera, pointBudget: number): void {
     // 1. 调用 core 的 LOD 选择算法
     const visibleNodes = this.octree.getVisibleNodes(camera, pointBudget)

     // 2. 收集所有可见节点的点数据
     const positions: number[] = []
     const colors: number[] = []

     for (const node of visibleNodes) {
       // 从节点加载点数据（占位，后续实现）
       // positions.push(...nodePositions)
       // colors.push(...nodeColors)
     }

     // 3. 更新 BufferGeometry
     this.updateGeometry(
       new Float32Array(positions),
       new Float32Array(colors)
     )
   }
   ```

2. 集成 core 的算法

**完成标准**:
- ✅ `update` 方法正确调用 core 算法
- ✅ 根据算法结果更新几何体
- ✅ LOD 切换流畅
- ✅ 在 playground 中验证 LOD 效果

**验证**:
在 playground 中移动相机，观察 LOD 变化

---

### T2.7 创建辅助对象可视化

**具体内容**:
1. 在 `@better-potree/rendering-three/src/helpers/` 创建：

   - `MeasurementHelper.ts`：
     ```typescript
     import * as THREE from 'three'
     import type { Measurement } from '@better-potree/core'

     export class MeasurementHelper extends THREE.Object3D {
       measurement: Measurement
       line: THREE.Line

       constructor(measurement: Measurement) {
         super()
         this.measurement = measurement

         // 创建线条可视化
         const geometry = new THREE.BufferGeometry()
         const material = new THREE.LineBasicMaterial({ color: 0xff0000 })
         this.line = new THREE.Line(geometry, material)
         this.add(this.line)

         this.update()
       }

       update(): void {
         const points = this.measurement.points
         const positions = new Float32Array(points.length * 3)

         for (let i = 0; i < points.length; i++) {
           positions[i * 3] = points[i].x
           positions[i * 3 + 1] = points[i].y
           positions[i * 3 + 2] = points[i].z
         }

         this.line.geometry.setAttribute(
           'position',
           new THREE.BufferAttribute(positions, 3)
         )
       }
     }
     ```

   - `AnnotationHelper.ts`：类似实现

**完成标准**:
- ✅ 能可视化测量对象
- ✅ 能可视化标注对象
- ✅ 数据变化时自动更新
- ✅ 在 playground 中验证

**验证**:
在 playground 中创建测量和标注，观察可视化

---

## 阶段 2 验收标准

完成阶段 2 后，必须满足：

1. **WebGL2 支持**: 必须在 WebGL2 环境下运行
2. **点云渲染**: 能够渲染点云并看到效果
3. **着色器正确**: 使用 GLSL 3.00 ES 语法
4. **LOD 工作**: LOD 切换正常
5. **辅助对象**: 能可视化测量和标注

**验证清单**:
```bash
# 构建渲染包
pnpm --filter @better-potree/rendering-three build

# 启动 playground
pnpm --filter @better-potree/playground dev

# 在浏览器中验证：
# 1. 控制台无 WebGL 错误
# 2. 能看到点云
# 3. 移动相机，LOD 变化
# 4. 能显示测量线
```

---

## 阶段 3: 加载器与控制器重构

### T3.1 重构 Potree 加载器

**原始代码参考**:
- `D:\coding\libs\potree\src\loader\POCLoader.js`
- `D:\coding\libs\potree\src\modules\loader\2.0\OctreeLoader.js`

**具体内容**:
1. 在 `@better-potree/loader-potree/src/` 创建：

   - `PotreeLoader.ts`：
     ```typescript
     import type { PointCloudOctree } from '@better-potree/core'
     import type { ILoader } from '@better-potree/types'

     export interface PotreeLoaderOptions {
       maxConcurrentRequests?: number
       pointBudget?: number
     }

     export class PotreeLoader implements ILoader<PointCloudOctree> {
       constructor(options?: PotreeLoaderOptions)

       async load(
         url: string,
         onProgress?: (progress: number) => void
       ): Promise<PointCloudOctree>

       // 加载元数据（cloud.js）
       private async loadMetadata(url: string): Promise<OctreeMetadata>

       // 加载层级数据（hierarchy.bin）
       private async loadHierarchy(baseUrl: string): Promise<void>
     }
     ```

2. 实现元数据解析：
   - 解析 `cloud.js` 或 `metadata.json`
   - 提取点云范围、点数量、属性信息等
   - 创建 `PointCloudOctree` 实例

3. 实现层级数据加载：
   - 解析 `hierarchy.bin`
   - 构建八叉树节点结构
   - 按需加载节点数据

4. 节点数据加载：
   - 根据可见性和 LOD 决定加载哪些节点
   - 使用 Worker 解码二进制数据（见 T3.2）
   - 填充节点的点数据

**完成标准**:
- ✅ 能加载 Potree 1.x 和 2.0 格式
- ✅ 正确解析元数据和层级信息
- ✅ 按需加载节点数据
- ✅ 加载进度回调正常工作
- ✅ 能在 playground 中加载真实点云数据

**验证命令**:
```bash
pnpm --filter @better-potree/loader-potree build
# 在 playground 中测试加载
```

---

### T3.2 重构 Worker 逻辑

**原始代码参考**: `D:\coding\libs\potree\src\workers\BinaryDecoderWorker.js`

**具体内容**:
1. 在 `@better-potree/loader-potree/src/workers/` 创建：

   - `BinaryDecoderWorker.ts`：
     ```typescript
     // Worker 入口文件
     import type { PointAttributes } from '@better-potree/core'

     export interface DecodeRequest {
       buffer: ArrayBuffer
       pointAttributes: PointAttributes
       numPoints: number
       scale: [number, number, number]
       offset: [number, number, number]
     }

     export interface DecodeResult {
       positions: Float32Array
       colors?: Uint8Array
       intensities?: Float32Array
       classifications?: Uint8Array
       normals?: Float32Array
     }

     // Worker 消息处理
     self.onmessage = (event: MessageEvent<DecodeRequest>) => {
       const { buffer, pointAttributes, numPoints, scale, offset } = event.data

       const result = decodeBinaryData(
         buffer,
         pointAttributes,
         numPoints,
         scale,
         offset
       )

       self.postMessage(result, [
         result.positions.buffer,
         // 其他可转移对象...
       ])
     }

     function decodeBinaryData(
       buffer: ArrayBuffer,
       pointAttributes: PointAttributes,
       numPoints: number,
       scale: [number, number, number],
       offset: [number, number, number]
     ): DecodeResult {
       // 实现二进制解码逻辑
       // 从原始代码迁移
     }
     ```

2. 配置 Rsbuild 打包 Worker：
   - 支持 Worker 文件的独立打包
   - 或使用内联 Worker（通过 Blob URL）

3. 在主线程中使用 Worker：
   ```typescript
   import BinaryDecoderWorker from './workers/BinaryDecoderWorker?worker'

   export class WorkerPool {
     private workers: Worker[]

     constructor(numWorkers: number = navigator.hardwareConcurrency || 4) {
       this.workers = Array.from(
         { length: numWorkers },
         () => new BinaryDecoderWorker()
       )
     }

     async decode(request: DecodeRequest): Promise<DecodeResult> {
       // 从池中获取空闲 worker
       // 发送解码请求
       // 返回 Promise
     }
   }
   ```

**完成标准**:
- ✅ Worker 正确解码 Potree 二进制数据
- ✅ 支持所有点云属性（位置、颜色、强度等）
- ✅ 使用 Transferable Objects 优化性能
- ✅ Worker 池管理多个并发请求
- ✅ 解码性能满足要求

**验证**:
在 playground 中加载大型点云，观察 Worker 性能

---

### T3.3 重构相机控制器

**原始代码参考**:
- `D:\coding\libs\potree\src\navigation\EarthControls.js` ⭐ **主要控制器**
- `D:\coding\libs\potree\src\navigation\OrbitControls.js`
- `D:\coding\libs\potree\src\navigation\FirstPersonControls.js` (可选)

**为什么不使用 Three.js 官方 OrbitControls**:
- ❌ Three.js 官方 OrbitControls 是**固定旋转中心**，用户体验不佳
- ✅ Potree 的控制器支持**动态旋转中心**（根据鼠标点击的点云位置自动调整）
- ✅ 更好的缩放和平移行为
- ✅ 更适合点云场景的交互逻辑

**具体内容**:
1. 分析 Potree 控制器的核心特性：

   **EarthControls 关键特性**:
   - 动态 pivot（旋转中心）
   - 根据鼠标点击的点云位置自动设置旋转中心
   - 支持惯性滑动
   - 支持双击缩放
   - 更自然的缩放行为

   **OrbitControls 关键特性**:
   - 类似 Earth Controls 但旋转方式不同
   - yaw/pitch 旋转
   - 支持平移和缩放

2. 在 `@better-potree/controls/src/` 创建：

   - `EarthControls.ts`：
     ```typescript
     import * as THREE from 'three'
     import { TypedEventEmitter } from '@better-potree/core'

     export interface EarthControlsEvents {
       'start': () => void
       'change': () => void
       'end': () => void
     }

     export class EarthControls extends TypedEventEmitter<EarthControlsEvents> {
       viewer: Viewer
       scene: THREE.Scene
       renderer: THREE.WebGLRenderer

       // 动态旋转中心
       pivot: THREE.Vector3 | null
       pivotIndicator: THREE.Mesh

       // 控制参数
       rotationSpeed: number
       fadeFactor: number
       wheelDelta: number
       zoomDelta: THREE.Vector3

       constructor(viewer: Viewer)

       // 核心方法
       update(delta: number): void
       setScene(scene: THREE.Scene): void

       // 动态设置旋转中心（关键功能）
       setPivot(point: THREE.Vector3): void

       // 射线检测，获取点击的点云位置
       getPivotFromMouse(mouse: THREE.Vector2): THREE.Vector3 | null
     }
     ```

   - `OrbitControls.ts`：类似实现

   - `FirstPersonControls.ts`：可选

3. 迁移核心逻辑：
   - 鼠标/触摸事件处理
   - 动态旋转中心计算
   - 惯性滑动
   - 缩放和平移
   - 边界限制

4. 移除 jQuery 依赖：
   - 使用原生 DOM 事件 API
   - 移除对 `viewer` 的 jQuery 依赖

5. TypeScript 重构：
   - 添加完整的类型定义
   - 使用 `eventemitter3` 替代原始事件系统
   - 确保类型安全

**完成标准**:
- ✅ `EarthControls` 迁移完成并正常工作
- ✅ 支持动态旋转中心（关键特性）
- ✅ 支持鼠标拖拽、滚轮缩放
- ✅ 支持触摸操作（移动设备）
- ✅ 惯性滑动正常
- ✅ 无 jQuery 依赖
- ✅ 完全 TypeScript 实现
- ✅ 在 playground 中能流畅控制相机

**验证**:
在 playground 中测试：
1. 鼠标拖拽旋转点云
2. 点击点云不同位置，旋转中心应该动态改变
3. 滚轮缩放
4. 右键平移
5. 触摸操作（如果有触摸设备）

---

### T3.3 重构相机控制器（旧版本，已废弃）

~~**原始代码参考**: Three.js 官方的 `OrbitControls`（推荐直接使用）~~

---

## 阶段 3 验收标准

完成阶段 3 后，必须满足：

1. **数据加载**: 能加载真实的 Potree 点云数据
2. **Worker 解码**: 二进制数据正确解码且性能良好
3. **相机控制**: 能流畅控制相机查看点云
4. **完整流程**: 从加载到渲染的完整流程跑通

**验证清单**:
```bash
# 准备测试数据
# 下载一个 Potree 格式的点云数据集

# 构建加载器和控制器
pnpm --filter @better-potree/loader-potree build
pnpm --filter @better-potree/controls build

# 在 playground 中加载和查看
pnpm --filter @better-potree/playground dev

# 验证：
# 1. 点云正确加载和显示
# 2. 可以用鼠标旋转、缩放
# 3. LOD 根据相机距离切换
# 4. 性能流畅（60fps）
```

---

## 阶段 4: API 封装与 UI 彻底解耦

### T4.1 创建 Viewer 主类

**具体内容**:
1. 在 `@better-potree/viewer/src/` 创建：

   - `Viewer.ts`：
     ```typescript
     import type { ThreeJsRenderer } from '@better-potree/rendering-three'
     import type { PotreeLoader } from '@better-potree/loader-potree'
     import type { PointCloudOctree } from '@better-potree/core'
     import { TypedEventEmitter } from '@better-potree/core'

     export interface ViewerOptions {
       renderer: ThreeJsRenderer
       loader?: PotreeLoader
       pointBudget?: number
     }

     export interface ViewerEvents {
       'pointcloud-loaded': (pointCloud: PointCloudOctree) => void
       'pointcloud-removed': (pointCloud: PointCloudOctree) => void
       'camera-changed': () => void
       'render': () => void
     }

     export class Viewer extends TypedEventEmitter<ViewerEvents> {
       renderer: ThreeJsRenderer
       loader: PotreeLoader
       pointClouds: PointCloudOctree[]
       pointBudget: number

       constructor(options: ViewerOptions) {
         super()
         this.renderer = options.renderer
         this.loader = options.loader || new PotreeLoader()
         this.pointBudget = options.pointBudget || 1_000_000
         this.pointClouds = []
       }

       async load(url: string): Promise<PointCloudOctree> {
         const pointCloud = await this.loader.load(url)
         this.pointClouds.push(pointCloud)
         this.emit('pointcloud-loaded', pointCloud)
         return pointCloud
       }

       remove(pointCloud: PointCloudOctree): void {
         const index = this.pointClouds.indexOf(pointCloud)
         if (index !== -1) {
           this.pointClouds.splice(index, 1)
           this.emit('pointcloud-removed', pointCloud)
         }
       }

       setPointBudget(budget: number): void {
         this.pointBudget = budget
       }

       render(): void {
         // 更新所有点云的 LOD
         // 渲染场景
         this.emit('render')
       }

       dispose(): void {
         this.renderer.dispose()
         this.removeAllListeners()
       }
     }
     ```

**完成标准**:
- ✅ `Viewer` 类实现完整
- ✅ 通过依赖注入接收渲染器
- ✅ 提供事件通知机制
- ✅ 能在 playground 中创建并使用

**验证**:
```typescript
const viewer = new Viewer({
  renderer: new ThreeJsRenderer(canvas),
  pointBudget: 1_000_000
})

viewer.on('pointcloud-loaded', (pc) => {
  console.log('Loaded:', pc)
})

await viewer.load('path/to/pointcloud')
```

---

### T4.2 封装高级 API

**具体内容**:
1. 为 `Viewer` 添加常用的高级方法：

   ```typescript
   export class Viewer {
     // ... 现有代码

     // 相机控制
     setNavigation(mode: 'orbit' | 'fps' | 'fly'): void {
       // 切换控制模式
     }

     fitToScreen(pointCloud?: PointCloudOctree): void {
       // 调整相机使点云适应屏幕
     }

     // 渲染设置
     setPointSize(size: number): void {
       // 设置点大小
     }

     setBackground(color: number | string): void {
       // 设置背景色
     }

     setEDLEnabled(enabled: boolean): void {
       // 启用/禁用 Eye-Dome Lighting
     }

     // 裁剪
     addClipVolume(volume: ClipVolume): void {
       // 添加裁剪体
     }

     removeClipVolume(volume: ClipVolume): void {
       // 移除裁剪体
     }

     // 测量
     startMeasuring(type: 'distance' | 'area' | 'volume'): MeasuringTool {
       // 开始测量
     }

     // 截图
     screenshot(): Promise<Blob> {
       // 生成截图
     }

     // 动画
     startAnimation(): void {
       // 开始渲染循环
     }

     stopAnimation(): void {
       // 停止渲染循环
     }
   }
   ```

**完成标准**:
- ✅ 所有常用 API 已实现
- ✅ API 简洁易用
- ✅ 有 TypeScript 类型提示
- ✅ 有 JSDoc 文档注释

**验证**:
测试所有 API 方法是否正常工作

---

### T4.3 分析并映射旧 UI 功能

**原始代码参考**:
- `D:\coding\libs\potree\src\viewer\sidebar.html`（如果存在）
- jQuery UI 相关的 JavaScript 文件

**具体内容**:
1. 分析旧 UI 的所有功能点：
   - 侧边栏控件
   - 工具栏按钮
   - 右键菜单
   - 快捷键

2. 创建映射文档 `UI_MIGRATION.md`：
   ```markdown
   # UI 功能映射表

   | 旧 UI 控件 | 触发的功能 | 新 API 方法 | 事件 | 备注 |
   |-----------|-----------|------------|------|------|
   | 点大小滑块 | 调整点大小 | `viewer.setPointSize(size)` | - | - |
   | 点预算输入框 | 设置点预算 | `viewer.setPointBudget(budget)` | - | - |
   | 背景色选择器 | 改变背景色 | `viewer.setBackground(color)` | - | - |
   | EDL 复选框 | 启用/禁用 EDL | `viewer.setEDLEnabled(enabled)` | - | - |
   | 测量工具按钮 | 开始测量 | `viewer.startMeasuring(type)` | `measurement-started` | - |
   | 裁剪工具按钮 | 创建裁剪体 | `viewer.addClipVolume(volume)` | `clip-volume-added` | - |
   | 截图按钮 | 生成截图 | `viewer.screenshot()` | - | 返回 Promise |
   | ... | ... | ... | ... | ... |
   ```

3. 检查是否有隐式逻辑：
   - 某些控件可能触发多个操作
   - 某些状态可能相互依赖
   - 需要在新 API 中明确这些关系

**完成标准**:
- ✅ `UI_MIGRATION.md` 文档完整
- ✅ 所有旧 UI 功能都有对应的新 API
- ✅ 隐式逻辑已识别并处理
- ✅ 映射表经过审查确认

**验证**:
与团队成员一起审查映射表

---

### T4.4 实现工具模块

**原始代码参考**:
- `D:\coding\libs\potree\src\utils\MeasuringTool.js`
- `D:\coding\libs\potree\src\utils\ClippingTool.js`
- `D:\coding\libs\potree\src\utils\Volume.js`

**具体内容**:
1. 在 `@better-potree/tools/src/` 创建：

   - `MeasuringTool.ts`：
     ```typescript
     import type { Viewer } from '@better-potree/viewer'
     import type { Measurement, MeasurementType } from '@better-potree/core'
     import { TypedEventEmitter } from '@better-potree/core'

     export interface MeasuringToolEvents {
       'point-added': (index: number) => void
       'measurement-finished': (measurement: Measurement) => void
       'measurement-cancelled': () => void
     }

     export class MeasuringTool extends TypedEventEmitter<MeasuringToolEvents> {
       viewer: Viewer
       measurement: Measurement | null
       active: boolean

       constructor(viewer: Viewer, type: MeasurementType) {
         super()
         this.viewer = viewer
         this.measurement = null
         this.active = false
       }

       start(): void {
         // 开始测量
         // 监听鼠标点击事件（通过 viewer 的公共 API）
       }

       addPoint(point: THREE.Vector3): void {
         // 添加测量点
         this.emit('point-added', this.measurement!.points.length - 1)
       }

       finish(): void {
         // 完成测量
         this.emit('measurement-finished', this.measurement!)
       }

       cancel(): void {
         // 取消测量
         this.emit('measurement-cancelled')
       }
     }
     ```

   - `ClippingTool.ts`：类似实现

   - `VolumeTool.ts`：类似实现

2. 确保工具只通过公共 API 与 Viewer 交互：
   - 不直接访问 Viewer 的私有属性
   - 通过事件监听 Viewer 的状态变化
   - 通过公共方法修改 Viewer 的状态

**完成标准**:
- ✅ 测量工具实现完整
- ✅ 裁剪工具实现完整
- ✅ 体积工具实现完整
- ✅ 所有工具只使用公共 API
- ✅ 工具提供丰富的事件通知

**验证**:
在 playground 中使用工具进行测量和裁剪

---

### T4.5 编写第一个无 UI 示例

**具体内容**:
1. 在 `packages/playground/examples/` 创建 `no-ui-example.html`：

   ```html
   <!DOCTYPE html>
   <html lang="zh-CN">
   <head>
     <meta charset="UTF-8">
     <title>Better Potree - 无 UI 示例</title>
     <style>
       body { margin: 0; overflow: hidden; }
       canvas { width: 100%; height: 100vh; }
       .controls {
         position: absolute;
         top: 10px;
         left: 10px;
         background: rgba(255, 255, 255, 0.9);
         padding: 10px;
         border-radius: 5px;
       }
       button { margin: 5px; padding: 5px 10px; }
       input { margin: 5px; }
     </style>
   </head>
   <body>
     <canvas id="canvas"></canvas>
     <div class="controls">
       <div>
         <label>点云 URL:</label>
         <input type="text" id="url" value="path/to/pointcloud" />
         <button id="load">加载</button>
       </div>
       <div>
         <label>点大小:</label>
         <input type="range" id="pointSize" min="0.1" max="5" step="0.1" value="1" />
         <span id="pointSizeValue">1.0</span>
       </div>
       <div>
         <label>点预算:</label>
         <input type="number" id="pointBudget" value="1000000" />
         <button id="applyBudget">应用</button>
       </div>
       <div>
         <button id="measure">开始测量</button>
         <button id="clip">开始裁剪</button>
         <button id="screenshot">截图</button>
       </div>
     </div>

     <script type="module">
       import { Viewer, ThreeJsRenderer, PotreeLoader } from '@better-potree/viewer'
       import { MeasuringTool, ClippingTool } from '@better-potree/tools'
       import * as THREE from 'three'

       const canvas = document.getElementById('canvas')
       const viewer = new Viewer({
         renderer: new ThreeJsRenderer(canvas),
         loader: new PotreeLoader(),
         pointBudget: 1_000_000
       })

       // 设置相机
       const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
       viewer.setCamera(camera)

       // 事件监听
       viewer.on('pointcloud-loaded', (pc) => {
         console.log('点云已加载:', pc)
         viewer.fitToScreen()
       })

       // UI 交互
       document.getElementById('load').addEventListener('click', async () => {
         const url = document.getElementById('url').value
         await viewer.load(url)
       })

       document.getElementById('pointSize').addEventListener('input', (e) => {
         const size = parseFloat(e.target.value)
         document.getElementById('pointSizeValue').textContent = size.toFixed(1)
         viewer.setPointSize(size)
       })

       document.getElementById('applyBudget').addEventListener('click', () => {
         const budget = parseInt(document.getElementById('pointBudget').value)
         viewer.setPointBudget(budget)
       })

       document.getElementById('measure').addEventListener('click', () => {
         const tool = viewer.startMeasuring('distance')
         tool.on('measurement-finished', (m) => {
           alert(`测量结果: ${m.getValue()} 米`)
         })
       })

       document.getElementById('screenshot').addEventListener('click', async () => {
         const blob = await viewer.screenshot()
         const url = URL.createObjectURL(blob)
         const a = document.createElement('a')
         a.href = url
         a.download = 'screenshot.png'
         a.click()
       })

       // 开始渲染循环
       viewer.startAnimation()
     </script>
   </body>
   </html>
   ```

2. 验证功能：
   - 点云加载
   - 参数调整
   - 工具使用
   - 截图导出

**完成标准**:
- ✅ 示例页面运行正常
- ✅ 所有功能通过原生 JS 和简单 HTML 实现
- ✅ 无任何 jQuery 或 UI 框架依赖
- ✅ 代码清晰，易于理解

**验证**:
在浏览器中打开示例页面并测试所有功能

---

## 阶段 4 验收标准

完成阶段 4 后，必须满足：

1. **API 完整**: `Viewer` 类提供完整的公共 API
2. **工具可用**: 测量、裁剪等工具正常工作
3. **UI 解耦**: 无 UI 示例证明完全解耦
4. **jQuery 移除**: 代码中无任何 jQuery 依赖

**验证清单**:
```bash
# 构建所有包
pnpm build

# 检查依赖
pnpm list jquery  # 应该返回空

# 运行无 UI 示例
pnpm --filter @better-potree/playground dev
# 访问 /examples/no-ui-example.html

# 验证：
# 1. 能加载点云
# 2. 能调整参数
# 3. 能使用工具
# 4. 能截图
# 5. 控制台无错误
```

---

## 后续阶段

阶段 5 的详细任务清单将在阶段 4 完成后根据实际情况制定。

---

## 任务跟踪

使用以下标记跟踪任务状态：
- ⏳ 待开始
- 🚧 进行中
- ✅ 已完成
- ⚠️  有问题
- 🔄 需要返工

**当前进度**: 阶段 0 - ⏳ 待开始
