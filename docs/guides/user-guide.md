# Better-Potree 用户指南

> 现代化的 WebGL 点云可视化引擎

## 快速开始

### 安装

```bash
npm install @better-potree/viewer
# 或
pnpm add @better-potree/viewer
```

### 基础用法

```typescript
import { PointCloudViewer } from '@better-potree/viewer';

// 创建查看器
const viewer = new PointCloudViewer({
  container: document.getElementById('viewer'),
  pointBudget: 2_000_000,
  fov: 60,
  edlEnabled: true
});

// 加载点云
await viewer.loadPointCloud({
  url: '/path/to/metadata.json',
  name: 'My Point Cloud'
});

// 监听事件
viewer.on('pointcloud-loaded', (pc) => {
  console.log('Loaded:', pc.name);
  viewer.fitToScreen();
});

// 启动渲染循环
viewer.start();
```

## 核心概念

### 1. 查看器 (Viewer)

`PointCloudViewer` 是应用的入口点，管理：
- 渲染循环
- 相机控制
- 点云加载
- 用户交互

### 2. 点云 (Point Cloud)

点云数据使用八叉树结构组织：
- **LOD (Level of Detail)**: 根据距离自动选择细节层级
- **流式加载**: 按需加载可见节点
- **内存管理**: 自动卸载不可见数据

### 3. 材质 (Material)

控制点的渲染样式：

```typescript
viewer.setMaterial({
  pointSize: 1.0,
  pointSizeType: 'adaptive', // 'fixed' | 'adaptive'
  shape: 'circle', // 'square' | 'circle'
  activeAttributeName: 'rgba' // 'elevation' | 'intensity' | 'classification'
});
```

### 4. 相机控制

```typescript
// 地球控制（推荐）
viewer.controls.type = 'earth';

// 轨道控制
viewer.controls.type = 'orbit';

// 第一人称控制
viewer.controls.type = 'fps';
```

## 高级功能

### 多点云支持

```typescript
// 加载多个点云
const pc1 = await viewer.loadPointCloud({
  url: '/pc1/metadata.json',
  name: 'Building A'
});

const pc2 = await viewer.loadPointCloud({
  url: '/pc2/metadata.json',
  name: 'Building B'
});

// 控制可见性
viewer.setSourceVisible('Building A', false);
```

### 测量工具

```typescript
// 启用测量模式
viewer.enableMeasurement('distance');

// 监听测量结果
viewer.on('measurement-complete', (result) => {
  console.log('Distance:', result.distance, 'meters');
});
```

### 截面剪切

```typescript
// 添加剪切平面
viewer.addClippingPlane({
  normal: [0, 0, 1],
  distance: 10
});

// 移除剪切
viewer.removeAllClippingPlanes();
```

### EDL 增强

Eye-Dome Lighting (EDL) 提升深度感知：

```typescript
viewer.setEDL({
  enabled: true,
  strength: 1.0,
  radius: 1.4
});
```

## 性能优化

### 点预算 (Point Budget)

控制最大渲染点数：

```typescript
viewer.setPointBudget(5_000_000); // 5M 点
```

建议值：
- **低端设备**: 1M - 2M
- **中端设备**: 2M - 5M
- **高端设备**: 5M - 10M

### 最小节点大小

控制 LOD 细节：

```typescript
viewer.setMinNodeSize(200); // 像素
```

- **更小** = 更多细节，更多 draw calls
- **更大** = 更少细节，更好性能

### 内存限制

```typescript
viewer.setMemoryLimit({
  cpu: 500 * 1024 * 1024, // 500MB
  gpu: 512 * 1024 * 1024  // 512MB
});
```

## 事件系统

```typescript
// 点云加载
viewer.on('pointcloud-loaded', (pc) => {});
viewer.on('pointcloud-removed', (id) => {});

// 渲染
viewer.on('render-start', () => {});
viewer.on('render-end', (stats) => {});

// 相机
viewer.on('camera-change', (camera) => {});

// 选择
viewer.on('point-picked', (point) => {});
```

## 配置选项

完整的配置选项：

```typescript
interface ViewerConfig {
  // 容器
  container: HTMLElement;

  // 渲染
  pointBudget?: number;
  fov?: number;
  near?: number;
  far?: number;

  // 材质
  pointSize?: number;
  pointSizeType?: 'fixed' | 'adaptive';
  shape?: 'square' | 'circle';

  // EDL
  edlEnabled?: boolean;
  edlStrength?: number;
  edlRadius?: number;

  // 控制
  controls?: 'earth' | 'orbit' | 'fps';
  controlsEnabled?: boolean;

  // 性能
  minNodeSize?: number;
  memoryLimit?: number;

  // 调试
  showStats?: boolean;
  showBoundingBox?: boolean;
}
```

## 常见问题

### Q: 点云加载很慢？

A: 检查：
1. 网络速度
2. 点预算设置
3. 服务器 CORS 配置
4. 数据格式是否正确

### Q: 内存占用过高？

A: 尝试：
1. 降低点预算
2. 增大最小节点大小
3. 设置内存限制
4. 及时移除不需要的点云

### Q: 帧率不稳定？

A: 优化：
1. 使用 EDL 适度（strength < 1.5）
2. 检查 GPU 兼容性
3. 降低点预算
4. 使用性能分析工具

## 示例

查看完整示例：

- [基础示例](../examples/basic.html)
- [多点云](../examples/multi-pointcloud.html)
- [测量工具](../examples/measurement.html)
- [材质编辑](../examples/material-editor.html)

## API 参考

详细的 API 文档请查看 [API Reference](../api/index.html)

## 支持

- GitHub Issues: https://github.com/yourusername/better-potree/issues
- 文档: https://better-potree.dev
- 示例: https://better-potree.dev/examples
