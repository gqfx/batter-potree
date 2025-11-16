# @better-potree/rendering

渲染抽象层，定义了 better-potree 的渲染接口和系统基类。

## 概述

这个包提供了渲染引擎无关的抽象接口，使得 better-potree 可以支持不同的渲染后端（如 Three.js、Babylon.js 等）。

## 核心接口

- **IRenderer**: 渲染器接口，定义渲染上下文的核心功能
- **IMaterial**: 材质接口，定义材质系统的抽象
- **IBuffer**: 缓冲区接口，定义几何数据的存储和管理
- **IShader**: 着色器接口，定义着色器程序的抽象

## 核心系统

- **RenderSystem**: 抽象的渲染系统基类，定义渲染流程

## 设计原则

1. **渲染引擎无关**: 接口不依赖具体的渲染库
2. **类型安全**: 完整的 TypeScript 类型定义
3. **高性能**: 接口设计考虑了零拷贝和低 GC 压力
4. **可扩展**: 易于实现不同的渲染后端

## 使用示例

```typescript
import type { IRenderer, IMaterial } from '@better-potree/rendering';

// 实现自定义渲染器
class MyRenderer implements IRenderer {
  // 实现接口方法
}
```

## 相关包

- `@better-potree/core`: 核心功能
- `@better-potree/rendering-three`: Three.js 渲染实现

## 许可证

BSD-2-Clause
