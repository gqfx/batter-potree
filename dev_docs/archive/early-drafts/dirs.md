# Better Potree 项目结构

```
better-potree/
├── .git/
├── .gitignore
├── package.json                     # 根 package.json，管理 pnpm、Rsbuild、Vitest、TypeScript 等开发依赖
├── pnpm-workspace.yaml              # (T0.1) 定义 pnpm workspace，指向 "packages/*" 和 "examples/*"
├── rsbuild.config.ts                # (T0.2) 根 Rsbuild 配置文件
├── tsconfig.json                    # (T0.2) 根 TypeScript 配置文件，用于定义公共设置和路径别名
│
├── packages/                        # (T0.3) 存放所有可发布的NPM包 (核心库)
│   │
│   ├── core/                        # @better-potree/core (阶段 1: 核心逻辑)
│   │   ├── src/
│   │   │   ├── math/                # (T1.1) 独立的数学库 (Vector3, Box3, Matrix4...)
│   │   │   ├── octree/              # (T1.3) 八叉树数据结构 (PointCloudOctree, OctreeNode)
│   │   │   ├── models/              # (T1.5) 纯数据模型 (PointCloud, Measurement, Annotation)
│   │   │   ├── algorithm/           # (T1.4) 核心算法 (LOD选择, 视锥剔除)
│   │   │   ├── event/               # (T1.6) 类型安全的事件分发器
│   │   │   ├── PointAttribute.ts    # (T1.2) 点属性定义
│   │   │   └── index.ts             # 包的公共出口
│   │   ├── tests/                   # (T0.5, T1.x) 核心库的单元测试 (Vitest)
│   │   │   ├── math.test.ts
│   │   │   ├── octree.test.ts
│   │   │   └── algorithm.test.ts
│   │   ├── package.json             # 定义 @better-potree/core
│   │   └── tsconfig.json            # 继承自根 tsconfig
│   │
│   ├── types/                       # @better-potree/types (T1.0)
│   │   ├── src/
│   │   │   ├── IRenderer.ts
│   │   │   ├── ISceneManager.ts
│   │   │   ├── ICamera.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── rendering-three/             # @better-potree/rendering-three (阶段 2: Three.js 渲染层)
│   │   ├── src/
│   │   │   ├── ThreeJsRenderer.ts   # (T2.1) IRenderer 的 Three.js 实现
│   │   │   ├── PointCloudObject3D.ts # (T2.4) 继承自 THREE.Object3D 的点云对象
│   │   │   ├── materials/
│   │   │   │   └── PointCloudMaterial.ts # (T2.3) 自定义着色器材质
│   │   │   ├── shaders/             # (T2.2) 独立的 GLSL 着色器文件
│   │   │   │   ├── pointcloud.vert.glsl
│   │   │   │   └── pointcloud.frag.glsl
│   │   │   ├── helpers/             # (T2.6) 测量、标注等辅助对象的 3D 可视化
│   │   │   │   ├── MeasureHelper.ts
│   │   │   │   └── AnnotationHelper.ts
│   │   │   └── index.ts
│   │   ├── package.json             # 定义 @better-potree/rendering-three，依赖 core, types, three
│   │   └── tsconfig.json
│   │
│   ├── loader-potree/               # @better-potree/loader-potree (阶段 3: 加载器)
│   │   ├── src/
│   │   │   ├── PotreeLoader.ts      # (T3.1) 加载器主类
│   │   │   ├── workers/             # (T3.2) Web Workers
│   │   │   │   └── BinaryDecoderWorker.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── controls/                    # @better-potree/controls (阶段 3: 控制器)
│   │   ├── src/
│   │   │   ├── OrbitControls.ts     # (T3.3) 适配 ICamera 的轨道控制器
│   │   │   ├── FirstPersonControls.ts # (T3.3) 适配 ICamera 的第一人称控制器
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── tools/                       # @better-potree/tools (阶段 4: 交互工具)
│   │   ├── src/
│   │   │   ├── MeasuringTool.ts     # (T4.4) 测量工具 (API 驱动)
│   │   │   ├── ClippingTool.ts      # (T4.4) 裁剪工具 (API 驱动)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── viewer/                      # @better-potree/viewer (阶段 4: 顶层 API 封装)
│   │   ├── src/
│   │   │   ├── Viewer.ts            # (T4.1, T4.2) 顶层 Viewer 类
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── loader-ept/                  # (T5.2 - 未来) @better-potree/loader-ept
│   ├── loader-copc/                 # (T5.2 - 未来) @better-potree/loader-copc
│   ├── loader-gs/                   # (T5.1 - 未来) @better-potree/loader-gs
│   └── react/                       # (T5.3 - 未来) @better-potree/react (UI 适配器)
│
└── examples/                        # (T4.5) 用于测试和演示的示例应用
    ├── simple-viewer/               # (T4.5) 第一个无 UI 示例
    │   ├── index.html
    │   ├── src/
    │   │   └── main.ts              # 在这里导入 @better-potree/viewer 并实例化
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── ui-react/                    # (T5.3 - 未来) 使用 @better-potree/react 的示例
    │   └── ...
    │
    └── tests/                       # (T4.5) 端到端 (E2E) 测试 (例如 Playwright)
        └── viewer.e2e.test.ts
```
