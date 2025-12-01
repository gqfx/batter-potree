/**
 * Brotli Decoder Worker
 * Decodes Potree 2.0 Brotli-compressed point cloud data in a Web Worker
 *
 * Based on potree-core's DecoderWorker_brotli.ts
 *
 * Key differences from BinaryDecoderWorker:
 * - Uses Brotli decompression
 * - Position uses Morton code encoding (16 bytes per point)
 * - RGBA uses Morton code encoding (8 bytes per point)
 */

import type { IWorkerDecodeRequest, IWorkerDecodeResponse } from '@better-potree/core';
import { PointAttribute } from '@better-potree/core';

// Brotli decoder - will be loaded dynamically
let brotliDecompress: ((data: Uint8Array) => Uint8Array) | null = null;

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
 * Morton code dealignment function
 *
 * Extracts aligned bits from Morton-encoded data.
 * See: https://stackoverflow.com/questions/45694690/how-i-can-remove-all-odds-bits-in-c
 *
 * Input bit alignment (24-bit Morton code):
 * ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p
 *
 * Output (realigned):
 * ................................abcdefghijklmnop
 *
 * @param mortoncode - 24-bit Morton encoded value
 * @returns Dealigned 8-bit value
 */
function dealign24b(mortoncode: number): number {
  let x = mortoncode;

  // Step 1: Extract every 3rd bit pair
  x = ((x & 0b001000001000001000001000) >> 2) | ((x & 0b000001000001000001000001) >> 0);

  // Step 2: Compact pairs
  x = ((x & 0b000011000000000011000000) >> 4) | ((x & 0b000000000011000000000011) >> 0);

  // Step 3: Compact quads
  x = ((x & 0b000000001111000000000000) >> 8) | ((x & 0b000000000000000000001111) >> 0);

  // Step 4: Final alignment
  x = ((x & 0b000000000000000000000000) >> 16) | ((x & 0b000000000000000011111111) >> 0);

  return x;
}

/**
 * Initialize Brotli decoder
 *
 * Uses brotli-wasm for decompression
 */
async function initBrotli(): Promise<void> {
  if (brotliDecompress) return;

  try {
    // Dynamic import of brotli-wasm
    const brotli = await import('brotli-wasm');
    const brotliModule = await brotli.default;
    brotliDecompress = brotliModule.decompress;
  } catch (error) {
    console.error('[BrotliDecoder] Failed to initialize brotli-wasm:', error);
    throw new Error('Brotli decoder initialization failed');
  }
}

/**
 * Decode Morton-encoded position data (16 bytes per point)
 *
 * Potree 2.0 uses Morton codes to interleave X, Y, Z coordinates.
 * Each point uses 16 bytes (128 bits) for position.
 *
 * @param view - DataView of decompressed buffer
 * @param byteOffset - Starting byte offset (will be modified)
 * @param numPoints - Number of points to decode
 * @param scale - Scale factors [x, y, z]
 * @param offset - Offset values [x, y, z]
 * @param min - Minimum bounding box values
 * @returns Float32Array of positions and updated byte offset
 */
function decodeMortonPosition(
  view: DataView,
  startOffset: number,
  numPoints: number,
  scale: [number, number, number],
  offset: [number, number, number],
  min: { x: number; y: number; z: number },
): { positions: Float32Array; byteOffset: number } {
  const positions = new Float32Array(numPoints * 3);
  let byteOffset = startOffset;

  for (let j = 0; j < numPoints; j++) {
    // Read 16 bytes of Morton-encoded position
    const mc_0 = view.getUint32(byteOffset + 4, true);
    const mc_1 = view.getUint32(byteOffset + 0, true);
    const mc_2 = view.getUint32(byteOffset + 12, true);
    const mc_3 = view.getUint32(byteOffset + 8, true);
    byteOffset += 16;

    // Decode X coordinate from Morton code
    let X = dealign24b((mc_3 & 0x00ffffff) >>> 0) | (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 0) << 8);

    // Decode Y coordinate from Morton code
    let Y = dealign24b((mc_3 & 0x00ffffff) >>> 1) | (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 1) << 8);

    // Decode Z coordinate from Morton code
    let Z = dealign24b((mc_3 & 0x00ffffff) >>> 2) | (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 2) << 8);

    // Handle higher precision bits if present
    if (mc_1 !== 0 || mc_2 !== 0) {
      X = X | (dealign24b((mc_1 & 0x00ffffff) >>> 0) << 16) | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 0) << 24);
      Y = Y | (dealign24b((mc_1 & 0x00ffffff) >>> 1) << 16) | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 1) << 24);
      Z = Z | (dealign24b((mc_1 & 0x00ffffff) >>> 2) << 16) | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 2) << 24);
    }

    // Apply scale, offset, and subtract min (local coordinates)
    const x = X * scale[0] + offset[0] - min.x;
    const y = Y * scale[1] + offset[1] - min.y;
    const z = Z * scale[2] + offset[2] - min.z;

    positions[3 * j + 0] = x;
    positions[3 * j + 1] = y;
    positions[3 * j + 2] = z;
  }

  return { positions, byteOffset };
}

/**
 * Decode Morton-encoded RGBA data (8 bytes per point)
 *
 * Potree 2.0 uses Morton codes to interleave R, G, B values.
 * Each point uses 8 bytes (64 bits) for color.
 *
 * @param view - DataView of decompressed buffer
 * @param startOffset - Starting byte offset
 * @param numPoints - Number of points to decode
 * @returns Uint8Array of RGBA colors and updated byte offset
 */
function decodeMortonRGBA(
  view: DataView,
  startOffset: number,
  numPoints: number,
): { colors: Uint8Array; byteOffset: number } {
  const colors = new Uint8Array(numPoints * 4);
  let byteOffset = startOffset;

  for (let j = 0; j < numPoints; j++) {
    // Read 8 bytes of Morton-encoded color
    const mc_0 = view.getUint32(byteOffset + 4, true);
    const mc_1 = view.getUint32(byteOffset + 0, true);
    byteOffset += 8;

    // Decode R from Morton code
    const r = dealign24b((mc_1 & 0x00ffffff) >>> 0) | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 0) << 8);

    // Decode G from Morton code
    const g = dealign24b((mc_1 & 0x00ffffff) >>> 1) | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 1) << 8);

    // Decode B from Morton code
    const b = dealign24b((mc_1 & 0x00ffffff) >>> 2) | (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 2) << 8);

    // Normalize to 0-255 range
    colors[4 * j + 0] = r > 255 ? r / 256 : r;
    colors[4 * j + 1] = g > 255 ? g / 256 : g;
    colors[4 * j + 2] = b > 255 ? b / 256 : b;
    colors[4 * j + 3] = 255; // Alpha
  }

  return { colors, byteOffset };
}

/**
 * Main decoder function for Brotli-compressed Potree 2.0 data
 */
async function decodePointCloudData(event: MessageEvent<IWorkerDecodeRequest>): Promise<IWorkerDecodeResponse> {
  performance.mark('brotli-decoder-start');

  const compressedBuffer = event.data.buffer;
  const pointAttributes = event.data.pointAttributes;
  const numPoints = event.data.numPoints;
  const nodeOffset = event.data.offset;
  const scaleArray = Array.isArray(event.data.scale)
    ? event.data.scale
    : [event.data.scale, event.data.scale, event.data.scale];

  // Initialize Brotli if not already done
  await initBrotli();

  if (!brotliDecompress) {
    throw new Error('Brotli decoder not initialized');
  }

  // Decompress the buffer
  let decompressedBuffer: ArrayBuffer;
  if (numPoints === 0) {
    decompressedBuffer = new ArrayBuffer(0);
  } else {
    try {
      const compressed = new Uint8Array(compressedBuffer);
      const decompressed = brotliDecompress(compressed);
      // Type assertion: brotli-wasm returns Uint8Array.buffer which is ArrayBuffer
      decompressedBuffer = decompressed.buffer as ArrayBuffer;
    } catch (error) {
      console.error('[BrotliDecoder] Decompression failed:', error);
      // Return empty buffer on error
      decompressedBuffer = new ArrayBuffer(numPoints * pointAttributes.byteSize);
    }
  }

  const view = new DataView(decompressedBuffer);
  const attributeBuffers: Record<string, any> = {};

  // Track byte offset for sequential reading (Morton-encoded attributes)
  let byteOffset = 0;

  // Bounding box calculation
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

  // Get bounding box min for local coordinates
  // In Potree 2.0, we need the bounding box min from the node
  const bbMin = { x: 0, y: 0, z: 0 }; // Will be subtracted in position decoding

  // Process each attribute sequentially (Potree 2.0 uses sequential layout after decompression)
  for (const pointAttribute of pointAttributes.attributes) {
    if (['POSITION_CARTESIAN', 'position'].includes(pointAttribute.name)) {
      // Decode Morton-encoded position (16 bytes per point)
      const result = decodeMortonPosition(
        view,
        byteOffset,
        numPoints,
        scaleArray as [number, number, number],
        nodeOffset as [number, number, number],
        bbMin,
      );

      byteOffset = result.byteOffset;
      const positions = result.positions;

      // Calculate tight bounding box and mean
      for (let j = 0; j < numPoints; j++) {
        const x = positions[3 * j + 0] ?? 0;
        const y = positions[3 * j + 1] ?? 0;
        const z = positions[3 * j + 2] ?? 0;

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
    } else if (['RGBA', 'rgba'].includes(pointAttribute.name)) {
      // Decode Morton-encoded RGBA (8 bytes per point)
      const result = decodeMortonRGBA(view, byteOffset, numPoints);
      byteOffset = result.byteOffset;

      attributeBuffers[pointAttribute.name] = {
        buffer: result.colors.buffer,
        attribute: pointAttribute,
      };
    } else {
      // Generic attribute decoding (sequential reading)
      const buff = new ArrayBuffer(numPoints * 4);
      const f32 = new Float32Array(buff);
      const TypedArray = typedArrayMapping[pointAttribute.type.name];
      const preciseBuffer = new TypedArray(numPoints);

      let attrOffset = 0;
      let attrScale = 1;

      const getterMap = createGetterMap(view);
      const getter = getterMap[pointAttribute.type.name as keyof typeof getterMap];

      if (!getter) {
        console.warn(`[BrotliDecoder] Unknown attribute type: ${pointAttribute.type.name}`);
        continue;
      }

      // Compute offset and scale for packing larger types into 32-bit floats
      if (pointAttribute.type.size > 4) {
        const range = (pointAttribute as any).range;
        if (range) {
          attrOffset = range[0];
          attrScale = 1 / (range[1] - range[0]);
        }
      }

      // Read attribute values sequentially
      for (let j = 0; j < numPoints; j++) {
        if (byteOffset + pointAttribute.byteSize > decompressedBuffer.byteLength) {
          console.error(
            `[BrotliDecoder] Buffer overflow for ${pointAttribute.name}: offset=${byteOffset}, size=${pointAttribute.byteSize}, bufferLength=${decompressedBuffer.byteLength}`,
          );
          break;
        }

        let value: any = getter(byteOffset, true);
        byteOffset += pointAttribute.byteSize;

        // Convert BigInt to Number for int64/uint64
        if (typeof value === 'bigint') {
          value = Number(value);
        }

        f32[j] = (value - attrOffset) * attrScale;
        preciseBuffer[j] = value;
      }

      attributeBuffers[pointAttribute.name] = {
        buffer: buff,
        preciseBuffer: preciseBuffer.buffer,
        attribute: pointAttribute,
        offset: attrOffset,
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
      const vectorBuffer = new ArrayBuffer(numVectorElements * numPoints * 4);
      const vectorF32 = new Float32Array(vectorBuffer);

      let iElement = 0;
      for (const sourceName of attributes) {
        const sourceBuffer = attributeBuffers[sourceName];
        if (!sourceBuffer) continue;

        const { offset, scale } = sourceBuffer;
        const sourceView = new DataView(sourceBuffer.buffer);

        for (let j = 0; j < numPoints; j++) {
          const value = sourceView.getFloat32(j * 4, true);
          vectorF32[j * numVectorElements + iElement] = value / scale + offset;
        }

        iElement++;
      }

      attributeBuffers[name] = {
        buffer: vectorBuffer,
        attribute: {
          name,
          type: { name: 'float', size: 4, ordinal: 0 },
          numElements: numVectorElements,
          byteSize: numVectorElements * 4,
        },
      };
    }
  }

  performance.mark('brotli-decoder-end');
  performance.clearMarks();
  performance.clearMeasures();

  const response: IWorkerDecodeResponse = {
    buffer: decompressedBuffer,
    mean,
    attributeBuffers,
    tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
    numPoints,
  };

  return response;
}

// Worker message handler
self.onmessage = async (event: MessageEvent) => {
  try {
    // Support two message formats:
    // 1. Direct IWorkerDecodeRequest
    // 2. WorkerPool wrapper format { taskId, data }
    let decodeRequest: IWorkerDecodeRequest;
    let taskId: string | undefined;

    if ('taskId' in event.data && 'data' in event.data) {
      // WorkerPool format
      taskId = event.data.taskId;
      decodeRequest = event.data.data;
    } else {
      // Direct format
      decodeRequest = event.data;
    }

    // Validate required data
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

    const result = await decodePointCloudData({ data: decodeRequest } as MessageEvent<IWorkerDecodeRequest>);

    // Send response WITHOUT transferable objects to avoid buffer detached issues
    if (taskId) {
      // WorkerPool format response
      (self as any).postMessage({ taskId, result });
    } else {
      // Direct format response
      (self as any).postMessage(result);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? `${error.message}\nStack: ${error.stack}` : String(error);

    if ('taskId' in event.data) {
      // WorkerPool format error response
      (self as any).postMessage({
        taskId: event.data.taskId,
        error: errorMessage,
      });
    } else {
      // Direct format error response
      (self as any).postMessage({
        error: errorMessage,
      });
    }
  }
};
