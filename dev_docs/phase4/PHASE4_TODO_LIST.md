# Better Potree - 第四阶段详细 TODO 清单

## 文档信息
- **创建日期**: 2025-11-17
- **测试数据路径**: `D:\3d_models\pointcloud\inchurch_colorized_las_converted`
- **目标**: 实现完整的点云加载和渲染管道

---

## 📋 总览

### 优先级说明
- **P0**: 立即执行（阻塞性问题，不完成无法正常运行）
- **P1**: 核心功能（功能缺失，影响用户体验）
- **P2**: 重要优化（性能和稳定性优化）
- **P3**: 增强功能（可选，提升用户体验）

### 时间估算
- **P0**: 7-8 天
- **P1**: 9.5-10.5 天
- **P2**: 6 天
- **P3**: 5.5 天（可选）
- **总计**: 28-30 天（不含 P3）

---

## 🔴 P0 - 立即执行（关键阻塞项）

### P0.1 实现 Viewer.load() 方法 ⭐⭐⭐
**预估时间**: 1 天
**文件**: `packages/viewer/src/Viewer.ts`

#### 任务描述
实现 `Viewer.load()` 方法，使其能够加载点云并启动渲染管道。

#### 实施步骤
- [ ] 1.1 使用 PotreeLoader 加载元数据
- [ ] 1.2 创建 PointCloudOctree 实体（ECS）
- [ ] 1.3 初始化根节点
- [ ] 1.4 将八叉树添加到 StreamingSystem
- [ ] 1.5 连接到 ThreeRenderSystem
- [ ] 1.6 返回 IPointCloudOctree 接口

#### 验收标准
```typescript
const octree = await viewer.load('D:/3d_models/pointcloud/inchurch_colorized_las_converted/cloud.js');
// ✅ 元数据加载成功
// ✅ 根节点显示
// ✅ 返回有效的 octree 对象
```

#### 参考代码
```typescript
async load(url: string, name?: string): Promise<IPointCloudOctree> {
  // 1. 加载元数据
  const octree = await this.loader.load(url);

  // 2. 创建根节点可视化
  const rootNode = this.createOctreeNode(octree);
  this.scene.add(rootNode);

  // 3. 启动 StreamingSystem
  this.streamingSystem.addOctree(octree);

  // 4. 连接到渲染系统
  this.renderSystem.addOctree(octree);

  return octree;
}
```

---

### P0.2 集成 StreamingSystem 到 Viewer ⭐⭐⭐
**预估时间**: 1-2 天
**文件**: `packages/viewer/src/Viewer.ts`

#### 任务描述
将 StreamingSystem 集成到 Viewer 的渲染循环中，实现自动流式加载。

#### 实施步骤
- [ ] 2.1 在 Viewer 构造函数中创建 StreamingSystem
- [ ] 2.2 将 StreamingSystem 添加到 SystemScheduler
- [ ] 2.3 在渲染循环中调用 `streamingSystem.update(runtime)`
- [ ] 2.4 订阅节点加载完成事件
- [ ] 2.5 将加载的节点数据传递给渲染系统
- [ ] 2.6 测试流式加载是否正常工作

#### 验收标准
- ✅ StreamingSystem 在每帧更新
- ✅ 可见节点自动加载
- ✅ 节点加载完成后触发渲染更新

---

### P0.3 创建 PointCloudScene 对象 ⭐⭐⭐
**预估时间**: 1-2 天
**文件**: `packages/rendering-three/src/PointCloudScene.ts`（新建）

#### 任务描述
创建一个 Three.js 场景对象来管理所有加载的点云节点。

#### 实施步骤
- [ ] 3.1 创建 PointCloudScene 类（继承 THREE.Group）
- [ ] 3.2 实现 `addNode(nodeId, geometry)` 方法
- [ ] 3.3 实现 `removeNode(nodeId)` 方法
- [ ] 3.4 实现 `updateMaterial(material)` 方法
- [ ] 3.5 实现 `updateVisibility(visibleNodes)` 方法
- [ ] 3.6 实现 `onBeforeRender` 机制自动更新 uniform
- [ ] 3.7 集成到 Viewer

#### 接口定义
```typescript
class PointCloudScene extends THREE.Group {
  addNode(nodeId: string, geometry: THREE.BufferGeometry): void;
  removeNode(nodeId: string): void;
  updateMaterial(material: PointCloudMaterial): void;
  updateVisibility(visibleNodes: Set<string>): void;
  dispose(): void;
}
```

#### 验收标准
- ✅ 可以动态添加/移除节点
- ✅ 统一材质管理
- ✅ 自动更新节点级别 uniform

---

### P0.4 实现可见性纹理生成 ⭐⭐⭐
**预估时间**: 2-3 天
**文件**: `packages/core/src/octree/VisibilityTexture.ts`（新建）

#### 任务描述
实现可见性纹理，用于 GPU 加速 LOD 遍历。

#### 实施步骤
- [ ] 4.1 创建 VisibilityTexture 类
- [ ] 4.2 实现 `computeVisibilityTextureData()` 方法
- [ ] 4.3 将节点层级关系编码到 RGBA 纹理
- [ ] 4.4 每个节点占 5 个像素（8 个子节点 + 节点信息）
- [ ] 4.5 集成到 PointCloudOctree
- [ ] 4.6 添加到渲染材质 uniform
- [ ] 4.7 测试纹理生成正确性

#### 参考算法
```typescript
computeVisibilityTextureData(visibleNodes: OctreeNode[]): Uint8Array {
  const data = new Uint8Array(visibleNodes.length * 5 * 4);

  for (let i = 0; i < visibleNodes.length; i++) {
    const node = visibleNodes[i];

    // 编码 8 个子节点的 vnStart 索引（4 个像素）
    for (let j = 0; j < 8; j++) {
      const child = node.children[j];
      if (child) {
        const vnStart = child.vnStart;
        data[offset++] = (vnStart >> 0) & 0xFF;
        data[offset++] = (vnStart >> 8) & 0xFF;
      }
    }

    // 编码节点级别（1 个像素）
    data[offset++] = node.level;
  }

  return data;
}
```

#### 验收标准
- ✅ 纹理正确生成
- ✅ 子节点索引正确编码
- ✅ 着色器可以正确解码

---

### P0.5 实现 GPU LOD 遍历 ⭐⭐⭐
**预估时间**: 3 天
**文件**: `packages/rendering-three/src/shaders/pointcloud.vert.glsl`

#### 任务描述
在顶点着色器中实现 GPU 八叉树遍历，实现自适应点大小。

#### 实施步骤
- [ ] 5.1 添加可见性纹理 uniform
- [ ] 5.2 实现 `getLOD()` 函数
- [ ] 5.3 遍历八叉树直到找到当前点所在的叶节点
- [ ] 5.4 实现 `getPointSizeAttenuation()` 函数
- [ ] 5.5 基于 LOD 深度计算点大小衰减
- [ ] 5.6 集成到主着色器
- [ ] 5.7 测试点大小是否随距离正确变化

#### 参考着色器代码
```glsl
uniform sampler2D visibilityTexture;
uniform float uVNStart;
uniform float uLevel;
uniform float uOctreeSize;

float getLOD() {
  vec3 offset = vec3(0.0);
  int iOffset = int(uVNStart);
  float depth = uLevel;

  // 遍历八叉树
  for (float i = 0.0; i <= 30.0; i++) {
    float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel);
    vec3 index3d = (position - offset) / nodeSizeAtLevel;
    ivec3 iIndex = ivec3(index3d);
    int childIndex = iIndex.x + iIndex.y * 2 + iIndex.z * 4;

    // 查询可见性纹理
    int index = iOffset + childIndex;
    vec2 texCoord = vec2(
      float(index % visibilityTextureWidth),
      float(index / visibilityTextureWidth)
    ) / vec2(visibilityTextureWidth, visibilityTextureHeight);

    vec4 visibility = texture2D(visibilityTexture, texCoord);
    float nextVNStart = visibility.r * 255.0 + visibility.g * 255.0 * 256.0;

    if (nextVNStart == 0.0) break;

    iOffset = int(nextVNStart);
    offset = offset + vec3(iIndex) * nodeSizeAtLevel;
    depth++;
  }

  return depth;
}

float getPointSizeAttenuation() {
  float lod = getLOD();
  float lodLevel = uLevel + lod;
  float attenuation = pow(2.0, lodLevel);

  return attenuation * uPointSize;
}
```

#### 验收标准
- ✅ 点大小随相机距离正确衰减
- ✅ LOD 深度计算正确
- ⏸️ 性能测试（暂时忽略）

---

### P0.6 实现优先级队列遍历 ⭐⭐⭐
**预估时间**: 2 天
**文件**: `packages/core/src/systems/TraversalSystem.ts`

#### 任务描述
将深度优先遍历替换为优先级队列遍历，确保总是先处理最重要的节点。

#### 实施步骤
- [ ] 6.1 引入 BinaryHeap 数据结构（或使用第三方库）
- [ ] 6.2 重构 `traverse()` 方法使用优先级队列
- [ ] 6.3 实现 `computeWeight()` 方法计算节点权重
- [ ] 6.4 根据权重排序处理节点
- [ ] 6.5 添加点预算控制
- [ ] 6.6 性能对比测试

#### 参考算法
```typescript
traverse(runtime: Runtime): TraversalResult {
  const priorityQueue = new BinaryHeap<OctreeNode>((node) => 1 / node.weight);

  // 初始化
  priorityQueue.push(octree.root);

  const visibleNodes: OctreeNode[] = [];
  let numPoints = 0;

  while (priorityQueue.size() > 0) {
    const node = priorityQueue.pop()!;

    // 视锥裁剪
    if (!this.frustum.intersectsBox(node.boundingBox)) continue;

    // 点预算检查
    if (numPoints + node.numPoints > this.config.pointBudget) break;

    // LOD 判断
    const screenSize = this.computeScreenSize(node, runtime.camera);
    if (screenSize < this.config.minScreenSize || !node.hasChildren) {
      visibleNodes.push(node);
      numPoints += node.numPoints;
    } else {
      // 添加子节点到队列
      for (const child of node.children) {
        if (child) {
          child.weight = this.computeWeight(child, runtime.camera);
          priorityQueue.push(child);
        }
      }
    }
  }

  return { visibleNodes, totalPoints: numPoints };
}
```

#### 验收标准
- ✅ 优先级队列正确工作
- ✅ 总是先处理重要节点
- ✅ 点预算控制有效
- ⏸️ 性能测试（暂时忽略）

---

### P0.7 更新 playground 使用新 API ⭐⭐
**预估时间**: 0.5 天
**文件**: `apps/playground/src/main.ts`

#### 任务描述
删除手动解码代码，替换为使用 Viewer API。

#### 实施步骤
- [ ] 7.1 删除手动解码代码（第 431-472 行）
- [ ] 7.2 简化为使用 `viewer.loadPointCloud()`
- [ ] 7.3 更新测试数据路径为 `D:/3d_models/pointcloud/inchurch_colorized_las_converted/cloud.js`
- [ ] 7.4 测试完整加载流程

#### 简化代码
```typescript
// 删除所有手动解码逻辑
// 替换为:
const viewer = new PointCloudViewer({
  canvas: document.querySelector('canvas')!,
  pointBudget: 1_000_000,
});

await viewer.loadPointCloud('D:/3d_models/pointcloud/inchurch_colorized_las_converted/cloud.js');
```

#### 验收标准
- ✅ 代码简洁清晰
- ✅ 使用统一 API
- ✅ 自动流式加载

---

### P0.8 端到端测试 ⭐⭐⭐
**预估时间**: 1 天
**测试数据**: `D:\3d_models\pointcloud\inchurch_colorized_las_converted`

#### 测试项
- [ ] 8.1 元数据加载成功
- [ ] 8.2 根节点显示
- [ ] 8.3 子节点自动流式加载
- [ ] 8.4 LOD 根据相机距离切换
- [ ] 8.5 点云正确渲染
- [ ] 8.6 相机控制流畅
- [ ] ⏸️ 8.7 性能测试（暂时忽略）

#### 测试步骤
```bash
cd apps/playground
npm run dev
# 浏览器访问 http://localhost:3000
# 加载测试数据
# 验证以上测试项
```

---

## 🟠 P1 - 核心功能缺失

### P1.1 实现 ClipBox 着色器支持 ⭐⭐
**预估时间**: 2 天
**文件**: `packages/rendering-three/src/shaders/pointcloud.vert.glsl`

#### 任务描述
在着色器中实现裁剪框逻辑，支持 INSIDE/OUTSIDE/HIGHLIGHT 模式。

#### 实施步骤
- [ ] 1.1 添加 ClipBox uniform（矩阵数组）
- [ ] 1.2 实现点在裁剪框内判断
- [ ] 1.3 支持 SHOW_INSIDE 模式
- [ ] 1.4 支持 SHOW_OUTSIDE 模式
- [ ] 1.5 支持 HIGHLIGHT 模式
- [ ] 1.6 支持多个裁剪框组合逻辑
- [ ] 1.7 测试裁剪效果

#### 参考代码
```glsl
uniform int clipBoxCount;
uniform mat4 clipBoxes[8]; // 最多 8 个

bool insideAny = false;
for (int i = 0; i < clipBoxCount; i++) {
  vec4 clipPosition = clipBoxes[i] * mvPosition;
  bool inside = abs(clipPosition.x) <= 1.0 &&
                abs(clipPosition.y) <= 1.0 &&
                abs(clipPosition.z) <= 1.0;

  #if defined(CLIP_TASK_SHOW_INSIDE)
    insideAny = insideAny || inside;
  #elif defined(CLIP_TASK_SHOW_OUTSIDE)
    insideAny = insideAny || !inside;
  #elif defined(CLIP_TASK_HIGHLIGHT)
    if (inside) vColor = vec3(1.0, 0.0, 0.0);
    insideAny = true;
  #endif
}

if (!insideAny) {
  gl_Position = vec4(0.0, 0.0, 2.0, 1.0); // 裁剪掉
}
```

---

### P1.2 实现 ClipBox 材质支持 ⭐⭐
**预估时间**: 1 天
**文件**: `packages/rendering-three/src/materials/PointCloudMaterial.ts`

#### 任务描述
在材质中添加 ClipBox 管理方法。

#### 实施步骤
- [ ] 2.1 添加 `clipBoxes` uniform 数组
- [ ] 2.2 实现 `setClipBoxes(clipBoxes)` 方法
- [ ] 2.3 自动更新着色器 defines
- [ ] 2.4 更新裁剪矩阵到 uniform
- [ ] 2.5 测试动态添加/移除裁剪框

---

### P1.3 实现 ClipBox LOD 集成 ⭐⭐
**预估时间**: 3 天
**文件**: `packages/core/src/systems/TraversalSystem.ts`

#### 任务描述
在 LOD 遍历中添加裁剪框判断。

#### 实施步骤
- [ ] 3.1 添加 `clipBoxes` 配置
- [ ] 3.2 实现 `intersectsClipBox()` 方法
- [ ] 3.3 在遍历中检查裁剪条件
- [ ] 3.4 支持多裁剪框组合（AND/OR）
- [ ] 3.5 测试裁剪性能

---

### P1.4 实现加载限速 ⭐
**预估时间**: 0.5 天
**文件**: `packages/core/src/systems/StreamingSystem.ts`

#### 任务描述
限制每帧 GPU 上传数量，避免卡顿。

#### 实施步骤
- [ ] 4.1 添加 `maxNodesLoadingPerFrame` 配置（默认 2）
- [ ] 4.2 跟踪当前帧已加载节点数
- [ ] 4.3 超过限制时延迟到下一帧
- [ ] 4.4 测试加载平滑度

---

### P1.5 实现动态着色器更新 ⭐⭐
**预估时间**: 2 天
**文件**: `packages/rendering-three/src/materials/PointCloudMaterial.ts`

#### 任务描述
支持运行时切换着色模式和选项。

#### 实施步骤
- [ ] 5.1 实现 `updateShaderSource()` 方法
- [ ] 5.2 动态生成 `#define` 语句
- [ ] 5.3 检测需要重新编译的条件
- [ ] 5.4 缓存编译结果避免重复编译
- [ ] 5.5 测试切换性能

---

### P1.6 实现强制显示低层级 ⭐
**预估时间**: 0.5 天
**文件**: `packages/core/src/systems/TraversalSystem.ts`

#### 任务描述
强制显示前 2-3 层，防止空白屏幕。

#### 实施步骤
- [ ] 6.1 添加 `forceLoadDepth` 配置（默认 3）
- [ ] 6.2 在遍历中跳过前 N 层的 LOD 判断
- [ ] 6.3 测试远距离观看效果

---

### P1.7 实现多点云加载 ⭐⭐
**预估时间**: 1 天
**文件**: `packages/viewer/src/Viewer.ts`

#### 任务描述
支持同时加载多个点云。

#### 实施步骤
- [ ] 7.1 维护 `pointClouds` 数组
- [ ] 7.2 每个点云独立空间变换
- [ ] 7.3 统一 LOD 预算管理
- [ ] 7.4 实现 `removePointCloud()` 方法
- [ ] 7.5 测试多点云场景

---

## 🟡 P2 - 重要优化

### P2.1 实现 LRU 缓存 ⭐⭐
**预估时间**: 1 天
**文件**: `packages/core/src/resource/ResourceManager.ts`

#### 任务描述
实现基于内存大小的 LRU 缓存，自动卸载不可见节点。

#### 实施步骤
- [ ] 1.1 扩展 ResourceManager 添加 LRU 逻辑
- [ ] 1.2 基于内存大小而非数量
- [ ] 1.3 实现 `evict()` 方法
- [ ] 1.4 监控内存使用
- [ ] 1.5 测试内存管理

---

### P2.2 实现变换缓存 ⭐
**预估时间**: 0.5 天
**文件**: `packages/core/src/systems/TraversalSystem.ts`

#### 任务描述
检测点云和相机是否移动，复用上一帧结果。

#### 实施步骤
- [ ] 2.1 记录上一帧的变换矩阵
- [ ] 2.2 比较当前帧和上一帧
- [ ] 2.3 如果相同则跳过遍历
- [ ] 2.4 测试性能提升

---

### P2.3 实现 Worker Pool ⭐⭐
**预估时间**: 1 天
**文件**: `packages/core/src/worker/WorkerPool.ts`

#### 任务描述
实现 Worker 复用池，避免频繁创建/销毁。

#### 实施步骤
- [ ] 3.1 创建 WorkerPool 类
- [ ] 3.2 维护可用 worker 队列
- [ ] 3.3 实现 `getWorker()` 和 `returnWorker()` 方法
- [ ] 3.4 任务队列管理
- [ ] 3.5 测试 worker 复用

---

### P2.4 补充着色模式 ⭐⭐
**预估时间**: 2 天
**文件**: `packages/rendering-three/src/shaders/pointcloud.vert.glsl`

#### 任务描述
添加更多着色模式（matcap, composite, GPS time 等）。

#### 实施步骤
- [ ] 4.1 实现 matcap 模式
- [ ] 4.2 实现 composite 模式
- [ ] 4.3 实现 GPS time 模式
- [ ] 4.4 实现 return number 模式
- [ ] 4.5 测试所有模式

---

### P2.5 实现分类动态更新 ⭐
**预估时间**: 1 天
**文件**: `packages/rendering-three/src/materials/PointCloudMaterial.ts`

#### 任务描述
支持动态更新分类颜色和可见性。

#### 实施步骤
- [ ] 5.1 实现 `recomputeClassification()` 方法
- [ ] 5.2 动态更新分类 LUT 纹理
- [ ] 5.3 支持可见性控制
- [ ] 5.4 测试分类切换

---

### P2.6 实现范围累积 ⭐
**预估时间**: 0.5 天
**文件**: `packages/viewer/src/loader/BinaryDecoderWorker.ts`

#### 任务描述
跨节点累积属性范围，用于动态颜色映射。

#### 实施步骤
- [ ] 6.1 维护全局属性范围
- [ ] 6.2 每次解码更新范围
- [ ] 6.3 自动更新材质 uniform
- [ ] 6.4 测试强度/高程渐变

---

## 🟢 P3 - 增强功能（可选）

### P3.1 实现 EDL 渲染 ⭐⭐⭐
**预估时间**: 3 天
**文件**: `packages/rendering-three/src/effects/EDLRenderer.ts`（新建）

#### 任务描述
实现 Eye-Dome Lighting 后处理效果。

#### 实施步骤
- [ ] 1.1 创建 EDL 着色器
- [ ] 1.2 实现双 pass 渲染（color + EDL）
- [ ] 1.3 深度采样和遮蔽计算
- [ ] 1.4 集成到 ThreeRenderSystem
- [ ] 1.5 添加 UI 控制（强度、半径）

---

### P3.2 实现阴影贴图 ⭐⭐⭐
**预估时间**: 3 天
**文件**: `packages/rendering-three/src/shaders/pointcloud.vert.glsl`

#### 任务描述
支持多阴影贴图。

#### 实施步骤
- [ ] 2.1 添加阴影 uniform
- [ ] 2.2 实现阴影坐标计算
- [ ] 2.3 片段着色器中采样阴影
- [ ] 2.4 PCF 采样平滑阴影
- [ ] 2.5 测试阴影效果

---

### P3.3 实现属性过滤器 ⭐
**预估时间**: 1 天
**文件**: `packages/rendering-three/src/shaders/pointcloud.vert.glsl`

#### 任务描述
支持 GPS 时间、返回值等属性过滤。

#### 实施步骤
- [ ] 3.1 添加过滤器 uniform
- [ ] 3.2 实现范围过滤逻辑
- [ ] 3.3 集成到着色器
- [ ] 3.4 测试过滤效果

---

### P3.4 完善测量工具 ⭐⭐
**预估时间**: 2 天
**文件**: `packages/viewer/src/tools/`

#### 任务描述
实现体积测量和高程剖面。

#### 实施步骤
- [ ] 4.1 实现 VolumeTool
- [ ] 4.2 实现 ProfileTool
- [ ] 4.3 体积计算算法
- [ ] 4.4 剖面线采样
- [ ] 4.5 测试工具

---

### P3.5 实现 HQ Splat 渲染 ⭐⭐
**预估时间**: 2 天
**文件**: `packages/rendering-three/src/shaders/hqsplat.glsl`（新建）

#### 任务描述
实现高质量点渲染。

#### 实施步骤
- [ ] 5.1 圆形 splat 着色器
- [ ] 5.2 法线估算
- [ ] 5.3 平滑插值
- [ ] 5.4 测试渲染质量

---

## 📊 里程碑

### 里程碑 M1: 基础渲染可用（第 1-2 天）
**目标**: playground 可以加载和显示点云

**交付物**:
- ✅ Viewer.load() 实现
- ✅ StreamingSystem 集成
- ✅ 单点云完整流程测试通过

**验收标准**:
```bash
# 启动 playground
cd apps/playground && npm run dev

# 加载测试数据
# URL: D:/3d_models/pointcloud/inchurch_colorized_las_converted/cloud.js

# 验证:
# - 可以加载 Potree 1.x 格式点云
# - 根节点正确显示
# - 子节点自动流式加载
# - ⏸️ 性能测试（暂时忽略）
```

---

### 里程碑 M2: P0 完成（第 3-8 天）
**目标**: 核心管道完全可用

**交付物**:
- ✅ 可见性纹理
- ✅ GPU LOD 遍历
- ✅ 优先级队列
- ✅ PointCloudScene
- ✅ 端到端测试通过

**验收标准**:
- ✅ 点大小自适应
- ✅ LOD 选择最优
- ✅ 加载流畅
- ⏸️ 性能和内存测试（暂时忽略）

---

### 里程碑 M3: P1 完成（第 9-18 天）
**目标**: 核心功能完整

**交付物**:
- ✅ ClipBox 完整实现
- ✅ 动态着色器
- ✅ 多点云支持
- ✅ 加载限速

**验收标准**:
- ✅ ClipBox 裁剪正确
- ✅ 可运行时切换着色模式
- ✅ 可同时加载 3+ 点云
- ✅ 加载平滑无卡顿

---

### 里程碑 M4: P2 完成（第 19-24 天）
**目标**: 性能和稳定性达标

**交付物**:
- ✅ LRU 缓存
- ✅ 变换缓存
- ✅ Worker Pool
- ✅ 补充着色模式
- ✅ 性能测试报告

**验收标准**:
- ✅ 10M 点 @60fps（桌面端）
- ✅ 内存占用 <1GB
- ✅ 无内存泄漏
- ✅ 所有着色模式正常工作

> **注意**: 性能目标作为参考，暂时不作为阻塞验收条件

---

### 里程碑 M5: P3 增强（第 25-30 天，可选）
**目标**: 提升视觉质量

**交付物**:
- ✅ EDL 渲染
- ✅ 阴影
- ✅ 高级测量工具

---

## 🧪 测试策略

### 单元测试
- [ ] LOD 算法测试
- [ ] 可见性纹理编码/解码测试
- [ ] ClipBox 判断测试
- [ ] 优先级计算测试
- [ ] LRU 缓存测试

### 集成测试
- [ ] 完整加载流程测试
- [ ] 多点云管理测试
- [ ] 内存管理测试
- [ ] 性能回归测试

### 性能测试
使用测试数据: `D:\3d_models\pointcloud\inchurch_colorized_las_converted`

> **注意**: 以下性能测试暂时忽略，仅作为参考目标

- [ ] ⏸️ 1M 点 @60fps
- [ ] ⏸️ 5M 点 @60fps
- [ ] ⏸️ 10M 点 @60fps
- [ ] ⏸️ 内存占用 <1GB
- [ ] ⏸️ 首次渲染 <3 秒

---

## 📝 开发规范

### Git 提交规范
- 每完成一个独立功能提交一次
- 提交信息使用中文，格式：`实现 XXX 功能`
- 示例：
  - `实现 Viewer.load() 方法`
  - `集成 StreamingSystem 到渲染管道`
  - `添加 ClipBox 着色器支持`

### 代码质量
- ✅ 完整的 TypeScript 类型定义
- ✅ JSDoc 注释
- ✅ 单元测试覆盖
- ✅ 无 ESLint 错误

### 文档更新
- 每完成一个里程碑更新进度
- 记录关键技术决策
- 更新 API 文档

---

## ⚠️ 风险管理

### 高风险项
1. **可见性纹理实现复杂** ⚠️
   - 缓解: 详细参考原版代码，单元测试

2. **GPU LOD 遍历调试困难** ⚠️
   - 缓解: 使用 RenderDoc，分步骤验证

3. **ClipBox 逻辑复杂** ⚠️
   - 缓解: 充分测试，渐进式实现

### 中风险项
1. **优先级队列性能**
   - 缓解: 性能基准测试

2. **动态着色器更新**
   - 缓解: 缓存编译结果

---

## 📚 参考资料

### 原版 Potree 关键文件
- `D:/coding/libs/potree/src/PointCloudOctree.js`
- `D:/coding/libs/potree/src/Potree_update_visibility.js`
- `D:/coding/libs/potree/src/materials/shaders/pointcloud.vs`
- `D:/coding/libs/potree/src/materials/PointCloudMaterial.js`

### 测试数据
- 路径: `D:\3d_models\pointcloud\inchurch_colorized_las_converted`
- 格式: Potree 1.x
- 用途: 端到端测试和性能基准

---

**文档版本**: 1.0
**创建日期**: 2025-11-17
**维护者**: Better Potree Team
