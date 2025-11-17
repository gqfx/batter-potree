# Better-Potree 示例集

本目录包含 Better-Potree 的示例代码。

## 在线示例

- [基础示例](./basic.html) - 最简单的点云加载和显示
- [多点云示例](./multi-pointcloud.html) - 加载和管理多个点云
- [材质编辑器](./material-editor.html) - 实时调整点云材质
- [测量工具](./measurement.html) - 距离和面积测量

## 本地运行

```bash
# 在项目根目录
pnpm dev

# 访问
open http://localhost:5173/examples/basic.html
```

## 示例说明

### basic.html

最基础的示例，展示如何：
- 初始化查看器
- 加载点云
- 基本相机控制
- EDL 开关

### multi-pointcloud.html (TODO)

展示如何：
- 加载多个点云
- 控制可见性
- 切换激活点云
- 管理内存

### material-editor.html (TODO)

展示如何：
- 修改点大小
- 切换渲染属性（颜色、高程、强度）
- 调整 EDL 参数
- 自定义材质

### measurement.html (TODO)

展示如何：
- 距离测量
- 面积测量
- 体积测量
- 导出测量结果

## 数据准备

示例需要点云数据。你可以：

1. **使用示例数据**（如果提供）
2. **转换自己的数据**:

```bash
# 使用 PotreeConverter 转换点云
PotreeConverter input.las -o output_dir --generate-page
```

3. **修改示例代码**，指向你的数据：

```javascript
await viewer.loadPointCloud({
  url: '/path/to/your/metadata.json',
  name: 'My Point Cloud'
});
```

## 开发自己的应用

基于示例快速开始：

```typescript
import { PointCloudViewer } from '@better-potree/viewer';

const viewer = new PointCloudViewer({
  container: document.getElementById('viewer'),
  pointBudget: 2_000_000
});

await viewer.loadPointCloud({
  url: '/data/metadata.json'
});

viewer.start();
```

详细文档请查看 [用户指南](../../docs/guides/user-guide.md)。
