# 渲染性能优化建议

**任务**: TASK-303
**状态**: 优化建议已记录
**日期**: 2025-11-17

## 渲染性能目标

- **10M 点 @ 60fps**: 每帧 16.67ms 预算
- **Draw calls**: < 100 per frame
- **GPU 内存**: < 512MB
- **着色器性能**: < 5ms

## 优化方案

### 1. GPU 批处理优化

**问题**: 每个八叉树节点一个 draw call

**优化方案**:
```typescript
// 使用实例化渲染批处理节点
class BatchedPointCloudRenderer {
  private instanceBuffer: WebGLBuffer;
  private maxInstances = 1000;

  batchRender(nodes: RenderableNode[]): void {
    // 按材质分组
    const batches = this.groupByMaterial(nodes);

    for (const [material, batchNodes] of batches) {
      // 更新实例化数据（transform, color, etc）
      this.updateInstanceData(batchNodes);

      // 单次 draw call 渲染所有实例
      gl.drawArraysInstanced(
        gl.POINTS,
        0,
        this.pointsPerInstance,
        batchNodes.length
      );
    }
  }

  private groupByMaterial(nodes: RenderableNode[]): Map<Material, RenderableNode[]> {
    const groups = new Map();
    for (const node of nodes) {
      const key = node.materialId || 'default';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(node);
    }
    return groups;
  }
}
```

**预期提升**: Draw calls 从 1000+ 降至 < 50

### 2. 着色器优化

**当前实现**: 通用点云着色器

**优化方案**:
```glsl
// 顶点着色器优化
#version 300 es
precision highp float;

// 使用 uniform buffer object 批量传输
layout(std140) uniform CameraBlock {
  mat4 viewMatrix;
  mat4 projectionMatrix;
  vec3 cameraPosition;
  float pointSize;
};

// 使用纹理传输节点数据（避免 uniform 限制）
uniform sampler2D nodeTransforms; // RGBA = position.xyz + scale

in vec3 position;
in vec3 color;

out vec3 vColor;

void main() {
  // 从纹理读取变换
  vec4 transform = texelFetch(nodeTransforms, ivec2(gl_InstanceID, 0), 0);

  // 应用变换
  vec3 worldPos = position * transform.w + transform.xyz;

  // MVP 变换
  vec4 viewPos = viewMatrix * vec4(worldPos, 1.0);
  gl_Position = projectionMatrix * viewPos;

  // 距离自适应点大小
  float dist = length(viewPos.xyz);
  gl_PointSize = pointSize / dist;

  vColor = color;
}
```

**片段着色器优化**:
```glsl
#version 300 es
precision mediump float;

in vec3 vColor;
out vec4 fragColor;

void main() {
  // 圆形点（避免复杂计算）
  vec2 coord = gl_PointCoord - vec2(0.5);
  if (dot(coord, coord) > 0.25) discard;

  fragColor = vec4(vColor, 1.0);
}
```

**预期提升**: 着色器执行时间 < 3ms

### 3. 纹理和缓冲区优化

**实现数据纹理缓存**:
```typescript
class TextureCache {
  private cache = new Map<string, WebGLTexture>();

  getOrCreate(nodeId: string, data: Float32Array): WebGLTexture {
    if (this.cache.has(nodeId)) {
      return this.cache.get(nodeId)!;
    }

    const texture = this.createDataTexture(data);
    this.cache.set(nodeId, texture);
    return texture;
  }

  private createDataTexture(data: Float32Array): WebGLTexture {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // 使用 R32F 格式减少带宽
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      data.length,
      1,
      0,
      gl.RED,
      gl.FLOAT,
      data
    );

    // 禁用 mipmap
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return tex;
  }
}
```

### 4. 几何体优化

**使用压缩顶点格式**:
```typescript
// 位置：使用相对坐标 + 量化
class CompressedPointGeometry {
  // 10-10-10-2 格式：30 位位置 + 2 位保留
  private packedPositions: Uint32Array;

  // RGB：使用 8 位颜色
  private packedColors: Uint32Array; // RGBA8

  packPosition(x: number, y: number, z: number): number {
    // 归一化到 [0, 1023]
    const px = Math.floor((x + 1) * 511.5);
    const py = Math.floor((y + 1) * 511.5);
    const pz = Math.floor((z + 1) * 511.5);

    // 打包为 32 位
    return (px & 0x3FF) | ((py & 0x3FF) << 10) | ((pz & 0x3FF) << 20);
  }
}
```

**预期提升**: 顶点缓冲区大小减少 40%

## Three.js 特定优化

```typescript
// 使用 Three.js 的 BufferGeometry 和 InstancedMesh
class ThreePointCloudRenderer {
  createInstancedPoints(nodes: OctreeNode[]): THREE.InstancedMesh {
    // 共享几何体
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    // 实例化材质
    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      sizeAttenuation: true
    });

    // 实例化网格
    const mesh = new THREE.InstancedMesh(geometry, material, nodes.length);

    // 更新实例变换矩阵
    for (let i = 0; i < nodes.length; i++) {
      const matrix = nodes[i].transform;
      mesh.setMatrixAt(i, matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }
}
```

## 性能验证清单

- [ ] Draw calls < 100
- [ ] 帧时间 < 16.67ms @ 10M points
- [ ] GPU 内存 < 512MB
- [ ] 着色器编译时间 < 100ms
- [ ] 纹理上传时间 < 5ms

## 实施步骤

1. 实现批处理渲染器
2. 优化着色器（移除不必要的计算）
3. 实现顶点压缩
4. 添加纹理缓存
5. 集成 Three.js InstancedMesh
6. 性能测试和验证

## 工具和监控

```typescript
// 性能监控
class RenderProfiler {
  trackDrawCall(name: string): void {
    const query = gl.createQuery();
    gl.beginQuery(gl.TIME_ELAPSED_EXT, query);
    // ... render code ...
    gl.endQuery(gl.TIME_ELAPSED_EXT);

    // 异步读取结果
    this.readQueryAsync(query, name);
  }

  logStats(): void {
    console.log('Draw Calls:', this.drawCallCount);
    console.log('Triangles:', this.triangleCount);
    console.log('GPU Memory:', this.getGPUMemory());
  }
}
```

## 参考资源

- WebGL 最佳实践: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- Three.js 性能优化: https://threejs.org/docs/#manual/en/introduction/Performance
- Potree 渲染优化: https://github.com/potree/potree
