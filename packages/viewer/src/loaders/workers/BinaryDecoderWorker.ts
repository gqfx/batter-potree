/**
 * Binary Decoder Worker
 * Decodes Potree binary point cloud data in a Web Worker
 *
 * Based on Potree's BinaryDecoderWorker.js
 */

import type { IWorkerDecodeRequest, IWorkerDecodeResponse } from '@better-potree/core';
import { PointAttribute } from '@better-potree/core';
import { Version } from '../Version.js';

// Type mapping for TypedArray constructors
const typedArrayMapping: Record<string, any> = {
  int8: Int8Array,
  int16: Int16Array,
  int32: Int32Array,
  int64: Float64Array,
  uint8: Uint8Array,
  uint16: Uint16Array,
  uint32: Uint32Array,
  uint64: Float64Array,
  float: Float32Array,
  double: Float64Array,
};

// Getter function mapping for DataView
const createGetterMap = (view: DataView) => ({
  int8: view.getInt8.bind(view),
  int16: view.getInt16.bind(view),
  int32: view.getInt32.bind(view),
  int64: view.getBigInt64.bind(view),
  uint8: view.getUint8.bind(view),
  uint16: view.getUint16.bind(view),
  uint32: view.getUint32.bind(view),
  uint64: view.getBigUint64.bind(view),
  float: view.getFloat32.bind(view),
  double: view.getFloat64.bind(view),
});

/**
 * Decode NORMAL_SPHEREMAPPED attribute
 */
function decodeSphereMapping(
  view: DataView,
  inOffset: number,
  byteSize: number,
  numPoints: number,
): Float32Array {
  const normals = new Float32Array(numPoints * 3);

  for (let j = 0; j < numPoints; j++) {
    const bx = view.getUint8(inOffset + j * byteSize);
    const by = view.getUint8(inOffset + j * byteSize + 1);

    const ex = bx / 255;
    const ey = by / 255;

    let nx = ex * 2 - 1;
    let ny = ey * 2 - 1;
    let nz = 1;
    const nw = -1;

    const l = nx * -nx + ny * -ny + nz * -nw;
    nz = l;
    nx = nx * Math.sqrt(l);
    ny = ny * Math.sqrt(l);

    nx = nx * 2;
    ny = ny * 2;
    nz = nz * 2 - 1;

    normals[3 * j + 0] = nx;
    normals[3 * j + 1] = ny;
    normals[3 * j + 2] = nz;
  }

  return normals;
}

/**
 * Decode NORMAL_OCT16 attribute
 */
function decodeOct16Normals(
  view: DataView,
  inOffset: number,
  byteSize: number,
  numPoints: number,
): Float32Array {
  const normals = new Float32Array(numPoints * 3);

  for (let j = 0; j < numPoints; j++) {
    const bx = view.getUint8(inOffset + j * byteSize);
    const by = view.getUint8(inOffset + j * byteSize + 1);

    const u = (bx / 255) * 2 - 1;
    const v = (by / 255) * 2 - 1;

    const z = 1 - Math.abs(u) - Math.abs(v);

    let x = 0;
    let y = 0;
    if (z >= 0) {
      x = u;
      y = v;
    } else {
      x = -(v / Math.sign(v) - 1) / Math.sign(u);
      y = -(u / Math.sign(u) - 1) / Math.sign(v);
    }

    const length = Math.sqrt(x * x + y * y + z * z);
    x = x / length;
    y = y / length;
    const nz = z / length;

    normals[3 * j + 0] = x;
    normals[3 * j + 1] = y;
    normals[3 * j + 2] = nz;
  }

  return normals;
}

/**
 * Main decoder function
 */
function decodePointCloudData(event: MessageEvent<IWorkerDecodeRequest>): IWorkerDecodeResponse {
  performance.mark('binary-decoder-start');

  const buffer = event.data.buffer;
  const pointAttributes = event.data.pointAttributes;
  const numPoints = buffer.byteLength / pointAttributes.byteSize;
  const view = new DataView(buffer);
  const version = new Version(event.data.version);
  const nodeOffset = event.data.offset;
  const scale = event.data.scale;

  const tightBoxMin: [number, number, number] = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];
  const tightBoxMax: [number, number, number] = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];
  const mean: [number, number, number] = [0, 0, 0];

  const attributeBuffers: Record<string, any> = {};
  let inOffset = 0;

  // Process each attribute
  for (const pointAttribute of pointAttributes.attributes) {
    if (pointAttribute.name === 'POSITION_CARTESIAN') {
      // Decode position data
      const positions = new Float32Array(numPoints * 3);

      for (let j = 0; j < numPoints; j++) {
        let x: number, y: number, z: number;

        if (version.newerThan('1.3')) {
          x = view.getUint32(inOffset + j * pointAttributes.byteSize + 0, true) * scale;
          y = view.getUint32(inOffset + j * pointAttributes.byteSize + 4, true) * scale;
          z = view.getUint32(inOffset + j * pointAttributes.byteSize + 8, true) * scale;
        } else {
          x = view.getFloat32(inOffset + j * pointAttributes.byteSize + 0, true) + nodeOffset[0];
          y = view.getFloat32(inOffset + j * pointAttributes.byteSize + 4, true) + nodeOffset[1];
          z = view.getFloat32(inOffset + j * pointAttributes.byteSize + 8, true) + nodeOffset[2];
        }

        positions[3 * j + 0] = x;
        positions[3 * j + 1] = y;
        positions[3 * j + 2] = z;

        mean[0] += x / numPoints;
        mean[1] += y / numPoints;
        mean[2] += z / numPoints;

        tightBoxMin[0] = Math.min(tightBoxMin[0], x);
        tightBoxMin[1] = Math.min(tightBoxMin[1], y);
        tightBoxMin[2] = Math.min(tightBoxMin[2], z);

        tightBoxMax[0] = Math.max(tightBoxMax[0], x);
        tightBoxMax[1] = Math.max(tightBoxMax[1], y);
        tightBoxMax[2] = Math.max(tightBoxMax[2], z);
      }

      attributeBuffers[pointAttribute.name] = {
        buffer: positions.buffer,
        attribute: pointAttribute,
      };
    } else if (pointAttribute.name === 'rgba') {
      // Decode RGBA color data
      const colors = new Uint8Array(numPoints * 4);

      for (let j = 0; j < numPoints; j++) {
        colors[4 * j + 0] = view.getUint8(inOffset + j * pointAttributes.byteSize + 0);
        colors[4 * j + 1] = view.getUint8(inOffset + j * pointAttributes.byteSize + 1);
        colors[4 * j + 2] = view.getUint8(inOffset + j * pointAttributes.byteSize + 2);
        colors[4 * j + 3] = 255; // Alpha
      }

      attributeBuffers[pointAttribute.name] = {
        buffer: colors.buffer,
        attribute: pointAttribute,
      };
    } else if (pointAttribute.name === 'NORMAL_SPHEREMAPPED') {
      // Decode sphere-mapped normals
      const normals = decodeSphereMapping(view, inOffset, pointAttributes.byteSize, numPoints);
      attributeBuffers[pointAttribute.name] = {
        buffer: normals.buffer,
        attribute: pointAttribute,
      };
    } else if (pointAttribute.name === 'NORMAL_OCT16') {
      // Decode octahedron-encoded normals
      const normals = decodeOct16Normals(view, inOffset, pointAttributes.byteSize, numPoints);
      attributeBuffers[pointAttribute.name] = {
        buffer: normals.buffer,
        attribute: pointAttribute,
      };
    } else if (pointAttribute.name === 'NORMAL') {
      // Decode standard normals
      const normals = new Float32Array(numPoints * 3);

      for (let j = 0; j < numPoints; j++) {
        const x = view.getFloat32(inOffset + j * pointAttributes.byteSize + 0, true);
        const y = view.getFloat32(inOffset + j * pointAttributes.byteSize + 4, true);
        const z = view.getFloat32(inOffset + j * pointAttributes.byteSize + 8, true);

        normals[3 * j + 0] = x;
        normals[3 * j + 1] = y;
        normals[3 * j + 2] = z;
      }

      attributeBuffers[pointAttribute.name] = {
        buffer: normals.buffer,
        attribute: pointAttribute,
      };
    } else {
      // Decode generic attributes
      const f32 = new Float32Array(numPoints);
      const TypedArray = typedArrayMapping[pointAttribute.type.name];
      const preciseBuffer = new TypedArray(numPoints);

      let min = Infinity;
      let max = -Infinity;
      let offset = 0;
      let attrScale = 1;

      const getterMap = createGetterMap(view);
      const getter = getterMap[pointAttribute.type.name as keyof typeof getterMap];

      if (!getter) {
        inOffset += pointAttribute.byteSize;
        continue;
      }

      // Compute offset and scale for packing larger types into 32-bit floats
      if (pointAttribute.type.size > 4) {
        for (let j = 0; j < numPoints; j++) {
          let value: any = getter(inOffset + j * pointAttributes.byteSize, true);

          // Convert BigInt to Number for int64/uint64
          if (typeof value === 'bigint') {
            value = Number(value);
          }

          if (!Number.isNaN(value)) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        }

        const initialRange = (pointAttribute as any).initialRange;
        if (initialRange != null) {
          offset = initialRange[0];
          attrScale = 1 / (initialRange[1] - initialRange[0]);
        } else {
          offset = min;
          attrScale = 1 / (max - min);
        }
      }

      // Read and normalize values
      for (let j = 0; j < numPoints; j++) {
        let value: any = getter(inOffset + j * pointAttributes.byteSize, true);

        // Convert BigInt to Number for int64/uint64
        if (typeof value === 'bigint') {
          value = Number(value);
        }

        if (!Number.isNaN(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }

        f32[j] = (value - offset) * attrScale;
        preciseBuffer[j] = value;
      }

      // Store range information
      const attributeWithRange = pointAttribute as any;
      attributeWithRange.range = [min, max];

      attributeBuffers[pointAttribute.name] = {
        buffer: f32.buffer,
        preciseBuffer: preciseBuffer.buffer,
        attribute: pointAttribute,
        offset: offset,
        scale: attrScale,
      };
    }

    inOffset += pointAttribute.byteSize;
  }

  // Add indices
  {
    const indices = new Uint32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      indices[i] = i;
    }

    attributeBuffers.INDICES = {
      buffer: indices.buffer,
      attribute: PointAttribute.INDICES,
    };
  }

  // Handle attribute vectors (e.g., combining NormalX, NormalY, NormalZ into NORMAL)
  const vectors = (pointAttributes as any).vectors;
  if (vectors && vectors.length > 0) {
    for (const vector of vectors) {
      const { name, attributes } = vector;
      const numVectorElements = attributes.length;
      const vectorData = new Float32Array(numVectorElements * numPoints);

      let iElement = 0;
      for (const sourceName of attributes) {
        const sourceBuffer = attributeBuffers[sourceName];
        if (!sourceBuffer) continue;

        const { offset, scale } = sourceBuffer;
        const sourceView = new DataView(sourceBuffer.buffer);

        for (let j = 0; j < numPoints; j++) {
          const value = sourceView.getFloat32(j * 4, true);
          vectorData[j * numVectorElements + iElement] = value / scale + offset;
        }

        iElement++;
      }

      attributeBuffers[name] = {
        buffer: vectorData.buffer,
        attribute: {
          name,
          type: { name: 'float', size: 4, ordinal: 0 },
          numElements: numVectorElements,
          byteSize: numVectorElements * 4,
        },
      };
    }
  }

  performance.mark('binary-decoder-end');
  performance.clearMarks();
  performance.clearMeasures();

  const response: IWorkerDecodeResponse = {
    buffer,
    mean,
    attributeBuffers,
    tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
    numPoints,
  };

  return response;
}

// Worker message handler
self.onmessage = (event: MessageEvent) => {
  try {
    // 支持两种消息格式：
    // 1. 直接的 IWorkerDecodeRequest
    // 2. WorkerPool 的包装格式 { taskId, data }
    let decodeRequest: IWorkerDecodeRequest;
    let taskId: string | undefined;

    if ('taskId' in event.data && 'data' in event.data) {
      // WorkerPool 格式
      taskId = event.data.taskId;
      decodeRequest = event.data.data;
    } else {
      // 直接格式
      decodeRequest = event.data;
    }

    const result = decodePointCloudData({ data: decodeRequest } as MessageEvent<IWorkerDecodeRequest>);

    // Collect transferable objects
    const transferables: Transferable[] = [result.buffer];
    for (const property in result.attributeBuffers) {
      if (result.attributeBuffers[property]?.buffer) {
        transferables.push(result.attributeBuffers[property].buffer);
      }
      if (result.attributeBuffers[property]?.preciseBuffer) {
        transferables.push(result.attributeBuffers[property].preciseBuffer!);
      }
    }

    // Send response with transferable objects
    if (taskId) {
      // WorkerPool 格式响应
      (self as any).postMessage({ taskId, result }, { transfer: transferables });
    } else {
      // 直接格式响应
      (self as any).postMessage(result, { transfer: transferables });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if ('taskId' in event.data) {
      // WorkerPool 格式错误响应
      (self as any).postMessage({
        taskId: event.data.taskId,
        error: errorMessage,
      });
    } else {
      // 直接格式错误响应
      (self as any).postMessage({
        error: errorMessage,
      });
    }
  }
};
