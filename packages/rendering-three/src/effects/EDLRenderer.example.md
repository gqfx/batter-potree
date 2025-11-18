# EDL (Eye-Dome Lighting) Rendering Example

这个示例展示如何使用 `EDLRenderer` 为点云添加 Eye-Dome Lighting 效果。

## 基础用法

```typescript
import * as THREE from 'three';
import { EDLRenderer } from '@better-potree/rendering-three';

// 1. 创建标准 Three.js 渲染器
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('canvas')!,
  antialias: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);

// 2. 创建 EDL 渲染器
const edlRenderer = new EDLRenderer(renderer, {
  edlStrength: 1.0,   // EDL 强度 (0.0 - 2.0)
  edlRadius: 1.4,     // EDL 半径 (像素)
  edlOpacity: 1.0,    // EDL 不透明度
  neighbourCount: 8,  // 采样邻居数量 (4, 8, 或 16)
});

// 3. 创建场景和相机
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

// 4. 添加点云 (确保材质启用了 USE_EDL)
const pointCloud = createYourPointCloud();
scene.add(pointCloud);

// 5. 渲染循环
function animate() {
  requestAnimationFrame(animate);

  // 使用 EDL 渲染器渲染场景
  edlRenderer.render(scene, camera);
}

animate();

// 6. 窗口大小变化时调整
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  edlRenderer.setSize(width, height);
});
```

## 动态调整 EDL 参数

```typescript
// 调整 EDL 强度
edlRenderer.strength = 1.5;

// 调整 EDL 半径
edlRenderer.radius = 2.0;

// 调整不透明度
edlRenderer.opacity = 0.8;

// 启用/禁用 EDL
edlRenderer.enabled = true;
```

## 与 PointCloudMaterial 配合使用

确保你的点云材质启用了 `USE_EDL` 定义:

```typescript
import { PointCloudMaterial } from '@better-potree/rendering-three';

const material = new PointCloudMaterial({
  size: 1.0,
  colorMode: PointCloudColorMode.RGB,
  useEDL: true,  // ✅ 启用 EDL 支持
});
```

当 `useEDL` 为 true 时,材质会在 fragment shader 的 alpha 通道中写入对数深度值,供 EDL pass 使用。

## EDL 渲染原理

EDL 是一个两步渲染过程:

### Pass 1: 点云渲染 + 对数深度
- 渲染点云到 `rtEDL` render target
- Fragment shader 将对数深度写入 alpha 通道
- `fragColor.a = vLogDepth;`

### Pass 2: EDL 着色
- 使用 fullscreen quad 渲染 EDL 效果
- 对每个像素采样周围邻居的深度
- 计算深度差异 (遮蔽因子)
- 应用指数衰减: `shade = exp(-response * 300.0 * edlStrength)`
- 将着色应用到颜色: `finalColor = color * shade`

## 参数说明

### edlStrength (EDL 强度)
- **范围**: 0.0 - 2.0
- **默认**: 1.0
- **效果**: 控制边缘变暗的程度
  - 0.0: 无 EDL 效果
  - 1.0: 标准效果
  - 2.0: 强烈的边缘强调

### edlRadius (EDL 半径)
- **范围**: 1.0 - 3.0 (像素)
- **默认**: 1.4
- **效果**: 控制采样范围
  - 1.0: 细微的边缘
  - 1.4: 平衡的效果
  - 3.0: 宽泛的边缘

### neighbourCount (邻居采样数)
- **选项**: 4, 8, 16
- **默认**: 8
- **效果**: 控制采样质量
  - 4: 最快,边缘可能不平滑
  - 8: 平衡性能和质量
  - 16: 最高质量,稍慢

## 性能优化建议

1. **使用合适的邻居数**: 对于大多数场景,8 个邻居足够
2. **调整半径**: 较小的半径性能更好
3. **按需启用**: 可以动态切换 `enabled` 属性
4. **合理的渲染目标大小**: EDL 使用 FloatType,较大的尺寸会消耗更多内存

## 常见问题

### Q: 为什么看不到 EDL 效果?
A: 确保:
1. PointCloudMaterial 启用了 `useEDL: true`
2. EDLRenderer 的 `enabled` 为 true
3. `edlStrength` 不为 0

### Q: EDL 效果太强/太弱?
A: 调整 `edlStrength` 和 `edlRadius` 参数:
```typescript
edlRenderer.strength = 0.5; // 减弱效果
edlRenderer.radius = 2.0;   // 增加采样范围
```

### Q: 性能问题?
A: 尝试:
1. 减少 `neighbourCount` 到 4
2. 降低 EDL render target 分辨率 (不推荐)
3. 在静态场景中禁用 EDL

## 完整示例

参考 `apps/playground` 中的完整示例代码。

## 参考资料

- [CloudCompare EDL 实现](https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL)
- [Eye-Dome Lighting 论文](https://tel.archives-ouvertes.fr/tel-00438464/document)
- [Kitware EDL 博客](http://www.kitware.com/source/home/post/9)
