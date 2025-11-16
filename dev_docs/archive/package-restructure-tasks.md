# Better-Potree 包结构重组任务

**版本**: v1.0
**基于**: architecture-v8.md 第 13 节
**目标**: 将现有 8 包结构重组为架构规定的 4 包结构
**优先级**: P0（必须在 Phase 1 Week 2 之前完成）

---

## 📋 重组说明

### 当前问题

当前项目有 **8 个包**，但架构 v8 规定只需要 **4 个核心包**：

**当前结构**（不符合架构）：
```
packages/
├── types/                    ❌ 应合并到 core
├── core/                     ✅ 保留
├── rendering-three/          ⚠️  保留但需拆分抽象层
├── loader-potree/            ❌ 应合并到 viewer
├── controls/                 ❌ 应合并到 viewer
├── tools/                    ❌ 应合并到 viewer 或删除
├── viewer/                   ✅ 保留
└── playground/               ⚠️  应移到 apps/
```

**架构 v8 规定**（标准结构）：
```
packages/
├── core/                     # 核心引擎（无渲染依赖）
├── rendering/                # 渲染抽象层（接口定义）
├── rendering-three/          # Three.js 渲染实现
└── viewer/                   # 高级 API（loaders, controls, ui）

apps/
└── playground/               # 演示应用
```

---

## 🎯 重组任务清单

### TASK-R01: 创建 @better-potree/rendering 抽象层

**任务 ID**: TASK-R01
**预计时间**: 2 小时
**优先级**: P0

#### 目标
从 `rendering-three` 中提取渲染接口，创建独立的抽象层包

#### 操作步骤

1. **创建新包结构**：
```bash
mkdir -p packages/rendering/src/interfaces
mkdir -p packages/rendering/src/systems
```

2. **创建 package.json**：
```json
{
  "name": "@better-potree/rendering",
  "version": "0.1.0",
  "description": "Rendering abstraction layer for better-potree",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "scripts": {
    "build": "tsc --build",
    "test": "vitest",
    "clean": "rm -rf dist *.tsbuildinfo"
  },
  "dependencies": {
    "@better-potree/core": "workspace:*"
  },
  "devDependencies": {
    "@types/three": "~0.180.0"
  }
}
```

3. **创建 tsconfig.json**：
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declarationDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"],
  "references": [{ "path": "../core" }]
}
```

4. **创建接口文件**：
   - `src/interfaces/IRenderer.ts` - 渲染器接口
   - `src/interfaces/IMaterial.ts` - 材质接口
   - `src/interfaces/IBuffer.ts` - 缓冲区接口
   - `src/interfaces/IShader.ts` - 着色器接口

5. **创建抽象系统**：
   - `src/systems/RenderSystem.ts` - 抽象的 RenderSystem 基类

6. **创建导出文件**：
   - `src/index.ts` - 导出所有接口和抽象类

#### 验证方法
```bash
# 1. 构建
pnpm --filter @better-potree/rendering run build

# 2. 类型检查
pnpm --filter @better-potree/rendering run typecheck

# 3. 测试
pnpm --filter @better-potree/rendering run test
```

---

### TASK-R02: 合并 @better-potree/types 到 core

**任务 ID**: TASK-R02
**预计时间**: 1 小时
**优先级**: P0

#### 目标
将独立的 types 包合并到 core 包中

#### 操作步骤

1. **移动类型文件**：
```bash
# 将 types/src/* 移动到 core/src/types/
mv packages/types/src/* packages/core/src/types/
```

2. **更新 core/src/index.ts**：
```typescript
// 导出所有类型
export * from './types';
export * from './config';
export * from './runtime';
// ... 其他导出
```

3. **更新所有引用**：
```bash
# 将所有 @better-potree/types 的引用替换为 @better-potree/core
# 使用全局搜索替换
```

4. **删除 types 包**：
```bash
rm -rf packages/types
```

5. **更新 pnpm-workspace.yaml**（如果需要）

6. **更新根 tsconfig.json 的 paths**：
```json
{
  "paths": {
    "@better-potree/core": ["./packages/core/src"],
    "@better-potree/core/*": ["./packages/core/src/*"],
    // 删除 @better-potree/types 相关 paths
  }
}
```

#### 验证方法
```bash
# 1. 构建所有包
pnpm run build

# 2. 运行所有测试
pnpm run test

# 3. 类型检查
pnpm run typecheck
```

---

### TASK-R03: 合并 @better-potree/loader-potree 到 viewer

**任务 ID**: TASK-R03
**预计时间**: 1 小时
**优先级**: P0

#### 目标
将 loader-potree 包合并到 viewer/loaders/

#### 操作步骤

1. **创建目标目录**：
```bash
mkdir -p packages/viewer/src/loaders
```

2. **移动加载器文件**：
```bash
# 移动 loader-potree/src/* 到 viewer/src/loaders/
mv packages/loader-potree/src/* packages/viewer/src/loaders/
```

3. **更新 viewer/src/index.ts**：
```typescript
export * from './loaders';
```

4. **更新 viewer/package.json 依赖**（如果 loader-potree 有额外依赖）

5. **删除 loader-potree 包**：
```bash
rm -rf packages/loader-potree
```

6. **更新所有引用**：
```bash
# 将 @better-potree/loader-potree 替换为 @better-potree/viewer
```

#### 验证方法
```bash
# 1. 构建 viewer
pnpm --filter @better-potree/viewer run build

# 2. 测试
pnpm --filter @better-potree/viewer run test
```

---

### TASK-R04: 合并 @better-potree/controls 到 viewer

**任务 ID**: TASK-R04
**预计时间**: 1 小时
**优先级**: P0

#### 目标
将 controls 包合并到 viewer/controls/

#### 操作步骤

1. **创建目标目录**：
```bash
mkdir -p packages/viewer/src/controls
```

2. **移动控制器文件**：
```bash
mv packages/controls/src/* packages/viewer/src/controls/
```

3. **更新 viewer/src/index.ts**：
```typescript
export * from './controls';
```

4. **删除 controls 包**：
```bash
rm -rf packages/controls
```

5. **更新所有引用**：
```bash
# 将 @better-potree/controls 替换为 @better-potree/viewer
```

#### 验证方法
```bash
pnpm --filter @better-potree/viewer run build
pnpm --filter @better-potree/viewer run test
```

---

### TASK-R05: 处理 @better-potree/tools 包

**任务 ID**: TASK-R05
**预计时间**: 1 小时
**优先级**: P1

#### 目标
评估 tools 包内容，决定合并到 viewer 或删除

#### 操作步骤

1. **分析 tools 包内容**：
```bash
ls -R packages/tools/src
```

2. **根据内容决定**：
   - 如果是测量、裁剪等用户工具 → 合并到 `viewer/src/tools/`
   - 如果是内部工具 → 合并到 `core/src/utils/`
   - 如果是废弃代码 → 删除

3. **执行合并或删除**

#### 验证方法
```bash
pnpm run build
pnpm run test
```

---

### TASK-R06: 移动 playground 到 apps/

**任务 ID**: TASK-R06
**预计时间**: 30 分钟
**优先级**: P1

#### 目标
将 playground 从 packages/ 移动到 apps/

#### 操作步骤

1. **创建 apps 目录**：
```bash
mkdir -p apps
```

2. **移动 playground**：
```bash
mv packages/playground apps/
```

3. **更新 pnpm-workspace.yaml**：
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

4. **更新 playground/package.json**（如果需要修改路径）

5. **更新根 package.json 的 scripts**：
```json
{
  "scripts": {
    "dev": "pnpm --filter playground dev"
  }
}
```

#### 验证方法
```bash
pnpm --filter playground run dev
```

---

### TASK-R07: 更新 rendering-three 的依赖

**任务 ID**: TASK-R07
**预计时间**: 30 分钟
**优先级**: P0

#### 目标
让 rendering-three 依赖新的 rendering 抽象层

#### 操作步骤

1. **更新 rendering-three/package.json**：
```json
{
  "dependencies": {
    "@better-potree/core": "workspace:*",
    "@better-potree/rendering": "workspace:*",
    "three": "~0.180.0"
  }
}
```

2. **更新 rendering-three/tsconfig.json**：
```json
{
  "references": [
    { "path": "../core" },
    { "path": "../rendering" }
  ]
}
```

3. **更新实现文件**：
   - 让 ThreeRenderSystem 继承 rendering 包的抽象 RenderSystem
   - 实现 rendering 包定义的所有接口

#### 验证方法
```bash
pnpm --filter @better-potree/rendering-three run build
pnpm --filter @better-potree/rendering-three run test
```

---

### TASK-R08: 完整验证和测试

**任务 ID**: TASK-R08
**预计时间**: 1 小时
**优先级**: P0

#### 目标
验证重组后的包结构正确无误

#### 验证清单

- [ ] 包数量：4 个核心包（core, rendering, rendering-three, viewer）
- [ ] apps 目录：1 个应用（playground）
- [ ] 依赖关系正确：
  - rendering → core
  - rendering-three → rendering + core
  - viewer → rendering-three + rendering + core
  - playground → viewer

#### 验证命令

```bash
# 1. 清理所有构建产物
pnpm run clean

# 2. 重新安装依赖
pnpm install

# 3. 构建所有包
pnpm run build

# 4. 运行所有测试
pnpm run test

# 5. 类型检查
pnpm run typecheck

# 6. Lint 检查
pnpm run lint

# 7. 启动 playground
pnpm --filter playground run dev

# 8. 检查包结构
ls packages/
# 期望输出: core rendering rendering-three viewer

ls apps/
# 期望输出: playground
```

---

## 📊 重组任务总结

| 任务 | 描述 | 预计时间 | 优先级 |
|------|------|----------|--------|
| TASK-R01 | 创建 rendering 抽象层 | 2h | P0 |
| TASK-R02 | 合并 types 到 core | 1h | P0 |
| TASK-R03 | 合并 loader-potree 到 viewer | 1h | P0 |
| TASK-R04 | 合并 controls 到 viewer | 1h | P0 |
| TASK-R05 | 处理 tools 包 | 1h | P1 |
| TASK-R06 | 移动 playground 到 apps/ | 0.5h | P1 |
| TASK-R07 | 更新 rendering-three 依赖 | 0.5h | P0 |
| TASK-R08 | 完整验证 | 1h | P0 |
| **总计** | | **8 小时** | |

---

## 🔄 重组后的最终结构

```
better-potree/
├── packages/
│   ├── core/                              # @better-potree/core
│   │   ├── src/
│   │   │   ├── types/                     # 从 @better-potree/types 合并
│   │   │   ├── config/                    # ConfigStore
│   │   │   ├── runtime/                   # Runtime
│   │   │   ├── coordinator/               # StateCoordinator
│   │   │   ├── octree/                    # OctreeManager
│   │   │   ├── ecs/                       # ECS
│   │   │   ├── systems/                   # 核心系统
│   │   │   ├── resources/                 # 资源管理
│   │   │   ├── scheduler/                 # 系统调度
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── rendering/                         # @better-potree/rendering (新建)
│   │   ├── src/
│   │   │   ├── interfaces/                # IRenderer, IMaterial, IBuffer
│   │   │   ├── systems/                   # 抽象 RenderSystem
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── rendering-three/                   # @better-potree/rendering-three
│   │   ├── src/
│   │   │   ├── ThreeRenderer.ts
│   │   │   ├── ThreeRenderSystem.ts       # 实现 rendering 的抽象类
│   │   │   ├── materials/
│   │   │   ├── shaders/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── viewer/                            # @better-potree/viewer
│       ├── src/
│       │   ├── Engine.ts
│       │   ├── loaders/                   # 从 loader-potree 合并
│       │   ├── controls/                  # 从 controls 合并
│       │   ├── tools/                     # 从 tools 合并（可选）
│       │   ├── ui/
│       │   └── index.ts
│       └── package.json
│
├── apps/
│   └── playground/                        # 从 packages/ 移动
│
├── tests/
├── docs/
├── dev_docs/
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

## ⚠️ 注意事项

1. **Git 操作**：建议在执行重组前创建新分支
   ```bash
   git checkout -b refactor/package-restructure
   ```

2. **备份**：在删除包之前，确保所有文件都已正确移动

3. **渐进式重组**：建议按任务顺序执行，每完成一个任务就提交

4. **测试覆盖**：重组后确保所有测试仍然通过

5. **文档更新**：重组完成后需要更新：
   - README.md
   - 包的导入路径示例
   - 文档中的包引用

---

## 🎯 重组完成后

重组完成后，项目结构将完全符合 architecture-v8.md 的规定，此时可以开始执行：
- **Phase 1 Week 2**：基础设施层实现（TASK-108 ~ TASK-115）
- **Phase 2**：核心系统实现（TASK-201 ~ TASK-215）
- **Phase 3**：性能优化与完善（TASK-301 ~ TASK-310）

---

**文档版本**: v1.0
**创建日期**: 2025-11-16
**预计完成时间**: 1 天（8 小时）
**优先级**: 必须在 Phase 1 Week 2 之前完成
