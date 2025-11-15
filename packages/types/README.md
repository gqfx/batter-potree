# @better-potree/types

Shared TypeScript types and interfaces for the better-potree library.

This package provides comprehensive type definitions for working with Potree point cloud data, including camera interfaces, loader contracts, renderer abstractions, and Potree-specific data structures.

## Installation

```bash
pnpm add @better-potree/types
```

## Overview

The `@better-potree/types` package contains framework-agnostic TypeScript interfaces and types that enable:

- Type-safe point cloud rendering and manipulation
- Abstraction over different rendering implementations
- Consistent data structures for Potree format handling
- Camera and scene management interfaces

## Exported Types

### Camera Types

#### `CameraType`

```typescript
enum CameraType {
  PERSPECTIVE = 'perspective',
  ORTHOGRAPHIC = 'orthographic',
}
```

Camera type enumeration for distinguishing between perspective and orthographic cameras.

#### `ICamera`

Generic camera interface defining minimum required functionality:

```typescript
interface ICamera {
  readonly type: CameraType;
  readonly position: THREE.Vector3;
  readonly matrixWorldInverse: THREE.Matrix4;
  readonly projectionMatrix: THREE.Matrix4;
  readonly matrixWorld: THREE.Matrix4;
  near: number;
  far: number;
  updateMatrixWorld(force?: boolean): void;
  updateProjectionMatrix(): void;
}
```

#### `IPerspectiveCamera`

```typescript
interface IPerspectiveCamera extends ICamera {
  readonly type: CameraType.PERSPECTIVE;
  fov: number;
  aspect: number;
}
```

#### `IOrthographicCamera`

```typescript
interface IOrthographicCamera extends ICamera {
  readonly type: CameraType.ORTHOGRAPHIC;
  left: number;
  right: number;
  top: number;
  bottom: number;
  zoom: number;
}
```

### Loader Types

#### `LoadState`

```typescript
enum LoadState {
  UNLOADED = 'unloaded',
  LOADING = 'loading',
  LOADED = 'loaded',
  FAILED = 'failed',
}
```

Tracks the loading state of asynchronous resources.

#### `ILoader<T>`

Generic loader interface for loading data from URLs:

```typescript
interface ILoader<T> {
  load(url: string): Promise<T>;
  abort?(): void;
}
```

#### `INodeLoader`

Specialized loader for octree node data:

```typescript
interface INodeLoader {
  loadNode(nodeName: string, baseUrl: string): Promise<void>;
  getLoadState(nodeName: string): LoadState;
}
```

#### `ILoaderOptions`

Configuration options for loaders:

```typescript
interface ILoaderOptions {
  maxConcurrentRequests?: number;
  timeout?: number;
  onProgress?: (progress: ILoadProgress) => void;
  onError?: (error: Error) => void;
}
```

### Renderer Types

#### `IRenderer`

Generic renderer interface for rendering point clouds:

```typescript
interface IRenderer {
  getSize(): { width: number; height: number };
  getContext?(): unknown;
  render(scene: unknown, camera: unknown): void;
}
```

#### `ISceneManager`

Scene management interface:

```typescript
interface ISceneManager {
  add(object: unknown): void;
  remove(object: unknown): void;
  getObjects(): unknown[];
}
```

#### `IPointCloudMaterial`

Material interface for point cloud rendering:

```typescript
interface IPointCloudMaterial {
  update(params: IPointCloudRenderParams): void;
  activeAttributeName?: string;
}
```

### Potree-Specific Types

#### Point Attributes

```typescript
enum PointAttributeDataType {
  DOUBLE = 'double',
  FLOAT = 'float',
  INT8 = 'int8',
  UINT8 = 'uint8',
  INT16 = 'int16',
  UINT16 = 'uint16',
  INT32 = 'int32',
  UINT32 = 'uint32',
  INT64 = 'int64',
  UINT64 = 'uint64',
}

interface IPointAttribute {
  name: string;
  type: PointAttributeType;
  numElements: number;
  byteSize: number;
  description?: string;
}

interface IPointAttributes {
  attributes: IPointAttribute[];
  byteSize: number;
  size: number;
}
```

#### Potree Metadata

```typescript
interface IPotreeMetadata {
  version: string;
  octreeDir: string;
  boundingBox: {
    lx: number; ly: number; lz: number;
    ux: number; uy: number; uz: number;
  };
  tightBoundingBox?: { /* ... */ };
  pointAttributes: string[] | IPotreeAttributeMetadata[];
  spacing: number;
  scale: number;
  points: number;
  projection?: string;
  hierarchy?: unknown;
  hierarchyStepSize?: number;
}
```

#### Point Cloud Octree

```typescript
interface IPointCloudOctree {
  url: string;
  spacing: number;
  boundingBox: THREE.Box3;
  tightBoundingBox: THREE.Box3;
  root: IPointCloudOctreeNode | null;
  pointAttributes: IPointAttributes;
  projection: string | null;
  version: string;
  scale: number;
}

interface IPointCloudOctreeNode {
  name: string;
  level: number;
  boundingBox: THREE.Box3;
  numPoints: number;
  children: (IPointCloudOctreeNode | null)[];
  loaded: boolean;
  loading: boolean;
}
```

#### Worker Interfaces

```typescript
interface IWorkerDecodeRequest {
  buffer: ArrayBuffer;
  pointAttributes: IPointAttributes;
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
    attribute: IPointAttribute;
    preciseBuffer?: ArrayBuffer;
    offset?: number;
    scale?: number;
  }>;
  error?: string;
}
```

### Configuration and Enums

#### `PotreeConfig`

```typescript
interface PotreeConfig {
  pointBudget?: number;
  fov?: number;
  edlEnabled?: boolean;
  edlRadius?: number;
  edlStrength?: number;
  pointSize?: number;
  minNodeSize?: number;
  showBoundingBox?: boolean;
}
```

#### Rendering Enums

```typescript
enum NavigationMode {
  ORBIT = 'orbit',
  FLY = 'fly',
  EARTH = 'earth',
  FPS = 'fps'
}

enum PointSizeType {
  FIXED = 'fixed',
  ATTENUATED = 'attenuated',
  ADAPTIVE = 'adaptive'
}

enum PointShape {
  SQUARE = 'square',
  CIRCLE = 'circle',
  PARABOLOID = 'paraboloid'
}

enum PointQuality {
  SQUARES = 'squares',
  CIRCLES = 'circles',
  INTERPOLATION = 'interpolation',
  HQ_SPLATS = 'hq_splats'
}

enum PointCloudColorMode {
  RGB = 'RGB',
  INTENSITY = 'INTENSITY',
  CLASSIFICATION = 'CLASSIFICATION',
  ELEVATION = 'ELEVATION',
  LEVEL_OF_DETAIL = 'LEVEL_OF_DETAIL',
  RETURN_NUMBER = 'RETURN_NUMBER',
  SOURCE_ID = 'SOURCE_ID',
  NORMAL = 'NORMAL',
}
```

#### Measurement and Clipping

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

enum ClipVolumeType {
  BOX = 'box',
  SPHERE = 'sphere',
  POLYGON = 'polygon'
}

enum ClipMode {
  DISABLED = 'disabled',
  CLIP_OUTSIDE = 'clip_outside',
  HIGHLIGHT_INSIDE = 'highlight_inside'
}
```

## Usage Examples

### Using Camera Interfaces

```typescript
import type { IPerspectiveCamera, CameraType } from '@better-potree/types';
import * as THREE from 'three';

function setupCamera(camera: IPerspectiveCamera) {
  camera.fov = 60;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.near = 0.1;
  camera.far = 1000;
  camera.updateProjectionMatrix();
}

const camera = new THREE.PerspectiveCamera() as IPerspectiveCamera;
setupCamera(camera);
```

### Working with Point Cloud Metadata

```typescript
import type { IPotreeMetadata, IPointAttributes } from '@better-potree/types';

async function loadMetadata(url: string): Promise<IPotreeMetadata> {
  const response = await fetch(url);
  const metadata: IPotreeMetadata = await response.json();

  console.log(`Point cloud version: ${metadata.version}`);
  console.log(`Total points: ${metadata.points}`);
  console.log(`Spacing: ${metadata.spacing}`);

  return metadata;
}
```

### Implementing a Custom Loader

```typescript
import type { ILoader, LoadState } from '@better-potree/types';

class CustomPointCloudLoader implements ILoader<ArrayBuffer> {
  async load(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load: ${response.statusText}`);
    }
    return response.arrayBuffer();
  }

  abort(): void {
    // Abort logic here
  }
}
```

### Type-Safe Configuration

```typescript
import type { PotreeConfig, PointCloudColorMode } from '@better-potree/types';

const config: PotreeConfig = {
  pointBudget: 1_000_000,
  fov: 60,
  edlEnabled: true,
  edlRadius: 1.4,
  edlStrength: 0.4,
  pointSize: 1.0,
  minNodeSize: 150,
  showBoundingBox: false,
};

const colorMode: PointCloudColorMode = PointCloudColorMode.RGB;
```

### Worker Communication

```typescript
import type {
  IWorkerDecodeRequest,
  IWorkerDecodeResponse
} from '@better-potree/types';

function sendDecodeRequest(
  worker: Worker,
  request: IWorkerDecodeRequest
): Promise<IWorkerDecodeResponse> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      const response: IWorkerDecodeResponse = e.data;
      if (response.error) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    };
    worker.postMessage(request, [request.buffer]);
  });
}
```

## Type Relationships

The types in this package are designed to work together:

1. **Camera System**: `ICamera` serves as the base for `IPerspectiveCamera` and `IOrthographicCamera`
2. **Loading Pipeline**: `ILoader` → `INodeLoader` → `LoadState` work together for async data loading
3. **Rendering Stack**: `IRenderer` + `ISceneManager` + `IPointCloudMaterial` provide rendering abstraction
4. **Potree Data Flow**: `IPotreeMetadata` → `IPointCloudOctree` → `IPointCloudOctreeNode` → `IWorkerDecodeRequest/Response`

## Integration with Three.js

While this package uses Three.js types (`THREE.Vector3`, `THREE.Box3`, etc.), it provides abstraction interfaces that allow the core library to work with any rendering implementation. This design enables:

- Framework-agnostic core logic
- Easy testing with mock implementations
- Future support for alternative renderers

## License

BSD-2-Clause
