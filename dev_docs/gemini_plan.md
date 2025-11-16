## **`better-potree` - LLM 驱动的实施计划 (基于架构 v8.0)**

### **核心原则**

1.  **原子化任务**: 每个任务都是一个独立的、可由 LLM 完成的工作单元。
2.  **上下文驱动**: 每个任务明确引用 `architecture-v8.md` 的相关章节作为其核心输入。
3.  **产物明确**: 每个任务的输出是具体的文件、代码或测试结果。
4.  **可衡量验收**: 每个任务都有清晰的、可自动验证的验收标准。

---

### **To-Do List: 详细开发计划**

#### **Phase 0: POC 验证 (预计 3 天)**

**目标**: 快速验证“分层状态管理”核心架构的可行性与性能优势，为后续大规模开发奠定信心。

-   [ ] **任务 0.1: 创建最小化 POC 项目结构**
    *   **`[输入]`**: `architecture-v8.md` 第 14 节 (Phase 0)。
    *   **`[输出]`**:
        *   根目录 `poc/`
        *   `poc/package.json` (包含 `vitest`, `typescript`, `zustand`)
        *   `poc/tsconfig.json`
        *   `poc/vitest.config.ts`
    *   **`[验收标准]`**: 运行 `pnpm test` 命令成功，但无测试用例。

-   [ ] **任务 0.2: 实现最简 `ConfigStore`**
    *   **`[输入]`**: `architecture-v8.md` 第 4.1 节的代码片段。
    *   **`[输出]`**:
        *   `poc/config.ts` 文件，包含 `createConfigStore` 函数。
    *   **`[验收标准]`**: 代码符合输入规范，无 TypeScript 错误。

-   [ ] **任务 0.3: 实现最简 `Runtime` 类**
    *   **`[输入]`**: `architecture-v8.md` 第 2.1 节 `Runtime State` 的核心定义。
    *   **`[输出]`**:
        *   `poc/runtime.ts` 文件，包含一个 `Runtime` 类，至少有 `visibleNodes` 和 `sources` 两个属性。
    *   **`[验收标准]`**: 代码符合输入规范，无 TypeScript 错误。

-   [ ] **任务 0.4: 实现最简 `StateCoordinator`**
    *   **`[输入]`**: `architecture-v8.md` 第 4.3 节，重点关注构造函数、`initialSync` 和 `syncSources` 的基本逻辑。
    *   **`[输出]`**:
        *   `poc/coordinator.ts` 文件，包含 `StateCoordinator` 类，实现 Config 到 Runtime 的单向同步。
    *   **`[验收标准]`**: 代码符合输入规范，无 TypeScript 错误。

-   [ ] **任务 0.5: 编写并执行 POC 单元测试**
    *   **`[输入]`**: `architecture-v8.md` 第 15.1 节的测试代码。
    *   **`[输出]`**:
        *   `poc/poc.test.ts` 文件。
    *   **`[验收标准]`**: `pnpm test poc.test.ts` 命令通过所有断言。

-   [ ] **任务 0.6: 编写并执行 POC 性能基准测试**
    *   **`[输入]`**: `architecture-v8.md` 第 15.2 节的测试代码。
    *   **`[输出]`**:
        *   `poc/poc-perf.test.ts` 文件。
    *   **`[验收标准]`**: `pnpm test poc-perf.test.ts` 命令通过，并在控制台打印出可变更新与不可变更新的耗时对比，结果符合预期（可变更新快 10 倍以上）。

#### **Phase 1: 核心框架 (预计 2 周)**

**目标**: 搭建完整的 Monorepo 项目结构，并实现所有与渲染无关的核心基础设施模块。

**Week 1: 项目搭建与核心类型**

-   [ ] **任务 1.1: 初始化 Monorepo 工作空间**
    *   **`[输入]`**: `architecture-v8.md` 第 13.1 节的包结构。
    *   **`[输出]`**:
        *   根 `package.json`
        *   `pnpm-workspace.yaml` 文件
        *   创建 `packages/core`, `packages/rendering`, `packages/rendering-three`, `packages/viewer`, `apps/playground` 目录结构。
        *   为每个 `packages/*` 和 `apps/playground` 创建一个基础的 `package.json`。
    *   **`[验收标准]`**: `pnpm install` 成功，所有工作空间被正确识别。

-   [ ] **任务 1.2: 配置工程化工具链**
    *   **`[输入]`**: `architecture-v8.md` 第 14 节 (Phase 1, Week 1)。
    *   **`[输出]`**:
        *   根目录 `tsconfig.base.json`
        *   根目录 `biome.json`
        *   `apps/playground/rsbuild.config.ts`
        *   根目录 `vitest.config.ts`
    *   **`[验收标准]`**: `pnpm lint` 和 `pnpm type-check` 命令能成功执行。`pnpm -F playground dev` 能启动开发服务器。

-   [ ] **任务 1.3: 实现 `@better-potree/core` - 完整 `ConfigStore`**
    *   **`[输入]`**: `architecture-v8.md` 第 4.1 节 `store.ts` 的完整代码。
    *   **`[输出]`**:
        *   `packages/core/src/config/store.ts`
        *   `packages/core/src/config/types.ts`
        *   `packages/core/src/config/store.test.ts` (单元测试)
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，单元测试覆盖率 > 80%。

**Week 2: 核心基础设施**

-   [ ] **任务 1.4: 实现 `@better-potree/core` - 完整 `Runtime` 类**
    *   **`[输入]`**: `architecture-v8.md` 第 4.2 节 `Runtime.ts` 的完整代码。
    *   **`[输出]`**:
        *   `packages/core/src/runtime/Runtime.ts`
        *   `packages/core/src/runtime/Runtime.test.ts`
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，测试覆盖 `checkGPUMemoryBudget` 等辅助方法。

-   [ ] **任务 1.5: 实现 `@better-potree/core` - 完整 `StateCoordinator`**
    *   **`[输入]`**: `architecture-v8.md` 第 4.3 节 `StateCoordinator.ts` 的完整代码。
    *   **`[输出]`**:
        *   `packages/core/src/coordinator/StateCoordinator.ts`
        *   `packages/core/src/coordinator/StateCoordinator.test.ts` (详尽的单元测试)
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，测试覆盖所有状态转换场景（增、删、改 source），单元测试覆盖率 > 90%。

-   [ ] **任务 1.6: 实现 `@better-potree/core` - `SystemScheduler`**
    *   **`[输入]`**: `architecture-v8.md` 第 6.1 节 `SystemScheduler.ts` 的完整代码。
    *   **`[输出]`**:
        *   `packages/core/src/scheduler/SystemScheduler.ts`
        *   `packages/core/src/types/system.ts`
        *   `packages/core/src/scheduler/SystemScheduler.test.ts`
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，测试验证系统能按 `Stage` 和 `priority` 正确排序和执行。

-   [ ] **任务 1.7: 实现 `@better-potree/core` - 轻量级 `ECSWorld` 及组件**
    *   **`[输入]`**: `architecture-v8.md` 第 7.1 节 `ECSWorld.ts` 和 第 7.2 节 `components.ts` 的代码。
    *   **`[输出]`**:
        *   `packages/core/src/ecs/ECSWorld.ts`
        *   `packages/core/src/ecs/components.ts`
        *   `packages/core/src/ecs/ECSWorld.test.ts`
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，测试覆盖实体和组件的增删改查及 `query` 功能。

-   [ ] **任务 1.8: 实现 `@better-potree/core` - `OctreeManager` 基础**
    *   **`[输入]`**: `architecture-v8.md` 第 5.2 节 `OctreeNode.ts` 和 第 5.3 节 `OctreeManager.ts` 的代码。
    *   **`[输出]`**:
        *   `packages/core/src/octree/OctreeNode.ts`
        *   `packages/core/src/octree/OctreeManager.ts`
        *   `packages/core/src/octree/OctreeManager.test.ts`
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，测试能够加载并解析 `meta.json` (使用 mock fetch)。

-   [ ] **任务 1.9: 实现 `@better-potree/core` - 资源管理基础设施**
    *   **`[输入]`**: `architecture-v8.md` 第 9 和 10 节的设计。
    *   **`[输出]`**:
        *   `packages/core/src/resources/MessageQueue.ts` + 测试
        *   `packages/core/src/resources/ObjectPools.ts` + 测试
        *   `packages/core/src/resources/WorkerPool.ts` (基础框架) + 测试
        *   `packages/core/src/resources/ResourceManager.ts` (含 LRU 逻辑) + 测试
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，每个模块的单元测试覆盖其核心功能。

#### **Phase 2: 最小可视化产品 (预计 3 周)**

**目标**: 渲染出第一个点云，打通从配置到渲染的完整数据流。

-   [ ] **任务 2.1: 实现 `@better-potree/core` - `TraversalSystem`**
    *   **`[输入]`**: `architecture-v8.md` 第 8.1 节 `TraversalSystem.ts` 的完整代码。
    *   **`[输出]`**:
        *   `packages/core/src/systems/TraversalSystem.ts`
        *   `packages/core/src/systems/TraversalSystem.test.ts` (使用 mock 的 `OctreeManager` 和 `Runtime`)
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，测试验证视锥剔除和 LOD 选择逻辑。

-   [ ] **任务 2.2: 实现 `@better-potree/core` - `StreamingSystem`**
    *   **`[输入]`**: `architecture-v8.md` 第 8.2 节的设计原则和第 11.5 节的状态机。
    *   **`[输出]`**:
        *   `packages/core/src/systems/StreamingSystem.ts` (包含加载任务管理、优先级计算、与 `WorkerPool` 和 `MessageQueue` 的交互逻辑)
        *   `packages/core/src/systems/StreamingSystem.test.ts`
    *   **`[验收标准]`**: `pnpm test -F @better-potree/core` 通过，测试验证节点加载状态转换的正确性。

-   [ ] **任务 2.3: 实现 `@better-potree/viewer` - `decoder.worker.ts`**
    *   **`[输入]`**: Potree 2.0 二进制格式规范。
    *   **`[输出]`**:
        *   `packages/viewer/src/loaders/decoder.worker.ts`
    *   **`[验收标准]`**: 能够正确解码一个给定的 Potree `.bin` 文件（提供一个 fixture 文件用于测试）。

-   [ ] **任务 2.4: 定义 `@better-potree/rendering` - 渲染抽象接口**
    *   **`[输入]`**: `architecture-v8.md` 第 13.2.2 节的职责定义。
    *   **`[输出]`**:
        *   `packages/rendering/src/interfaces/IRenderer.ts`
        *   `packages/rendering/src/interfaces/IMaterial.ts`
        *   `packages/rendering/src/interfaces/IBuffer.ts`
    *   **`[验收标准]`**: 接口定义清晰，符合架构设计，无实现代码。

-   [ ] **任务 2.5: 实现 `@better-potree/rendering-three` - Three.js 渲染后端**
    *   **`[输入]`**: `@better-potree/rendering` 的接口和 Three.js API。
    *   **`[输出]`**:
        *   `packages/rendering-three/src/ThreeRenderer.ts` (实现 `IRenderer`)
        *   `packages/rendering-three/src/materials/PointCloudMaterial.ts`
        *   `packages/rendering-three/src/shaders/pointcloud.vert.glsl` 和 `pointcloud.frag.glsl`
    *   **`[验收标准]`**: 代码结构完成，无 TypeScript 错误。

-   [ ] **任务 2.6: 实现 `@better-potree/viewer` - `Engine` API 类**
    *   **`[输入]`**: `architecture-v8.md` 第 12 节的 API 设计示例。
    *   **`[输出]`**:
        *   `packages/viewer/src/Engine.ts` (组装 `core`, `rendering-three` 等模块)
    *   **`[验收标准]`**: `Engine` 类能够被实例化，并正确初始化所有内部模块。

-   [ ] **任务 2.7: 集成与调试 - 在 `playground` 中渲染点云**
    *   **`[输入]`**: 所有已完成的模块。
    *   **`[输出]`**:
        *   `apps/playground/src/main.ts` 中完整的引擎初始化和启动代码。
    *   **`[验收标准]`**: 在浏览器中打开 `playground` 页面，能够成功加载并渲染一个 Potree 点云数据集。LOD 和视锥剔除工作正常。

#### **Phase 3: 性能优化 (预计 2 周)**

**目标**: 达到生产级性能标准，并建立性能监控和回归测试机制。

-   [ ] **任务 3.1: 建立性能基准测试套件**
    *   **`[输入]`**: `architecture-v8.md` 第 15.5 节的测试示例，以及 Phase 2 的成果。
    *   **`[输出]`**:
        *   `tests/benchmarks/rendering.bench.ts`
        *   `tests/benchmarks/traversal.bench.ts`
    *   **`[验收标准]`**: `pnpm test:bench` 命令可以执行，并输出渲染和遍历的性能指标。

-   [ ] **任务 3.2: 性能分析与瓶颈定位**
    *   **`[输入]`**: Chrome DevTools Performance/Memory Profiler。
    *   **`[输出]`**:
        *   一份 Markdown 文档 `docs/performance-report-phase3.md`，记录 CPU、内存热点和 GC 压力点。
    *   **`[验收标准]`**: 报告清晰地指出了 Top 3 性能瓶颈。

-   [ ] **任务 3.3: 优化热点代码 - 全面应用对象池**
    *   **`[输入]`**: `docs/performance-report-phase3.md` 和 `architecture-v8.md` 第 10.2 节。
    *   **`[输出]`**:
        *   修改 `TraversalSystem` 和 `RenderSystem` 等高频更新的系统，将所有临时的 `Vector3`, `Matrix4` 等对象的创建替换为从 `ObjectPools` 中获取和释放。
    *   **`[验收标准]`**: 再次运行性能分析，确认临时对象创建显著减少，GC 压力降低。

-   [ ] **任务 3.4: 关键决策 - 评估并决定是否迁移到 `bitecs`**
    *   **`[输入]`**: `architecture-v8.md` 第 14 节 (ADR-004)。
    *   **`[输出]`**:
        *   一个测试脚本 `tests/benchmarks/ecs.bench.ts`，对比 `ECSWorld` 和 `bitecs` 的性能。
        *   更新 `ADR-004.md`，记录决策结果和数据支撑。
    *   **`[验收标准]`**: 基于性能数据做出明确决策。如果需要迁移，则创建新的任务。

-   [ ] **任务 3.5: 实现性能监控面板**
    *   **`[输入]`**: `architecture-v8.md` 第 10.3.4 节。
    *   **`[输出]`**:
        *   一个 UI 组件 `apps/playground/src/components/PerfPanel.tsx` (或等效实现)。
    *   **`[验收标准]`**: `playground` 页面上实时显示 FPS、系统耗时、内存使用和渲染统计信息。

