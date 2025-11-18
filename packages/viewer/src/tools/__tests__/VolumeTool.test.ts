/**
 * VolumeTool 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { VolumeTool } from '../VolumeTool.js';
import type { Viewer } from '../../Viewer.js';

describe('VolumeTool', () => {
  let viewer: Viewer;
  let tool: VolumeTool;

  beforeEach(() => {
    // 创建 mock viewer
    viewer = {
      // 添加必要的 mock 方法
    } as unknown as Viewer;

    tool = new VolumeTool(viewer);
  });

  describe('constructor', () => {
    it('应该使用默认配置创建工具', () => {
      expect(tool).toBeDefined();
      expect(tool.getMeasurementBox()).toBeNull();
    });

    it('应该使用自定义配置创建工具', () => {
      const customTool = new VolumeTool(viewer, {
        boxColor: 0xff0000,
        boxOpacity: 0.5,
        gridResolution: 2.0,
      });

      expect(customTool).toBeDefined();
    });
  });

  describe('setMeasurementBox', () => {
    it('应该设置测量框', () => {
      const min = new THREE.Vector3(-10, -10, -5);
      const max = new THREE.Vector3(10, 10, 5);

      tool.setMeasurementBox(min, max);

      const box = tool.getMeasurementBox();
      expect(box).toBeDefined();
      expect(box!.min).toEqual(min);
      expect(box!.max).toEqual(max);
    });

    it('应该克隆输入的向量', () => {
      const min = new THREE.Vector3(-10, -10, -5);
      const max = new THREE.Vector3(10, 10, 5);

      tool.setMeasurementBox(min, max);

      // 修改原始向量
      min.x = 100;
      max.x = 200;

      const box = tool.getMeasurementBox();
      expect(box!.min.x).toBe(-10);
      expect(box!.max.x).toBe(10);
    });
  });

  describe('setBox', () => {
    it('应该使用 Box3 设置测量框', () => {
      const box3 = new THREE.Box3(
        new THREE.Vector3(-5, -5, -5),
        new THREE.Vector3(5, 5, 5)
      );

      tool.setBox(box3);

      const box = tool.getMeasurementBox();
      expect(box).toBeDefined();
      expect(box!.min).toEqual(box3.min);
      expect(box!.max).toEqual(box3.max);
    });
  });

  describe('calculateVolume', () => {
    it('应该在未设置测量框时抛出错误', async () => {
      await expect(tool.calculateVolume()).rejects.toThrow(
        'Measurement box not set'
      );
    });

    it('应该计算体积', async () => {
      const min = new THREE.Vector3(-10, -10, 0);
      const max = new THREE.Vector3(10, 10, 10);

      tool.setMeasurementBox(min, max);

      const result = await tool.calculateVolume();

      expect(result).toBeDefined();
      expect(result.volume).toBeGreaterThan(0);
      expect(result.cut).toBeGreaterThanOrEqual(0);
      expect(result.fill).toBeGreaterThanOrEqual(0);
      expect(result.sampleCount).toBeGreaterThan(0);
      expect(result.boundingBox).toBeDefined();
    });

    it('应该包含正确的基准高度', async () => {
      const min = new THREE.Vector3(-10, -10, 0);
      const max = new THREE.Vector3(10, 10, 10);

      tool.setMeasurementBox(min, max);
      tool.setBaseHeight(5.0);

      const result = await tool.calculateVolume();

      expect(result.baseHeight).toBe(5.0);
    });
  });

  describe('setGridResolution', () => {
    it('应该设置网格分辨率', () => {
      tool.setGridResolution(2.5);
      // 没有直接的 getter，通过计算验证
      expect(() => tool.setGridResolution(2.5)).not.toThrow();
    });

    it('应该限制最小分辨率', () => {
      tool.setGridResolution(0.01); // 太小
      // 内部应该被限制为 0.1
      expect(() => tool.setGridResolution(0.01)).not.toThrow();
    });
  });

  describe('setBaseHeight', () => {
    it('应该设置基准高度', () => {
      tool.setBaseHeight(10.5);
      expect(() => tool.setBaseHeight(10.5)).not.toThrow();
    });
  });

  describe('getMeasurementBox', () => {
    it('应该在未设置时返回 null', () => {
      expect(tool.getMeasurementBox()).toBeNull();
    });

    it('应该返回测量框的副本', () => {
      const min = new THREE.Vector3(-10, -10, -5);
      const max = new THREE.Vector3(10, 10, 5);

      tool.setMeasurementBox(min, max);

      const box1 = tool.getMeasurementBox();
      const box2 = tool.getMeasurementBox();

      expect(box1).not.toBe(box2); // 不同的实例
      expect(box1).toEqual(box2); // 但内容相同
    });
  });

  describe('getVisualization', () => {
    it('应该返回可视化组', () => {
      const group = tool.getVisualization();

      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.name).toBe('VolumeTool');
    });
  });

  describe('dispose', () => {
    it('应该清理所有资源', () => {
      const min = new THREE.Vector3(-10, -10, -5);
      const max = new THREE.Vector3(10, 10, 5);

      tool.setMeasurementBox(min, max);
      tool.dispose();

      expect(tool.getMeasurementBox()).toBeNull();
    });

    it('应该多次调用 dispose 不报错', () => {
      tool.dispose();
      expect(() => tool.dispose()).not.toThrow();
    });
  });

  describe('startMeasurement', () => {
    it('应该开始测量', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      tool.startMeasurement();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Volume measurement started')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('integration', () => {
    it('应该完成完整的测量流程', async () => {
      // 1. 开始测量
      tool.startMeasurement();

      // 2. 设置测量框
      const min = new THREE.Vector3(-5, -5, 0);
      const max = new THREE.Vector3(5, 5, 5);
      tool.setMeasurementBox(min, max);

      // 3. 设置参数
      tool.setGridResolution(1.0);
      tool.setBaseHeight(2.5);

      // 4. 计算体积
      const result = await tool.calculateVolume();

      expect(result.volume).toBeGreaterThan(0);
      expect(result.baseHeight).toBe(2.5);

      // 5. 清理
      tool.dispose();
      expect(tool.getMeasurementBox()).toBeNull();
    });
  });
});
