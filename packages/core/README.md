# @better-potree/core

> 点云渲染库 better-potree 的核心功能模块，提供八叉树数据结构、LOD 选择、视锥体裁剪和点属性管理。

## 功能特性

- **八叉树数据结构** - 用于分层点云存储的完整八叉树实现
- **点属性系统** - 支持位置、颜色、强度、法线等标准点云属性
- **LOD (细节层次) 选择** - 基于屏幕空间投影的自动 LOD 选择
- **视锥体裁剪** - 高效的相机视锥体裁剪
- **点预算管理** - 控制渲染负载的点预算分配系统
- **类型安全的事件系统** - 基于 eventemitter3 的强类型事件发射器

## 安装

```bash
npm install @better-potree/core
# 或
pnpm add @better-potree/core
```

## 使用方法

### 基础示例

```typescript
import * as THREE from 'three';
import {
  PointCloudOctree,
  PointAttributes,
  PointAttribute
} from '@better-potree/core';

// 创建点属性配置
const pointAttributes = new PointAttributes([
  'POSITION_CARTESIAN',
  'RGB_PACKED',
  'INTENSITY'
]);

// 创建点云八叉树
const boundingBox = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(100, 100, 100)
);

const octree = new PointCloudOctree(
  boundingBox,
  1.0,  // 基础间距
  pointAttributes
);

// 配置渲染参数
octree.pointBudget = 1_000_000;
octree.minimumNodePixelSize = 150;
```

### 点属性管理

```typescript
import { PointAttribute, PointAttributes, PointAttributeDataType } from '@better-potree/core';

// 使用标准预定义属性
const positionAttr = PointAttribute.POSITION_CARTESIAN;
console.log(positionAttr.byteSize); // 12 (3 个 float，每个 4 字节)

const intensityAttr = PointAttribute.INTENSITY;
console.log(intensityAttr.byteSize); // 2 (1 个 uint16，2 字节)

// 创建自定义属性
const customAttr = new PointAttribute(
  'CustomData',
  PointAttributeDataType.FLOAT,
  3  // 3 个元素
);

// 管理属性集合
const attributes = new PointAttributes();
attributes.add(PointAttribute.POSITION_CARTESIAN);
attributes.add(PointAttribute.RGB_PACKED);
attributes.add(PointAttribute.INTENSITY);

console.log(attributes.byteSize);  // 总字节大小: 12 + 3 + 2 = 17
console.log(attributes.hasNormals());  // false
console.log(attributes.getAttributeOffset('INTENSITY'));  // 15 (位置 + RGB 之后的偏移)
```

### 八叉树节点操作

```typescript
import * as THREE from 'three';
import { OctreeNode } from '@better-potree/core';

// 创建根节点
const rootBox = new THREE.Box3(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(100, 100, 100)
);
const rootNode = new OctreeNode('r', rootBox, 1.0, 0);

// 创建子节点 (八叉树索引 0-7)
const child0 = rootNode.createChild(0);  // 名称: 'r0'
const child1 = rootNode.createChild(1);  // 名称: 'r1'

// 访问子节点
console.log(rootNode.getChild(0));  // child0
console.log(rootNode.getChildren());  // [child0, child1]
console.log(rootNode.isLeaf());  // false

// 计算子节点边界框
const childBox = OctreeNode.computeChildBoundingBox(rootBox, 0);
// 子节点 0 占据父边界框的 (-X, -Y, -Z) 八分之一
```

### LOD 选择

```typescript
import { LODSelector } from '@better-potree/core';
import * as THREE from 'three';

const params = {
  cameraPosition: new THREE.Vector3(50, 50, 50),
  screenWidth: 1920,
  screenHeight: 1080,
  fov: 60,
  minimumNodePixelSize: 150
};

// 计算节点的屏幕像素半径
const pixelRadius = LODSelector.calculateScreenPixelRadius(node, params);

// 判断节点是否应该渲染
const shouldRender = LODSelector.shouldRender(node, params);

// 计算加载优先级 (返回值越大优先级越高)
const priority = LODSelector.calculatePriority(node, params);
```

### 视锥体裁剪

```typescript
import { FrustumCuller } from '@better-potree/core';

const culler = new FrustumCuller();

// 从相机更新视锥体
culler.updateFrustum(camera);

// 测试节点是否与视锥体相交
if (culler.intersects(node)) {
  // 节点可见，执行渲染
}

// 也可以测试球体或包围盒
culler.intersectsSphere(sphere);
culler.intersectsBox(box);
```

### 点预算管理

```typescript
import { PointBudget } from '@better-potree/core';

const budget = new PointBudget(1_000_000);

// 检查容量
if (budget.hasCapacity(50000)) {
  budget.allocate(50000);
}

// 获取预算信息
console.log(budget.budget);      // 1000000
console.log(budget.used);        // 50000
console.log(budget.remaining);   // 950000
console.log(budget.getUsageRatio());  // 0.05

// 重置使用量 (通常在每帧开始时)
budget.reset();
```

### 类型安全的事件系统

```typescript
import { TypedEventEmitter } from '@better-potree/core';
import type { PointCloudEvents } from '@better-potree/core';

const emitter = new TypedEventEmitter<PointCloudEvents>();

// 订阅事件 (完全类型安全)
emitter.on('node-loaded', (data) => {
  console.log(`节点 ${data.node.name} 已加载`);
  console.log(`点云: ${data.pointCloud.name}`);
});

// 一次性事件监听
emitter.once('visibility-changed', (data) => {
  console.log(`可见性: ${data.visible}`);
});

// 发射事件
emitter.emit('node-loaded', {
  node: someNode,
  pointCloud: someOctree
});

// 移除监听器
emitter.off('node-loaded', listener);
emitter.removeAllListeners('node-loaded');
```

### 八叉树遍历和查询

```typescript
// 通过名称查找节点
const node = octree.findNode('r01234');

// 获取特定层级的所有节点
const level2Nodes = octree.getNodesAtLevel(2);

// 遍历所有节点
octree.traverse((node) => {
  console.log(`节点 ${node.name}: ${node.numPoints} 个点`);
});

// 获取总点数
const totalPoints = octree.getTotalPoints();

// 资源清理
octree.dispose();
```

## API 参考

### 类

#### `PointCloudOctree`

基于八叉树的分层 LOD 点云。

**构造函数：**
```typescript
constructor(
  boundingBox: THREE.Box3,
  spacing: number,
  pointAttributes: PointAttributes,
  offset?: THREE.Vector3
)
```

**属性：**
- `root: OctreeNode` - 八叉树的根节点
- `boundingBox: THREE.Box3` - 整个点云的边界框
- `pointBudget: number` - 最大渲染点数 (默认: 1,000,000)
- `minimumNodePixelSize: number` - LOD 选择的最小节点像素大小 (默认: 150)
- `visibleNodes: OctreeNode[]` - 可见节点 (裁剪时更新)
- `numVisiblePoints: number` - 可见点数量

**方法：**

##### `findNode(name: string): OctreeNode | null`

通过名称查找节点。

**参数：**
- `name` - 节点名称 (例如: "r", "r0", "r01")

**返回：**
- 找到的节点或 `null`

##### `getNodesAtLevel(level: number): OctreeNode[]`

获取特定层级的所有节点。

##### `traverse(callback: (node: OctreeNode) => void): void`

遍历八叉树中的所有节点。

##### `getTotalPoints(): number`

获取八叉树中的总点数。

##### `dispose(): void`

释放八叉树资源。

---

#### `OctreeNode`

八叉树层级结构中的节点。

**构造函数：**
```typescript
constructor(
  name: string,
  boundingBox: THREE.Box3,
  spacing: number,
  level?: number
)
```

**属性：**
- `name: string` - 节点名称 (例如: "r", "r0", "r01")
- `children: (OctreeNode | null)[]` - 子节点 (最多 8 个)
- `boundingBox: THREE.Box3` - 局部空间中的边界框
- `boundingSphere: THREE.Sphere` - 边界球
- `level: number` - 八叉树层级 (0 = 根节点)
- `numPoints: number` - 此节点中的点数
- `spacing: number` - 此层级的点间距
- `geometry: THREE.BufferGeometry | null` - 几何数据
- `loaded: boolean` - 几何数据是否已加载

**方法：**

##### `getChild(index: number): OctreeNode | null`

通过索引 (0-7) 获取子节点。

##### `setChild(index: number, child: OctreeNode): void`

设置子节点。

##### `createChild(index: number): OctreeNode`

为给定的八分位创建子节点。

##### `getChildren(): OctreeNode[]`

获取所有非空子节点。

##### `isLeaf(): boolean`

检查节点是否为叶节点 (无子节点)。

##### `static computeChildBoundingBox(parentBox: THREE.Box3, index: number): THREE.Box3`

计算给定八分位索引的子边界框。

**八分位索引模式：**
```
0: -X, -Y, -Z    4: -X, -Y, +Z
1: +X, -Y, -Z    5: +X, -Y, +Z
2: -X, +Y, -Z    6: -X, +Y, +Z
3: +X, +Y, -Z    7: +X, +Y, +Z
```

---

#### `PointAttributes`

管理点云的点属性集合。

**构造函数：**
```typescript
constructor(pointAttributeNames?: string[])
```

**属性：**
- `attributes: PointAttribute[]` - 属性数组
- `byteSize: number` - 每个点的总字节大小
- `size: number` - 属性数量

**方法：**

##### `add(pointAttribute: PointAttribute): void`

向集合添加点属性。

##### `hasNormals(): boolean`

检查集合是否包含法线属性。

##### `hasAttribute(name: string): boolean`

检查集合是否包含特定属性。

##### `getAttribute(name: string): PointAttribute | undefined`

通过名称获取属性。

##### `getAttributeOffset(name: string): number`

获取属性的字节偏移量。如果未找到属性，返回 -1。

---

#### `PointAttribute`

表示单个点属性 (例如: 位置、颜色、强度)。

**构造函数：**
```typescript
constructor(
  name: string,
  dataType: PointAttributeDataType,
  numElements: number
)
```

**属性：**
- `name: string` - 属性名称
- `type: PointAttributeType` - 数据类型元数据
- `numElements: number` - 元素数量 (例如: XYZ 位置为 3)
- `byteSize: number` - 总字节大小
- `description: string` - 人类可读的描述
- `range: [number, number]` - 值范围 [最小值, 最大值]

**标准属性 (静态常量)：**

```typescript
PointAttribute.POSITION_CARTESIAN  // 3 个 float (12 字节)
PointAttribute.RGBA_PACKED         // 4 个 int8 (4 字节)
PointAttribute.RGB_PACKED          // 3 个 int8 (3 字节)
PointAttribute.NORMAL_FLOATS       // 3 个 float (12 字节)
PointAttribute.NORMAL_SPHEREMAPPED // 2 个 uint8 (2 字节)
PointAttribute.NORMAL_OCT16        // 2 个 uint8 (2 字节)
PointAttribute.NORMAL              // 3 个 float (12 字节)
PointAttribute.INTENSITY           // 1 个 uint16 (2 字节)
PointAttribute.CLASSIFICATION      // 1 个 uint8 (1 字节)
PointAttribute.RETURN_NUMBER       // 1 个 uint8 (1 字节)
PointAttribute.NUMBER_OF_RETURNS   // 1 个 uint8 (1 字节)
PointAttribute.SOURCE_ID           // 1 个 uint16 (2 字节)
PointAttribute.GPS_TIME            // 1 个 double (8 字节)
PointAttribute.INDICES             // 1 个 uint32 (4 字节)
PointAttribute.SPACING             // 1 个 float (4 字节)
```

---

#### `LODSelector`

基于屏幕空间标准选择适当的 LOD 层级。

**静态方法：**

##### `calculateScreenPixelRadius(node: OctreeNode, params: LODSelectionParams): number`

计算节点边界球的屏幕空间半径。

##### `shouldRender(node: OctreeNode, params: LODSelectionParams): boolean`

根据屏幕大小判断节点是否应该可见。

##### `calculatePriority(node: OctreeNode, params: LODSelectionParams): number`

计算节点加载优先级 (返回值越大表示优先级越高)。

---

#### `FrustumCuller`

对八叉树节点执行视锥体裁剪。

**方法：**

##### `updateFrustum(camera: { matrixWorldInverse: THREE.Matrix4; projectionMatrix: THREE.Matrix4 }): void`

从相机更新视锥体。

##### `intersects(node: OctreeNode): boolean`

测试节点是否与视锥体相交。

##### `intersectsSphere(sphere: THREE.Sphere): boolean`

测试球体是否与视锥体相交。

##### `intersectsBox(box: THREE.Box3): boolean`

测试包围盒是否与视锥体相交。

---

#### `PointBudget`

管理多个点云的点预算分配。

**构造函数：**
```typescript
constructor(budget?: number)  // 默认: 1,000,000
```

**属性：**
- `budget: number` - 总点预算 (getter/setter)
- `used: number` - 当前使用的点数 (只读)
- `remaining: number` - 剩余预算 (只读)

**方法：**

##### `hasCapacity(points: number): boolean`

检查预算是否有给定点数的容量。

##### `allocate(points: number): boolean`

从预算中分配点。如果容量不足，返回 `false`。

##### `reset(): void`

重置已使用的点数 (通常在每帧开始时调用)。

##### `getUsageRatio(): number`

获取预算使用率 (0-1)。

---

#### `TypedEventEmitter<TEventMap>`

基于 eventemitter3 的类型安全事件发射器。

**方法：**

##### `on<K>(event: K, listener: (data: TEventMap[K]) => void): this`

添加事件监听器。

##### `once<K>(event: K, listener: (data: TEventMap[K]) => void): this`

添加一次性事件监听器。

##### `off<K>(event: K, listener: (data: TEventMap[K]) => void): this`

移除事件监听器。

##### `emit<K>(event: K, data: TEventMap[K]): boolean`

发射事件。

##### `removeAllListeners<K>(event?: K): this`

移除事件的所有监听器或所有事件的监听器。

##### `listenerCount<K>(event: K): number`

获取事件的监听器数量。

### 类型和接口

#### `PointAttributeDataType`

点属性数据类型枚举：

```typescript
enum PointAttributeDataType {
  DOUBLE = 'double',   // 8 字节
  FLOAT = 'float',     // 4 字节
  INT8 = 'int8',       // 1 字节
  UINT8 = 'uint8',     // 1 字节
  INT16 = 'int16',     // 2 字节
  UINT16 = 'uint16',   // 2 字节
  INT32 = 'int32',     // 4 字节
  UINT32 = 'uint32',   // 4 字节
  INT64 = 'int64',     // 8 字节
  UINT64 = 'uint64',   // 8 字节
}
```

#### `PointAttributeName`

标准点属性名称枚举。

#### `LODSelectionParams`

LOD 选择参数：

```typescript
interface LODSelectionParams {
  cameraPosition: THREE.Vector3;
  screenWidth: number;
  screenHeight: number;
  fov: number;
  minimumNodePixelSize: number;
}
```

#### `PointCloudEvents`

点云相关事件：

```typescript
interface PointCloudEvents {
  'visibility-changed': { visible: boolean; pointCloud: PointCloudOctree };
  'name-changed': { name: string; pointCloud: PointCloudOctree };
  'transformation-changed': { pointCloud: PointCloudOctree };
  'node-loaded': { node: OctreeNode; pointCloud: PointCloudOctree };
  'node-disposed': { node: OctreeNode; pointCloud: PointCloudOctree };
}
```

#### `LoaderEvents`, `MeasurementEvents`, `CameraEvents`

其他事件类型定义可用于扩展类型安全的事件系统。

## 示例

### 完整的点云设置

```typescript
import * as THREE from 'three';
import {
  PointCloudOctree,
  PointAttributes,
  PointBudget,
  FrustumCuller,
  LODSelector
} from '@better-potree/core';

// 创建点属性
const attributes = new PointAttributes([
  'POSITION_CARTESIAN',
  'RGB_PACKED',
  'INTENSITY',
  'CLASSIFICATION'
]);

// 创建八叉树
const boundingBox = new THREE.Box3(
  new THREE.Vector3(-50, -50, -50),
  new THREE.Vector3(50, 50, 50)
);

const octree = new PointCloudOctree(boundingBox, 1.0, attributes);
octree.setName('my-point-cloud');

// 设置渲染参数
const pointBudget = new PointBudget(2_000_000);
octree.pointBudget = pointBudget.budget;
octree.minimumNodePixelSize = 120;

// 设置视锥体裁剪
const culler = new FrustumCuller();

// 渲染循环
function render(camera: THREE.Camera) {
  // 更新视锥体
  culler.updateFrustum(camera);

  // 重置点预算
  pointBudget.reset();

  // LOD 选择参数
  const lodParams = {
    cameraPosition: camera.position,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    fov: (camera as THREE.PerspectiveCamera).fov,
    minimumNodePixelSize: octree.minimumNodePixelSize
  };

  // 遍历并选择可见节点
  octree.visibleNodes = [];
  octree.traverse((node) => {
    if (culler.intersects(node) && LODSelector.shouldRender(node, lodParams)) {
      if (pointBudget.hasCapacity(node.numPoints)) {
        pointBudget.allocate(node.numPoints);
        octree.visibleNodes.push(node);
      }
    }
  });

  octree.numVisiblePoints = pointBudget.used;
}
```

## 开发

### 运行测试

```bash
pnpm test
```

### 构建

```bash
pnpm build
```

## 依赖

- **@better-potree/types** - 类型定义
- **@better-potree/utils** - 实用工具函数
- **eventemitter3** - 事件发射器库
- **three** (peer dependency) - Three.js ~0.180.0

## 注意事项

- 此包需要 Three.js ~0.180.0 作为 peer dependency
- 八叉树节点名称遵循 Potree 命名约定 ("r", "r0", "r01", 等)
- 八分位索引使用位标志: bit 0 = X, bit 1 = Y, bit 2 = Z
- 点预算应该在每个渲染帧开始时使用 `reset()` 重置
- 在不再需要时记得调用 `dispose()` 清理八叉树资源

## 许可证

BSD-2-Clause

---

better-potree monorepo 的一部分
