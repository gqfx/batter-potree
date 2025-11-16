# Better-Potree LLM 开发计划补充 - Phase 1 Week 2 到 Phase 3

**版本**: v2.0-extension（基于实际项目结构更新）
**基于**: llm-development-plan.md v1.1
**基于 Potree 源码分析**: gemini_guide.md
**实际项目分析**: 2025-11-16
**目标**: 补充缺失的 Phase 1 Week 2、Phase 2、Phase 3 任务

---

## 📋 补充说明

### 为什么需要这些补充任务？

根据 `llm-plan-review.md` 的分析，原开发计划存在三个关键问题：
1. **路线图在 Phase 1 Week 1 后中断** - 缺少 Phase 1 Week 2 到 Phase 3 的任务
2. **缺失 Phase 1 Week 2 基础设施任务** - SystemScheduler、WorkerPool、ResourceManager、ECS、Octree
3. ~~工具链配置不完整~~ - **已解决：TypeScript 和 Vitest 已配置**

### 实际项目结构分析（2025-11-16）

#### ✅ 已完成的工作

**包结构**（8个包）：
- `@better-potree/types` - 类型定义包
- `@better-potree/core` - 核心功能包
- `@better-potree/rendering-three` - Three.js 渲染包
- `@better-potree/loader-potree` - Potree 格式加载器
- `@better-potree/controls` - 控制器包
- `@better-potree/tools` - 工具包
- `@better-potree/viewer` - 查看器包
- `@better-potree/playground` - 演示应用

**已配置的基础设施**：
- ✅ TypeScript 项目引用（composite + references 已配置）
- ✅ Vitest workspace（根目录有 vitest.config.ts）
- ✅ Biome lint + format（完整配置）
- ✅ pnpm workspace

**已实现的核心模块**（在 `@better-potree/core` 中）：
- ✅ `attributes/` - 点属性系统（PointAttribute, PointAttributes）
- ✅ `events/` - 事件系统（EventEmitter）
- ✅ `lod/` - LOD 系统（LODSelector, FrustumCuller, PointBudget）
- ✅ `octree/` - 八叉树系统（OctreeNode, PointCloudOctree）

#### ❌ 缺失的基础设施模块

根据架构 v8.0 要求，以下模块**尚未实现**：
1. ❌ `scheduler/` - SystemScheduler（系统调度器）
2. ❌ `messaging/` - MessageQueue（消息队列）
3. ❌ `workers/` - WorkerPool（工作线程池）
4. ❌ `resources/` - ResourceManager + LRUCache（资源管理器）
5. ❌ `ecs/` - ECS 系统（实体组件系统）
6. ❌ `pools/` - ObjectPools（对象池）

#### 🔄 需要调整的任务

原计划中的 **TASK-106 和 TASK-107**（TypeScript 和 Vitest 配置）**已无需执行**，因为：
- TypeScript 项目引用已在每个包中配置（`composite: true`, `references`）
- Vitest 已配置为全局模式（jsdom 环境，setupFiles）

因此，**Phase 1 Week 2 任务需要从 TASK-108 开始**。

### Potree 源码分析支撑

基于对 Potree 源码的深入分析（见 Explore Agent 报告），我们提取了以下核心实现要点：

| 核心功能 | Potree 参考文件 | 提取的算法/数据结构 |
|---------|---------------|-------------------|
| **LOD 选择** | `Potree_update_visibility.js` | 优先级队列、SSE 计算、视锥剔除 |
| **八叉树** | `PointCloudOctree.js` | TreeNode 结构、visibleNodes 管理 |
| **渲染器** | `PotreeRenderer.js` | WebGL 管线、VAO/VBO 管理、Uniform 优化 |
| **材质系统** | `PointCloudMaterial.js` | Uniforms、Defines、纹理管理 |
| **着色器** | `pointcloud.vs/fs` | 自适应点大小、颜色编码、裁剪算法 |
| **数据加载** | `POCLoader.js`、`BinaryLoader.js` | 元数据解析、二进制加载流程 |
| **数据解码** | `BinaryDecoderWorker.js` | 属性解码、压缩、Transferable Objects |
| **内存管理** | `LRU.js` | 双向链表 LRU、递归释放 |
| **Worker 池** | `WorkerPool.js` | Worker 对象池、复用策略 |

---

## 🏗️ Phase 1 Week 2: 核心基础设施 (4天 / 8个任务)

**说明**: TASK-106 和 TASK-107（TypeScript/Vitest 配置）已完成，从 TASK-108 开始。

---

### TASK-108: 实现 SystemScheduler (系统调度器)

**任务 ID**: TASK-108
**依赖**: TASK-104 (核心类型定义)
**预计时间**: 4 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 2.4 节（系统调度）
  - `architecture-v8.md` 第 8 节（系统实现）
- 目标: 实现 ECS 风格的系统调度器，管理所有系统的更新循环

#### 输入
```typescript
// 需要实现的接口（已在 TASK-104 定义）
interface ISystem {
  readonly name: string;
  readonly stage: SystemStage;
  readonly priority?: number;
  update(deltaTime: number): void;
  dispose?(): void;
}

enum SystemStage {
  INPUT = 0,
  UPDATE = 100,
  RENDER = 200,
  CLEANUP = 300
}
```

#### 输出
- [ ] 创建 `packages/core/src/scheduler/SystemScheduler.ts`
- [ ] 创建 `packages/core/src/scheduler/types.ts`
- [ ] 创建 `packages/core/src/scheduler/index.ts`
- [ ] 创建 `packages/core/src/scheduler/__tests__/SystemScheduler.test.ts`
- [ ] 测试覆盖率 > 85%
- [ ] 性能测试: 100 个系统的调度开销 < 1ms

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的系统调度器。

参考文档: architecture-v8.md 第 2.4 节

上下文:
- 核心类型已定义 (TASK-104)
- SystemStage 和 ISystem 已存在

任务: 实现 SystemScheduler

要求:
1. 实现 SystemScheduler 类:
   ```typescript
   export class SystemScheduler {
     private systems: ISystem[] = [];
     private systemsByStage: Map<SystemStage, ISystem[]> = new Map();
     private running: boolean = false;

     constructor() {
       // 初始化每个 stage 的系统数组
     }

     addSystem(system: ISystem): void {
       // 添加系统并按 stage + priority 排序
     }

     removeSystem(name: string): void {
       // 移除系统并调用 dispose
     }

     update(deltaTime: number): void {
       // 按 stage 顺序执行所有系统
       // INPUT → UPDATE → RENDER → CLEANUP
     }

     dispose(): void {
       // 清理所有系统
     }
   }
   ```

2. 关键逻辑:
   - **排序**: 同一 stage 内按 priority 排序（小值优先）
   - **阶段顺序**: INPUT → UPDATE → RENDER → CLEANUP
   - **错误处理**: 单个系统错误不影响其他系统

3. 编写测试:
   - 测试系统添加/移除
   - 测试系统执行顺序（stage + priority）
   - 测试错误隔离（一个系统抛错不影响其他）
   - 性能测试: 100 个系统 × 1000 次更新的耗时

4. 辅助方法:
   - getSystem(name: string): ISystem | undefined
   - hasSystem(name: string): boolean
   - getSystems(): ReadonlyArray<ISystem>

文件结构:
packages/core/src/scheduler/
├── SystemScheduler.ts
├── types.ts
├── index.ts
└── __tests__/
    └── SystemScheduler.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- scheduler

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- scheduler

# 3. 性能测试
# 期望输出: 100 系统 × 1000 次更新 < 100ms

# 4. 类型检查
pnpm --filter @better-potree/core run typecheck
```

---

### TASK-109: 实现 MessageQueue (消息队列)

**任务 ID**: TASK-109
**依赖**: TASK-108
**预计时间**: 2 小时
**优先级**: P0

#### 上下文
- 阅读文件: `architecture-v8.md` 第 2.5 节（事件与消息）
- 目标: 实现跨帧消息队列，用于异步任务通信

#### 输入
```typescript
// 消息类型示例
type Message =
  | { type: 'NODE_LOADED'; nodeId: string; data: any }
  | { type: 'NODE_FAILED'; nodeId: string; error: Error }
  | { type: 'RESOURCE_FREED'; resourceId: string }
```

#### 输出
- [ ] 创建 `packages/core/src/messaging/MessageQueue.ts`
- [ ] 创建 `packages/core/src/messaging/types.ts`
- [ ] 创建 `packages/core/src/messaging/index.ts`
- [ ] 创建 `packages/core/src/messaging/__tests__/MessageQueue.test.ts`
- [ ] 测试覆盖率 > 90%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的消息队列。

参考文档: architecture-v8.md 第 2.5 节

任务: 实现跨帧消息队列

要求:
1. 实现 MessageQueue 类:
   ```typescript
   export class MessageQueue<T = any> {
     private queue: T[] = [];
     private handlers: Map<string, (msg: T) => void> = new Map();

     // 入队消息
     enqueue(message: T): void {
       this.queue.push(message);
     }

     // 批量入队
     enqueueMany(messages: T[]): void {
       this.queue.push(...messages);
     }

     // 处理消息（在系统的 update 中调用）
     processMessages(maxMessages?: number): void {
       const count = maxMessages ?? this.queue.length;
       const messages = this.queue.splice(0, count);

       for (const msg of messages) {
         this.handleMessage(msg);
       }
     }

     // 注册处理器
     on(type: string, handler: (msg: T) => void): void {
       this.handlers.set(type, handler);
     }

     // 移除处理器
     off(type: string): void {
       this.handlers.delete(type);
     }

     // 清空队列
     clear(): void {
       this.queue.length = 0;
     }

     private handleMessage(msg: T): void {
       const handler = this.handlers.get((msg as any).type);
       if (handler) {
         handler(msg);
       }
     }
   }
   ```

2. 定义消息类型 (types.ts):
   ```typescript
   export type NodeMessage =
     | { type: 'NODE_LOADED'; nodeId: string; data: NodeData }
     | { type: 'NODE_FAILED'; nodeId: string; error: Error };

   export type ResourceMessage =
     | { type: 'RESOURCE_ALLOCATED'; resourceId: string }
     | { type: 'RESOURCE_FREED'; resourceId: string };
   ```

3. 编写测试:
   - 测试消息入队/出队
   - 测试处理器注册/移除
   - 测试批量处理（maxMessages 限制）
   - 测试错误隔离（处理器抛错不影响其他消息）

4. 性能测试:
   - 10000 条消息入队/出队 < 10ms

文件结构:
packages/core/src/messaging/
├── MessageQueue.ts
├── types.ts
├── index.ts
└── __tests__/
    └── MessageQueue.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- messaging

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- messaging

# 期望: 所有测试通过，覆盖率 > 90%
```

---

### TASK-110: 实现 WorkerPool (工作线程池)

**任务 ID**: TASK-110
**依赖**: TASK-109
**预计时间**: 4 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 9.3 节（Worker Pool）
  - Potree 源码: `D:\coding\libs\potree\src\WorkerPool.js`
- 目标: 实现 Web Worker 对象池，用于并行解码

#### 输入
```typescript
// Worker 任务接口
interface WorkerTask {
  id: string;
  data: any;
  transferables?: Transferable[];
}
```

#### 输出
- [ ] 创建 `packages/core/src/workers/WorkerPool.ts`
- [ ] 创建 `packages/core/src/workers/types.ts`
- [ ] 创建 `packages/core/src/workers/index.ts`
- [ ] 创建 `packages/core/src/workers/__tests__/WorkerPool.test.ts`
- [ ] 测试覆盖率 > 80%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的 Worker 池。

参考文档:
- architecture-v8.md 第 9.3 节
- Potree 源码: WorkerPool.js

任务: 实现 Web Worker 对象池

要求:
1. 实现 WorkerPool 类:
   ```typescript
   export class WorkerPool {
     private workers: Worker[] = [];
     private availableWorkers: Worker[] = [];
     private taskQueue: WorkerTask[] = [];
     private activeTasks: Map<Worker, WorkerTask> = new Map();

     constructor(
       private workerUrl: string,
       private maxWorkers: number = navigator.hardwareConcurrency || 4
     ) {
       // 懒创建 Worker
     }

     // 执行任务
     execute<T>(data: any, transferables?: Transferable[]): Promise<T> {
       return new Promise((resolve, reject) => {
         const task: WorkerTask = {
           id: generateId(),
           data,
           transferables,
           resolve,
           reject,
         };

         this.taskQueue.push(task);
         this.processTasks();
       });
     }

     // 处理任务队列
     private processTasks(): void {
       while (this.taskQueue.length > 0 && this.availableWorkers.length > 0) {
         const task = this.taskQueue.shift()!;
         const worker = this.availableWorkers.pop()!;

         this.activeTasks.set(worker, task);
         worker.postMessage(task.data, task.transferables ?? []);
       }

       // 如果还有任务且未达到最大 Worker 数，创建新 Worker
       if (this.taskQueue.length > 0 && this.workers.length < this.maxWorkers) {
         this.createWorker();
       }
     }

     // 创建 Worker
     private createWorker(): void {
       const worker = new Worker(this.workerUrl, { type: 'module' });

       worker.onmessage = (e) => {
         const task = this.activeTasks.get(worker);
         if (task) {
           task.resolve(e.data);
           this.activeTasks.delete(worker);
           this.availableWorkers.push(worker);
           this.processTasks();
         }
       };

       worker.onerror = (e) => {
         const task = this.activeTasks.get(worker);
         if (task) {
           task.reject(new Error(e.message));
           this.activeTasks.delete(worker);
           this.availableWorkers.push(worker);
           this.processTasks();
         }
       };

       this.workers.push(worker);
       this.availableWorkers.push(worker);
       this.processTasks();
     }

     // 清理
     dispose(): void {
       for (const worker of this.workers) {
         worker.terminate();
       }
       this.workers.length = 0;
       this.availableWorkers.length = 0;
       this.taskQueue.length = 0;
       this.activeTasks.clear();
     }
   }
   ```

2. 关键特性:
   - **懒创建**: 按需创建 Worker（最多 maxWorkers 个）
   - **任务队列**: 当所有 Worker 忙碌时任务入队
   - **自动复用**: Worker 完成任务后自动复用
   - **Transferable**: 支持 ArrayBuffer 转移

3. 编写测试:
   - 创建测试用 Worker (packages/core/src/workers/__tests__/test.worker.ts)
   - 测试任务执行和结果返回
   - 测试并发任务（超过 maxWorkers 数量）
   - 测试任务队列
   - 测试错误处理

4. 辅助方法:
   - getActiveTaskCount(): number
   - getQueuedTaskCount(): number

文件结构:
packages/core/src/workers/
├── WorkerPool.ts
├── types.ts
├── index.ts
└── __tests__/
    ├── WorkerPool.test.ts
    └── test.worker.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- workers

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- workers

# 3. 测试并发
# 期望: 提交 10 个任务，只创建 4 个 Worker（navigator.hardwareConcurrency）

# 4. 类型检查
pnpm --filter @better-potree/core run typecheck
```

---

### TASK-111: 实现 ResourceManager (资源管理器)

**任务 ID**: TASK-111
**依赖**: TASK-110
**预计时间**: 5 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 9.2 节（ResourceManager）
  - Potree 源码: `D:\coding\libs\potree\src\LRU.js`
- 目标: 实现基于 LRU 的资源管理器，管理 GPU 资源和已加载节点

#### 输入
```typescript
// GPU 资源接口
interface GPUResource {
  id: string;
  byteSize: number;
  dispose(): void;
}
```

#### 输出
- [ ] 创建 `packages/core/src/resources/ResourceManager.ts`
- [ ] 创建 `packages/core/src/resources/LRUCache.ts`
- [ ] 创建 `packages/core/src/resources/types.ts`
- [ ] 创建 `packages/core/src/resources/index.ts`
- [ ] 创建 `packages/core/src/resources/__tests__/ResourceManager.test.ts`
- [ ] 创建 `packages/core/src/resources/__tests__/LRUCache.test.ts`
- [ ] 测试覆盖率 > 85%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的资源管理器。

参考文档:
- architecture-v8.md 第 9.2 节
- Potree 源码: LRU.js

任务: 实现基于 LRU 的资源管理器

要求:
1. 实现 LRUCache 类（参考 Potree LRU.js）:
   ```typescript
   interface LRUItem<T> {
     key: string;
     value: T;
     prev: LRUItem<T> | null;
     next: LRUItem<T> | null;
   }

   export class LRUCache<T> {
     private items: Map<string, LRUItem<T>> = new Map();
     private head: LRUItem<T> | null = null;
     private tail: LRUItem<T> | null = null;

     constructor(private maxSize: number) {}

     // 获取并标记为最近使用
     get(key: string): T | undefined {
       const item = this.items.get(key);
       if (!item) return undefined;

       this.moveToTail(item);
       return item.value;
     }

     // 设置并标记为最近使用
     set(key: string, value: T): void {
       let item = this.items.get(key);

       if (item) {
         item.value = value;
         this.moveToTail(item);
       } else {
         item = { key, value, prev: null, next: null };
         this.items.set(key, item);
         this.addToTail(item);

         if (this.items.size > this.maxSize) {
           this.evictHead();
         }
       }
     }

     // 标记为最近使用
     touch(key: string): void {
       const item = this.items.get(key);
       if (item) {
         this.moveToTail(item);
       }
     }

     // 移除
     delete(key: string): boolean {
       const item = this.items.get(key);
       if (!item) return false;

       this.removeItem(item);
       this.items.delete(key);
       return true;
     }

     // 获取最少使用的项
     getLRU(): T | undefined {
       return this.head?.value;
     }

     private moveToTail(item: LRUItem<T>): void {
       if (item === this.tail) return;

       this.removeItem(item);
       this.addToTail(item);
     }

     private addToTail(item: LRUItem<T>): void {
       item.next = null;
       item.prev = this.tail;

       if (this.tail) {
         this.tail.next = item;
       } else {
         this.head = item;
       }

       this.tail = item;
     }

     private removeItem(item: LRUItem<T>): void {
       if (item.prev) {
         item.prev.next = item.next;
       } else {
         this.head = item.next;
       }

       if (item.next) {
         item.next.prev = item.prev;
       } else {
         this.tail = item.prev;
       }
     }

     private evictHead(): void {
       if (!this.head) return;

       const key = this.head.key;
       this.removeItem(this.head);
       this.items.delete(key);
     }
   }
   ```

2. 实现 ResourceManager 类:
   ```typescript
   export class ResourceManager {
     private gpuResources: LRUCache<GPUResource>;
     private loadedNodes: LRUCache<NodeData>;
     private totalGPUMemory: number = 0;

     constructor(
       private gpuMemoryBudget: number,  // 字节
       private maxLoadedNodes: number
     ) {
       this.gpuResources = new LRUCache(1000);
       this.loadedNodes = new LRUCache(maxLoadedNodes);
     }

     // 分配 GPU 资源
     allocateGPU(id: string, resource: GPUResource): void {
       // 检查预算
       if (this.totalGPUMemory + resource.byteSize > this.gpuMemoryBudget) {
         this.evictGPU(resource.byteSize);
       }

       this.gpuResources.set(id, resource);
       this.totalGPUMemory += resource.byteSize;
     }

     // 释放 GPU 资源
     freeGPU(id: string): void {
       const resource = this.gpuResources.get(id);
       if (resource) {
         resource.dispose();
         this.totalGPUMemory -= resource.byteSize;
         this.gpuResources.delete(id);
       }
     }

     // 标记资源为使用中
     touchGPU(id: string): void {
       this.gpuResources.touch(id);
     }

     // 驱逐 GPU 资源
     private evictGPU(requiredBytes: number): void {
       while (this.totalGPUMemory + requiredBytes > this.gpuMemoryBudget) {
         const lru = this.gpuResources.getLRU();
         if (!lru) break;

         this.freeGPU(lru.id);
       }
     }

     // 加载节点
     loadNode(nodeId: string, data: NodeData): void {
       this.loadedNodes.set(nodeId, data);
     }

     // 获取已加载节点
     getNode(nodeId: string): NodeData | undefined {
       return this.loadedNodes.get(nodeId);
     }

     // 卸载节点
     unloadNode(nodeId: string): void {
       this.loadedNodes.delete(nodeId);
     }

     // 清理所有资源
     dispose(): void {
       // 释放所有 GPU 资源
       for (const [id] of this.gpuResources['items']) {
         this.freeGPU(id);
       }
     }
   }
   ```

3. 编写测试:
   - LRUCache 测试:
     * 测试插入/获取/删除
     * 测试 LRU 驱逐（超过 maxSize）
     * 测试 touch 更新位置
   - ResourceManager 测试:
     * 测试 GPU 资源分配/释放
     * 测试内存预算驱逐
     * 测试节点加载/卸载
     * 模拟高压场景（频繁分配/释放）

4. 性能测试:
   - 10000 次 LRU 操作 < 50ms

文件结构:
packages/core/src/resources/
├── ResourceManager.ts
├── LRUCache.ts
├── types.ts
├── index.ts
└── __tests__/
    ├── ResourceManager.test.ts
    └── LRUCache.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- resources

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- resources

# 3. 性能测试
# 期望: 10000 次 LRU 操作 < 50ms

# 4. 类型检查
pnpm --filter @better-potree/core run typecheck
```

---

### TASK-112: 实现 ECS (Entity Component System)

**任务 ID**: TASK-112
**依赖**: TASK-104
**预计时间**: 6 小时
**优先级**: P0

#### 上下文
- 阅读文件: `architecture-v8.md` 第 7 节（ECS 数据模型）
- 目标: 实现轻量级 ECS，管理点云节点的组件化数据

#### 输入
```typescript
// Component 基类（已在 TASK-104 定义）
interface Component {
  __componentType?: string;
}

// 预定义组件
interface TransformComponent extends Component {
  matrix: number[]; // 4x4 变换矩阵
}

interface VisibilityComponent extends Component {
  visible: boolean;
  screenSize: number; // 屏幕投影大小（像素）
}
```

#### 输出
- [ ] 创建 `packages/core/src/ecs/World.ts`
- [ ] 创建 `packages/core/src/ecs/Entity.ts`
- [ ] 创建 `packages/core/src/ecs/ComponentStore.ts`
- [ ] 创建 `packages/core/src/ecs/Query.ts`
- [ ] 创建 `packages/core/src/ecs/components/` (预定义组件)
- [ ] 创建 `packages/core/src/ecs/__tests__/` (测试)
- [ ] 测试覆盖率 > 80%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的 ECS 系统。

参考文档: architecture-v8.md 第 7 节

任务: 实现轻量级 ECS

要求:
1. 实现 World 类:
   ```typescript
   export class World {
     private nextEntityId: number = 0;
     private entities: Set<number> = new Set();
     private componentStores: Map<string, ComponentStore<any>> = new Map();

     // 创建实体
     createEntity(): number {
       const id = this.nextEntityId++;
       this.entities.add(id);
       return id;
     }

     // 销毁实体
     destroyEntity(entityId: number): void {
       for (const store of this.componentStores.values()) {
         store.remove(entityId);
       }
       this.entities.delete(entityId);
     }

     // 添加组件
     addComponent<T extends Component>(
       entityId: number,
       componentType: string,
       component: T
     ): void {
       let store = this.componentStores.get(componentType);
       if (!store) {
         store = new ComponentStore<T>();
         this.componentStores.set(componentType, store);
       }
       store.set(entityId, component);
     }

     // 获取组件
     getComponent<T extends Component>(
       entityId: number,
       componentType: string
     ): T | undefined {
       return this.componentStores.get(componentType)?.get(entityId);
     }

     // 移除组件
     removeComponent(entityId: number, componentType: string): void {
       this.componentStores.get(componentType)?.remove(entityId);
     }

     // 查询实体
     query(...componentTypes: string[]): Query {
       return new Query(this, componentTypes);
     }
   }
   ```

2. 实现 ComponentStore 类:
   ```typescript
   export class ComponentStore<T extends Component> {
     private components: Map<number, T> = new Map();

     set(entityId: number, component: T): void {
       this.components.set(entityId, component);
     }

     get(entityId: number): T | undefined {
       return this.components.get(entityId);
     }

     remove(entityId: number): void {
       this.components.delete(entityId);
     }

     has(entityId: number): boolean {
       return this.components.has(entityId);
     }

     getAll(): IterableIterator<[number, T]> {
       return this.components.entries();
     }
   }
   ```

3. 实现 Query 类:
   ```typescript
   export class Query {
     constructor(
       private world: World,
       private componentTypes: string[]
     ) {}

     // 迭代匹配的实体
     *iterate(): Generator<[number, Component[]]> {
       const entities = this.world['entities'];

       for (const entityId of entities) {
         const components: Component[] = [];
         let matched = true;

         for (const type of this.componentTypes) {
           const component = this.world.getComponent(entityId, type);
           if (!component) {
             matched = false;
             break;
           }
           components.push(component);
         }

         if (matched) {
           yield [entityId, components];
         }
       }
     }

     // 获取所有匹配实体
     getEntities(): number[] {
       const result: number[] = [];
       for (const [entityId] of this.iterate()) {
         result.push(entityId);
       }
       return result;
     }
   }
   ```

4. 定义预定义组件 (components/):
   - TransformComponent: 变换矩阵
   - VisibilityComponent: 可见性和屏幕大小
   - BoundingBoxComponent: 包围盒
   - LODComponent: LOD 层级信息
   - GeometryComponent: 几何数据引用
   - MaterialComponent: 材质 ID

5. 编写测试:
   - 测试实体创建/销毁
   - 测试组件添加/获取/移除
   - 测试查询功能
   - 性能测试: 10000 实体 × 3 组件的查询 < 10ms

文件结构:
packages/core/src/ecs/
├── World.ts
├── Entity.ts
├── ComponentStore.ts
├── Query.ts
├── components/
│   ├── TransformComponent.ts
│   ├── VisibilityComponent.ts
│   ├── BoundingBoxComponent.ts
│   ├── LODComponent.ts
│   ├── GeometryComponent.ts
│   └── MaterialComponent.ts
├── index.ts
└── __tests__/
    ├── World.test.ts
    ├── ComponentStore.test.ts
    └── Query.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- ecs

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- ecs

# 3. 性能测试
# 期望: 10000 实体查询 < 10ms

# 4. 类型检查
pnpm --filter @better-potree/core run typecheck
```

---

### TASK-113: 实现 OctreeManager (八叉树管理器)

**任务 ID**: TASK-113
**依赖**: TASK-112 (ECS)
**预计时间**: 6 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 5.2 节（OctreeManager）
  - Potree 源码: `D:\coding\libs\potree\src\PointCloudOctree.js`
- 目标: 实现八叉树管理器，管理节点层级和元数据

#### 输入
```typescript
// 八叉树元数据接口（已在 TASK-104 定义）
interface OctreeMetadata {
  sourceId: string;
  boundingBox: BoundingBox;
  spacing: number;
  hierarchyStepSize: number;
  pointAttributes: string[];
}
```

#### 输出
- [ ] 创建 `packages/core/src/octree/OctreeManager.ts`
- [ ] 创建 `packages/core/src/octree/OctreeNode.ts`
- [ ] 创建 `packages/core/src/octree/types.ts`
- [ ] 创建 `packages/core/src/octree/utils.ts` (辅助函数)
- [ ] 创建 `packages/core/src/octree/index.ts`
- [ ] 创建 `packages/core/src/octree/__tests__/OctreeManager.test.ts`
- [ ] 测试覆盖率 > 80%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的八叉树管理器。

参考文档:
- architecture-v8.md 第 5.2 节
- Potree 源码: PointCloudOctree.js

上下文:
- ECS 已实现 (TASK-112)
- 核心类型已定义 (TASK-104)

任务: 实现八叉树管理器

要求:
1. 实现 OctreeNode 类:
   ```typescript
   export class OctreeNode {
     readonly id: string;
     readonly sourceId: string;
     readonly name: string; // "r", "r0", "r01", etc.
     readonly level: number;
     readonly boundingBox: BoundingBox;
     readonly spacing: number;

     children: (OctreeNode | null)[] = new Array(8).fill(null);
     parent: OctreeNode | null = null;

     // ECS 实体 ID
     entityId: number | null = null;

     // 加载状态
     loaded: boolean = false;
     loading: boolean = false;

     constructor(
       sourceId: string,
       name: string,
       boundingBox: BoundingBox,
       spacing: number
     ) {
       this.id = `${sourceId}/${name}`;
       this.sourceId = sourceId;
       this.name = name;
       this.level = name.length - 1; // "r" = 0, "r0" = 1, "r01" = 2
       this.boundingBox = boundingBox;
       this.spacing = spacing;
     }

     // 获取子节点索引 (0-7)
     getChildIndex(childName: string): number {
       return parseInt(childName[childName.length - 1]);
     }

     // 添加子节点
     addChild(child: OctreeNode): void {
       const index = this.getChildIndex(child.name);
       this.children[index] = child;
       child.parent = this;
     }

     // 是否是叶子节点
     isLeaf(): boolean {
       return this.children.every(c => c === null);
     }
   }
   ```

2. 实现 OctreeManager 类:
   ```typescript
   export class OctreeManager {
     private metadata: Map<string, OctreeMetadata> = new Map();
     private roots: Map<string, OctreeNode> = new Map();
     private nodes: Map<string, OctreeNode> = new Map();

     constructor(private ecs: World) {}

     // 加载八叉树元数据
     async loadOctree(
       sourceId: string,
       url: string,
       type: string
     ): Promise<void> {
       // 1. 加载 meta.json（Potree 2.0）或其他元数据文件
       const metadata = await this.fetchMetadata(url, type);

       // ⚠️ 关键: 必须填充 sourceId
       metadata.sourceId = sourceId;
       this.metadata.set(sourceId, metadata);

       // 2. 创建根节点
       const root = new OctreeNode(
         sourceId,
         'r',
         metadata.boundingBox,
         metadata.spacing
       );

       // 3. 创建 ECS 实体
       const entityId = this.ecs.createEntity();
       root.entityId = entityId;

       this.ecs.addComponent(entityId, 'Transform', {
         matrix: createIdentityMatrix(),
       });

       this.ecs.addComponent(entityId, 'BoundingBox', {
         min: metadata.boundingBox.min,
         max: metadata.boundingBox.max,
       });

       this.roots.set(sourceId, root);
       this.nodes.set(root.id, root);
     }

     // 获取或创建子节点
     getOrCreateNode(
       sourceId: string,
       nodeName: string
     ): OctreeNode | null {
       const id = `${sourceId}/${nodeName}`;

       // 已存在
       if (this.nodes.has(id)) {
         return this.nodes.get(id)!;
       }

       // 创建节点（需要父节点存在）
       if (nodeName.length === 1) {
         // 根节点应该已存在
         return this.roots.get(sourceId) ?? null;
       }

       const parentName = nodeName.slice(0, -1);
       const parent = this.getOrCreateNode(sourceId, parentName);
       if (!parent) return null;

       const metadata = this.metadata.get(sourceId);
       if (!metadata) return null;

       // 计算子节点的包围盒和间距
       const childIndex = parseInt(nodeName[nodeName.length - 1]);
       const childBoundingBox = computeChildBoundingBox(
         parent.boundingBox,
         childIndex
       );
       const childSpacing = parent.spacing / 2;

       const node = new OctreeNode(
         sourceId,
         nodeName,
         childBoundingBox,
         childSpacing
       );

       // 创建 ECS 实体
       const entityId = this.ecs.createEntity();
       node.entityId = entityId;

       this.ecs.addComponent(entityId, 'BoundingBox', {
         min: childBoundingBox.min,
         max: childBoundingBox.max,
       });

       this.ecs.addComponent(entityId, 'LOD', {
         level: node.level,
         spacing: childSpacing,
       });

       parent.addChild(node);
       this.nodes.set(id, node);

       return node;
     }

     // 获取节点
     getNode(sourceId: string, nodeName: string): OctreeNode | undefined {
       return this.nodes.get(`${sourceId}/${nodeName}`);
     }

     // 卸载八叉树
     unloadOctree(sourceId: string): void {
       const root = this.roots.get(sourceId);
       if (!root) return;

       // 递归销毁所有节点的 ECS 实体
       this.destroyNodeRecursive(root);

       this.roots.delete(sourceId);
       this.metadata.delete(sourceId);

       // 从 nodes 中移除所有属于该 source 的节点
       for (const [id, node] of this.nodes.entries()) {
         if (node.sourceId === sourceId) {
           this.nodes.delete(id);
         }
       }
     }

     private destroyNodeRecursive(node: OctreeNode): void {
       if (node.entityId !== null) {
         this.ecs.destroyEntity(node.entityId);
       }

       for (const child of node.children) {
         if (child) {
           this.destroyNodeRecursive(child);
         }
       }
     }

     private async fetchMetadata(
       url: string,
       type: string
     ): Promise<OctreeMetadata> {
       // 根据 type 加载不同格式的元数据
       // 'potree': meta.json
       // 'las': 直接解析 LAS 头
       // TODO: 实现加载逻辑
       throw new Error('Not implemented');
     }
   }
   ```

3. 实现 utils.ts:
   ```typescript
   // 计算子节点包围盒
   export function computeChildBoundingBox(
     parentBox: BoundingBox,
     childIndex: number
   ): BoundingBox {
     const { min, max } = parentBox;
     const center = [
       (min[0] + max[0]) / 2,
       (min[1] + max[1]) / 2,
       (min[2] + max[2]) / 2,
     ];

     // 子节点索引到坐标映射 (0-7)
     // 0: (0,0,0), 1: (1,0,0), 2: (0,1,0), 3: (1,1,0)
     // 4: (0,0,1), 5: (1,0,1), 6: (0,1,1), 7: (1,1,1)
     const x = (childIndex & 1) > 0 ? 1 : 0;
     const y = (childIndex & 2) > 0 ? 1 : 0;
     const z = (childIndex & 4) > 0 ? 1 : 0;

     const childMin = [
       x === 0 ? min[0] : center[0],
       y === 0 ? min[1] : center[1],
       z === 0 ? min[2] : center[2],
     ];

     const childMax = [
       x === 0 ? center[0] : max[0],
       y === 0 ? center[1] : max[1],
       z === 0 ? center[2] : max[2],
     ];

     return { min: childMin, max: childMax };
   }

   // 创建单位矩阵
   export function createIdentityMatrix(): number[] {
     return [
       1, 0, 0, 0,
       0, 1, 0, 0,
       0, 0, 1, 0,
       0, 0, 0, 1,
     ];
   }
   ```

4. 编写测试:
   - 测试节点创建和层级关系
   - 测试子节点包围盒计算
   - 测试 ECS 集成
   - 测试卸载清理

文件结构:
packages/core/src/octree/
├── OctreeManager.ts
├── OctreeNode.ts
├── types.ts
├── utils.ts
├── index.ts
└── __tests__/
    ├── OctreeManager.test.ts
    ├── OctreeNode.test.ts
    └── utils.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- octree

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- octree

# 3. 类型检查
pnpm --filter @better-potree/core run typecheck
```

---

### TASK-114: 实现 ObjectPools (对象池)

**任务 ID**: TASK-114
**依赖**: 无
**预计时间**: 2 小时
**优先级**: P1

#### 上下文
- 阅读文件: `architecture-v8.md` 第 9.1 节（ObjectPools）
- 目标: 实现对象池，减少高频对象的 GC 压力

#### 输入
```typescript
// 可池化对象接口
interface Poolable {
  reset(): void;
}
```

#### 输出
- [ ] 创建 `packages/core/src/pools/ObjectPool.ts`
- [ ] 创建 `packages/core/src/pools/types.ts`
- [ ] 创建 `packages/core/src/pools/index.ts`
- [ ] 创建 `packages/core/src/pools/__tests__/ObjectPool.test.ts`
- [ ] 测试覆盖率 > 90%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的对象池。

参考文档: architecture-v8.md 第 9.1 节

任务: 实现对象池

要求:
1. 实现 ObjectPool 类:
   ```typescript
   export class ObjectPool<T> {
     private available: T[] = [];
     private inUse: Set<T> = new Set();

     constructor(
       private factory: () => T,
       private reset: (obj: T) => void,
       private initialSize: number = 0
     ) {
       // 预分配对象
       for (let i = 0; i < initialSize; i++) {
         this.available.push(factory());
       }
     }

     // 获取对象
     acquire(): T {
       let obj: T;

       if (this.available.length > 0) {
         obj = this.available.pop()!;
       } else {
         obj = this.factory();
       }

       this.inUse.add(obj);
       return obj;
     }

     // 归还对象
     release(obj: T): void {
       if (!this.inUse.has(obj)) {
         console.warn('Releasing object not from pool');
         return;
       }

       this.reset(obj);
       this.inUse.delete(obj);
       this.available.push(obj);
     }

     // 批量归还
     releaseMany(objects: T[]): void {
       for (const obj of objects) {
         this.release(obj);
       }
     }

     // 清空池
     clear(): void {
       this.available.length = 0;
       this.inUse.clear();
     }

     // 获取统计信息
     getStats() {
       return {
         available: this.available.length,
         inUse: this.inUse.size,
         total: this.available.length + this.inUse.size,
       };
     }
   }
   ```

2. 创建常用对象池:
   ```typescript
   // Vector3 池
   export const vector3Pool = new ObjectPool(
     () => ({ x: 0, y: 0, z: 0 }),
     (v) => { v.x = 0; v.y = 0; v.z = 0; },
     100
   );

   // BoundingBox 池
   export const boundingBoxPool = new ObjectPool(
     () => ({
       min: [0, 0, 0],
       max: [0, 0, 0],
     }),
     (bb) => {
       bb.min[0] = bb.min[1] = bb.min[2] = 0;
       bb.max[0] = bb.max[1] = bb.max[2] = 0;
     },
     50
   );
   ```

3. 编写测试:
   - 测试对象获取/归还
   - 测试池扩展（初始大小不足时）
   - 测试重复归还保护
   - 性能测试: 10000 次获取/归还 < 10ms

文件结构:
packages/core/src/pools/
├── ObjectPool.ts
├── types.ts
├── index.ts
└── __tests__/
    └── ObjectPool.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- pools

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- pools

# 3. 性能测试
# 期望: 10000 次获取/归还 < 10ms
```

---

### TASK-115: Phase 1 Week 2 完成检查

**任务 ID**: TASK-115
**依赖**: TASK-106 ~ TASK-114
**预计时间**: 1 小时
**优先级**: P0

#### 上下文
- 阅读文件: `architecture-v8.md` 第 14 节 Phase 1 Week 2 退出标准
- 目标: 确保所有 Phase 1 Week 2 目标达成

#### 输入
```
退出标准:
- ✅ TypeScript 项目引用配置完成
- ✅ Vitest workspace 配置完成
- ✅ SystemScheduler 实现并测试通过
- ✅ MessageQueue 实现并测试通过
- ✅ WorkerPool 实现并测试通过
- ✅ ResourceManager 实现并测试通过
- ✅ ECS 实现并测试通过
- ✅ OctreeManager 实现并测试通过
- ✅ ObjectPools 实现并测试通过
- ✅ 所有测试通过，覆盖率 > 80%
```

#### 输出
- [ ] 创建 `dev_docs/phase1-week2-report.md`
- [ ] 所有测试通过
- [ ] 覆盖率达标
- [ ] 准备进入 Phase 2

#### LLM Prompt 模板
```
我正在完成 better-potree 项目 Phase 1 Week 2 验证。

任务: 生成 Phase 1 Week 2 完成报告

要求:
1. 运行所有测试并收集结果
2. 生成 phase1-week2-report.md，包含:
   - 完成的任务清单
   - 测试结果摘要
   - 覆盖率数据
   - 遇到的问题和解决方案
   - Phase 2 准备清单

3. 检查清单:
   - [ ] TypeScript 构建成功
   - [ ] Vitest 测试通过
   - [ ] 所有基础设施组件实现
   - [ ] 测试覆盖率 > 80%
   - [ ] 无 TypeScript 错误
   - [ ] 无 lint 错误

报告模板见 POC-REPORT.md。

请生成完整的报告。
```

#### 验证方法
```bash
# 1. 运行完整测试套件
pnpm run test

# 2. 检查覆盖率
pnpm run test:coverage

# 3. TypeScript 构建
pnpm run build:types

# 4. Lint 检查
pnpm run lint

# 5. 查看报告
cat dev_docs/phase1-week2-report.md
```

---

## 🎯 Phase 2: 核心系统实现 (10天 / 15个任务)

### TASK-201: 实现 PotreeLoader (元数据加载器)

**任务 ID**: TASK-201
**依赖**: TASK-113 (OctreeManager)
**预计时间**: 6 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 10.1 节（数据加载器）
  - Potree 源码: `D:\coding\libs\potree\src\loader\POCLoader.js`
- 目标: 实现 Potree 格式的元数据加载器

#### 输入
```
支持格式:
- Potree 2.0: meta.json
- Potree 1.x: cloud.js
```

#### 输出
- [ ] 创建 `packages/viewer/src/loaders/PotreeLoader.ts`
- [ ] 创建 `packages/viewer/src/loaders/types.ts`
- [ ] 创建 `packages/viewer/src/loaders/__tests__/PotreeLoader.test.ts`
- [ ] 测试覆盖率 > 80%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的 Potree 加载器。

参考文档:
- architecture-v8.md 第 10.1 节
- Potree 源码: POCLoader.js

上下文:
- OctreeManager 已实现 (TASK-113)
- 需要实现元数据解析逻辑

任务: 实现 PotreeLoader

要求:
1. 实现 PotreeLoader 类:
   ```typescript
   export class PotreeLoader {
     async load(url: string): Promise<OctreeMetadata> {
       // 1. 检测版本（meta.json 或 cloud.js）
       const metadataUrl = await this.detectMetadataFile(url);

       // 2. 加载元数据
       const response = await fetch(metadataUrl);
       const data = await response.json();

       // 3. 解析元数据
       return this.parseMetadata(data, url);
     }

     private async detectMetadataFile(url: string): Promise<string> {
       // 尝试 meta.json (Potree 2.0)
       const metaUrl = `${url}/meta.json`;
       try {
         const response = await fetch(metaUrl, { method: 'HEAD' });
         if (response.ok) return metaUrl;
       } catch {}

       // 尝试 cloud.js (Potree 1.x)
       return `${url}/cloud.js`;
     }

     private parseMetadata(
       data: any,
       baseUrl: string
     ): OctreeMetadata {
       // 解析 boundingBox
       const boundingBox = this.parseBoundingBox(data.boundingBox);

       // 解析 pointAttributes
       const pointAttributes = this.parseAttributes(data.pointAttributes);

       return {
         sourceId: '', // 由调用者填充
         boundingBox,
         tightBoundingBox: data.tightBoundingBox
           ? this.parseBoundingBox(data.tightBoundingBox)
           : boundingBox,
         spacing: data.spacing,
         hierarchyStepSize: data.hierarchyStepSize ?? 5,
         pointAttributes,
         scale: data.scale ?? 1.0,
         offset: data.offset ?? [0, 0, 0],
         version: data.version ?? '1.7',
       };
     }

     private parseBoundingBox(bbox: any): BoundingBox {
       // Potree 格式: { min: [x,y,z], max: [x,y,z] }
       // 或 { lx, ly, lz, ux, uy, uz }
       if (bbox.min && bbox.max) {
         return {
           min: bbox.min,
           max: bbox.max,
         };
       } else {
         return {
           min: [bbox.lx, bbox.ly, bbox.lz],
           max: [bbox.ux, bbox.uy, bbox.uz],
         };
       }
     }

     private parseAttributes(attrs: any): string[] {
       // Potree 1.x: 字符串数组
       if (Array.isArray(attrs)) {
         return attrs;
       }

       // Potree 2.0: 对象数组 [{ name, type, size }]
       return attrs.map((attr: any) => attr.name);
     }
   }
   ```

2. 编写测试:
   - 使用 mock fetch
   - 测试 Potree 2.0 格式解析
   - 测试 Potree 1.x 格式解析
   - 测试错误处理（文件不存在、格式错误）

文件结构:
packages/viewer/src/loaders/
├── PotreeLoader.ts
├── types.ts
├── index.ts
└── __tests__/
    ├── PotreeLoader.test.ts
    └── fixtures/
        ├── meta.json
        └── cloud.js

请提供完整的代码实现和测试数据。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/viewer run test -- loaders

# 2. 检查覆盖率
pnpm --filter @better-potree/viewer run test:coverage -- loaders
```

---

### TASK-202: 实现 BinaryDecoder Worker

**任务 ID**: TASK-202
**依赖**: TASK-110 (WorkerPool)
**预计时间**: 8 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 10.2 节（数据解码）
  - Potree 源码: `D:\coding\libs\potree\src\workers\BinaryDecoderWorker.js`
  - Potree 源码: `D:\coding\libs\potree\src\loader\PointAttributes.js`
- 目标: 实现 Worker 中的二进制解码逻辑

#### 输出
- [ ] 创建 `packages/viewer/src/workers/decoder.worker.ts`
- [ ] 创建 `packages/viewer/src/workers/PointAttributes.ts`
- [ ] 创建 `packages/viewer/src/workers/__tests__/decoder.test.ts`
- [ ] 测试覆盖率 > 75%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的二进制解码 Worker。

参考文档:
- architecture-v8.md 第 10.2 节
- Potree 源码: BinaryDecoderWorker.js, PointAttributes.js

任务: 实现 BinaryDecoder Worker

要求:
1. 实现 PointAttributes.ts（参考 Potree）:
   ```typescript
   export enum PointAttributeType {
     INT8 = 0,
     INT16 = 1,
     INT32 = 2,
     INT64 = 3,
     UINT8 = 4,
     UINT16 = 5,
     UINT32 = 6,
     UINT64 = 7,
     FLOAT = 8,
     DOUBLE = 9,
   }

   export interface PointAttribute {
     name: string;
     type: PointAttributeType;
     numElements: number;
     byteSize: number;
     range?: [number, number];
   }

   export class PointAttributes {
     attributes: PointAttribute[] = [];
     byteSize: number = 0;

     add(attr: PointAttribute): void {
       this.attributes.push(attr);
       this.byteSize += attr.byteSize;
     }

     static POSITION_CARTESIAN: PointAttribute = {
       name: 'POSITION_CARTESIAN',
       type: PointAttributeType.FLOAT,
       numElements: 3,
       byteSize: 12,
     };

     static RGBA_PACKED: PointAttribute = {
       name: 'rgba',
       type: PointAttributeType.UINT8,
       numElements: 4,
       byteSize: 4,
     };

     // ... 其他预定义属性
   }
   ```

2. 实现 decoder.worker.ts:
   ```typescript
   self.onmessage = (event) => {
     const { buffer, pointAttributes, numPoints, scale, offset } = event.data;

     try {
       const result = decode(
         buffer,
         pointAttributes,
         numPoints,
         scale,
         offset
       );

       self.postMessage(result, [
         result.position.buffer,
         result.color.buffer,
         // ... 其他 transferables
       ]);
     } catch (error) {
       self.postMessage({ error: error.message });
     }
   };

   function decode(
     buffer: ArrayBuffer,
     pointAttributes: PointAttributes,
     numPoints: number,
     scale: number[],
     offset: number[]
   ) {
     const view = new DataView(buffer);
     const stride = pointAttributes.byteSize;

     // 分配输出 buffers
     const position = new Float32Array(numPoints * 3);
     const color = new Uint8Array(numPoints * 4);
     const intensity = new Uint16Array(numPoints);
     // ... 其他属性

     // 逐点解码
     for (let i = 0; i < numPoints; i++) {
       const pointOffset = i * stride;
       let attributeOffset = 0;

       for (const attr of pointAttributes.attributes) {
         const byteOffset = pointOffset + attributeOffset;

         if (attr.name === 'POSITION_CARTESIAN') {
           // 解码位置（Uint32 → Float32）
           const x = view.getUint32(byteOffset, true);
           const y = view.getUint32(byteOffset + 4, true);
           const z = view.getUint32(byteOffset + 8, true);

           position[i * 3] = x * scale[0] + offset[0];
           position[i * 3 + 1] = y * scale[1] + offset[1];
           position[i * 3 + 2] = z * scale[2] + offset[2];
         } else if (attr.name === 'rgba') {
           // 解码颜色（RGB → RGBA）
           color[i * 4] = view.getUint8(byteOffset);
           color[i * 4 + 1] = view.getUint8(byteOffset + 1);
           color[i * 4 + 2] = view.getUint8(byteOffset + 2);
           color[i * 4 + 3] = 255;
         }
         // ... 其他属性解码

         attributeOffset += attr.byteSize;
       }
     }

     // 计算 tightBoundingBox
     const tightBoundingBox = computeTightBoundingBox(position);

     return {
       position,
       color,
       intensity,
       tightBoundingBox,
     };
   }

   function computeTightBoundingBox(positions: Float32Array) {
     const min = [Infinity, Infinity, Infinity];
     const max = [-Infinity, -Infinity, -Infinity];

     for (let i = 0; i < positions.length; i += 3) {
       min[0] = Math.min(min[0], positions[i]);
       min[1] = Math.min(min[1], positions[i + 1]);
       min[2] = Math.min(min[2], positions[i + 2]);

       max[0] = Math.max(max[0], positions[i]);
       max[1] = Math.max(max[1], positions[i + 1]);
       max[2] = Math.max(max[2], positions[i + 2]);
     }

     return { min, max };
   }
   ```

3. 编写测试:
   - 创建测试数据（模拟 .bin 文件）
   - 测试位置解码
   - 测试颜色解码
   - 测试 tightBoundingBox 计算
   - 测试 Transferable Objects

文件结构:
packages/viewer/src/workers/
├── decoder.worker.ts
├── PointAttributes.ts
├── types.ts
└── __tests__/
    ├── decoder.test.ts
    └── fixtures/
        └── test.bin

请提供完整的代码实现。参考 Potree 的 BinaryDecoderWorker.js 确保属性解码逻辑正确。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/viewer run test -- workers

# 2. 检查覆盖率
pnpm --filter @better-potree/viewer run test:coverage -- workers
```

---

### TASK-203: 实现 TraversalSystem (遍历系统)

**任务 ID**: TASK-203
**依赖**: TASK-108 (SystemScheduler), TASK-113 (OctreeManager)
**预计时间**: 10 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 8.1 节（TraversalSystem）
  - Potree 源码: `D:\coding\libs\potree\src\Potree_update_visibility.js`
- 目标: 实现基于 SSE 的 LOD 遍历系统

#### 输出
- [ ] 创建 `packages/core/src/systems/TraversalSystem.ts`
- [ ] 创建 `packages/core/src/systems/__tests__/TraversalSystem.test.ts`
- [ ] 测试覆盖率 > 75%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的遍历系统。

参考文档:
- architecture-v8.md 第 8.1 节
- Potree 源码: Potree_update_visibility.js

上下文:
- SystemScheduler 已实现 (TASK-108)
- OctreeManager 已实现 (TASK-113)
- Runtime 已实现 (POC 阶段)

任务: 实现 TraversalSystem

要求:
1. 实现 TraversalSystem 类（ISystem 接口）:
   ```typescript
   export class TraversalSystem implements ISystem {
     readonly name = 'TraversalSystem';
     readonly stage = SystemStage.UPDATE;
     readonly priority = 10;

     private priorityQueue: BinaryHeap<OctreeNode>;

     constructor(
       private runtime: Runtime,
       private octreeManager: OctreeManager,
       private camera: Camera
     ) {
       // 初始化优先级队列（基于屏幕投影半径）
       this.priorityQueue = new BinaryHeap((node) => 1 / this.getScreenSize(node));
     }

     update(deltaTime: number): void {
       // 1. 清空之前的可见节点
       this.runtime.visibleNodes.clear();
       this.runtime.visibleNodesList.length = 0;

       // 2. 更新视锥体
       const frustum = new Frustum();
       frustum.setFromProjectionMatrix(
         new Matrix4().multiplyMatrices(
           this.camera.projectionMatrix,
           this.camera.matrixWorldInverse
         )
       );

       // 3. 遍历所有 source 的根节点
       for (const [sourceId, metadata] of this.octreeManager['metadata']) {
         const root = this.octreeManager['roots'].get(sourceId);
         if (!root) continue;

         this.traverseOctree(root, frustum);
       }
     }

     private traverseOctree(root: OctreeNode, frustum: Frustum): void {
       // 重置优先级队列
       this.priorityQueue.clear();
       this.priorityQueue.push(root);

       let loadedPoints = 0;
       const pointBudget = this.runtime.rendering.pointBudget;

       while (this.priorityQueue.size() > 0 && loadedPoints < pointBudget) {
         const node = this.priorityQueue.pop()!;

         // 视锥剔除
         if (!this.isInFrustum(node, frustum)) {
           continue;
         }

         // 计算屏幕投影大小
         const screenSize = this.getScreenSize(node);

         // LOD 判断
         if (screenSize < this.runtime.rendering.minNodeSize || node.isLeaf()) {
           // 标记为可见
           this.runtime.visibleNodes.add(node.id);
           this.runtime.visibleNodesList.push(node.id);

           if (node.loaded) {
             loadedPoints += node.numPoints || 0;
           }
         } else {
           // 继续细分
           for (const child of node.children) {
             if (child) {
               this.priorityQueue.push(child);
             }
           }
         }
       }
     }

     private isInFrustum(node: OctreeNode, frustum: Frustum): boolean {
       const box = new Box3(
         new Vector3(...node.boundingBox.min),
         new Vector3(...node.boundingBox.max)
       );
       return frustum.intersectsBox(box);
     }

     private getScreenSize(node: OctreeNode): number {
       // 计算节点中心到相机的距离
       const center = new Vector3(
         (node.boundingBox.min[0] + node.boundingBox.max[0]) / 2,
         (node.boundingBox.min[1] + node.boundingBox.max[1]) / 2,
         (node.boundingBox.min[2] + node.boundingBox.max[2]) / 2
       );

       const distance = center.distanceTo(this.camera.position);

       // 计算节点半径
       const size = new Vector3(
         node.boundingBox.max[0] - node.boundingBox.min[0],
         node.boundingBox.max[1] - node.boundingBox.min[1],
         node.boundingBox.max[2] - node.boundingBox.min[2]
       );
       const radius = size.length() / 2;

       // SSE 计算（屏幕空间误差）
       const fov = this.runtime.rendering.fov * (Math.PI / 180);
       const slope = Math.tan(fov / 2);
       const projFactor = (0.5 * window.innerHeight) / (slope * distance);

       return radius * projFactor;
     }

     dispose(): void {
       this.priorityQueue.clear();
     }
   }
   ```

2. 实现 BinaryHeap（优先级队列）:
   ```typescript
   class BinaryHeap<T> {
     private items: T[] = [];

     constructor(private scoreFunction: (item: T) => number) {}

     push(item: T): void {
       this.items.push(item);
       this.bubbleUp(this.items.length - 1);
     }

     pop(): T | undefined {
       const result = this.items[0];
       const end = this.items.pop();

       if (this.items.length > 0 && end) {
         this.items[0] = end;
         this.bubbleDown(0);
       }

       return result;
     }

     size(): number {
       return this.items.length;
     }

     clear(): void {
       this.items.length = 0;
     }

     private bubbleUp(index: number): void {
       const item = this.items[index];
       const score = this.scoreFunction(item);

       while (index > 0) {
         const parentIndex = Math.floor((index - 1) / 2);
         const parent = this.items[parentIndex];

         if (score >= this.scoreFunction(parent)) break;

         this.items[index] = parent;
         index = parentIndex;
       }

       this.items[index] = item;
     }

     private bubbleDown(index: number): void {
       const length = this.items.length;
       const item = this.items[index];
       const score = this.scoreFunction(item);

       while (true) {
         const child2Index = (index + 1) * 2;
         const child1Index = child2Index - 1;

         let swapIndex = -1;

         if (child1Index < length) {
           const child1 = this.items[child1Index];
           const child1Score = this.scoreFunction(child1);

           if (child1Score < score) {
             swapIndex = child1Index;
           }
         }

         if (child2Index < length) {
           const child2 = this.items[child2Index];
           const child2Score = this.scoreFunction(child2);

           if (child2Score < (swapIndex === -1 ? score : this.scoreFunction(this.items[swapIndex]))) {
             swapIndex = child2Index;
           }
         }

         if (swapIndex === -1) break;

         this.items[index] = this.items[swapIndex];
         index = swapIndex;
       }

       this.items[index] = item;
     }
   }
   ```

3. 编写测试:
   - 测试视锥剔除逻辑
   - 测试 SSE 计算
   - 测试优先级队列排序
   - 测试点预算限制

文件结构:
packages/core/src/systems/
├── TraversalSystem.ts
├── BinaryHeap.ts
└── __tests__/
    ├── TraversalSystem.test.ts
    └── BinaryHeap.test.ts

请提供完整的代码实现，参考 Potree 的 Potree_update_visibility.js 确保 LOD 算法正确。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- systems

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- systems
```

---

### TASK-204: 实现 StreamingSystem (流式加载系统)

**任务 ID**: TASK-204
**依赖**: TASK-109 (MessageQueue), TASK-110 (WorkerPool), TASK-203 (TraversalSystem)
**预计时间**: 10 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 8.2 节（StreamingSystem）
  - Potree 源码: `D:\coding\libs\potree\src\loader\BinaryLoader.js`
- 目标: 实现异步流式加载系统

#### 输出
- [ ] 创建 `packages/core/src/systems/StreamingSystem.ts`
- [ ] 创建 `packages/core/src/systems/__tests__/StreamingSystem.test.ts`
- [ ] 测试覆盖率 > 70%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的流式加载系统。

参考文档:
- architecture-v8.md 第 8.2 节
- Potree 源码: BinaryLoader.js

上下文:
- MessageQueue 已实现 (TASK-109)
- WorkerPool 已实现 (TASK-110)
- TraversalSystem 已实现 (TASK-203)

任务: 实现 StreamingSystem

要求:
1. 实现 StreamingSystem 类:
   ```typescript
   export class StreamingSystem implements ISystem {
     readonly name = 'StreamingSystem';
     readonly stage = SystemStage.UPDATE;
     readonly priority = 20; // 在 TraversalSystem 之后

     private readonly MAX_CONCURRENT_LOADS = 8;
     private readonly MAX_RETRIES = 3;

     private activeLoads: Map<string, AbortController> = new Map();
     private retryCount: Map<string, number> = new Map();

     constructor(
       private runtime: Runtime,
       private octreeManager: OctreeManager,
       private workerPool: WorkerPool,
       private messageQueue: MessageQueue,
       private baseUrl: string
     ) {}

     update(deltaTime: number): void {
       // 1. 处理消息队列（来自 Worker 的解码结果）
       this.processMessages();

       // 2. 调度新的加载任务
       this.scheduleLoads();

       // 3. 清理不需要的加载任务
       this.cleanupTasks();
     }

     private processMessages(): void {
       this.messageQueue.processMessages(100); // 每帧最多处理 100 条消息
     }

     private scheduleLoads(): void {
       // 获取可见但未加载的节点
       const nodesToLoad: OctreeNode[] = [];

       for (const nodeId of this.runtime.visibleNodesList) {
         const [sourceId, nodeName] = nodeId.split('/');
         const node = this.octreeManager.getNode(sourceId, nodeName);

         if (node && !node.loaded && !node.loading) {
           nodesToLoad.push(node);
         }
       }

       // 按优先级排序（距离相机近的优先）
       nodesToLoad.sort((a, b) => {
         const distA = this.getDistanceToCamera(a);
         const distB = this.getDistanceToCamera(b);
         return distA - distB;
       });

       // 启动加载任务（不超过并发限制）
       const slotsAvailable = this.MAX_CONCURRENT_LOADS - this.activeLoads.size;

       for (let i = 0; i < Math.min(slotsAvailable, nodesToLoad.length); i++) {
         this.startLoad(nodesToLoad[i]);
       }
     }

     private async startLoad(node: OctreeNode): Promise<void> {
       node.loading = true;

       const abortController = new AbortController();
       this.activeLoads.set(node.id, abortController);

       try {
         // 1. 加载 .bin 文件
         const url = `${this.baseUrl}/${node.name}.bin`;
         const response = await fetch(url, { signal: abortController.signal });

         if (!response.ok) {
           throw new Error(`HTTP ${response.status}: ${response.statusText}`);
         }

         const buffer = await response.arrayBuffer();

         // 2. 发送到 Worker 解码
         const metadata = this.octreeManager['metadata'].get(node.sourceId);
         if (!metadata) throw new Error('Metadata not found');

         const result = await this.workerPool.execute({
           buffer,
           pointAttributes: metadata.pointAttributes,
           scale: metadata.scale,
           offset: metadata.offset,
           numPoints: buffer.byteLength / metadata.pointStride,
         }, [buffer]);

         // 3. 发送消息通知加载成功
         this.messageQueue.enqueue({
           type: 'NODE_LOADED',
           nodeId: node.id,
           data: result,
         });

         // 清理
         this.activeLoads.delete(node.id);
         this.retryCount.delete(node.id);

       } catch (error) {
         if (error.name === 'AbortError') {
           // 加载被取消
           node.loading = false;
           this.activeLoads.delete(node.id);
           return;
         }

         // 重试逻辑
         const retries = this.retryCount.get(node.id) || 0;

         if (retries < this.MAX_RETRIES) {
           this.retryCount.set(node.id, retries + 1);
           node.loading = false;
           this.activeLoads.delete(node.id);
           console.warn(`Retrying load for ${node.id} (${retries + 1}/${this.MAX_RETRIES})`);
         } else {
           // 加载失败
           this.messageQueue.enqueue({
             type: 'NODE_FAILED',
             nodeId: node.id,
             error: error as Error,
           });

           node.loading = false;
           this.activeLoads.delete(node.id);
           this.retryCount.delete(node.id);
         }
       }
     }

     private cleanupTasks(): void {
       // 取消不再可见的加载任务
       for (const [nodeId, controller] of this.activeLoads) {
         if (!this.runtime.visibleNodes.has(nodeId)) {
           controller.abort();
           this.activeLoads.delete(nodeId);

           const [sourceId, nodeName] = nodeId.split('/');
           const node = this.octreeManager.getNode(sourceId, nodeName);
           if (node) {
             node.loading = false;
           }
         }
       }
     }

     private getDistanceToCamera(node: OctreeNode): number {
       // 计算节点中心到相机的距离
       const center = new Vector3(
         (node.boundingBox.min[0] + node.boundingBox.max[0]) / 2,
         (node.boundingBox.min[1] + node.boundingBox.max[1]) / 2,
         (node.boundingBox.min[2] + node.boundingBox.max[2]) / 2
       );

       return center.distanceTo(this.runtime.camera.position);
     }

     dispose(): void {
       // 取消所有活动加载
       for (const controller of this.activeLoads.values()) {
         controller.abort();
       }
       this.activeLoads.clear();
       this.retryCount.clear();
     }
   }
   ```

2. 注册消息处理器:
   ```typescript
   // 在初始化时
   messageQueue.on('NODE_LOADED', (msg) => {
     const { nodeId, data } = msg;
     const [sourceId, nodeName] = nodeId.split('/');
     const node = octreeManager.getNode(sourceId, nodeName);

     if (node) {
       node.loaded = true;
       node.loading = false;
       node.numPoints = data.position.length / 3;

       // 存储到 Runtime
       runtime.loadedNodes.set(nodeId, data);

       // 创建 GPU 资源（在 RenderSystem 中处理）
     }
   });

   messageQueue.on('NODE_FAILED', (msg) => {
     const { nodeId, error } = msg;
     console.error(`Failed to load ${nodeId}:`, error);

     const [sourceId, nodeName] = nodeId.split('/');
     const node = octreeManager.getNode(sourceId, nodeName);

     if (node) {
       node.loading = false;
     }
   });
   ```

3. 编写测试:
   - 使用 mock fetch 和 Worker
   - 测试并发加载限制
   - 测试重试逻辑
   - 测试任务取消

文件结构:
packages/core/src/systems/
├── StreamingSystem.ts
└── __tests__/
    └── StreamingSystem.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/core run test -- systems/StreamingSystem

# 2. 检查覆盖率
pnpm --filter @better-potree/core run test:coverage -- systems
```

---

### TASK-205: 实现 PointCloudMaterial (材质系统)

**任务 ID**: TASK-205
**依赖**: 无
**预计时间**: 8 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 11 节（渲染层）
  - Potree 源码: `D:\coding\libs\potree\src\materials\PointCloudMaterial.js`
- 目标: 实现点云材质系统

#### 输出
- [ ] 创建 `packages/rendering-three/src/materials/PointCloudMaterial.ts`
- [ ] 创建 `packages/rendering-three/src/materials/__tests__/PointCloudMaterial.test.ts`
- [ ] 测试覆盖率 > 70%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的材质系统。

参考文档:
- architecture-v8.md 第 11 节
- Potree 源码: PointCloudMaterial.js

任务: 实现 PointCloudMaterial

要求:
1. 实现 PointCloudMaterial 类（继承 RawShaderMaterial）:
   ```typescript
   export class PointCloudMaterial extends RawShaderMaterial {
     constructor() {
       super({
         vertexShader: pointcloudVS,
         fragmentShader: pointcloudFS,
         uniforms: {
           // 相机参数
           uCameraPosition: { value: new Vector3() },
           uProjectionMatrix: { value: new Matrix4() },
           uViewMatrix: { value: new Matrix4() },
           uScreenWidth: { value: window.innerWidth },
           uScreenHeight: { value: window.innerHeight },

           // 点大小
           uPointSize: { value: 1.0 },
           uMinPointSize: { value: 1.0 },
           uMaxPointSize: { value: 50.0 },
           uPointSizeType: { value: 0 }, // 0: FIXED, 1: ATTENUATED, 2: ADAPTIVE

           // 颜色
           uColorType: { value: 0 }, // 0: RGB, 1: ELEVATION, 2: INTENSITY, 3: CLASSIFICATION
           uElevationRange: { value: new Vector2(0, 100) },
           uIntensityRange: { value: new Vector2(0, 65535) },

           // 渐变纹理
           uGradient: { value: null },
           uClassificationLUT: { value: null },

           // 裁剪
           uClipBoxCount: { value: 0 },
           uClipBoxes: { value: [] },
         },
       });

       this.setPointSize(1.0);
       this.setColorType('RGB');
     }

     setPointSize(size: number): void {
       this.uniforms.uPointSize.value = size;
     }

     setPointSizeType(type: 'FIXED' | 'ATTENUATED' | 'ADAPTIVE'): void {
       const typeMap = { FIXED: 0, ATTENUATED: 1, ADAPTIVE: 2 };
       this.uniforms.uPointSizeType.value = typeMap[type];

       // 更新 defines
       this.defines = {
         ...this.defines,
         [type + '_POINT_SIZE']: '',
       };
       this.needsUpdate = true;
     }

     setColorType(type: string): void {
       const typeMap = {
         RGB: 0,
         ELEVATION: 1,
         INTENSITY: 2,
         CLASSIFICATION: 3,
       };

       this.uniforms.uColorType.value = typeMap[type] ?? 0;

       // 更新 defines
       this.defines = {
         ...this.defines,
         ['COLOR_TYPE_' + type]: '',
       };
       this.needsUpdate = true;
     }

     setGradient(texture: Texture): void {
       this.uniforms.uGradient.value = texture;
     }

     setClipBoxes(boxes: Box3[]): void {
       this.uniforms.uClipBoxCount.value = boxes.length;
       this.uniforms.uClipBoxes.value = boxes.map((box) => {
         const matrix = new Matrix4();
         // 计算裁剪盒的变换矩阵
         return matrix;
       });
     }

     updateCamera(camera: Camera): void {
       this.uniforms.uCameraPosition.value.copy(camera.position);
       this.uniforms.uProjectionMatrix.value.copy(camera.projectionMatrix);
       this.uniforms.uViewMatrix.value.copy(camera.matrixWorldInverse);
     }

     updateScreen(width: number, height: number): void {
       this.uniforms.uScreenWidth.value = width;
       this.uniforms.uScreenHeight.value = height;
     }
   }
   ```

2. 编写测试:
   - 测试材质初始化
   - 测试 uniform 更新
   - 测试 defines 更新

文件结构:
packages/rendering-three/src/materials/
├── PointCloudMaterial.ts
└── __tests__/
    └── PointCloudMaterial.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/rendering-three run test -- materials

# 2. 检查覆盖率
pnpm --filter @better-potree/rendering-three run test:coverage
```

---

### TASK-206: 实现点云着色器 (Shaders)

**任务 ID**: TASK-206
**依赖**: TASK-205
**预计时间**: 12 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - Potree 源码: `D:\coding\libs\potree\src\materials\shaders\pointcloud.vs`
  - Potree 源码: `D:\coding\libs\potree\src\materials\shaders\pointcloud.fs`
- 目标: 实现点云顶点和片元着色器

#### 输出
- [ ] 创建 `packages/rendering-three/src/shaders/pointcloud.vs.glsl`
- [ ] 创建 `packages/rendering-three/src/shaders/pointcloud.fs.glsl`
- [ ] 创建 `packages/rendering-three/src/shaders/index.ts` (导出)

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的着色器。

参考文档:
- Potree 源码: pointcloud.vs, pointcloud.fs

任务: 实现点云着色器

要求:
1. 实现 pointcloud.vs.glsl（顶点着色器）:
   - 参考 Potree 的实现
   - 支持 FIXED/ATTENUATED/ADAPTIVE 点大小
   - 支持 RGB/ELEVATION/INTENSITY/CLASSIFICATION 颜色模式
   - 支持裁剪盒裁剪

2. 实现 pointcloud.fs.glsl（片元着色器）:
   - 参考 Potree 的实现
   - 支持 CIRCLE/SQUARE 点形状
   - 支持深度输出

3. 导出为 TypeScript 字符串:
   ```typescript
   export const pointcloudVS = `
   #version 300 es
   precision highp float;

   // ... GLSL 代码
   `;

   export const pointcloudFS = `
   #version 300 es
   precision highp float;

   // ... GLSL 代码
   `;
   ```

文件结构:
packages/rendering-three/src/shaders/
├── pointcloud.vs.glsl
├── pointcloud.fs.glsl
└── index.ts

请提供完整的 GLSL 代码，严格参考 Potree 的实现以确保正确性。
```

#### 验证方法
```bash
# 1. 类型检查
pnpm --filter @better-potree/rendering-three run typecheck

# 2. 构建
pnpm --filter @better-potree/rendering-three run build

# 3. 在 playground 中测试渲染
pnpm --filter @better-potree/playground run dev
```

---

### TASK-207: 实现 RenderSystem (渲染系统)

**任务 ID**: TASK-207
**依赖**: TASK-205 (PointCloudMaterial), TASK-206 (Shaders)
**预计时间**: 10 小时
**优先级**: P0

#### 上下文
- 阅读文件:
  - `architecture-v8.md` 第 8.3 节（RenderSystem）
  - Potree 源码: `D:\coding\libs\potree\src\PotreeRenderer.js`
- 目标: 实现渲染系统

#### 输出
- [ ] 创建 `packages/rendering-three/src/systems/RenderSystem.ts`
- [ ] 创建 `packages/rendering-three/src/systems/__tests__/RenderSystem.test.ts`
- [ ] 测试覆盖率 > 60%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的渲染系统。

参考文档:
- architecture-v8.md 第 8.3 节
- Potree 源码: PotreeRenderer.js

上下文:
- PointCloudMaterial 已实现 (TASK-205)
- 着色器已实现 (TASK-206)

任务: 实现 RenderSystem

要求:
1. 实现 RenderSystem 类:
   ```typescript
   export class RenderSystem implements ISystem {
     readonly name = 'RenderSystem';
     readonly stage = SystemStage.RENDER;
     readonly priority = 0;

     private material: PointCloudMaterial;
     private geometries: Map<string, BufferGeometry> = new Map();

     constructor(
       private runtime: Runtime,
       private renderer: WebGLRenderer,
       private scene: Scene,
       private camera: Camera
     ) {
       this.material = new PointCloudMaterial();
     }

     update(deltaTime: number): void {
       // 1. 更新材质参数
       this.material.updateCamera(this.camera);
       this.material.updateScreen(window.innerWidth, window.innerHeight);
       this.material.setPointSize(this.runtime.rendering.pointSize);

       // 2. 同步 GPU 资源
       this.syncGPUResources();

       // 3. 渲染所有可见节点
       this.renderNodes();
     }

     private syncGPUResources(): void {
       // 为新加载的节点创建几何体
       for (const nodeId of this.runtime.visibleNodesList) {
         if (!this.geometries.has(nodeId)) {
           const nodeData = this.runtime.loadedNodes.get(nodeId);
           if (nodeData) {
             const geometry = this.createGeometry(nodeData);
             this.geometries.set(nodeId, geometry);
           }
         }
       }

       // 清理不再可见的几何体
       for (const [nodeId, geometry] of this.geometries) {
         if (!this.runtime.visibleNodes.has(nodeId)) {
           geometry.dispose();
           this.geometries.delete(nodeId);
         }
       }
     }

     private createGeometry(nodeData: NodeData): BufferGeometry {
       const geometry = new BufferGeometry();

       geometry.setAttribute(
         'position',
         new BufferAttribute(nodeData.position, 3)
       );

       geometry.setAttribute(
         'color',
         new BufferAttribute(nodeData.color, 4, true)
       );

       if (nodeData.intensity) {
         geometry.setAttribute(
           'intensity',
           new BufferAttribute(nodeData.intensity, 1)
         );
       }

       return geometry;
     }

     private renderNodes(): void {
       for (const nodeId of this.runtime.visibleNodesList) {
         const geometry = this.geometries.get(nodeId);
         if (!geometry) continue;

         // 更新模型矩阵
         const [sourceId] = nodeId.split('/');
         const transform = this.getSourceTransform(sourceId);

         this.material.uniforms.uModelMatrix.value = transform;

         // 渲染
         this.renderer.render(
           this.createPointsMesh(geometry),
           this.camera
         );
       }
     }

     private createPointsMesh(geometry: BufferGeometry): Points {
       return new Points(geometry, this.material);
     }

     private getSourceTransform(sourceId: string): Matrix4 {
       // 获取数据源的变换矩阵
       return new Matrix4(); // TODO: 从 ConfigStore 获取
     }

     dispose(): void {
       // 清理所有几何体
       for (const geometry of this.geometries.values()) {
         geometry.dispose();
       }
       this.geometries.clear();

       this.material.dispose();
     }
   }
   ```

2. 编写测试:
   - 测试几何体创建
   - 测试 GPU 资源同步
   - 使用 mock 测试渲染流程

文件结构:
packages/rendering-three/src/systems/
├── RenderSystem.ts
└── __tests__/
    └── RenderSystem.test.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/rendering-three run test -- systems

# 2. 在 playground 中测试
pnpm --filter @better-potree/playground run dev
```

---

### TASK-208: 集成所有系统到 Viewer

**任务 ID**: TASK-208
**依赖**: TASK-203, TASK-204, TASK-207
**预计时间**: 6 小时
**优先级**: P0

#### 输出
- [ ] 创建 `packages/viewer/src/PointCloudViewer.ts`
- [ ] 创建示例: `packages/playground/src/basic-example.ts`
- [ ] 测试覆盖率 > 60%

#### LLM Prompt 模板
```
我正在开发 better-potree 项目的主查看器类。

任务: 集成所有系统到 PointCloudViewer

要求:
1. 实现 PointCloudViewer 类:
   ```typescript
   export class PointCloudViewer {
     private scene: Scene;
     private camera: PerspectiveCamera;
     private renderer: WebGLRenderer;
     private scheduler: SystemScheduler;
     private runtime: Runtime;
     private configStore: ConfigStore;
     private stateCoordinator: StateCoordinator;

     constructor(container: HTMLElement) {
       // 1. 初始化 Three.js
       this.scene = new Scene();
       this.camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
       this.renderer = new WebGLRenderer({ antialias: true });
       this.renderer.setSize(window.innerWidth, window.innerHeight);
       container.appendChild(this.renderer.domElement);

       // 2. 初始化状态管理
       this.configStore = createConfigStore();
       this.runtime = new Runtime(this.camera);

       // 3. 初始化基础设施
       const workerPool = new WorkerPool('/decoder.worker.js');
       const resourceManager = new ResourceManager(
         512 * 1024 * 1024, // 512MB GPU 内存
         10000 // 最多 10000 个节点
       );
       const messageQueue = new MessageQueue();
       const octreeManager = new OctreeManager(ecs);

       // 4. 初始化系统
       this.scheduler = new SystemScheduler();

       const traversalSystem = new TraversalSystem(
         this.runtime,
         octreeManager,
         this.camera
       );

       const streamingSystem = new StreamingSystem(
         this.runtime,
         octreeManager,
         workerPool,
         messageQueue,
         '/data' // 基础 URL
       );

       const renderSystem = new RenderSystem(
         this.runtime,
         this.renderer,
         this.scene,
         this.camera
       );

       this.scheduler.addSystem(traversalSystem);
       this.scheduler.addSystem(streamingSystem);
       this.scheduler.addSystem(renderSystem);

       // 5. 初始化状态协调器
       this.stateCoordinator = new StateCoordinator(
         this.configStore,
         this.runtime,
         octreeManager,
         resourceManager,
         ecs
       );

       this.stateCoordinator.initialSync();
       this.stateCoordinator.setupSubscriptions();

       // 6. 启动渲染循环
       this.animate();
     }

     async loadPointCloud(url: string): Promise<void> {
       const loader = new PotreeLoader();
       const metadata = await loader.load(url);

       this.configStore.getState().addSource({
         id: 'pointcloud-1',
         type: 'potree',
         url,
         visible: true,
       });
     }

     private animate = (): void => {
       requestAnimationFrame(this.animate);

       const deltaTime = 0.016; // 假设 60 FPS
       this.scheduler.update(deltaTime);

       // renderer.render() 在 RenderSystem 中调用
     };

     dispose(): void {
       this.scheduler.dispose();
       this.stateCoordinator.dispose();
       this.renderer.dispose();
     }
   }
   ```

2. 创建基础示例:
   ```typescript
   // packages/playground/src/basic-example.ts
   import { PointCloudViewer } from '@better-potree/viewer';

   const container = document.getElementById('app')!;
   const viewer = new PointCloudViewer(container);

   viewer.loadPointCloud('/data/pointcloud');
   ```

文件结构:
packages/viewer/src/
├── PointCloudViewer.ts
└── __tests__/
    └── PointCloudViewer.test.ts

packages/playground/src/
└── basic-example.ts

请提供完整的代码实现。
```

#### 验证方法
```bash
# 1. 运行测试
pnpm --filter @better-potree/viewer run test

# 2. 启动 playground
pnpm --filter @better-potree/playground run dev

# 3. 在浏览器中验证点云加载和渲染
```

---

### TASK-209 ~ TASK-215: 后续任务

由于篇幅限制，后续任务概要：

- **TASK-209**: 实现相机控制器（EarthControls）
- **TASK-210**: 实现测量工具（距离、面积、角度）
- **TASK-211**: 实现裁剪工具（ClipBox、ClipSphere）
- **TASK-212**: 实现 EDL（Eye-Dome Lighting）渲染
- **TASK-213**: 实现侧边栏 UI（lil-gui 集成）
- **TASK-214**: 实现 Minimap（小地图）
- **TASK-215**: Phase 2 完成检查

---

## 🚀 Phase 3: 性能优化与完善 (5天 / 10个任务)

### TASK-301: 性能分析和基准测试框架

**任务 ID**: TASK-301
**依赖**: TASK-215 (Phase 2 完成)
**预计时间**: 4 小时
**优先级**: P1

#### 目标
建立性能基准测试框架，为后续优化提供数据支撑

#### 输出
- [ ] 创建 `packages/core/src/benchmarks/` 目录
- [ ] 实现基准测试工具（使用 Vitest bench）
- [ ] 创建性能报告生成器

---

### TASK-302: LOD 算法性能优化

**任务 ID**: TASK-302
**依赖**: TASK-301
**预计时间**: 6 小时
**优先级**: P1

#### 目标
优化 TraversalSystem 的 LOD 选择算法

#### 关键优化点
- 优先级队列性能优化
- 视锥剔除优化（空间索引）
- SSE 计算缓存

---

### TASK-303: 渲染性能优化

**任务 ID**: TASK-303
**依赖**: TASK-301
**预计时间**: 8 小时
**优先级**: P1

#### 目标
优化 RenderSystem 的渲染性能

#### 关键优化点
- 批量渲染（合并 draw call）
- Uniform 状态缓存
- 几何体复用（对象池）
- Frustum culling 优化

---

### TASK-304: Worker 性能优化

**任务 ID**: TASK-304
**依赖**: TASK-301
**预计时间**: 4 小时
**优先级**: P1

#### 目标
优化 Worker 解码性能

#### 关键优化点
- SIMD 优化（如果可用）
- SharedArrayBuffer（如果可用）
- 属性解码并行化

---

### TASK-305: 内存管理优化

**任务 ID**: TASK-305
**依赖**: TASK-301
**预计时间**: 6 小时
**优先级**: P1

#### 目标
优化 ResourceManager 和 LRU 缓存

#### 关键优化点
- LRU 驱逐策略优化
- GPU 内存监控
- 自动降级（超出预算时）

---

### TASK-306: 编写完整的 API 文档

**任务 ID**: TASK-306
**依赖**: TASK-215
**预计时间**: 6 小时
**优先级**: P2

#### 输出
- [ ] 使用 TypeDoc 生成 API 文档
- [ ] 编写用户指南
- [ ] 创建示例库

---

### TASK-307: 编写单元测试补充

**任务 ID**: TASK-307
**依赖**: TASK-215
**预计时间**: 8 小时
**优先级**: P1

#### 目标
提升测试覆盖率到 80% 以上

#### 输出
- [ ] 补充核心模块测试
- [ ] 补充边缘用例测试
- [ ] 补充集成测试

---

### TASK-308: 浏览器兼容性测试

**任务 ID**: TASK-308
**依赖**: TASK-215
**预计时间**: 4 小时
**优先级**: P2

#### 目标
确保在主流浏览器上正常运行

#### 测试浏览器
- Chrome/Edge (Chromium)
- Firefox
- Safari

---

### TASK-309: 创建完整的示例集

**任务 ID**: TASK-309
**依赖**: TASK-215
**预计时间**: 6 小时
**优先级**: P2

#### 输出
- [ ] 基础加载示例
- [ ] 多数据源示例
- [ ] 测量工具示例
- [ ] 裁剪工具示例
- [ ] 自定义材质示例

---

### TASK-310: Phase 3 完成检查和项目交付

**任务 ID**: TASK-310
**依赖**: TASK-301 ~ TASK-309
**预计时间**: 4 小时
**优先级**: P0

#### 退出标准
- ✅ 所有测试通过（覆盖率 > 80%）
- ✅ 性能基准测试通过
- ✅ API 文档完整
- ✅ 示例完整
- ✅ README 完整
- ✅ 浏览器兼容性验证通过

#### 输出
- [ ] 创建 `dev_docs/phase3-report.md`
- [ ] 创建 `CHANGELOG.md`
- [ ] 准备发布 v1.0.0

---

## 📊 完整任务统计

### Phase 1 Week 2 (TASK-108 ~ TASK-115)
- **任务数**: 8 个（跳过已完成的 TASK-106/107）
- **预计时间**: 4 天
- **核心内容**: 基础设施层（Scheduler, MessageQueue, WorkerPool, ResourceManager, ECS, Octree, ObjectPools）

### Phase 2 (TASK-201 ~ TASK-215)
- **任务数**: 15 个
- **预计时间**: 10 天
- **核心内容**: 核心系统层（数据加载、遍历、流式加载、渲染、工具、UI）

### Phase 3 (TASK-301 ~ TASK-310)
- **任务数**: 10 个
- **预计时间**: 5 天
- **核心内容**: 性能优化、文档、测试、发布

### 总计
- **总任务数**: 33 个任务
- **总预计时间**: 19 天（约 4 周）
- **总测试覆盖目标**: > 80%

---

## 🔄 任务依赖关系图

```
Phase 1 Week 2 (基础设施层)
├── TASK-108: SystemScheduler
├── TASK-109: MessageQueue
├── TASK-110: WorkerPool
├── TASK-111: ResourceManager
├── TASK-112: ECS
├── TASK-113: OctreeManager
├── TASK-114: ObjectPools
└── TASK-115: Phase 1 Week 2 完成检查

Phase 2 (核心系统层)
├── TASK-201: PotreeLoader ← TASK-113
├── TASK-202: BinaryDecoder Worker ← TASK-110
├── TASK-203: TraversalSystem ← TASK-108, TASK-113
├── TASK-204: StreamingSystem ← TASK-109, TASK-110, TASK-203
├── TASK-205: PointCloudMaterial
├── TASK-206: Shaders ← TASK-205
├── TASK-207: RenderSystem ← TASK-205, TASK-206
├── TASK-208: PointCloudViewer 集成 ← TASK-203, TASK-204, TASK-207
├── TASK-209 ~ TASK-214: 工具和 UI
└── TASK-215: Phase 2 完成检查

Phase 3 (优化与完善)
├── TASK-301: 基准测试框架 ← TASK-215
├── TASK-302 ~ TASK-305: 性能优化 ← TASK-301
├── TASK-306 ~ TASK-309: 文档和测试 ← TASK-215
└── TASK-310: 项目交付 ← 所有任务
```

---

## 📝 使用指南

### 对于 LLM

1. **按顺序执行任务**: 严格按照依赖关系执行
2. **使用提供的 Prompt**: 每个任务都有详细的 LLM Prompt 模板
3. **参考 Potree 源码**: 关键算法必须参考 Potree 实现
4. **运行验证方法**: 每个任务完成后运行验证命令
5. **更新进度**: 在 `dev_docs/progress.md` 中记录完成情况

### 对于开发者

1. **选择任务**: 从当前可执行的任务中选择（检查依赖）
2. **阅读上下文**: 理解任务背景和参考文档
3. **复制 Prompt**: 将 LLM Prompt 模板提供给 AI
4. **Code Review**: 审查 AI 生成的代码
5. **运行测试**: 执行验证方法
6. **标记完成**: 任务通过后继续下一个

---

## 🎯 关键里程碑

1. **Phase 1 Week 2 完成** (Day 4)
   - 所有基础设施就绪
   - 测试覆盖率 > 80%

2. **Phase 2 Week 1 完成** (Day 9)
   - 数据加载和遍历系统就绪
   - 基础渲染可用

3. **Phase 2 完成** (Day 14)
   - 完整功能实现
   - 工具和 UI 可用

4. **Phase 3 完成** (Day 19)
   - 性能优化完成
   - 文档和测试完善
   - 准备发布

---

**文档版本**: v2.0-extension（完整版）
**最后更新**: 2025-11-16
**维护者**: better-potree team
**状态**: ✅ 完整补充完成
