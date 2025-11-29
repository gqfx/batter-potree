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
 *
 * @param view - DataView of the buffer
 * @param attrOffset - Offset of this attribute within a single point
 * @param pointByteSize - Total byte size of a single point (pointAttributes.byteSize)
 * @param numPoints - Number of points
 */
function decodeSphereMapping(
  view: DataView,
  attrOffset: number,
  pointByteSize: number,
  numPoints: number,
): Float32Array {
  const normals = new Float32Array(numPoints * 3);

  for (let j = 0; j < numPoints; j++) {
    // ✅ 修复: attrOffset 是属性在点中的偏移, j * pointByteSize 是点之间的间隔
    const bx = view.getUint8(attrOffset + j * pointByteSize);
    const by = view.getUint8(attrOffset + j * pointByteSize + 1);

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
 *
 * @param view - DataView of the buffer
 * @param attrOffset - Offset of this attribute within a single point
 * @param pointByteSize - Total byte size of a single point (pointAttributes.byteSize)
 * @param numPoints - Number of points
 */
function decodeOct16Normals(
  view: DataView,
  attrOffset: number,
  pointByteSize: number,
  numPoints: number,
): Float32Array {
  const normals = new Float32Array(numPoints * 3);

  for (let j = 0; j < numPoints; j++) {
    // ✅ 修复: attrOffset 是属性在点中的偏移, j * pointByteSize 是点之间的间隔
    const bx = view.getUint8(attrOffset + j * pointByteSize);
    const by = view.getUint8(attrOffset + j * pointByteSize + 1);

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

  // ✅ 使用 pointAttributes.byteSize 作为每个点的总字节大小
  // Potree 数据是交错存储的，pointAttributes.byteSize 已经包含了所有属性
  const bytesPerPoint = pointAttributes.byteSize;

  // ✅ 修复：根据实际 buffer 大小计算点数，而不是完全依赖元数据
  // 元数据中的 numPoints 可能与实际 buffer 不匹配
  const actualNumPoints = Math.floor(buffer.byteLength / bytesPerPoint);
  const metadataNumPoints = event.data.numPoints;

  // 使用实际 buffer 可容纳的点数和元数据点数中的较小值
  const numPoints = metadataNumPoints !== undefined
    ? Math.min(metadataNumPoints, actualNumPoints)
    : actualNumPoints;

  // 调试信息：检测不匹配的情况
  if (metadataNumPoints !== undefined && metadataNumPoints !== actualNumPoints) {
    console.warn(`[BinaryDecoder] Point count mismatch: metadata=${metadataNumPoints}, actual=${actualNumPoints} (buffer=${buffer.byteLength}, bytesPerPoint=${bytesPerPoint}), using=${numPoints}`);
  }

  const view = new DataView(buffer);
  const version = new Version(event.data.version);
  const nodeOffset = event.data.offset;
  // ✅ 修复: scale 应该是数组 [x, y, z] 或单一值
  const scaleArray = Array.isArray(event.data.scale)
    ? event.data.scale
    : [event.data.scale, event.data.scale, event.data.scale];

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

  // ✅ 修复: 使用 getAttributeOffset 获取每个属性的正确偏移量
  // 而不是累加 inOffset
  const getAttributeOffset = (attrName: string): number => {
    let offset = 0;
    for (const attr of pointAttributes.attributes) {
      if (attr.name === attrName) {
        return offset;
      }
      offset += attr.byteSize;
    }
    return 0;
  };

  // Process each attribute
  for (const pointAttribute of pointAttributes.attributes) {
    // ✅ 获取该属性在点数据中的正确偏移量
    const attrOffset = getAttributeOffset(pointAttribute.name);

    if (pointAttribute.name === 'POSITION_CARTESIAN') {
      // Decode position data
      const positions = new Float32Array(numPoints * 3);

      for (let j = 0; j < numPoints; j++) {
        const posOffset = attrOffset + j * bytesPerPoint;

        // Check if we can read 12 bytes (3 x 4-byte values) from this offset
        if (posOffset + 12 > buffer.byteLength) {
          console.error(`[BinaryDecoder] POSITION_CARTESIAN read would exceed buffer: offset=${posOffset}, bufferSize=${buffer.byteLength}, point=${j}/${numPoints}`);
          // Use zero coordinates for remaining points
          positions[3 * j + 0] = 0;
          positions[3 * j + 1] = 0;
          positions[3 * j + 2] = 0;
          continue;
        }

        let x: number, y: number, z: number;

        if (version.newerThan('1.3')) {
          // ✅ 修复: Potree 2.0 使用 Int32 (有符号整数) 并分别应用 scale
          // 然后加上 offset (boundingBox.min) 得到绝对坐标
          x = view.getInt32(posOffset + 0, true) * scaleArray[0] + nodeOffset[0];
          y = view.getInt32(posOffset + 4, true) * scaleArray[1] + nodeOffset[1];
          z = view.getInt32(posOffset + 8, true) * scaleArray[2] + nodeOffset[2];
        } else {
          x = view.getFloat32(posOffset + 0, true) + nodeOffset[0];
          y = view.getFloat32(posOffset + 4, true) + nodeOffset[1];
          z = view.getFloat32(posOffset + 8, true) + nodeOffset[2];
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
      // Decode RGBA color data (uint8 x 4)
      const colors = new Uint8Array(numPoints * 4);

      for (let j = 0; j < numPoints; j++) {
        const offset = attrOffset + j * bytesPerPoint;

        // Check if we can read 3 bytes from this offset
        if (offset + 3 > buffer.byteLength) {
          console.error(`[BinaryDecoder] RGBA read would exceed buffer: offset=${offset}, bufferSize=${buffer.byteLength}, point=${j}/${numPoints}`);
          // Use default color for remaining points
          colors[4 * j + 0] = 128;
          colors[4 * j + 1] = 128;
          colors[4 * j + 2] = 128;
          colors[4 * j + 3] = 255;
          continue;
        }

        colors[4 * j + 0] = view.getUint8(offset + 0);
        colors[4 * j + 1] = view.getUint8(offset + 1);
        colors[4 * j + 2] = view.getUint8(offset + 2);
        colors[4 * j + 3] = 255; // Alpha
      }

      attributeBuffers[pointAttribute.name] = {
        buffer: colors.buffer,
        attribute: pointAttribute,
      };
    } else if (pointAttribute.name === 'rgb') {
      // Decode RGB color data (uint16 x 3 → uint8 x 4)
      // ✅ 修复: 参考 potree-core 的处理方式
      const colors = new Uint8Array(numPoints * 4);

      for (let j = 0; j < numPoints; j++) {
        const offset = attrOffset + j * bytesPerPoint;

        // Check if we can read 6 bytes (3 x uint16) from this offset
        if (offset + 6 > buffer.byteLength) {
          console.error(`[BinaryDecoder] RGB read would exceed buffer: offset=${offset}, bufferSize=${buffer.byteLength}`);
          // Use default color (gray) for remaining points
          colors[4 * j + 0] = 128;
          colors[4 * j + 1] = 128;
          colors[4 * j + 2] = 128;
          colors[4 * j + 3] = 255;
          continue;
        }

        const r = view.getUint16(offset + 0, true);
        const g = view.getUint16(offset + 2, true);
        const b = view.getUint16(offset + 4, true);

        // ✅ 修复: 如果值 > 255,则除以 256;否则直接使用
        colors[4 * j + 0] = r > 255 ? r / 256 : r; // R
        colors[4 * j + 1] = g > 255 ? g / 256 : g; // G
        colors[4 * j + 2] = b > 255 ? b / 256 : b; // B
        colors[4 * j + 3] = 255; // Alpha
      }

      // Store as 'rgba' for compatibility with rendering
      attributeBuffers['rgba'] = {
        buffer: colors.buffer,
        attribute: pointAttribute,
      };
    } else if (pointAttribute.name === 'NORMAL_SPHEREMAPPED') {
      // Decode sphere-mapped normals
      const normals = decodeSphereMapping(view, attrOffset, bytesPerPoint, numPoints);
      attributeBuffers[pointAttribute.name] = {
        buffer: normals.buffer,
        attribute: pointAttribute,
      };
    } else if (pointAttribute.name === 'NORMAL_OCT16') {
      // Decode octahedron-encoded normals
      const normals = decodeOct16Normals(view, attrOffset, bytesPerPoint, numPoints);
      attributeBuffers[pointAttribute.name] = {
        buffer: normals.buffer,
        attribute: pointAttribute,
      };
    } else if (pointAttribute.name === 'NORMAL') {
      // Decode standard normals
      const normals = new Float32Array(numPoints * 3);

      for (let j = 0; j < numPoints; j++) {
        const normOffset = attrOffset + j * bytesPerPoint;

        // Check if we can read 12 bytes (3 x float32) from this offset
        if (normOffset + 12 > buffer.byteLength) {
          console.error(`[BinaryDecoder] NORMAL read would exceed buffer: offset=${normOffset}, bufferSize=${buffer.byteLength}, point=${j}/${numPoints}`);
          // Use default normal pointing up
          normals[3 * j + 0] = 0;
          normals[3 * j + 1] = 0;
          normals[3 * j + 2] = 1;
          continue;
        }

        const x = view.getFloat32(normOffset + 0, true);
        const y = view.getFloat32(normOffset + 4, true);
        const z = view.getFloat32(normOffset + 8, true);

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
        continue;
      }

      // Compute offset and scale for packing larger types into 32-bit floats
      if (pointAttribute.type.size > 4) {
        for (let j = 0; j < numPoints; j++) {
          let value: any = getter(attrOffset + j * bytesPerPoint, true);

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
        const readOffset = attrOffset + j * bytesPerPoint;

        // Check buffer bounds before reading
        if (readOffset + pointAttribute.type.size > buffer.byteLength) {
          console.error(`[BinaryDecoder] Generic attribute read would exceed buffer: attribute=${pointAttribute.name}, offset=${readOffset}, size=${pointAttribute.type.size}, bufferSize=${buffer.byteLength}, point=${j}/${numPoints}`);
          // Use default value (0) for remaining points
          f32[j] = 0;
          preciseBuffer[j] = 0;
          continue;
        }

        try {
          let value: any = getter(readOffset, true);

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
        } catch (error) {
          console.error(`[BinaryDecoder] Error reading attribute ${pointAttribute.name} at point ${j}:`, error);
          f32[j] = 0;
          preciseBuffer[j] = 0;
        }
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

    // 验证必要的数据
    if (!decodeRequest.buffer) {
      throw new Error('Missing buffer in decode request');
    }
    if (!decodeRequest.pointAttributes) {
      throw new Error('Missing pointAttributes in decode request');
    }
    if (typeof decodeRequest.pointAttributes.byteSize !== 'number') {
      throw new Error(`Invalid pointAttributes.byteSize: ${decodeRequest.pointAttributes.byteSize}`);
    }
    if (!Array.isArray(decodeRequest.pointAttributes.attributes)) {
      throw new Error('Invalid pointAttributes.attributes: not an array');
    }

    const result = decodePointCloudData({ data: decodeRequest } as MessageEvent<IWorkerDecodeRequest>);

    // 不使用 transferables，因为会导致 buffer detached
    // 这样接收端可以安全地访问 buffer
    // 注意：这会增加内存开销，但避免了 detached buffer 问题

    // Send response WITHOUT transferable objects
    if (taskId) {
      // WorkerPool 格式响应
      (self as any).postMessage({ taskId, result });
    } else {
      // 直接格式响应
      (self as any).postMessage(result);
    }
  } catch (error) {
    const errorMessage = error instanceof Error
      ? `${error.message}\nStack: ${error.stack}`
      : String(error);

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
