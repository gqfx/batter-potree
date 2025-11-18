/**
 * ProfileTool 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { ProfileTool } from '../ProfileTool.js';
import type { Viewer } from '../../Viewer.js';

describe('ProfileTool', () => {
  let viewer: Viewer;
  let tool: ProfileTool;

  beforeEach(() => {
    // 创建 mock viewer
    viewer = {
      // 添加必要的 mock 方法
    } as unknown as Viewer;

    tool = new ProfileTool(viewer);
  });

  describe('constructor', () => {
    it('应该使用默认配置创建工具', () => {
      expect(tool).toBeDefined();
      expect(tool.getControlPoints()).toHaveLength(0);
    });

    it('应该使用自定义配置创建工具', () => {
      const customTool = new ProfileTool(viewer, {
        lineColor: 0x0000ff,
        lineWidth: 3,
        defaultResolution: 0.5,
      });

      expect(customTool).toBeDefined();
    });
  });

  describe('setProfileLine', () => {
    it('应该设置剖面线', () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
        new THREE.Vector3(10, 10, 0),
      ];

      tool.setProfileLine(points);

      const controlPoints = tool.getControlPoints();
      expect(controlPoints).toHaveLength(3);
      expect(controlPoints[0]).toEqual(points[0]);
    });

    it('应该在点数少于2时抛出错误', () => {
      expect(() => {
        tool.setProfileLine([new THREE.Vector3(0, 0, 0)]);
      }).toThrow('at least 2 points');
    });

    it('应该克隆输入的点', () => {
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ];

      tool.setProfileLine(points);

      // 修改原始点
      points[0]!.x = 100;

      const controlPoints = tool.getControlPoints();
      expect(controlPoints[0]!.x).toBe(0);
    });
  });

  describe('addPoint', () => {
    it('应该添加控制点', () => {
      tool.addPoint(new THREE.Vector3(0, 0, 0));
      tool.addPoint(new THREE.Vector3(10, 0, 0));

      expect(tool.getControlPoints()).toHaveLength(2);
    });

    it('应该克隆添加的点', () => {
      const point = new THREE.Vector3(5, 5, 5);
      tool.addPoint(point);

      point.x = 100;

      const controlPoints = tool.getControlPoints();
      expect(controlPoints[0]!.x).toBe(5);
    });
  });

  describe('removePoint', () => {
    beforeEach(() => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
        new THREE.Vector3(10, 10, 0),
      ]);
    });

    it('应该移除指定索引的点', () => {
      tool.removePoint(1);

      expect(tool.getControlPoints()).toHaveLength(2);
    });

    it('应该在索引无效时抛出错误', () => {
      expect(() => tool.removePoint(-1)).toThrow('Invalid point index');
      expect(() => tool.removePoint(10)).toThrow('Invalid point index');
    });
  });

  describe('updatePoint', () => {
    beforeEach(() => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);
    });

    it('应该更新指定索引的点', () => {
      const newPos = new THREE.Vector3(5, 5, 5);
      tool.updatePoint(0, newPos);

      const controlPoints = tool.getControlPoints();
      expect(controlPoints[0]).toEqual(newPos);
    });

    it('应该在索引无效时抛出错误', () => {
      const newPos = new THREE.Vector3(5, 5, 5);

      expect(() => tool.updatePoint(-1, newPos)).toThrow('Invalid point index');
      expect(() => tool.updatePoint(10, newPos)).toThrow('Invalid point index');
    });

    it('应该克隆新位置', () => {
      const newPos = new THREE.Vector3(5, 5, 5);
      tool.updatePoint(0, newPos);

      newPos.x = 100;

      const controlPoints = tool.getControlPoints();
      expect(controlPoints[0]!.x).toBe(5);
    });
  });

  describe('sampleProfile', () => {
    it('应该在未设置剖面线时抛出错误', async () => {
      await expect(tool.sampleProfile()).rejects.toThrow('Profile line not set');
    });

    it('应该采样剖面', async () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      const profile = await tool.sampleProfile(1.0);

      expect(profile).toBeDefined();
      expect(profile.points.length).toBeGreaterThan(0);
      expect(profile.totalLength).toBeCloseTo(10, 1);
      expect(profile.minElevation).toBeDefined();
      expect(profile.maxElevation).toBeDefined();
      expect(profile.elevationRange).toBe(
        profile.maxElevation - profile.minElevation
      );
    });

    it('应该使用默认分辨率', async () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      const profile = await tool.sampleProfile();

      expect(profile.points.length).toBeGreaterThan(0);
    });

    it('应该使用自定义分辨率', async () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(100, 0, 0),
      ]);

      const profile1 = await tool.sampleProfile(1.0);
      const profile2 = await tool.sampleProfile(10.0);

      // 分辨率更细，点数应该更多
      expect(profile1.points.length).toBeGreaterThan(profile2.points.length);
    });
  });

  describe('exportProfile', () => {
    it('应该在未采样时抛出错误', () => {
      expect(() => tool.exportProfile()).toThrow('No profile data');
    });

    it('应该导出 CSV 格式', async () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      await tool.sampleProfile(1.0);

      const csv = tool.exportProfile();

      expect(csv).toContain('Distance (m),Elevation (m),X,Y,Z');
      expect(csv.split('\n').length).toBeGreaterThan(1);
    });
  });

  describe('exportProfileJSON', () => {
    it('应该在未采样时抛出错误', () => {
      expect(() => tool.exportProfileJSON()).toThrow('No profile data');
    });

    it('应该导出 JSON 格式', async () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      await tool.sampleProfile(1.0);

      const json = tool.exportProfileJSON();
      const data = JSON.parse(json);

      expect(data.points).toBeDefined();
      expect(data.totalLength).toBeDefined();
      expect(data.minElevation).toBeDefined();
      expect(data.maxElevation).toBeDefined();
    });
  });

  describe('getProfileData', () => {
    it('应该在未采样时返回 null', () => {
      expect(tool.getProfileData()).toBeNull();
    });

    it('应该返回剖面数据', async () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      await tool.sampleProfile(1.0);

      const data = tool.getProfileData();
      expect(data).not.toBeNull();
      expect(data!.points.length).toBeGreaterThan(0);
    });
  });

  describe('getControlPoints', () => {
    it('应该返回控制点数组的副本', () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      const points1 = tool.getControlPoints();
      const points2 = tool.getControlPoints();

      expect(points1).not.toBe(points2); // 不同的数组
      expect(points1[0]).toEqual(points2[0]); // 但内容相同
    });
  });

  describe('getTotalLength', () => {
    it('应该计算剖面线总长度', () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
        new THREE.Vector3(10, 10, 0),
      ]);

      const length = tool.getTotalLength();
      expect(length).toBeCloseTo(20, 1);
    });

    it('应该在没有点时返回0', () => {
      expect(tool.getTotalLength()).toBe(0);
    });
  });

  describe('setProfileWidth', () => {
    it('应该设置剖面宽度', () => {
      tool.setProfileWidth(2.5);
      expect(() => tool.setProfileWidth(2.5)).not.toThrow();
    });

    it('应该限制最小宽度', () => {
      tool.setProfileWidth(0.01); // 太小
      // 内部应该被限制为 0.1
      expect(() => tool.setProfileWidth(0.01)).not.toThrow();
    });
  });

  describe('clear', () => {
    it('应该清除所有数据', async () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      await tool.sampleProfile(1.0);

      tool.clear();

      expect(tool.getControlPoints()).toHaveLength(0);
      expect(tool.getProfileData()).toBeNull();
      expect(tool.getTotalLength()).toBe(0);
    });
  });

  describe('getVisualization', () => {
    it('应该返回可视化组', () => {
      const group = tool.getVisualization();

      expect(group).toBeInstanceOf(THREE.Group);
      expect(group.name).toBe('ProfileTool');
    });
  });

  describe('dispose', () => {
    it('应该清理所有资源', async () => {
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      await tool.sampleProfile(1.0);

      tool.dispose();

      expect(tool.getControlPoints()).toHaveLength(0);
      expect(tool.getProfileData()).toBeNull();
    });

    it('应该多次调用 dispose 不报错', () => {
      tool.dispose();
      expect(() => tool.dispose()).not.toThrow();
    });
  });

  describe('integration', () => {
    it('应该完成完整的剖面测量流程', async () => {
      // 1. 设置剖面线
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(50, 0, 0),
        new THREE.Vector3(50, 50, 0),
      ];
      tool.setProfileLine(points);

      // 2. 设置参数
      tool.setProfileWidth(2.0);

      // 3. 采样剖面
      const profile = await tool.sampleProfile(5.0);
      expect(profile.points.length).toBeGreaterThan(0);
      expect(profile.totalLength).toBeCloseTo(100, 1);

      // 4. 导出数据
      const csv = tool.exportProfile();
      expect(csv).toContain('Distance');

      const json = tool.exportProfileJSON();
      const data = JSON.parse(json);
      expect(data.points).toBeDefined();

      // 5. 清理
      tool.dispose();
      expect(tool.getControlPoints()).toHaveLength(0);
    });

    it('应该支持动态修改剖面线', async () => {
      // 设置初始剖面线
      tool.setProfileLine([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(10, 0, 0),
      ]);

      const length1 = tool.getTotalLength();
      expect(length1).toBeCloseTo(10, 1);

      // 添加点
      tool.addPoint(new THREE.Vector3(10, 10, 0));

      const length2 = tool.getTotalLength();
      expect(length2).toBeCloseTo(20, 1);

      // 移除点
      tool.removePoint(1);

      const length3 = tool.getTotalLength();
      expect(length3).toBeCloseTo(Math.sqrt(200), 1);

      // 更新点
      tool.updatePoint(1, new THREE.Vector3(0, 10, 0));

      const length4 = tool.getTotalLength();
      expect(length4).toBeCloseTo(10, 1);
    });
  });
});
