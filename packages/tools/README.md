# @better-potree/tools

交互式测量和标注工具,用于 better-potree 点云库。

此包将提供点云场景中的测量、标注和分析工具,包括距离测量、面积计算、体积测量、角度测量等功能。

## 状态

**当前为占位包 - 功能计划在后续阶段实现**

此包目前包含基础的类型定义和占位符,实际测量工具功能将在项目后续阶段开发。

## 安装

```bash
pnpm add @better-potree/tools
```

## 计划功能

此包计划实现以下测量和标注工具:

- **点测量**: 选择和标注场景中的单个点
- **距离测量**: 测量两点或多点之间的距离
- **面积测量**: 计算多边形区域的面积
- **体积测量**: 计算封闭多边形的体积
- **角度测量**: 测量三点形成的角度
- **高度测量**: 测量垂直高度差
- **圆形测量**: 拟合圆形并计算半径和周长
- **方位角测量**: 计算方向角度

## 当前 API

### 类

#### `MeasurementTool`

占位符类,用于未来的测量工具实现。

```typescript
import { MeasurementTool } from '@better-potree/tools';

// 当前为占位符 - 暂无可用功能
const tool = new MeasurementTool();
```

## 未来 API 设计(规划中)

基于 Potree 的测量工具设计,未来的 API 可能包括:

### 测量管理器

```typescript
interface MeasurementManager {
  // 创建新的测量
  createMeasurement(type: MeasurementType): Measurement;

  // 添加/移除测量
  addMeasurement(measurement: Measurement): void;
  removeMeasurement(measurement: Measurement): void;

  // 获取所有测量
  getMeasurements(): Measurement[];

  // 清除所有测量
  clear(): void;

  // 事件处理
  on(event: 'measurement-added' | 'measurement-removed', callback: Function): void;
}
```

### 测量类型

```typescript
enum MeasurementType {
  POINT = 'point',
  DISTANCE = 'distance',
  AREA = 'area',
  VOLUME = 'volume',
  ANGLE = 'angle',
  HEIGHT = 'height',
  CIRCLE = 'circle',
  AZIMUTH = 'azimuth'
}
```

### 测量基类

```typescript
interface Measurement {
  // 基础属性
  readonly id: string;
  readonly type: MeasurementType;
  name: string;
  visible: boolean;

  // 测量数据
  points: Vector3[];

  // 测量结果
  getValue(): number;
  getFormattedValue(): string;

  // 交互
  addPoint(point: Vector3): void;
  removePoint(index: number): void;
  finish(): void;

  // 事件
  on(event: 'change' | 'finish', callback: Function): void;
}
```

### 距离测量示例(规划)

```typescript
// 未来用法示例
import { MeasurementManager, MeasurementType } from '@better-potree/tools';

const manager = new MeasurementManager();

// 创建距离测量
const distanceMeasurement = manager.createMeasurement(MeasurementType.DISTANCE);

distanceMeasurement.on('change', () => {
  const distance = distanceMeasurement.getValue();
  console.log(`距离: ${distanceMeasurement.getFormattedValue()}`);
});

// 添加测量点
distanceMeasurement.addPoint(new Vector3(0, 0, 0));
distanceMeasurement.addPoint(new Vector3(10, 0, 0));
distanceMeasurement.finish();

// 获取结果
const distance = distanceMeasurement.getValue(); // 10
const formatted = distanceMeasurement.getFormattedValue(); // "10.00 m"
```

### 面积测量示例(规划)

```typescript
// 未来用法示例
const areaMeasurement = manager.createMeasurement(MeasurementType.AREA);

// 添加多边形顶点
areaMeasurement.addPoint(new Vector3(0, 0, 0));
areaMeasurement.addPoint(new Vector3(10, 0, 0));
areaMeasurement.addPoint(new Vector3(10, 10, 0));
areaMeasurement.addPoint(new Vector3(0, 10, 0));
areaMeasurement.finish();

const area = areaMeasurement.getValue(); // 100
const formatted = areaMeasurement.getFormattedValue(); // "100.00 m²"
```

### 体积测量示例(规划)

```typescript
// 未来用法示例
const volumeMeasurement = manager.createMeasurement(MeasurementType.VOLUME);

// 定义底面多边形
volumeMeasurement.addPoint(new Vector3(0, 0, 0));
volumeMeasurement.addPoint(new Vector3(10, 0, 0));
volumeMeasurement.addPoint(new Vector3(10, 10, 0));
volumeMeasurement.addPoint(new Vector3(0, 10, 0));
volumeMeasurement.finish();

const volume = volumeMeasurement.getValue(); // 基于地形计算
const formatted = volumeMeasurement.getFormattedValue(); // "1234.56 m³"
```

## 集成计划

此包计划与以下包集成:

- `@better-potree/core` - 访问点云数据和场景
- `@better-potree/rendering-three` - 可视化测量标注
- `@better-potree/controls` - 处理用户交互
- `@better-potree/types` - 使用共享类型定义

## 技术依赖

- **@better-potree/types**: 共享类型定义
- **@better-potree/core**: 点云核心功能
- **three**: Three.js (peer dependency)

## 开发计划

未来实现将包括:

1. **Phase 1**: 基础测量工具
   - 点选择和标注
   - 距离测量(两点、多点)
   - 高度测量

2. **Phase 2**: 高级测量
   - 面积测量(多边形)
   - 角度测量
   - 方位角测量

3. **Phase 3**: 复杂分析
   - 体积测量和挖填方计算
   - 圆形拟合
   - 剖面线工具

4. **Phase 4**: 标注和导出
   - 自定义标注和注释
   - 测量结果导出(JSON/CSV)
   - 截图和报告生成

## 参与开发

此包正在开发中。如果你有兴趣贡献测量工具功能,请查看项目的贡献指南。

## License

BSD-2-Clause
