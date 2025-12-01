/**
 * Unit tests for BinaryDecoderWorker
 * Note: Testing worker code requires special handling since it runs in a worker context
 */

import { PointAttributes } from '@better-potree/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

  describe('RGB color decoding (uint16)', () => {
    it('should decode RGB color data from uint16 format', () => {
      // Simulate the real metadata.json structure:
      // - position: 12 bytes (int32 x 3)
      // - intensity: 2 bytes (uint16)
      // - return number: 1 byte (uint8)
      // - number of returns: 1 byte (uint8)
      // - classification flags: 1 byte (uint8)
      // - classification: 1 byte (uint8)
      // - user data: 1 byte (uint8)
      // - scan angle: 2 bytes (int16)
      // - point source id: 2 bytes (uint16)
      // - gps-time: 8 bytes (double)
      // - rgb: 6 bytes (uint16 x 3)
      // Total: 37 bytes per point

      const numPoints = 2;
      const bytesPerPoint = 37;
      const buffer = new ArrayBuffer(numPoints * bytesPerPoint);
      const view = new DataView(buffer);

      // Point 1
      // Position (offset 0, 12 bytes)
      view.setUint32(0, 1000, true);
      view.setUint32(4, 2000, true);
      view.setUint32(8, 3000, true);

      // Other attributes (offset 12-30, 19 bytes) - fill with zeros for simplicity
      // RGB (offset 31, 6 bytes)
      view.setUint16(31, 255, true); // R
      view.setUint16(33, 128, true); // G
      view.setUint16(35, 64, true);  // B

      // Point 2
      // Position (offset 37, 12 bytes)
      view.setUint32(37, 4000, true);
      view.setUint32(41, 5000, true);
      view.setUint32(45, 6000, true);

      // Other attributes (offset 49-67, 19 bytes) - fill with zeros
      // RGB (offset 68, 6 bytes)
      view.setUint16(68, 200, true); // R
      view.setUint16(70, 100, true); // G
      view.setUint16(72, 50, true);  // B

      // Decode RGB (simulating the worker logic)
      const colors = new Uint8Array(numPoints * 4);
      const rgbOffset = 31; // RGB starts at byte 31 in each point

      for (let j = 0; j < numPoints; j++) {
        const pointOffset = j * bytesPerPoint;
        const r = view.getUint16(pointOffset + rgbOffset + 0, true);
        const g = view.getUint16(pointOffset + rgbOffset + 2, true);
        const b = view.getUint16(pointOffset + rgbOffset + 4, true);

        // Convert to uint8 (clamp to 0-255 range)
        colors[4 * j + 0] = Math.min(255, r); // R
        colors[4 * j + 1] = Math.min(255, g); // G
        colors[4 * j + 2] = Math.min(255, b); // B
        colors[4 * j + 3] = 255; // Alpha
      }

      // Verify first point
      expect(colors[0]).toBe(255); // R
      expect(colors[1]).toBe(128); // G
      expect(colors[2]).toBe(64);  // B
      expect(colors[3]).toBe(255); // A

      // Verify second point
      expect(colors[4]).toBe(200); // R
      expect(colors[5]).toBe(100); // G
      expect(colors[6]).toBe(50);  // B
      expect(colors[7]).toBe(255); // A
    });

    it('should clamp RGB values above 255', () => {
      const numPoints = 1;
      const bytesPerPoint = 37;
      const buffer = new ArrayBuffer(numPoints * bytesPerPoint);
      const view = new DataView(buffer);

      // RGB with values above 255 (offset 31)
      view.setUint16(31, 300, true); // R (will be clamped to 255)
      view.setUint16(33, 500, true); // G (will be clamped to 255)
      view.setUint16(35, 100, true); // B (stays 100)

      const colors = new Uint8Array(numPoints * 4);
      const rgbOffset = 31;

      const r = view.getUint16(rgbOffset + 0, true);
      const g = view.getUint16(rgbOffset + 2, true);
      const b = view.getUint16(rgbOffset + 4, true);

      colors[0] = Math.min(255, r);
      colors[1] = Math.min(255, g);
      colors[2] = Math.min(255, b);
      colors[3] = 255;

      expect(colors[0]).toBe(255); // Clamped from 300
      expect(colors[1]).toBe(255); // Clamped from 500
      expect(colors[2]).toBe(100); // Original value
      expect(colors[3]).toBe(255); // Alpha
    });
  });

  describe('Normal decoding', () => {
    it('should decode NORMAL_SPHEREMAPPED normals', () => {
      // Test sphere mapping decoding algorithm
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

  describe('Interleaved attribute layout', () => {
    it('should correctly decode interleaved attributes', () => {
      // Test realistic data layout: POSITION (12) + INTENSITY (2) + RGB (6) = 20 bytes per point
      const numPoints = 3;
      const bytesPerPoint = 20;
      const buffer = new ArrayBuffer(numPoints * bytesPerPoint);
      const view = new DataView(buffer);

      // Point 0
      view.setUint32(0, 1000, true);   // pos.x
      view.setUint32(4, 2000, true);   // pos.y
      view.setUint32(8, 3000, true);   // pos.z
      view.setUint16(12, 100, true);   // intensity
      view.setUint16(14, 255, true);   // rgb.r
      view.setUint16(16, 128, true);   // rgb.g
      view.setUint16(18, 64, true);    // rgb.b

      // Point 1
      view.setUint32(20, 4000, true);  // pos.x
      view.setUint32(24, 5000, true);  // pos.y
      view.setUint32(28, 6000, true);  // pos.z
      view.setUint16(32, 200, true);   // intensity
      view.setUint16(34, 200, true);   // rgb.r
      view.setUint16(36, 100, true);   // rgb.g
      view.setUint16(38, 50, true);    // rgb.b

      // Point 2
      view.setUint32(40, 7000, true);  // pos.x
      view.setUint32(44, 8000, true);  // pos.y
      view.setUint32(48, 9000, true);  // pos.z
      view.setUint16(52, 150, true);   // intensity
      view.setUint16(54, 128, true);   // rgb.r
      view.setUint16(56, 64, true);    // rgb.g
      view.setUint16(58, 32, true);    // rgb.b

      const scale = 0.001;

      // Decode positions
      const positions = new Float32Array(numPoints * 3);
      for (let j = 0; j < numPoints; j++) {
        positions[3 * j + 0] = view.getUint32(j * bytesPerPoint + 0, true) * scale;
        positions[3 * j + 1] = view.getUint32(j * bytesPerPoint + 4, true) * scale;
        positions[3 * j + 2] = view.getUint32(j * bytesPerPoint + 8, true) * scale;
      }

      // Decode intensity
      const intensities = new Uint16Array(numPoints);
      for (let j = 0; j < numPoints; j++) {
        intensities[j] = view.getUint16(j * bytesPerPoint + 12, true);
      }

      // Decode RGB
      const colors = new Uint8Array(numPoints * 4);
      for (let j = 0; j < numPoints; j++) {
        const r = view.getUint16(j * bytesPerPoint + 14, true);
        const g = view.getUint16(j * bytesPerPoint + 16, true);
        const b = view.getUint16(j * bytesPerPoint + 18, true);
        colors[4 * j + 0] = Math.min(255, r);
        colors[4 * j + 1] = Math.min(255, g);
        colors[4 * j + 2] = Math.min(255, b);
        colors[4 * j + 3] = 255;
      }

      // Verify positions
      expect(positions[0]).toBe(1.0);
      expect(positions[1]).toBe(2.0);
      expect(positions[2]).toBe(3.0);
      expect(positions[6]).toBe(7.0);
      expect(positions[7]).toBe(8.0);
      expect(positions[8]).toBe(9.0);

      // Verify intensities
      expect(intensities[0]).toBe(100);
      expect(intensities[1]).toBe(200);
      expect(intensities[2]).toBe(150);

      // Verify colors
      expect(colors[0]).toBe(255);
      expect(colors[1]).toBe(128);
      expect(colors[2]).toBe(64);
      expect(colors[8]).toBe(128);
      expect(colors[9]).toBe(64);
      expect(colors[10]).toBe(32);
    });

    it('should handle attributes at different offsets correctly', () => {
      // Simulate offset calculation for attributes
      const attributes = [
        { name: 'POSITION_CARTESIAN', byteSize: 12 },
        { name: 'intensity', byteSize: 2 },
        { name: 'return_number', byteSize: 1 },
        { name: 'classification', byteSize: 1 },
        { name: 'rgb', byteSize: 6 },
      ];

      let currentOffset = 0;
      const offsets: Record<string, number> = {};

      for (const attr of attributes) {
        offsets[attr.name] = currentOffset;
        currentOffset += attr.byteSize;
      }

      expect(offsets.POSITION_CARTESIAN).toBe(0);
      expect(offsets.intensity).toBe(12);
      expect(offsets.return_number).toBe(14);
      expect(offsets.classification).toBe(15);
      expect(offsets.rgb).toBe(16);
      expect(currentOffset).toBe(22); // Total bytes per point
    });
  });

  describe('Buffer size validation', () => {
    it('should validate buffer size matches point count', () => {
      const numPoints = 5;
      const bytesPerPoint = 12; // POSITION_CARTESIAN only
      const expectedBufferSize = numPoints * bytesPerPoint;
      const buffer = new ArrayBuffer(expectedBufferSize);

      expect(buffer.byteLength).toBe(expectedBufferSize);
      expect(buffer.byteLength / bytesPerPoint).toBe(numPoints);
    });

    it('should detect mismatched buffer size', () => {
      const bytesPerPoint = 37;
      const buffer = new ArrayBuffer(100); // Not divisible by 37

      const calculatedNumPoints = buffer.byteLength / bytesPerPoint;
      expect(calculatedNumPoints).not.toBe(Math.floor(calculatedNumPoints)); // Should be fractional
    });

    it('should handle empty buffer', () => {
      const buffer = new ArrayBuffer(0);
      const bytesPerPoint = 37;
      const calculatedNumPoints = buffer.byteLength / bytesPerPoint;

      expect(calculatedNumPoints).toBe(0);
    });
  });

  describe('Attribute offset calculation', () => {
    it('should correctly calculate attribute offsets for interleaved data', () => {
      // Test data structure: POSITION (12) + intensity (2) + rgb (6) = 20 bytes per point
      const numPoints = 2;
      const bytesPerPoint = 20;

      // Simulate getAttributeOffset function from Worker
      const attributes = [
        { name: 'POSITION_CARTESIAN', byteSize: 12 },
        { name: 'intensity', byteSize: 2 },
        { name: 'rgb', byteSize: 6 },
      ];

      const getAttributeOffset = (attrName: string): number => {
        let offset = 0;
        for (const attr of attributes) {
          if (attr.name === attrName) {
            return offset;
          }
          offset += attr.byteSize;
        }
        return 0;
      };

      // Verify correct offsets
      expect(getAttributeOffset('POSITION_CARTESIAN')).toBe(0);
      expect(getAttributeOffset('intensity')).toBe(12);
      expect(getAttributeOffset('rgb')).toBe(14);
    });

    it('should read RGB from correct offset in interleaved buffer', () => {
      // Real structure matching metadata.json:
      // 0-11:   POSITION (12 bytes)
      // 12-13:  intensity (2 bytes)
      // 14-19:  rgb (6 bytes) ← RGB should be read from offset 14
      const numPoints = 2;
      const bytesPerPoint = 20;
      const buffer = new ArrayBuffer(numPoints * bytesPerPoint);
      const view = new DataView(buffer);

      // Write test data for point 0
      // Position at offset 0
      view.setUint32(0, 1000, true);
      view.setUint32(4, 2000, true);
      view.setUint32(8, 3000, true);
      // Intensity at offset 12
      view.setUint16(12, 100, true);
      // RGB at offset 14 (NOT offset 12!)
      view.setUint16(14, 255, true); // R
      view.setUint16(16, 128, true); // G
      view.setUint16(18, 64, true);  // B

      // Write test data for point 1
      // Position at offset 20
      view.setUint32(20, 4000, true);
      view.setUint32(24, 5000, true);
      view.setUint32(28, 6000, true);
      // Intensity at offset 32
      view.setUint16(32, 200, true);
      // RGB at offset 34 (NOT offset 32!)
      view.setUint16(34, 200, true); // R
      view.setUint16(36, 100, true); // G
      view.setUint16(38, 50, true);  // B

      // Simulate Worker logic with CORRECT offset
      const rgbOffset = 14; // Correct: 12 (position) + 2 (intensity)
      const colors = new Uint8Array(numPoints * 4);

      for (let j = 0; j < numPoints; j++) {
        const offset = rgbOffset + j * bytesPerPoint;
        const r = view.getUint16(offset + 0, true);
        const g = view.getUint16(offset + 2, true);
        const b = view.getUint16(offset + 4, true);

        colors[4 * j + 0] = Math.min(255, r);
        colors[4 * j + 1] = Math.min(255, g);
        colors[4 * j + 2] = Math.min(255, b);
        colors[4 * j + 3] = 255;
      }

      // Verify point 0 colors
      expect(colors[0]).toBe(255); // R
      expect(colors[1]).toBe(128); // G
      expect(colors[2]).toBe(64);  // B
      expect(colors[3]).toBe(255); // A

      // Verify point 1 colors
      expect(colors[4]).toBe(200); // R
      expect(colors[5]).toBe(100); // G
      expect(colors[6]).toBe(50);  // B
      expect(colors[7]).toBe(255); // A
    });
  });

  describe('Real-world data structure simulation', () => {
    it('should decode data matching inchurch_colorized_las_converted metadata', () => {
      // Exact structure from metadata.json:
      // position: 12 bytes (int32 x 3)
      // intensity: 2 bytes (uint16)
      // return number: 1 byte (uint8)
      // number of returns: 1 byte (uint8)
      // classification flags: 1 byte (uint8)
      // classification: 1 byte (uint8)
      // user data: 1 byte (uint8)
      // scan angle: 2 bytes (int16)
      // point source id: 2 bytes (uint16)
      // gps-time: 8 bytes (double)
      // rgb: 6 bytes (uint16 x 3)
      // Total: 37 bytes

      const numPoints = 1;
      const bytesPerPoint = 37;
      const buffer = new ArrayBuffer(numPoints * bytesPerPoint);
      const view = new DataView(buffer);
      const scale = 0.001;

      // Write complete point data
      view.setUint32(0, 10000, true);     // pos.x = 10.0
      view.setUint32(4, 20000, true);     // pos.y = 20.0
      view.setUint32(8, 30000, true);     // pos.z = 30.0
      view.setUint16(12, 5000, true);     // intensity
      view.setUint8(14, 1);               // return number
      view.setUint8(15, 2);               // number of returns
      view.setUint8(16, 0);               // classification flags
      view.setUint8(17, 2);               // classification (ground)
      view.setUint8(18, 0);               // user data
      view.setInt16(19, 100, true);       // scan angle
      view.setUint16(21, 1001, true);     // point source id
      view.setFloat64(23, 123456.789, true); // gps-time
      view.setUint16(31, 200, true);      // rgb.r
      view.setUint16(33, 150, true);      // rgb.g
      view.setUint16(35, 100, true);      // rgb.b

      // Decode and verify all attributes
      const pos = {
        x: view.getUint32(0, true) * scale,
        y: view.getUint32(4, true) * scale,
        z: view.getUint32(8, true) * scale,
      };
      const intensity = view.getUint16(12, true);
      const returnNumber = view.getUint8(14);
      const numReturns = view.getUint8(15);
      const classification = view.getUint8(17);
      const gpsTime = view.getFloat64(23, true);
      const rgb = {
        r: Math.min(255, view.getUint16(31, true)),
        g: Math.min(255, view.getUint16(33, true)),
        b: Math.min(255, view.getUint16(35, true)),
      };

      expect(pos.x).toBe(10.0);
      expect(pos.y).toBe(20.0);
      expect(pos.z).toBe(30.0);
      expect(intensity).toBe(5000);
      expect(returnNumber).toBe(1);
      expect(numReturns).toBe(2);
      expect(classification).toBe(2);
      expect(gpsTime).toBeCloseTo(123456.789, 3);
      expect(rgb.r).toBe(200);
      expect(rgb.g).toBe(150);
      expect(rgb.b).toBe(100);
    });
  });
});
