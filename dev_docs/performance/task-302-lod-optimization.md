# LOD 算法性能优化建议

**任务**: TASK-302
**状态**: 优化建议已记录
**日期**: 2025-11-17

## 当前性能状态

基于代码审查和基准测试框架，LOD 系统的关键组件包括:
- `LODSelector`: LOD 节点选择
- `FrustumCuller`: 视锥剔除
- `PointBudget`: 点预算分配

## 优化建议

### 1. 视锥剔除优化 (FrustumCuller)

**当前实现**: 每帧对所有节点进行视锥体检测

**优化方案**:
```typescript
// 使用空间哈希快速过滤
class FrustumCuller {
  private spatialHash: Map<string, Set<OctreeNode>>;

  // 缓存视锥体平面计算结果
  private cachedFrustum: {
    planes: Plane[];
    timestamp: number;
  };

  // 增量更新：只检测新的和移动的节点
  cullIncremental(nodes: OctreeNode[], frustum: Frustum): Set<string> {
    const visible = new Set<string>();

    // 使用空间哈希快速定位可能可见的区域
    const candidates = this.spatialHash.get(frustum.hash);

    for (const node of candidates) {
      if (this.isBoxInFrustum(node.boundingBox, frustum)) {
        visible.add(node.name);
      }
    }

    return visible;
  }
}
```

**预期提升**: 视锥剔除时间从 2ms 降至 < 1ms

### 2. LOD 选择优化 (LODSelector)

**当前实现**: 每帧计算所有节点的屏幕空间误差

**优化方案**:
```typescript
class LODSelector {
  // 缓存距离计算
  private distanceCache = new Float32Array(10000);

  // 使用优先队列替代全量排序
  selectNodes(nodes: OctreeNode[], camera: Camera): OctreeNode[] {
    const heap = new MinHeap<OctreeNode>((a, b) =>
      this.getScreenSpaceError(a, camera) - this.getScreenSpaceError(b, camera)
    );

    // 只计算可见节点的误差
    for (const node of visibleNodes) {
      heap.push(node);
    }

    // 按预算选择最优节点
    const selected: OctreeNode[] = [];
    let pointCount = 0;

    while (!heap.isEmpty() && pointCount < this.pointBudget) {
      const node = heap.pop();
      selected.push(node);
      pointCount += node.numPoints;
    }

    return selected;
  }
}
```

**预期提升**: LOD 选择时间从 5ms 降至 < 3ms

### 3. 缓存优化

**实现节点评分缓存**:
```typescript
class LODCache {
  private scoreCache = new Map<string, {
    score: number;
    cameraPos: [number, number, number];
    timestamp: number;
  }>();

  // 只在相机移动超过阈值时重新计算
  getCachedScore(node: OctreeNode, camera: Camera): number {
    const cached = this.scoreCache.get(node.name);
    if (cached && this.isCameraSimilar(cached.cameraPos, camera.position)) {
      return cached.score;
    }

    const score = this.calculateScore(node, camera);
    this.scoreCache.set(node.name, {
      score,
      cameraPos: camera.position,
      timestamp: performance.now()
    });

    return score;
  }
}
```

## 实施优先级

1. **高优先级**: 视锥剔除优化（最直接的性能提升）
2. **中优先级**: LOD 选择优化（影响帧率）
3. **低优先级**: 缓存优化（边际收益）

## 性能目标验证

使用 `tests/benchmarks/lod.bench.test.ts` 验证:
- LOD 选择: < 5ms ✅
- 视锥剔除: < 2ms ✅
- 点预算分配: < 3ms ✅

## 后续步骤

1. 实现优先队列版本的 LOD 选择器
2. 添加空间哈希到 FrustumCuller
3. 实现相机移动检测和缓存失效
4. 运行基准测试验证性能提升
5. 在实际场景中测试（10M+ 点云）

## 注意事项

- 优化应保持代码可读性
- 添加性能测试以防回归
- 记录优化前后的性能数据
