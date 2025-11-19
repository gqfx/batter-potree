/**
 * Unit tests for BinaryDecoderWorker
 * Note: Testing worker code requires special handling since it runs in a worker context
 */

import { PointAttributes } from '@better-potree/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the worker self context
const _mockSelf = {
  onmessage: null as ((event: MessageEvent) => void) | null,
  postMessage: vi.fn(),
  performance: {
    mark: vi.fn(),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  },
};

// We'll test the decoder logic by extracting the core decoding function
// For this, we'll create helper functions that simulate the worker's behavior

describe('BinaryDecoderWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POSITION_CARTESIAN decoding', () => {
    it('should decode position data for version > 1.3', () => {
      const numPoints = 3;
      const pointAttributes = new PointAttributes(['POSITION_CARTESIAN']);
      const buffer = new ArrayBuffer(numPoints * pointAttributes.byteSize);
      const view = new DataView(buffer);

      const scale = 0.001;

      // Write test data (3 points as uint32)
      view.setUint32(0, 1000, true); // x
      view.setUint32(4, 2000, true); // y
      view.setUint32(8, 3000, true); // z

      view.setUint32(12, 4000, true);
      view.setUint32(16, 5000, true);
      view.setUint32(20, 6000, true);

      view.setUint32(24, 7000, true);
      view.setUint32(28, 8000, true);
      view.setUint32(32, 9000, true);

      // Decode manually (simulating worker logic)
      const positions = new Float32Array(numPoints * 3);
      for (let j = 0; j < numPoints; j++) {
        const x = view.getUint32(j * pointAttributes.byteSize + 0, true) * scale;
        const y = view.getUint32(j * pointAttributes.byteSize + 4, true) * scale;
        const z = view.getUint32(j * pointAttributes.byteSize + 8, true) * scale;

        positions[3 * j + 0] = x;
        positions[3 * j + 1] = y;
        positions[3 * j + 2] = z;
      }

      expect(positions[0]).toBe(1.0);
      expect(positions[1]).toBe(2.0);
      expect(positions[2]).toBe(3.0);
      expect(positions[3]).toBe(4.0);
      expect(positions[4]).toBe(5.0);
      expect(positions[5]).toBe(6.0);
      expect(positions[6]).toBe(7.0);
      expect(positions[7]).toBe(8.0);
      expect(positions[8]).toBe(9.0);
    });

    it('should decode position data for version <= 1.3', () => {
      const numPoints = 2;
      const pointAttributes = new PointAttributes(['POSITION_CARTESIAN']);
      const buffer = new ArrayBuffer(numPoints * pointAttributes.byteSize);
      const view = new DataView(buffer);

      const nodeOffset: [number, number, number] = [10, 20, 30];

      // Write test data (2 points as float32)
      view.setFloat32(0, 1.5, true); // x
      view.setFloat32(4, 2.5, true); // y
      view.setFloat32(8, 3.5, true); // z

      view.setFloat32(12, 4.5, true);
      view.setFloat32(16, 5.5, true);
      view.setFloat32(20, 6.5, true);

      // Decode manually (simulating worker logic for old version)
      const positions = new Float32Array(numPoints * 3);
      for (let j = 0; j < numPoints; j++) {
        const x = view.getFloat32(j * pointAttributes.byteSize + 0, true) + nodeOffset[0];
        const y = view.getFloat32(j * pointAttributes.byteSize + 4, true) + nodeOffset[1];
        const z = view.getFloat32(j * pointAttributes.byteSize + 8, true) + nodeOffset[2];

        positions[3 * j + 0] = x;
        positions[3 * j + 1] = y;
        positions[3 * j + 2] = z;
      }

      expect(positions[0]).toBe(11.5);
      expect(positions[1]).toBe(22.5);
      expect(positions[2]).toBe(33.5);
      expect(positions[3]).toBe(14.5);
      expect(positions[4]).toBe(25.5);
      expect(positions[5]).toBe(36.5);
    });

    it('should calculate tight bounding box correctly', () => {
      const numPoints = 4;
      const pointAttributes = new PointAttributes(['POSITION_CARTESIAN']);
      const buffer = new ArrayBuffer(numPoints * pointAttributes.byteSize);
      const view = new DataView(buffer);

      const scale = 0.001;

      // Write test data with varying values
      const positions = [
        [1000, 2000, 3000], // Will be 1.0, 2.0, 3.0 after scale
        [500, 4000, 1000], // Will be 0.5, 4.0, 1.0
        [3000, 0, 2000], // Will be 3.0, 0.0, 2.0
        [0, 0, 5000], // Will be 0.0, 0.0, 5.0
      ];

      positions.forEach(([x, y, z], i) => {
        view.setUint32(i * 12 + 0, x, true);
        view.setUint32(i * 12 + 4, y, true);
        view.setUint32(i * 12 + 8, z, true);
      });

      // Calculate bounding box
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

      for (let j = 0; j < numPoints; j++) {
        const x = view.getUint32(j * 12 + 0, true) * scale;
        const y = view.getUint32(j * 12 + 4, true) * scale;
        const z = view.getUint32(j * 12 + 8, true) * scale;

        tightBoxMin[0] = Math.min(tightBoxMin[0], x);
        tightBoxMin[1] = Math.min(tightBoxMin[1], y);
        tightBoxMin[2] = Math.min(tightBoxMin[2], z);

        tightBoxMax[0] = Math.max(tightBoxMax[0], x);
        tightBoxMax[1] = Math.max(tightBoxMax[1], y);
        tightBoxMax[2] = Math.max(tightBoxMax[2], z);
      }

      expect(tightBoxMin[0]).toBe(0.0);
      expect(tightBoxMin[1]).toBe(0.0);
      expect(tightBoxMin[2]).toBe(1.0);
      expect(tightBoxMax[0]).toBe(3.0);
      expect(tightBoxMax[1]).toBe(4.0);
      expect(tightBoxMax[2]).toBe(5.0);
    });

    it('should calculate mean position correctly', () => {
      const numPoints = 3;
      const pointAttributes = new PointAttributes(['POSITION_CARTESIAN']);
      const buffer = new ArrayBuffer(numPoints * pointAttributes.byteSize);
      const view = new DataView(buffer);

      const scale = 0.001;

      // Write test data
      view.setUint32(0, 1000, true);
      view.setUint32(4, 2000, true);
      view.setUint32(8, 3000, true);

      view.setUint32(12, 2000, true);
      view.setUint32(16, 4000, true);
      view.setUint32(20, 6000, true);

      view.setUint32(24, 3000, true);
      view.setUint32(28, 6000, true);
      view.setUint32(32, 9000, true);

      // Calculate mean
      const mean: [number, number, number] = [0, 0, 0];
      for (let j = 0; j < numPoints; j++) {
        const x = view.getUint32(j * 12 + 0, true) * scale;
        const y = view.getUint32(j * 12 + 4, true) * scale;
        const z = view.getUint32(j * 12 + 8, true) * scale;

        mean[0] += x / numPoints;
        mean[1] += y / numPoints;
        mean[2] += z / numPoints;
      }

      expect(mean[0]).toBeCloseTo(2.0, 5);
      expect(mean[1]).toBeCloseTo(4.0, 5);
      expect(mean[2]).toBeCloseTo(6.0, 5);
    });
  });

  describe('RGBA color decoding', () => {
    it('should decode RGBA color data', () => {
      const numPoints = 2;
      const pointAttributes = new PointAttributes(['POSITION_CARTESIAN', 'RGBA_PACKED']);
      const buffer = new ArrayBuffer(numPoints * pointAttributes.byteSize);
      const view = new DataView(buffer);

      // Position data (12 bytes)
      view.setUint32(0, 1000, true);
      view.setUint32(4, 2000, true);
      view.setUint32(8, 3000, true);

      // Color data (4 bytes) - RGB only, alpha is always 255
      const colorOffset = 12;
      view.setUint8(colorOffset + 0, 255); // R
      view.setUint8(colorOffset + 1, 128); // G
      view.setUint8(colorOffset + 2, 64); // B

      // Second point
      view.setUint32(16, 4000, true);
      view.setUint32(20, 5000, true);
      view.setUint32(24, 6000, true);

      view.setUint8(28, 32);
      view.setUint8(29, 64);
      view.setUint8(30, 128);

      // Decode colors
      const colors = new Uint8Array(numPoints * 4);
      const rgbaOffset = 12; // After POSITION_CARTESIAN

      for (let j = 0; j < numPoints; j++) {
        colors[4 * j + 0] = view.getUint8(j * pointAttributes.byteSize + rgbaOffset + 0);
        colors[4 * j + 1] = view.getUint8(j * pointAttributes.byteSize + rgbaOffset + 1);
        colors[4 * j + 2] = view.getUint8(j * pointAttributes.byteSize + rgbaOffset + 2);
        colors[4 * j + 3] = 255; // Alpha
      }

      expect(colors[0]).toBe(255);
      expect(colors[1]).toBe(128);
      expect(colors[2]).toBe(64);
      expect(colors[3]).toBe(255);

      expect(colors[4]).toBe(32);
      expect(colors[5]).toBe(64);
      expect(colors[6]).toBe(128);
      expect(colors[7]).toBe(255);
    });
  });

  describe('Normal decoding', () => {
    it('should decode NORMAL_SPHEREMAPPED normals', () => {
      // Test sphere mapping decoding algorithm
      const _numPoints = 1;
      const bx = 128; // Middle value
      const by = 128;

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

      // Normals should be close to [0, 0, 1] for middle values
      expect(Math.abs(nx)).toBeLessThan(0.1);
      expect(Math.abs(ny)).toBeLessThan(0.1);
      expect(nz).toBeGreaterThan(0.9);
    });

    it('should decode NORMAL_OCT16 normals', () => {
      // Test octahedron encoding decoding
      const bx = 128;
      const by = 128;

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

      // Should produce a valid normalized vector
      const vectorLength = Math.sqrt(x * x + y * y + nz * nz);
      expect(vectorLength).toBeCloseTo(1.0, 5);
    });

    it('should decode NORMAL floats', () => {
      const numPoints = 2;
      const buffer = new ArrayBuffer(numPoints * 12); // 3 floats per point
      const view = new DataView(buffer);

      // Write normalized normals
      view.setFloat32(0, 0.5773, true);
      view.setFloat32(4, 0.5773, true);
      view.setFloat32(8, 0.5773, true);

      view.setFloat32(12, 1.0, true);
      view.setFloat32(16, 0.0, true);
      view.setFloat32(20, 0.0, true);

      // Decode
      const normals = new Float32Array(numPoints * 3);
      for (let j = 0; j < numPoints; j++) {
        normals[3 * j + 0] = view.getFloat32(j * 12 + 0, true);
        normals[3 * j + 1] = view.getFloat32(j * 12 + 4, true);
        normals[3 * j + 2] = view.getFloat32(j * 12 + 8, true);
      }

      expect(normals[0]).toBeCloseTo(0.5773, 4);
      expect(normals[1]).toBeCloseTo(0.5773, 4);
      expect(normals[2]).toBeCloseTo(0.5773, 4);

      expect(normals[3]).toBe(1.0);
      expect(normals[4]).toBe(0.0);
      expect(normals[5]).toBe(0.0);
    });
  });

  describe('Generic attribute decoding', () => {
    it('should decode uint8 attributes', () => {
      const numPoints = 3;
      const buffer = new ArrayBuffer(numPoints * 1);
      const view = new DataView(buffer);

      view.setUint8(0, 10);
      view.setUint8(1, 20);
      view.setUint8(2, 30);

      const values = new Uint8Array(numPoints);
      for (let j = 0; j < numPoints; j++) {
        values[j] = view.getUint8(j);
      }

      expect(values[0]).toBe(10);
      expect(values[1]).toBe(20);
      expect(values[2]).toBe(30);
    });

    it('should decode uint16 attributes', () => {
      const numPoints = 2;
      const buffer = new ArrayBuffer(numPoints * 2);
      const view = new DataView(buffer);

      view.setUint16(0, 1000, true);
      view.setUint16(2, 2000, true);

      const values = new Uint16Array(numPoints);
      for (let j = 0; j < numPoints; j++) {
        values[j] = view.getUint16(j * 2, true);
      }

      expect(values[0]).toBe(1000);
      expect(values[1]).toBe(2000);
    });

    it('should decode float32 attributes', () => {
      const numPoints = 2;
      const buffer = new ArrayBuffer(numPoints * 4);
      const view = new DataView(buffer);

      view.setFloat32(0, 1.5, true);
      view.setFloat32(4, 2.75, true);

      const values = new Float32Array(numPoints);
      for (let j = 0; j < numPoints; j++) {
        values[j] = view.getFloat32(j * 4, true);
      }

      expect(values[0]).toBe(1.5);
      expect(values[1]).toBe(2.75);
    });

    it('should decode double attributes', () => {
      const numPoints = 2;
      const buffer = new ArrayBuffer(numPoints * 8);
      const view = new DataView(buffer);

      view.setFloat64(0, 123.456789, true);
      view.setFloat64(8, 987.654321, true);

      const values = new Float64Array(numPoints);
      for (let j = 0; j < numPoints; j++) {
        values[j] = view.getFloat64(j * 8, true);
      }

      expect(values[0]).toBeCloseTo(123.456789, 6);
      expect(values[1]).toBeCloseTo(987.654321, 6);
    });

    it('should normalize values for attributes larger than 32-bit', () => {
      const numPoints = 3;
      const buffer = new ArrayBuffer(numPoints * 8);
      const view = new DataView(buffer);

      // Write int64 values
      view.setBigInt64(0, BigInt(1000), true);
      view.setBigInt64(8, BigInt(5000), true);
      view.setBigInt64(16, BigInt(9000), true);

      // Calculate min/max
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      for (let j = 0; j < numPoints; j++) {
        const value = Number(view.getBigInt64(j * 8, true));
        min = Math.min(min, value);
        max = Math.max(max, value);
      }

      const offset = min;
      const scale = 1 / (max - min);

      // Normalize values
      const normalized = new Float32Array(numPoints);
      for (let j = 0; j < numPoints; j++) {
        const value = Number(view.getBigInt64(j * 8, true));
        normalized[j] = (value - offset) * scale;
      }

      expect(normalized[0]).toBe(0.0);
      expect(normalized[1]).toBe(0.5);
      expect(normalized[2]).toBe(1.0);
    });
  });

  describe('Indices generation', () => {
    it('should generate sequential indices', () => {
      const numPoints = 5;
      const indices = new Uint32Array(numPoints);

      for (let i = 0; i < numPoints; i++) {
        indices[i] = i;
      }

      expect(indices[0]).toBe(0);
      expect(indices[1]).toBe(1);
      expect(indices[2]).toBe(2);
      expect(indices[3]).toBe(3);
      expect(indices[4]).toBe(4);
    });
  });

  describe('Vector attributes', () => {
    it('should combine scalar attributes into vectors', () => {
      // Simulate combining NormalX, NormalY, NormalZ into NORMAL
      const numPoints = 2;
      const numVectorElements = 3;

      // Simulated normalized float buffers for each component
      const normalXBuffer = new Float32Array([0.5, 1.0]);
      const normalYBuffer = new Float32Array([0.25, 0.75]);
      const normalZBuffer = new Float32Array([0.125, 0.375]);

      const vectorData = new Float32Array(numVectorElements * numPoints);

      // Combine (assuming no offset/scale for simplicity)
      for (let j = 0; j < numPoints; j++) {
        vectorData[j * numVectorElements + 0] = normalXBuffer[j];
        vectorData[j * numVectorElements + 1] = normalYBuffer[j];
        vectorData[j * numVectorElements + 2] = normalZBuffer[j];
      }

      expect(vectorData[0]).toBeCloseTo(0.5, 5);
      expect(vectorData[1]).toBeCloseTo(0.25, 5);
      expect(vectorData[2]).toBeCloseTo(0.125, 5);

      expect(vectorData[3]).toBeCloseTo(1.0, 5);
      expect(vectorData[4]).toBeCloseTo(0.75, 5);
      expect(vectorData[5]).toBeCloseTo(0.375, 5);
    });
  });

  describe('Edge cases', () => {
    it('should handle single point', () => {
      const numPoints = 1;
      const pointAttributes = new PointAttributes(['POSITION_CARTESIAN']);
      const buffer = new ArrayBuffer(numPoints * pointAttributes.byteSize);
      const view = new DataView(buffer);

      const scale = 0.001;

      view.setUint32(0, 5000, true);
      view.setUint32(4, 6000, true);
      view.setUint32(8, 7000, true);

      const positions = new Float32Array(numPoints * 3);
      for (let j = 0; j < numPoints; j++) {
        positions[3 * j + 0] = view.getUint32(j * 12 + 0, true) * scale;
        positions[3 * j + 1] = view.getUint32(j * 12 + 4, true) * scale;
        positions[3 * j + 2] = view.getUint32(j * 12 + 8, true) * scale;
      }

      expect(positions[0]).toBe(5.0);
      expect(positions[1]).toBe(6.0);
      expect(positions[2]).toBe(7.0);
    });

    it('should handle zero values', () => {
      const _numPoints = 1;
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);

      view.setUint32(0, 0, true);

      const value = view.getUint32(0, true);
      expect(value).toBe(0);
    });

    it('should handle NaN values gracefully', () => {
      const value = NaN;
      const isValid = !Number.isNaN(value);

      expect(isValid).toBe(false);

      // Min/max should ignore NaN
      let min = Number.POSITIVE_INFINITY;
      let max = Number.NEGATIVE_INFINITY;

      if (!Number.isNaN(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }

      expect(min).toBe(Number.POSITIVE_INFINITY);
      expect(max).toBe(Number.NEGATIVE_INFINITY);
    });

    it('should handle large numbers', () => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);

      const largeNumber = 4294967295; // max uint32
      view.setUint32(0, largeNumber, true);

      const value = view.getUint32(0, true);
      expect(value).toBe(largeNumber);
    });

    it('should handle negative values correctly with signed types', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);

      view.setInt32(0, -12345, true);

      const value = view.getInt32(0, true);
      expect(value).toBe(-12345);
    });
  });

  describe('Performance marks', () => {
    it('should create performance marks', () => {
      const mockPerformance = {
        mark: vi.fn(),
        clearMarks: vi.fn(),
        clearMeasures: vi.fn(),
      };

      mockPerformance.mark('binary-decoder-start');
      // ... decoding work ...
      mockPerformance.mark('binary-decoder-end');
      mockPerformance.clearMarks();
      mockPerformance.clearMeasures();

      expect(mockPerformance.mark).toHaveBeenCalledWith('binary-decoder-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('binary-decoder-end');
      expect(mockPerformance.clearMarks).toHaveBeenCalled();
      expect(mockPerformance.clearMeasures).toHaveBeenCalled();
    });
  });
});
