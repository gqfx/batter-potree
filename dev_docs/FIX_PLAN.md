# Better Potree 修复与开发计划

基于对代码库的深度分析，以下是针对当前问题的详细修复计划和 TODO 列表。

## 🚨 优先级 1: 核心渲染修复 (Critical Rendering Fixes)

目前 Playground 无法渲染点云，这是首要解决的问题。

- [ ] **解决 `IRenderer` 接口不匹配问题**
    - **问题**: `Viewer.ts` 调用 `renderer.render(scene, camera)`，但 `IRenderer` 接口定义的是 `render(buffer, material, matrix)`。
    - **方案**: 修改 `packages/rendering/src/interfaces/IRenderer.ts`，添加支持场景渲染的高级接口，或者在 `Viewer` 中遍历场景手动调用低级渲染接口（不推荐，因为 Three.js 擅长处理场景图）。
    - **建议修改**:
      ```typescript
      // IRenderer.ts
      render(scene: IScene, camera: Camera): void;
      ```
- [ ] **实现 `ThreeJsRenderer.render`**
    - **问题**: `ThreeJsRenderer.ts` 中的 `render` 方法目前为空实现。
    - **任务**:
        - 移除 `renderScene` (Legacy) 方法。
        - 在 `render` 方法中调用 `this.renderer.render(threeScene, camera)`。
        - 确保 `IScene` 能正确获取底层的 `THREE.Scene`。
- [ ] **验证 Playground 渲染**
    - 修复上述问题后，运行 Playground，确保能看到点云数据。

## ⚡ 优先级 2: 性能优化 (Performance)

解决主线程卡顿和渲染效率问题。

- [ ] **实现 Worker 解码 (`StreamingSystem`)**
    - **问题**: `StreamingSystem.ts` 目前在主线程进行数据解码，导致加载大模型时 UI 卡顿。
    - **任务**:
        - 完善 `packages/core/src/workers/` 下的解码 Worker。
        - 在 `StreamingSystem` 中集成 `WorkerPool`。
        - 将 `decodeNodeData` 逻辑移至 Worker 执行。
        - 使用 `Transferable Objects` 传输二进制数据。
- [ ] **实现 GPU 可见性剔除**
    - **问题**: `Viewer.ts` 中存在 TODO `implement updateVisibilityTexture on octree`。
    - **任务**:
        - 在 `PointCloudOctree` 中维护一个可见性纹理。
        - 在 Shader 中读取该纹理以在 GPU 端剔除节点。

## 🛠 优先级 3: 功能补全 (Feature Completion)

完善 `ViewerAPI` 以支持更多交互功能。

- [ ] **完善 `ViewerAPI` 方法**
    - `setPointShape` / `setPointSizeType`: 实现点云形状和大小模式切换。
    - `setPointQuality`: 实现高质量/快速渲染切换。
    - `addClipVolume` / `removeClipVolume`: 实现裁剪体功能（需要 Shader 支持）。
    - `moveCameraTo`: 实现带动画的相机移动（使用 `tween.js` 或类似库）。
- [ ] **完善 `ThreeJsRenderer` 功能**
    - 实现 `IBuffer` 和 `IMaterial` 到 Three.js `BufferGeometry` 和 `ShaderMaterial` 的完整映射（如果计划长期支持非 Three.js 渲染后端）。

## 🧹 优先级 4: 代码质量与维护 (Maintenance)

- [ ] **解决 Lint 警告**
    - 运行 `pnpm lint` 并修复 300+ 警告，主要是未使用的变量和类型定义问题。
- [ ] **统一类型定义**
    - 检查 `packages/types`，确保所有包使用统一的类型定义，减少 `any` 的使用。

## 📝 开发文档更新

- [ ] 更新 `README.md`，反映当前的开发状态和已知问题。
- [ ] 编写 `CONTRIBUTING.md`，指导新贡献者如何运行和调试。
