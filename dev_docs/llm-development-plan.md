# Better-Potree LLM 驱动开发计划

**版本**: v1.0
**基于架构**: architecture-v8.md
**目标**: 通过 LLM 辅助完成整个项目开发
**特点**: 每个任务都是独立的、可执行的、可验证的

---

## 📋 计划说明

### LLM 驱动开发的核心原则

1. **任务原子化**: 每个任务都是独立的、可在一次对话中完成
2. **明确的输入**: 每个任务都有清晰的上下文引用
3. **明确的输出**: 每个任务都有具体的验收标准
4. **可验证性**: 每个任务都可以通过测试或检查清单验证

### 任务结构模板

```
## 任务标题

**任务 ID**: TASK-XXX
**依赖**: [前置任务 ID 列表]
**预计时间**: X 小时
**优先级**: P0/P1/P2

### 上下文
- 需要阅读的文件: [文件路径列表]
- 相关架构章节: [architecture-v8.md 章节]
- 前置知识: [需要了解的概念]

### 输入
- 明确的需求描述
- 代码模板或参考实现
- 类型定义

### 输出
- [ ] 需要创建/修改的文件列表
- [ ] 需要通过的测试用例
- [ ] 验收检查清单

### LLM Prompt 模板
提供给 LLM 的完整提示词模板

### 验证方法
- 运行命令: `npm run xxx`
- 检查输出: 期望看到什么
```

---

## 🎯 Phase 0: POC 验证 (3天 / 8个任务)

### TASK-001: 搭建最小化项目结构

**任务 ID**: TASK-001
**依赖**: 无
**预计时间**: 2 小时
**优先级**: P0

#### 上下文
- 阅读文件: `architecture-v8.md` 第 13.1 节（包结构概览）
- 目标: 创建基础的 monorepo 结构，只包含核心包

#### 输入
```
需求: 创建 better-potree 项目的基础目录结构
- 使用 pnpm workspace
- 只创建 Phase 0 需要的最小结构
- 配置 TypeScript 和 Vitest
```

#### 输出
- [ ] 创建根目录 `package.json` 和 `pnpm-workspace.yaml`
- [ ] 创建 `packages/core` 基础结构
- [ ] 创建 `poc` 目录用于 POC 测试
- [ ] 配置 `tsconfig.json` (根目录和包级别)
- [ ] 配置 `vitest.config.ts`
- [ ] 测试: 运行 `pnpm install` 成功
- [ ] 测试: 运行 `pnpm run test` 可执行（即使没有测试）

#### LLM Prompt 模板
```
我正在开发 better-potree 项目，这是一个 Web 点云渲染引擎。

任务: 搭建 Phase 0 POC 验证所需的最小化项目结构

需求:
1. 创建 pnpm monorepo 结构
2. 创建 packages/core 包（只创建结构，不实现代码）
3. 创建 poc 目录用于 POC 测试
4. 配置 TypeScript (strictNullChecks, noImplicitAny)
5. 配置 Vitest

目录结构应该是:
```
better-potree/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── vitest.config.ts
├── packages/
│   └── core/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
└── poc/
    └── poc.test.ts
```

请创建这些文件，并确保:
- package.json 包含正确的 workspace 配置
- tsconfig.json 有严格的类型检查
- vitest.config.ts 可以运行测试
- core 包可以被 poc 测试引用

输出所有需要创建的文件内容。
```

#### 验证方法
```bash
# 1. 安装依赖
pnpm install

# 2. 类型检查
pnpm --filter @better-potree/core run typecheck

# 3. 运行测试（应该通过，即使是空测试）
pnpm run test

# 4. 检查文件结构
ls -R packages/core/src
ls -R poc
```

---

### TASK-002: 实现最简 ConfigStore

**任务 ID**: TASK-002
**依赖**: TASK-001
**预计时间**: 3 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 4.1 节（Config Store 实现）
  - `architecture-v8.md` 第 2.1 节（分层状态管理）
- 前置知识: Zustand 基础用法

#### 输入
```typescript
// 需要实现的核心类型和接口
// 参考 architecture-v8.md 第 4.1 节的完整代码
```

#### 输出
- [ ] 创建 `packages/core/src/config/types.ts`
- [ ] 创建 `packages/core/src/config/store.ts`
- [ ] 创建 `packages/core/src/config/index.ts` (导出)
- [ ] 创建 `packages/core/src/config/__tests__/store.test.ts`
- [ ] 测试覆盖率 > 80%
- [ ] 所有类型检查通过

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的配置状态管理层。

参考文档: architecture-v8.md 第 4.1 节

任务: 实现基于 Zustand 的 ConfigStore

要求:
1. 实现以下类型（参考架构文档）:
   - SourceConfig
   - MaterialConfig
   - RenderingConfig
   - ConfigState
   - ConfigStore (包含 actions)

2. 实现 createConfigStore 工厂函数:
   - 接受可选的初始配置
   - 返回 Zustand vanilla store
   - 实现以下 actions:
     * addSource(config: SourceConfig)
     * removeSource(id: string)
     * updateSource(id: string, partial: Partial<SourceConfig>)
     * setRenderingConfig(config: Partial<RenderingConfig>)

3. 编写单元测试:
   - 测试添加/删除/更新 source
   - 测试状态不可变性
   - 测试订阅机制

关键点:
- 使用 zustand/vanilla (不是 React 版本)
- 状态必须是不可变的
- 所有配置必须可序列化

文件结构:
packages/core/src/config/
├── types.ts (类型定义)
├── store.ts (store 实现)
├── index.ts (导出)
└── __tests__/
    └── store.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 类型检查
pnpm --filter @better-potree/core run typecheck

# 2. 运行测试
pnpm --filter @better-potree/core run test -- config

# 3. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage

# 期望输出:
# - 所有测试通过
# - 覆盖率 > 80%
# - 无 TypeScript 错误
```

---

### TASK-003: 实现最简 Runtime 类

**任务 ID**: TASK-003
**依赖**: TASK-001
**预计时间**: 2 小时
**优先级**: P0

#### 上下文
- 阅读文件: `architecture-v8.md` 第 4.2 节（Runtime State 实现）
- 重点: Runtime 是完全可变的，用于高频更新

#### 输入
```typescript
// 参考架构文档中的 Runtime 类定义
// 需要实现可变的状态管理
```

#### 输出
- [ ] 创建 `packages/core/src/runtime/Runtime.ts`
- [ ] 创建 `packages/core/src/runtime/types.ts`
- [ ] 创建 `packages/core/src/runtime/index.ts`
- [ ] 创建 `packages/core/src/runtime/__tests__/Runtime.test.ts`
- [ ] 测试: 验证可变更新的性能优势

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的运行时状态管理层。

参考文档: architecture-v8.md 第 4.2 节

任务: 实现可变的 Runtime 状态类

要求:
1. 实现 Runtime 类，包含以下可变状态:
   - camera: Camera (来自 three.js)
   - rendering: { pointBudget, minNodeSize }
   - visibleNodes: Set<string>
   - visibleNodesList: string[]
   - loadingTasks: Map<string, LoadTask>
   - loadedNodes: Map<string, NodeData>
   - sources: Map<string, SourceRuntimeState>
   - gpuResources: Map<string, GPUResource>
   - stats: 性能统计
   - budgets: 内存预算（只读）

2. 实现辅助方法:
   - checkGPUMemoryBudget(requiredBytes: number): boolean
   - cleanupInvisibleNodes(): void
   - evictInvisibleLoadedNodes(resourceManager): void

3. 定义相关类型（types.ts）:
   - LoadTask
   - NodeData
   - SourceRuntimeState
   - GPUResource

4. 编写单元测试:
   - 测试状态的可变性（直接修改不创建新对象）
   - 测试辅助方法逻辑
   - 性能测试: 10000 次更新 < 10ms

注意:
- Runtime 是完全可变的（与 Config 不同）
- 不需要序列化
- 针对高频更新优化

文件结构:
packages/core/src/runtime/
├── Runtime.ts
├── types.ts
├── index.ts
└── __tests__/
    └── Runtime.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- runtime

# 2. 性能验证
# 期望: 10000 次可变更新 < 10ms

# 3. 类型检查
pnpm --filter @better-potree/core run typecheck
```

---

### TASK-004: 实现 StateCoordinator

**任务 ID**: TASK-004
**依赖**: TASK-002, TASK-003
**预计时间**: 4 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 4.3 节（StateCoordinator 完整实现）
  - `architecture-v8.md` 第 2.3 节（单向数据流）
- 关键: StateCoordinator 是连接 Config 和 Runtime 的唯一桥梁

#### 输入
```typescript
// 需要整合 ConfigStore 和 Runtime
// 实现单向同步: Config → Runtime
```

#### 输出
- [ ] 创建 `packages/core/src/coordinator/StateCoordinator.ts`
- [ ] 创建 `packages/core/src/coordinator/index.ts`
- [ ] 创建 `packages/core/src/coordinator/__tests__/StateCoordinator.test.ts`
- [ ] 测试: Config 变更能同步到 Runtime
- [ ] 测试覆盖率 > 90%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的状态协调层。

参考文档: architecture-v8.md 第 4.3 节

上下文:
- ConfigStore 已实现 (TASK-002)
- Runtime 已实现 (TASK-003)

任务: 实现 StateCoordinator 连接 Config 和 Runtime

要求:
1. 实现 StateCoordinator 类:
   - 构造函数接受: configStore, runtime, octreeManager, resourceManager, ecs
   - 实现 initialSync(): 初始同步配置到运行时
   - 实现 setupSubscriptions(): 订阅配置变更
   - 实现 dispose(): 清理订阅

2. 实现私有方法:
   - syncSources(sources): 同步数据源
   - addSource(config): 添加新数据源
   - removeSource(id): 删除数据源并清理资源
   - updateSource(config): 更新数据源配置
   - syncRenderingConfig(config): 同步渲染配置
   - cleanupRuntimeState(sourceId): 清理运行时状态

3. 关键逻辑:
   - Config → Runtime 单向同步
   - 资源清理要彻底（GPU、ECS、Octree、Runtime）
   - 错误处理（加载失败的 source）
   - loadState 状态管理（loading/loaded/failed）

4. 编写测试:
   - 测试 Config 变更同步
   - 测试添加/删除 source 的完整流程
   - 测试资源清理
   - 测试 loadState 状态转换

注意:
- 现在只需要实现核心逻辑，octreeManager/resourceManager/ecs 可以用 mock
- 重点测试状态同步的正确性

文件结构:
packages/core/src/coordinator/
├── StateCoordinator.ts
├── index.ts
└── __tests__/
    └── StateCoordinator.test.ts

请提供完整的代码实现，包括测试用的 mock 对象。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- coordinator

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- coordinator

# 期望:
# - 所有测试通过
# - 覆盖率 > 90%

# 3. 集成测试
pnpm run test -- poc
```

---

### TASK-005: 编写 POC 测试

**任务 ID**: TASK-005
**依赖**: TASK-002, TASK-003, TASK-004
**预计时间**: 2 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 15.1 节（POC 测试）
  - `architecture-v8.md` 第 15.2 节（性能基准测试）
- 目标: 验证分层状态管理的正确性和性能

#### 输入
```typescript
// 需要验证:
// 1. Config → Runtime 同步正确
// 2. 高频更新不触发 Config 订阅
// 3. 可变更新比不可变快 10 倍以上
```

#### 输出
- [ ] 创建 `poc/poc.test.ts` (功能测试)
- [ ] 创建 `poc/poc-perf.test.ts` (性能测试)
- [ ] 所有测试通过
- [ ] 性能测试: 可变更新比不可变快 10 倍以上

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的 POC 验证。

参考文档:
- architecture-v8.md 第 15.1 节
- architecture-v8.md 第 15.2 节

上下文:
- ConfigStore 已实现 (TASK-002)
- Runtime 已实现 (TASK-003)
- StateCoordinator 已实现 (TASK-004)

任务: 编写 POC 测试验证核心架构

要求:
1. 功能测试 (poc/poc.test.ts):
   - 测试: Config 变更能正确同步到 Runtime
     * 添加 source 后 Runtime 应有对应状态
     * 删除 source 后 Runtime 应清理状态
     * 更新 source 后 Runtime 应反映变化

   - 测试: 高频更新不触发 Config 订阅
     * 模拟 1000 次 Runtime.visibleNodes 更新
     * 验证 Config 订阅回调未被调用

   - 测试: Runtime 状态是完全可变的
     * 直接修改 Set/Map 不创建新对象
     * 验证引用不变

2. 性能测试 (poc/poc-perf.test.ts):
   - 测试: 10000 次可变更新 < 10ms
   - 对比测试: 10000 次不可变更新的耗时
   - 验证: 可变更新至少快 10 倍

3. 输出格式:
   - 功能测试: 清晰的断言信息
   - 性能测试: 输出实际耗时（用于后续优化参考）

参考架构文档中的测试代码，但要确保:
- 使用真实的实现（不是 mock）
- 测试用例覆盖关键场景
- 性能测试可重复运行

请提供完整的测试代码。
```

#### 验证方法
```bash
# 1. 运行 POC 功能测试
pnpm run test -- poc/poc.test.ts

# 2. 运行 POC 性能测试
pnpm run test -- poc/poc-perf.test.ts

# 3. 查看性能测试输出
# 期望输出示例:
# ✓ 10000 次可变更新 < 10ms (实际: 3.45ms)
# ✓ 对比: 10000 次不可变更新 (实际: 156.78ms)
# ✓ 可变更新快 45 倍

# 4. 生成测试报告
pnpm run test:coverage
```

---

### TASK-006: POC 退出标准验证

**任务 ID**: TASK-006
**依赖**: TASK-005
**预计时间**: 1 小时
**优先级**: P0

#### 上下文
- 阅读文件: `architecture-v8.md` 第 14 节 Phase 0 退出标准
- 目标: 确保所有 POC 目标达成

#### 输入
```
退出标准:
- ✅ 所有 POC 测试通过
- ✅ 性能测试: 可变更新比不可变更新快 10 倍以上
- ✅ 团队 Code Review 通过
```

#### 输出
- [ ] 创建 `poc/POC-REPORT.md` (POC 验证报告)
- [ ] 所有测试通过
- [ ] 性能指标达标
- [ ] 准备 Code Review

#### LLM Prompt 模板
```
我正在完成 better-potree 项目 Phase 0 POC 验证。

任务: 生成 POC 验证报告并确认退出标准

要求:
1. 运行所有测试并收集结果
2. 生成 POC-REPORT.md，包含:
   - 测试结果摘要（通过/失败数量）
   - 性能测试结果（实际数据）
   - 架构验证结论
   - 遇到的问题和解决方案
   - 后续建议

3. 检查清单:
   - [ ] 所有单元测试通过
   - [ ] POC 功能测试通过
   - [ ] POC 性能测试通过
   - [ ] 可变更新比不可变快 10 倍以上
   - [ ] 无 TypeScript 错误
   - [ ] 代码符合 Biome 规范

4. 输出 Code Review 准备清单

报告模板:
```markdown
# POC 验证报告

## 测试结果

### 单元测试
- ConfigStore: X/Y 通过
- Runtime: X/Y 通过
- StateCoordinator: X/Y 通过

### POC 测试
- 功能测试: X/Y 通过
- 性能测试: X/Y 通过

### 性能数据
- 10000 次可变更新: X.XXms
- 10000 次不可变更新: X.XXms
- 性能提升: XX 倍

## 架构验证

### 分层状态管理 ✅/❌
- Config → Runtime 单向同步: ✅
- 高频更新零 GC 压力: ✅
- ...

## 问题和解决方案

## 后续建议

## Code Review 准备
- [ ] 代码符合规范
- [ ] 测试覆盖率足够
- [ ] 文档完整
```

请生成完整的报告和检查清单。
```

#### 验证方法
```bash
# 1. 运行完整测试套件
pnpm run test

# 2. 检查代码规范
pnpm run lint

# 3. 类型检查
pnpm run typecheck

# 4. 生成覆盖率报告
pnpm run test:coverage

# 5. 查看 POC 报告
cat poc/POC-REPORT.md
```

---

## 🏗️ Phase 1 Week 1: Monorepo 基础设施 (5天 / 10个任务)

### TASK-101: 创建完整的 Monorepo 结构

**任务 ID**: TASK-101
**依赖**: TASK-006 (POC 通过)
**预计时间**: 3 小时
**优先级**: P0

#### 上下文
- 阅读文件: `architecture-v8.md` 第 13.1 节（完整包结构）
- 基于 POC 验证成功，创建完整的 4 包结构

#### 输入
```
需要创建的包:
- @better-potree/core (已有 POC 基础)
- @better-potree/rendering (新建)
- @better-potree/rendering-three (新建)
- @better-potree/viewer (新建)
```

#### 输出
- [ ] 创建 4 个包的完整目录结构
- [ ] 配置包之间的依赖关系
- [ ] 每个包的 package.json 正确配置
- [ ] 每个包的 tsconfig.json 继承根配置
- [ ] 测试: 所有包可以独立构建

#### LLM Prompt 模板
```
我正在开发 better-potree 项目，Phase 0 POC 已验证通过。

参考文档: architecture-v8.md 第 13 节

任务: 创建完整的 Monorepo 结构（4 个包）

背景:
- POC 阶段已创建 packages/core 基础
- 现在需要创建完整的 4 包结构

要求:
1. 扩展现有的 monorepo 结构:
```
better-potree/
├── packages/
│   ├── core/                   # 已存在，需要补充目录
│   │   ├── src/
│   │   │   ├── config/        # 已存在
│   │   │   ├── runtime/       # 已存在
│   │   │   ├── coordinator/   # 已存在
│   │   │   ├── octree/        # 新建
│   │   │   ├── ecs/           # 新建
│   │   │   ├── systems/       # 新建
│   │   │   ├── resources/     # 新建
│   │   │   ├── scheduler/     # 新建
│   │   │   ├── types/         # 新建
│   │   │   └── index.ts
│   │   └── package.json
│   ├── rendering/              # 新建
│   │   ├── src/
│   │   │   ├── interfaces/
│   │   │   ├── systems/
│   │   │   └── index.ts
│   │   └── package.json
│   ├── rendering-three/        # 新建
│   │   ├── src/
│   │   │   ├── materials/
│   │   │   ├── shaders/
│   │   │   └── index.ts
│   │   └── package.json
│   └── viewer/                 # 新建
│       ├── src/
│       │   ├── loaders/
│       │   ├── controls/
│       │   ├── ui/
│       │   └── index.ts
│       └── package.json
└── apps/
    └── playground/             # 新建
        └── package.json
```

2. 配置包依赖关系（参考架构文档 13.3 节）:
   - rendering → core
   - rendering-three → rendering + core
   - viewer → rendering-three + rendering + core
   - playground → viewer

3. 每个 package.json 需要:
   - 正确的 name (@better-potree/xxx)
   - 正确的 dependencies
   - 统一的构建脚本
   - 导出配置 (main, module, types)

4. 创建空的 index.ts 文件（每个包）

请提供:
1. 所有新建包的 package.json
2. 更新后的根 package.json
3. 更新后的 pnpm-workspace.yaml
4. 每个包的目录结构创建命令

注意: 只创建结构，不实现代码。
```

#### 验证方法
```bash
# 1. 安装依赖
pnpm install

# 2. 验证包依赖
pnpm list --depth 0

# 3. 验证每个包可以构建
pnpm --filter @better-potree/core run build
pnpm --filter @better-potree/rendering run build
pnpm --filter @better-potree/rendering-three run build
pnpm --filter @better-potree/viewer run build

# 4. 检查目录结构
tree packages -L 3
```

---

### TASK-102: 配置构建工具链 (Rsbuild)

**任务 ID**: TASK-102
**依赖**: TASK-101
**预计时间**: 2 小时
**优先级**: P0

#### 上下文
- 阅读文件: `architecture-v8.md` 第 14 节 Phase 1 Week 1
- 目标: 配置 Rsbuild 用于库构建

#### 输入
```
需要配置:
- 每个包的 rsbuild.config.ts
- 支持 TypeScript
- 生成 .d.ts 类型文件
- 支持 Tree Shaking
```

#### 输出
- [ ] 创建根目录 `rsbuild.config.base.ts`
- [ ] 每个包创建 `rsbuild.config.ts`
- [ ] 配置 build 脚本
- [ ] 测试: 构建输出正确的文件

#### LLM Prompt 模板
```
我正在配置 better-potree 项目的构建工具链。

任务: 配置 Rsbuild 用于库构建

背景:
- 项目是 monorepo，有 4 个库包
- 需要生成 ESM 和 CJS 格式
- 需要生成类型声明文件
- playground 需要支持开发服务器

要求:
1. 创建 rsbuild.config.base.ts（通用配置）:
   - TypeScript 支持
   - 声明文件生成
   - Source map
   - Tree shaking

2. 为每个包创建 rsbuild.config.ts:
   - 库包 (core/rendering/rendering-three/viewer):
     * format: 'esm' 和 'cjs'
     * minify: true
     * external: 依赖不打包

   - 应用包 (playground):
     * 开发服务器配置
     * HMR 支持

3. 配置 package.json scripts:
   - build: 生产构建
   - dev: 开发模式
   - clean: 清理构建产物

4. 配置输出目录:
   - dist/esm
   - dist/cjs
   - dist/types

参考配置:
- Rsbuild 官方文档: https://rsbuild.dev
- Monorepo 最佳实践

请提供所有配置文件的完整代码。
```

#### 验证方法
```bash
# 1. 构建所有包
pnpm run build

# 2. 检查输出文件
ls packages/core/dist/
# 期望: esm/, cjs/, types/

# 3. 验证类型声明
ls packages/core/dist/types/
# 期望: index.d.ts 和所有类型文件

# 4. 测试 playground 开发服务器
pnpm --filter playground run dev
# 期望: 开发服务器启动
```

---

### TASK-103: 配置 Biome (Linter + Formatter)

**任务 ID**: TASK-103
**依赖**: TASK-101
**预计时间**: 1 小时
**优先级**: P1

#### 上下文
- 目标: 统一代码风格和质量标准

#### 输入
```
配置要求:
- 严格的 lint 规则
- 自动格式化
- 与 TypeScript 集成
- 支持 Git hooks
```

#### 输出
- [ ] 创建 `biome.json`
- [ ] 配置 lint 规则
- [ ] 配置 format 规则
- [ ] 添加 lint 和 format 脚本
- [ ] 测试: 可以检查和格式化代码

#### LLM Prompt 模板
```
我正在配置 better-potree 项目的代码质量工具。

任务: 配置 Biome 用于 lint 和 format

要求:
1. 创建 biome.json:
   - 严格的 TypeScript 规则
   - 推荐的 lint 规则
   - 统一的格式化风格（2 空格缩进）
   - 忽略 dist/ node_modules/

2. 配置规则:
   - 禁止 any（除非显式标注）
   - 禁止 console.log（警告级别）
   - 强制使用分号
   - 单引号字符串
   - 尾随逗号

3. 添加 scripts（根 package.json）:
   - lint: 检查所有包
   - lint:fix: 自动修复
   - format: 格式化所有文件
   - format:check: 检查格式

4. 配置 VSCode 集成（可选）

参考:
- Biome 文档: https://biomejs.dev
- TypeScript 最佳实践

请提供 biome.json 配置和更新后的 package.json scripts。
```

#### 验证方法
```bash
# 1. 检查代码
pnpm run lint

# 2. 自动修复
pnpm run lint:fix

# 3. 格式化检查
pnpm run format:check

# 4. 格式化所有文件
pnpm run format
```

---

### TASK-104: 实现核心类型定义

**任务 ID**: TASK-104
**依赖**: TASK-101
**预计时间**: 3 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 2.4 节（系统调度）
  - `architecture-v8.md` 第 7 节（ECS 数据模型）
- 目标: 定义所有核心类型

#### 输入
```typescript
// 需要定义的类型:
// - System 相关
// - Octree 相关
// - Rendering 相关
// - Component 相关
```

#### 输出
- [ ] 创建 `packages/core/src/types/system.ts`
- [ ] 创建 `packages/core/src/types/octree.ts`
- [ ] 创建 `packages/core/src/types/rendering.ts`
- [ ] 创建 `packages/core/src/types/component.ts`
- [ ] 创建 `packages/core/src/types/index.ts`
- [ ] 所有类型导出正确

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的核心类型系统。

参考文档:
- architecture-v8.md 第 2.4 节（系统调度）
- architecture-v8.md 第 7 节（ECS）

任务: 实现核心类型定义

要求:
1. system.ts - 系统相关类型:
   ```typescript
   export enum SystemStage {
     INPUT = 0,
     UPDATE = 100,
     RENDER = 200,
     CLEANUP = 300
   }

   export interface ISystem {
     readonly name: string;
     readonly stage: SystemStage;
     readonly priority?: number;
     update(deltaTime: number): void;
     dispose?(): void;
   }
   ```

2. octree.ts - 八叉树相关类型:
   - OctreeNodeMetadata
   - OctreeMetadata
   参考架构文档第 5.2 节

3. rendering.ts - 渲染相关类型:
   - RenderCommand
   - MaterialType
   - BufferDescriptor
   根据架构需求定义

4. component.ts - ECS 组件基类:
   ```typescript
   export interface Component {
     __componentType?: string;
   }
   ```

5. index.ts - 统一导出

关键点:
- 所有类型必须可导出
- 使用 readonly 保护不可变字段
- 完善的 JSDoc 注释
- 严格的类型约束

请提供所有类型文件的完整代码。
```

#### 验证方法
```bash
# 1. 类型检查
pnpm --filter @better-potree/core run typecheck

# 2. 构建
pnpm --filter @better-potree/core run build

# 3. 检查类型声明文件
cat packages/core/dist/types/types/index.d.ts

# 4. 在其他文件中导入测试
# import type { ISystem, SystemStage } from '@better-potree/core/types'
```

---

### TASK-105: 完善 ConfigStore（补充类型）

**任务 ID**: TASK-105
**依赖**: TASK-104
**预计时间**: 1 小时
**优先级**: P1

#### 上下文
- 基于新定义的核心类型完善 ConfigStore
- 补充 Material 和其他配置类型

#### 输入
```typescript
// 补充架构文档中定义的完整配置类型
```

#### 输出
- [ ] 更新 `packages/core/src/config/types.ts`
- [ ] 添加 MaterialConfig 完整定义
- [ ] 更新测试覆盖新类型
- [ ] 测试通过

#### LLM Prompt 模板
```
我正在完善 better-potree 项目的配置类型。

参考文档: architecture-v8.md 第 4.1 节

上下文:
- ConfigStore 基础已实现（POC 阶段）
- 核心类型已定义（TASK-104）

任务: 补充完整的配置类型

要求:
1. 更新 config/types.ts:
   - 补充 MaterialConfig 完整定义:
     ```typescript
     export interface MaterialConfig {
       id: string;
       type: 'point' | 'gaussian' | string;
       size?: number;
       colorEncoding?: 'RGB' | 'INTENSITY' | 'CLASSIFICATION';
       // ... 其他材质属性
     }
     ```

   - 确保 SourceConfig 包含所有字段（参考架构文档）
   - 确保 RenderingConfig 完整

2. 更新 ConfigStore:
   - 添加 materials 管理（如果 POC 未实现）
   - 添加 material 相关 actions

3. 更新测试:
   - 测试 material 添加/删除/更新
   - 测试类型约束

4. 确保向后兼容 POC 测试

请提供更新后的代码。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- config

# 2. 类型检查
pnpm --filter @better-potree/core run typecheck

# 3. POC 测试仍然通过
pnpm run test -- poc
```

---

## 🎯 阶段性检查点

在每个 Phase 结束时，执行以下验证:

### Phase 0 完成检查
```bash
# 运行检查脚本
./scripts/check-phase-0.sh

# 或手动检查:
pnpm run test              # 所有测试通过
pnpm run typecheck         # 无类型错误
pnpm run lint              # 无 lint 错误
cat poc/POC-REPORT.md      # POC 报告完整
```

### Phase 1 Week 1 完成检查
```bash
# 运行检查脚本
./scripts/check-phase-1-w1.sh

# 或手动检查:
pnpm run build             # 所有包构建成功
pnpm run test              # 所有测试通过
pnpm run typecheck         # 无类型错误
pnpm run lint              # 无 lint 错误
ls packages/*/dist         # 所有包有构建产物
```

---

## 📊 进度跟踪

### 完成统计
- Phase 0: 0/6 任务完成
- Phase 1 Week 1: 0/10 任务完成
- 总计: 0/16 任务完成 (0%)

### 下一个任务
**当前应执行**: TASK-001 (搭建最小化项目结构)

---

## 🔄 使用流程

### 对于 LLM:
1. 执行任务时，先阅读任务的"上下文"部分
2. 理解"输入"要求
3. 使用"LLM Prompt 模板"作为提示词基础
4. 生成代码后，提供"输出"清单中的所有内容
5. 告知用户如何运行"验证方法"

### 对于开发者:
1. 选择下一个未完成的任务
2. 将"LLM Prompt 模板"复制给 LLM
3. 审查 LLM 输出的代码
4. 运行"验证方法"
5. 如果通过，标记任务完成，继续下一个
6. 如果失败，向 LLM 反馈错误信息

---

## 附录: 常用命令速查

```bash
# 安装依赖
pnpm install

# 运行测试
pnpm run test                              # 所有测试
pnpm --filter @better-potree/core run test  # 单包测试
pnpm run test -- config                    # 指定文件

# 构建
pnpm run build                             # 所有包
pnpm --filter @better-potree/core run build # 单包

# 代码检查
pnpm run lint                              # 检查
pnpm run lint:fix                          # 自动修复
pnpm run format                            # 格式化

# 类型检查
pnpm run typecheck

# 清理
pnpm run clean                             # 清理构建产物

# 开发模式
pnpm --filter playground run dev           # 启动开发服务器
```

---

**文档版本**: v1.0
**最后更新**: 2025-11-16
**维护者**: better-potree team
