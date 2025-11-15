# @better-potree/loader-potree

> Potree 格式点云加载器,支持 Potree 1.x 和 2.0 格式

## 功能特性

- 支持 Potree 1.x 格式 (cloud.js)
- 支持 Potree 2.0 格式 (metadata.json)
- 自动检测和解析 JSONP/JSON 格式元数据
- 并行解码点云数据的 Worker Pool
- 支持多种点属性:位置、颜色、强度、分类、法线等
- 二进制数据高效解码
- 完整的 TypeScript 类型支持

## 安装

```bash
npm install @better-potree/loader-potree
# or
pnpm add @better-potree/loader-potree
```

## 使用方法

### 基础用法

```typescript
import { PotreeLoader } from '@better-potree/loader-potree';

// 创建加载器实例
const loader = new PotreeLoader();

// 加载点云元数据
const octree = await loader.load('https://example.com/pointcloud/');

// 或者指定具体的元数据文件
const octree = await loader.load('https://example.com/pointcloud/cloud.js');
const octree2 = await loader.load('https://example.com/pointcloud/metadata.json');

console.log('点云信息:', {
  url: octree.url,
  version: octree.version,
  spacing: octree.spacing,
  boundingBox: octree.boundingBox,
  pointAttributes: octree.pointAttributes,
});
```

### 使用 Worker Pool 进行并行解码

```typescript
import { createWorkerPool } from '@better-potree/loader-potree';
import BinaryDecoderWorker from '@better-potree/loader-potree/workers/BinaryDecoderWorker?worker';

// 创建 Worker Pool (默认使用 CPU 核心数量)
const workerPool = createWorkerPool(
  () => new BinaryDecoderWorker(),
  4 // 可选:指定 worker 数量
);

// 解码点云数据
const request = {
  buffer: arrayBuffer,
  pointAttributes: octree.pointAttributes,
  version: octree.version,
  offset: [0, 0, 0],
  scale: octree.scale,
  spacing: octree.spacing,
  hasChildren: 0,
  name: 'r',
};

const result = await workerPool.decode(request);
console.log('解码结果:', {
  numPoints: result.numPoints,
  mean: result.mean,
  tightBoundingBox: result.tightBoundingBox,
  attributeBuffers: result.attributeBuffers,
});

// 使用完毕后清理
workerPool.dispose();
```

### 解析点属性

```typescript
import { parseAttributes } from '@better-potree/loader-potree';

// 从 Potree 元数据解析点属性
const pointAttributes = parseAttributes(metadata);

console.log('属性信息:', {
  size: pointAttributes.size,
  byteSize: pointAttributes.byteSize,
  attributes: pointAttributes.attributes.map(attr => ({
    name: attr.name,
    type: attr.type.name,
    numElements: attr.numElements,
  })),
});
```

## API 文档

### 类

#### `PotreeLoader`

Potree 格式点云加载器。

**方法:**

##### `load(url: string): Promise<IPointCloudOctree>`

加载 Potree 点云。

**参数:**
- `url` - 点云元数据文件的 URL (cloud.js 或 metadata.json),也可以是包含这些文件的目录 URL

**返回:**
- `Promise<IPointCloudOctree>` - 解析后的八叉树结构

**支持的 URL 格式:**
- `https://example.com/pointcloud/` - 目录 URL,自动查找 cloud.js
- `https://example.com/pointcloud` - 无斜杠的目录 URL
- `https://example.com/pointcloud/cloud.js` - 直接指定 cloud.js
- `https://example.com/pointcloud/metadata.json` - 直接指定 metadata.json

**自动回退:**
- 首先尝试加载 cloud.js (Potree 1.x)
- 失败时自动回退到 metadata.json (Potree 2.0)

**示例:**
```typescript
const loader = new PotreeLoader();
const octree = await loader.load('https://example.com/pointcloud/');

// 访问加载的数据
console.log('边界框:', octree.boundingBox);
console.log('点间距:', octree.spacing);
console.log('版本:', octree.version);
console.log('投影:', octree.projection);
```

#### `WorkerPool`

Web Worker 池,用于并行解码点云数据。

**构造函数:**
```typescript
constructor(workerCount?: number)
```

**参数:**
- `workerCount` - Worker 数量,默认为 `navigator.hardwareConcurrency` 或 4

**注意:** `WorkerPool` 是抽象类,需要通过 `createWorkerPool` 工厂函数创建实例。

**方法:**

##### `decode(request: IWorkerDecodeRequest): Promise<IWorkerDecodeResponse>`

解码点云二进制数据。

**参数:**
- `request` - 解码请求对象,包含:
  - `buffer: ArrayBuffer` - 二进制数据
  - `pointAttributes: PointAttributes` - 点属性描述
  - `version: string` - Potree 版本
  - `offset: [number, number, number]` - 位置偏移
  - `scale: number` - 缩放因子
  - `spacing: number` - 点间距
  - `hasChildren: number` - 子节点标记
  - `name: string` - 节点名称

**返回:**
- `Promise<IWorkerDecodeResponse>` - 解码后的数据,包含:
  - `buffer: ArrayBuffer` - 原始缓冲区
  - `numPoints: number` - 点数量
  - `mean: [number, number, number]` - 点云中心
  - `tightBoundingBox: { min, max }` - 紧密边界框
  - `attributeBuffers: Record<string, any>` - 属性缓冲区

**示例:**
```typescript
const result = await workerPool.decode({
  buffer: arrayBuffer,
  pointAttributes: octree.pointAttributes,
  version: '1.7',
  offset: [0, 0, 0],
  scale: 0.001,
  spacing: 0.1,
  hasChildren: 0,
  name: 'r',
});

// 访问解码结果
const positions = result.attributeBuffers.POSITION_CARTESIAN.buffer;
const colors = result.attributeBuffers.rgba?.buffer;
```

##### `getWorkerCount(): number`

获取 Worker 池中的 Worker 数量。

##### `getBusyWorkerCount(): number`

获取当前正在工作的 Worker 数量。

##### `getQueuedTaskCount(): number`

获取队列中等待处理的任务数量。

##### `isBusy(): boolean`

检查 Worker 池是否正在处理任务。

##### `dispose(): void`

释放所有 Worker 资源并清空任务队列。所有待处理和排队的任务将被拒绝。

**示例:**
```typescript
const workerPool = createWorkerPool(() => new Worker('./worker.js'), 4);

console.log('Worker 数量:', workerPool.getWorkerCount());
console.log('忙碌的 Worker:', workerPool.getBusyWorkerCount());
console.log('队列任务数:', workerPool.getQueuedTaskCount());
console.log('是否忙碌:', workerPool.isBusy());

// 清理资源
workerPool.dispose();
```

### 函数

#### `parseAttributes(metadata: IPotreeMetadata): PointAttributes`

从 Potree 元数据解析点属性。

**参数:**
- `metadata` - Potree 元数据对象

**返回:**
- `PointAttributes` - 解析后的点属性集合

**支持的属性:**
- `POSITION_CARTESIAN` - 3D 位置坐标
- `rgba` / `COLOR_PACKED` / `RGBA` - RGBA 颜色
- `intensity` / `INTENSITY` - 激光强度
- `classification` / `CLASSIFICATION` - 点分类
- `gps-time` / `GPS_TIME` - GPS 时间戳
- `NORMAL` - 法线向量
- `NORMAL_SPHEREMAPPED` - 球面映射法线
- `NORMAL_OCT16` - 八面体编码法线
- 其他自定义属性

**版本兼容性:**
- Potree 1.x (版本 ≤ 1.7): 字符串数组格式
- Potree 2.0+ (版本 > 1.7): 对象数组格式

**示例:**
```typescript
const metadata = {
  version: '1.7',
  octreeDir: 'data',
  boundingBox: { lx: 0, ly: 0, lz: 0, ux: 10, uy: 10, uz: 10 },
  pointAttributes: ['POSITION_CARTESIAN', 'RGBA', 'INTENSITY'],
  spacing: 0.5,
  scale: 0.001,
  points: 1000000,
};

const attributes = parseAttributes(metadata);

console.log('属性数量:', attributes.size);
console.log('总字节大小:', attributes.byteSize);
attributes.attributes.forEach(attr => {
  console.log(`- ${attr.name}: ${attr.type.name}, ${attr.numElements} 元素`);
});
```

#### `createWorkerPool(workerFactory: () => Worker, workerCount?: number): WorkerPool`

创建 Worker Pool 实例的工厂函数。

**参数:**
- `workerFactory` - Worker 构造函数,返回 Worker 实例
- `workerCount` - 可选,Worker 数量

**返回:**
- `WorkerPool` - Worker Pool 实例

**示例:**
```typescript
import BinaryDecoderWorker from './BinaryDecoderWorker?worker';

// 使用 Vite 的 ?worker 语法
const pool = createWorkerPool(() => new BinaryDecoderWorker(), 4);

// 或使用 Web Worker API
const pool2 = createWorkerPool(
  () => new Worker('./BinaryDecoderWorker.js', { type: 'module' })
);
```

### Worker

#### `BinaryDecoderWorker`

Web Worker,用于解码 Potree 二进制点云数据。

**支持的数据格式:**
- Potree 1.x 格式 (版本 ≤ 1.3 和 > 1.3)
- Potree 2.0 格式
- 多种点属性编码格式

**解码的属性:**
- 位置数据 (POSITION_CARTESIAN)
  - 版本 > 1.3: UINT32 编码,使用 scale 缩放
  - 版本 ≤ 1.3: FLOAT32 编码,使用 offset 偏移
- 颜色数据 (rgba): UINT8[4]
- 法线数据:
  - NORMAL: Float32[3]
  - NORMAL_SPHEREMAPPED: 球面映射解码
  - NORMAL_OCT16: 八面体编码解码
- 通用属性: 支持所有基本数据类型 (int8/16/32/64, uint8/16/32/64, float, double)

**特性:**
- 使用 Transferable Objects 优化性能
- 计算紧密边界框和点云中心
- 自动处理大数据类型到 Float32 的转换
- 支持向量属性组合 (如 NormalX/Y/Z → NORMAL)

## 类型定义

```typescript
interface IPointCloudOctree {
  url: string;
  spacing: number;
  boundingBox: THREE.Box3;
  tightBoundingBox: THREE.Box3;
  root: IOctreeNode | null;
  pointAttributes: PointAttributes;
  projection: string | null;
  version: string;
  scale: number;
}

interface IPotreeMetadata {
  version: string;
  octreeDir: string;
  boundingBox: {
    lx: number; ly: number; lz: number;
    ux: number; uy: number; uz: number;
  };
  tightBoundingBox?: {
    lx: number; ly: number; lz: number;
    ux: number; uy: number; uz: number;
  };
  pointAttributes: string[] | IPotreeAttributeMetadata[];
  spacing: number;
  scale: number;
  points: number;
  projection?: string;
}

interface IWorkerDecodeRequest {
  buffer: ArrayBuffer;
  pointAttributes: PointAttributes;
  version: string;
  offset: [number, number, number];
  scale: number;
  spacing: number;
  hasChildren: number;
  name: string;
}

interface IWorkerDecodeResponse {
  buffer: ArrayBuffer;
  numPoints: number;
  mean: [number, number, number];
  tightBoundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  attributeBuffers: Record<string, {
    buffer: ArrayBuffer;
    preciseBuffer?: ArrayBuffer;
    attribute: any;
    offset?: number;
    scale?: number;
  }>;
}
```

## 使用示例

### 完整的加载和解码流程

```typescript
import { PotreeLoader, createWorkerPool } from '@better-potree/loader-potree';
import BinaryDecoderWorker from '@better-potree/loader-potree/workers/BinaryDecoderWorker?worker';

async function loadPointCloud(url: string) {
  // 1. 创建加载器和 Worker Pool
  const loader = new PotreeLoader();
  const workerPool = createWorkerPool(() => new BinaryDecoderWorker(), 4);

  try {
    // 2. 加载元数据
    const octree = await loader.load(url);
    console.log('点云加载成功:', octree);

    // 3. 加载根节点二进制数据 (假设已有二进制数据)
    const response = await fetch(`${octree.url}r.bin`);
    const buffer = await response.arrayBuffer();

    // 4. 解码点云数据
    const result = await workerPool.decode({
      buffer,
      pointAttributes: octree.pointAttributes,
      version: octree.version,
      offset: [0, 0, 0],
      scale: octree.scale,
      spacing: octree.spacing,
      hasChildren: 0,
      name: 'r',
    });

    console.log('解码完成:', {
      点数量: result.numPoints,
      中心点: result.mean,
      边界框: result.tightBoundingBox,
    });

    // 5. 访问属性数据
    const positions = new Float32Array(result.attributeBuffers.POSITION_CARTESIAN.buffer);
    const colors = result.attributeBuffers.rgba
      ? new Uint8Array(result.attributeBuffers.rgba.buffer)
      : null;

    return {
      octree,
      positions,
      colors,
      numPoints: result.numPoints,
    };
  } finally {
    // 6. 清理资源
    workerPool.dispose();
  }
}

// 使用
const pointCloud = await loadPointCloud('https://example.com/pointcloud/');
```

### 处理不同版本的 Potree 格式

```typescript
import { PotreeLoader, parseAttributes } from '@better-potree/loader-potree';

const loader = new PotreeLoader();

// 加载 Potree 1.x (cloud.js)
const octree1x = await loader.load('https://example.com/potree1/');
console.log('Potree 1.x 版本:', octree1x.version); // '1.7'

// 加载 Potree 2.0 (metadata.json)
const octree2 = await loader.load('https://example.com/potree2/');
console.log('Potree 2.0 版本:', octree2.version); // '2.0'

// 两种格式都会被正确解析
console.log('属性:', octree1x.pointAttributes.attributes);
console.log('属性:', octree2.pointAttributes.attributes);
```

### 监控 Worker Pool 状态

```typescript
import { createWorkerPool } from '@better-potree/loader-potree';

const workerPool = createWorkerPool(() => new Worker('./worker.js'), 4);

// 提交多个解码任务
const tasks = [];
for (let i = 0; i < 10; i++) {
  const task = workerPool.decode(createRequest(i));
  tasks.push(task);

  console.log(`任务 ${i}:`, {
    忙碌Worker: workerPool.getBusyWorkerCount(),
    队列任务: workerPool.getQueuedTaskCount(),
    是否忙碌: workerPool.isBusy(),
  });
}

// 等待所有任务完成
await Promise.all(tasks);

console.log('所有任务完成');
console.log('忙碌Worker:', workerPool.getBusyWorkerCount()); // 0
console.log('队列任务:', workerPool.getQueuedTaskCount()); // 0
console.log('是否忙碌:', workerPool.isBusy()); // false

workerPool.dispose();
```

## 重要说明

### 元数据格式兼容性

- **Potree 1.x (≤ 1.7)**: 使用 `cloud.js` 文件,点属性为字符串数组
- **Potree 2.0+ (> 1.7)**: 使用 `metadata.json` 文件,点属性为对象数组
- 加载器会自动检测格式并正确解析

### JSONP 格式支持

加载器支持多种 `cloud.js` 格式:
```javascript
// JSONP 回调格式
Potree.setMetadata({...});

// var 赋值格式
var metadata = {...};

// 纯 JSON 格式
{...}
```

### Worker 使用建议

1. **Worker 数量**: 默认使用 CPU 核心数,可根据实际情况调整
2. **资源清理**: 务必在不再使用时调用 `dispose()` 释放资源
3. **错误处理**: Worker 解码错误会被包装成 Promise rejection
4. **Transferable Objects**: Worker 使用 transferable objects 传递数据,提高性能

### 性能优化

1. **并行解码**: Worker Pool 支持并行处理多个解码任务
2. **任务队列**: 当所有 Worker 都忙时,任务会被自动排队
3. **内存管理**: 解码完成后及时释放不需要的缓冲区
4. **Transferable Objects**: 二进制数据使用 transferable 方式传递,避免复制

## 依赖

- `@better-potree/types` - 类型定义
- `@better-potree/core` - 核心数据结构 (PointAttribute, PointAttributes)
- `@better-potree/utils` - 工具函数 (Version)
- `three` - Three.js (用于 Box3 等几何类型)

## 开发

```bash
# 构建
pnpm build

# 运行测试
pnpm test

# 清理
pnpm clean
```

## License

BSD-2-Clause
