# `architecture-v8.md` 评审说明

- `dev_docs/architecture-v8.md:80-88` 与 `dev_docs/architecture-v8.md:323-330` 中的 `SourceConfig` 定义彼此冲突：前者要求 `visible` 必填并允许 `transform` 直接是 `Matrix4`，后者让 `visible` 可选且 `transform` 变成 `number[]`。引擎到底接收哪一种结构并不清楚，导致 StateCoordinator、加载器和 API 调用方无法判定应遵循哪种格式。
- `dev_docs/architecture-v8.md:522-531` 表明 `StateCoordinator` 构造函数需要 `ResourceManager` 与 `ECSWorld`，但 §11.1 初始化流程（`dev_docs/architecture-v8.md:1820-1826`）只传入 `(store, runtime, octree)`。文档没有交代新增依赖如何提供，意味着 GPU 资源释放与 ECS 实体清理在当前流程下无法真正执行。
- Config 中的相机设置没有订阅入口：`setupSubscriptions` 只监听 `sources` 与 `rendering`（`dev_docs/architecture-v8.md:546-558`），尽管状态模型声明了 `camera` 且存在 `syncCamera` 方法（`dev_docs/architecture-v8.md:681-684`）。因此配置层的相机修改永远不会同步到 Runtime，这与“Config 是唯一真相来源”的原则矛盾。
- 渲染配置/API 描述不一致：
  - `RenderingConfig` 含有 `fov`（`dev_docs/architecture-v8.md:339-343`），但 `syncRenderingConfig` 只同步 `pointBudget` 与 `minNodeSize`（`dev_docs/architecture-v8.md:676-679`），FOV 的更改会被静默丢弃。
  - 公共 API 宣称存在 `engine.setPointSize(...)`（`dev_docs/architecture-v8.md:1984-1986`），然而无论 Config 还是 Runtime 都没有 `pointSize` 字段，读者无法判断这个调用会修改哪块状态。
- `OctreeMetadata` 接口要求 `sourceId` 非空（`dev_docs/architecture-v8.md:811-819`），但两种元数据加载器都返回 `sourceId: ''`，且 `loadOctree` 没有在创建根节点前修正它（`dev_docs/architecture-v8.md:831-838`, `dev_docs/architecture-v8.md:926-947`）。任何读取 `metadata.sourceId` 的逻辑都会得到空字符串，接口约定与实现相矛盾。
- 第 8 节声称提供 StreamingSystem 细节，却只有一个标题并让读者跳到第 9 节（`dev_docs/architecture-v8.md:1373-1375`）。第 9 节实际上只描述 `MessageQueue`、`WorkerPool` 等基础设施（`dev_docs/architecture-v8.md:1385-1434`），完全没有 StreamingSystem 的阶段、输入或输出，导致关键系统的行为空缺。
- 包划分与路线图互相冲突：§13.2.2 明确把 `RenderSystem` 放在 `@better-potree/rendering`（`dev_docs/architecture-v8.md:2067-2076`），但 Phase 2 任务依旧要求“实现 `RenderSystem` (`@better-potree/core/systems`)”（`dev_docs/architecture-v8.md:2240-2277`）。贡献者无法确定渲染系统究竟属于哪个包。

## 复核记录（2025-11-16）

### ✅ 已修复问题

1. **SourceConfig 冲突** - 已统一为 `visible?: boolean` 和 `transform?: number[]`
2. **StateCoordinator 构造签名** - 已更新初始化流程图，包含所有 5 个依赖参数
3. **相机配置订阅** - 已在 `setupSubscriptions` 中添加 camera 订阅
4. **渲染配置同步** - 已添加 `fov` 和 `pointSize` 字段及完整同步逻辑
5. **OctreeMetadata.sourceId** - 已在 `loadOctree` 中添加 `metadata.sourceId = sourceId` 赋值
6. **StreamingSystem 详细内容** - 已补充完整的 200+ 行实现代码
7. **包划分冲突** - 已明确 RenderSystem 在 `@better-potree/rendering` (抽象)和 `@better-potree/rendering-three` (实现)

所有问题已在 2025-11-16 修复完成。
