## **`better-potree` - LLM 辅助开发计划 (To-Do List)**

### **方法论**

本计划将严格遵循 `architecture-v8.md` 中定义的四个实施阶段。每个任务项 (Task) 都设计为一个独立的、可由 LLM 完成的工作单元。

**执行流程**:
1.  **选择任务**: 从 To-Do List 中选择一个 `[ ]` 状态的任务。
2.  **提供上下文**: 将【上下文输入】部分的内容喂给 LLM，确保它理解背景和依赖。
3.  **下达指令**: 将【LLM Prompt 指令】作为核心指令，要求 LLM 生成代码。
4.  **验证输出**: 对比 LLM 生成的代码与【输出验收标准】，确保质量达标并运行相关测试。
5.  **合并代码**: 将验证通过的代码合并到项目中。
6.  **更新状态**: 将任务标记为 `[x]`。

---

### **Phase 0: POC 验证 (3 天)**

**目标**: 验证核心架构假设——分层状态管理的可行性和性能优势。

-   **[ ] P0-T1: 搭建最小化项目结构与配置**
    -   **上下文输入**: 项目需要 TypeScript 和 Vitest。
    -   **LLM Prompt 指令**: "请为我的新项目生成以下配置文件：1. `package.json`，包含 `typescript`, `vitest`, `zustand` 依赖；2. `tsconfig.json`，使用严格模式；3. `vitest.config.ts`，配置基本的测试环境。"
    -   **输出验收标准**:
        -   ✅ `pnpm install` 或 `npm install` 可以成功执行。
        -   ✅ `pnpm test` 或 `npm test` 可以成功运行。

-   **[ ] P0-T2: 实现最简 `ConfigStore`**
    -   **上下文输入**: `architecture-v8.md` 的 **章节 4.1 (Config Store 实现)** 提供了完整的类型定义和实现代码。
    -   **LLM Prompt 指令**: "根据 `architecture-v8.md` 章节 4.1 的代码，生成 `src/config/store.ts` 文件。文件应导出 `createConfigStore` 函数及所有相关的 TypeScript 类型。"
    -   **输出验收标准**:
        -   ✅ 文件 `src/config/store.ts` 创建成功。
        -   ✅ 导出的 `createConfigStore` 函数和类型与文档一致。
        -   ✅ 代码通过 TypeScript 编译，无类型错误。

-   **[ ] P0-T3: 实现最简 `Runtime` 类**
    -   **上下文输入**: `architecture-v8.md` 的 **章节 2.1 (运行时状态)** 和 **章节 4.2 (Runtime State 实现)** 描述了 `Runtime` 类的核心属性和职责。
    -   **LLM Prompt 指令**: "根据 `architecture-v8.md` 章节 4.2 的代码，生成 `src/runtime/Runtime.ts` 文件。实现一个 `Runtime` 类，包含 `visibleNodes` (Set) 和 `loadedNodes` (Map) 两个核心属性。"
    -   **输出验收标准**:
        -   ✅ 文件 `src/runtime/Runtime.ts` 创建成功。
        -   ✅ 导出的 `Runtime` 类包含指定的可变属性。
        -   ✅ 代码通过 TypeScript 编译。

-   **[ ] P0-T4: 实现最简 `StateCoordinator`**
    -   **上下文输入**: `architecture-v8.md` 的 **章节 4.3 (StateCoordinator 完整实现)** 提供了 `StateCoordinator` 的骨架。POC 阶段只需实现 `initialSync` 和对 `sources` 变化的订阅。
    -   **LLM Prompt 指令**: "根据 `architecture-v8.md` 章节 4.3，生成 `src/coordinator/StateCoordinator.ts` 文件。实现 `StateCoordinator` 类，包含构造函数、`initialSync` 方法，并设置对 `configStore.subscribe` 的调用来同步 `sources` 状态到 `runtime.sources`。"
    -   **输出验收标准**:
        -   ✅ 文件 `src/coordinator/StateCoordinator.ts` 创建成功。
        -   ✅ `StateCoordinator` 类能够订阅 Zustand store 的变更并更新 `Runtime` 实例。
        -   ✅ 代码通过 TypeScript 编译。

-   **[ ] P0-T5: 编写并执行 POC 验证测试**
    -   **上下文输入**: `architecture-v8.md` 的 **章节 15.1 (POC 测试)** 和 **章节 15.2 (性能基准测试)** 提供了完整的测试用例代码。
    -   **LLM Prompt 指令**: "根据 `architecture-v8.md` 章节 15.1 和 15.2，为我生成 Vitest 测试文件 `poc.test.ts`。该文件应包含'分层状态管理'和'性能验证'两个测试套件。"
    -   **输出验收标准**:
        -   ✅ 测试文件 `poc.test.ts` 创建成功。
        -   ✅ `pnpm test` 执行通过所有测试。
        -   ✅ 性能测试输出显示：可变更新的耗时远小于不可变更新（至少快 10 倍）。
        -   ✅ **Phase 0 退出标准达成。**

---

### **Phase 1: 核心框架 (2 周)**

**目标**: 搭建完整的 Monorepo 结构和所有核心基础设施模块。

-   **[ ] P1-T1: 搭建 Monorepo 结构**
    -   **上下文输入**: `architecture-v8.md` 的 **章节 13.1 (包结构概览)** 描述了 pnpm workspace 结构和四个核心包。
    -   **LLM Prompt 指令**: "请为我生成 Monorepo 的配置文件：1. 根目录的 `package.json`，声明 `private: true`；2. `pnpm-workspace.yaml`，定义 `packages/*`；3. 在 `packages/` 目录下为 `core`, `rendering`, `rendering-three`, `viewer` 四个包分别生成初始的 `package.json` 和 `tsconfig.json` 文件，并设置好它们之间的依赖关系（如 `viewer` 依赖 `core`）。"
    -   **输出验收标准**:
        -   ✅ 四个包的目录结构已创建。
        -   ✅ `pnpm install` 能够正确安装所有依赖并建立符号链接。
        -   ✅ 在根目录运行构建命令可以成功构建所有包。

-   **[ ] P1-T2: 实现完整的 `@better-potree/core` 模块**
    -   **上下文输入**: `architecture-v8.md` 中所有位于 `packages/core` 下的模块定义，包括 **章节 5, 6, 7, 9, 10**。
    -   **LLM Prompt 指令**: "为 `@better-potree/core` 包生成以下模块的完整代码和对应的 Vitest 单元测试，测试覆盖率需达到 80% 以上：
        1.  `OctreeManager` 和 `OctreeNode` (章节 5.2, 5.3)
        2.  `SystemScheduler` (章节 6.1)
        3.  `ECSWorld` 和所有组件 (章节 7.1, 7.2)
        4.  `MessageQueue` (章节 9.1)
        5.  `WorkerPool` (章节 9.2)
        6.  `ResourceManager` (章节 10.1)
        7.  `ObjectPools` (章节 10.2)"
    -   **输出验收标准**:
        -   ✅ 所有模块的代码和测试文件均已生成。
        -   ✅ `@better-potree/core` 包的所有单元测试通过。
        -   ✅ **Phase 1 退出标准达成。**

---

### **Phase 2: 最小可视化产品 (3 周)**

**目标**: 实现核心渲染管线，加载并成功渲染第一个点云。

-   **[ ] P2-T1: 实现 `TraversalSystem`**
    -   **上下文输入**: `architecture-v8.md` **章节 8.1** 提供了 `TraversalSystem` 的类结构。`gemini_guide.md` **章节 1** 指出，核心的屏幕空间误差(SSE)算法需要参考 Potree 源码的 `src/PotreeRenderer.js` 中的 `updateVisibility` 方法。
    -   **LLM Prompt 指令**: "生成 `@better-potree/core/src/systems/TraversalSystem.ts` 文件。请严格按照 `architecture-v8.md` 章节 8.1 实现其结构。对于 `calculateScreenSize` 方法，请翻译并实现 Potree 源码 `src/PotreeRenderer.js` `updateVisibility` 函数中的屏幕空间误差(SSE)计算逻辑。"
    -   **输出验收标准**:
        -   ✅ `TraversalSystem.ts` 文件创建成功。
        -   ✅ 包含视锥剔除和基于 SSE 的 LOD 选择逻辑。
        -   ✅ 单元测试通过（使用 mock 的相机和八叉树节点）。

-   **[ ] P2-T2: 实现 `decoder.worker.ts`**
    -   **上下文输入**: `gemini_guide.md` **章节 2** 是核心参考。它指明了解码逻辑的关键在于 Potree 源码的 `src/workers/BinaryDecoderWorker.js` 和 `src/loader/PointAttributes.js`。
    -   **LLM Prompt 指令**: "生成 `@better-potree/viewer/src/loaders/decoder.worker.ts` 文件。这个 Worker 接收一个 URL，下载二进制点云数据 (`.bin` 文件)，并根据点属性定义解码 `ArrayBuffer`。请严格参考 Potree 源码 `src/workers/BinaryDecoderWorker.js` 的解码循环逻辑，并使用 `src/loader/PointAttributes.js` 中的信息来确定每个点的属性、类型和字节偏移。将解码后的数据（如 positions, colors）通过 `postMessage` 返回。"
    -   **输出验收标准**:
        -   ✅ `decoder.worker.ts` 文件创建成功。
        -   ✅ 能够正确解码 Potree 格式的 `.bin` 文件。
        -   ✅ 在 `playground` 中测试，可以接收并打印出解码后的点云数据。

-   **[ ] P2-T3: 实现 `StreamingSystem`**
    -   **上下文输入**: `architecture-v8.md` **章节 8.2** 提供了 `StreamingSystem` 的完整实现代码。它依赖于 `WorkerPool` 和 `MessageQueue`。
    -   **LLM Prompt 指令**: "根据 `architecture-v8.md` 章节 8.2 的代码，生成 `@better-potree/core/src/systems/StreamingSystem.ts` 文件。这个系统负责调度可见但未加载的节点，并通过 `WorkerPool` 将任务分发给 `decoder.worker.ts`。"
    -   **输出验收标准**:
        -   ✅ `StreamingSystem.ts` 文件创建成功。
        -   ✅ 能够根据 `runtime.visibleNodes` 调度加载任务。
        -   ✅ 单元测试通过，能正确处理成功和失败的消息。

-   **[ ] P2-T4: 实现渲染抽象层与 Three.js 实现**
    -   **上下文输入**: `architecture-v8.md` **章节 13.2** 定义了 `@better-potree/rendering` 和 `@better-potree/rendering-three` 的职责。`gemini_guide.md` **章节 1** 指出着色器逻辑应参考 `pointcloud.vs` 和 `pointcloud.fs`。
    -   **LLM Prompt 指令**: "请分步执行：
        1.  在 `@better-potree/rendering` 包中，生成渲染接口 `IRenderer.ts`, `IMaterial.ts`。
        2.  在 `@better-potree/rendering-three` 包中，生成 `ThreeRenderer.ts` 实现 `IRenderer`。
        3.  创建 `PointCloudMaterial.ts`，其 uniforms 和着色器代码请严格参考 Potree 源码 `src/materials/PointCloudMaterial.js`、`pointcloud.vs` 和 `pointcloud.fs`。特别注意在顶点着色器中实现点大小的 SSE 计算逻辑。"
    -   **输出验收标准**:
        -   ✅ 渲染抽象层和 Three.js 实现层代码生成完毕。
        -   ✅ `PointCloudMaterial` 能够根据相机距离动态调整点的大小。
        -   ✅ 代码通过 TypeScript 编译。

-   **[ ] P2-T5: 搭建 `playground` 并完成首次渲染**
    -   **上下文输入**: `architecture-v8.md` **章节 12.1** 提供了 `Engine` 的初始化示例。
    -   **LLM Prompt 指令**: "在 `apps/playground` 目录下，创建一个简单的 web 应用。使用 `@better-potree/viewer` 中的 `Engine` 类，初始化引擎，加载一个公开的 Potree 点云数据集，并启动渲染循环。请参考 `architecture-v8.md` 章节 12.1 的示例代码。"
    -   **输出验收标准**:
        -   ✅ `playground` 应用能够成功运行。
        -   ✅ 浏览器中能够看到并交互式地浏览一个点云。
        -   ✅ 视锥剔除和 LOD 切换肉眼可见且工作正常。
        -   ✅ **Phase 2 退出标准达成。**

---

### **Phase 3: 性能优化 (2 周)**

**目标**: 分析性能瓶颈，优化核心模块，达到生产级性能标准。

-   **[ ] P3-T1: 编写并执行性能基准测试**
    -   **上下文输入**: `architecture-v8.md` **章节 15.5 (性能测试)** 提供了 `vitest` `bench` 的使用示例。性能目标见 **章节 16.1**。
    -   **LLM Prompt 指令**: "在 `benchmarks/` 目录下，创建性能基准测试文件。使用 `vitest` 的 `bench` 函数，针对以下场景编写测试：1. 渲染 100 万、500 万、1000 万点；2. TraversalSystem 在不同节点数量下的遍历耗时。将测试结果与 `architecture-v8.md` 章节 16.1 的性能目标进行对比。"
    -   **输出验收标准**:
        -   ✅ 性能基准测试脚本创建成功。
        -   ✅ 能够量化当前版本的性能数据，并生成报告。

-   **[ ] P3-T2: 优化代码热点 (人机协作)**
    -   **上下文输入**: **P3-T1** 的性能报告，以及 Chrome DevTools 的性能分析结果。`architecture-v8.md` **章节 10.3** 提供了优化策略（如对象池、增量更新）。
    -   **LLM Prompt 指令 (示例)**: "Chrome Profiler 显示，`TraversalSystem` 的 `traverseNode` 方法中创建了大量临时的 `Vector3` 对象，导致 GC 压力。请重构此方法，使用 `@better-potree/core` 中定义的 `ObjectPools.vector3Pool` 来管理 `Vector3` 对象的分配和释放。"
    -   **输出验收标准**:
        -   ✅ 代码热点被重构。
        -   ✅ 再次运行性能基准测试，相关指标有明显提升。
        -   ✅ 内存使用曲线更加平滑，GC 暂停时间减少。
        -   ✅ **Phase 3 退出标准达成。**