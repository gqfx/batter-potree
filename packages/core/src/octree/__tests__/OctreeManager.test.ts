/**
 * OctreeManager 测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OctreeManager } from '../OctreeManager.js';
import { OctreeNode } from '../OctreeNode.js';
import * as utils from '../utils.js';

// Mock metadata response
const mockMetadata = {
  name: 'test-pointcloud',
  boundingBox: {
    min: [0, 0, 0],
    max: [100, 100, 100],
  },
  spacing: 1.0,
  pointAttributes: {
    POSITION_CARTESIAN: {},
    COLOR_PACKED: {},
  },
  points: 1000000,
  hierarchy: {
    firstChunkSize: 1000,
    stepSize: 4,
    depth: 10,
  },
  offset: [0, 0, 0],
};

// Mock fetch function
const createMockFetch = (data: unknown = mockMetadata) => {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
};

describe('OctreeManager', () => {
  let manager: OctreeManager;

  beforeEach(() => {
    manager = new OctreeManager();
  });

  describe('加载八叉树', () => {
    it('应该能够加载八叉树', async () => {
      const mockFetch = createMockFetch();

      const metadata = await manager.loadOctree(
        'pc1',
        'http://example.com/metadata.json',
        mockFetch,
      );

      expect(metadata).toBeDefined();
      expect(metadata.sourceId).toBe('pc1');
      expect(metadata.name).toBe('test-pointcloud');
      expect(metadata.points).toBe(1000000);
      expect(mockFetch).toHaveBeenCalledWith('http://example.com/metadata.json');
    });

    it('应该填充 metadata.sourceId', async () => {
      const mockFetch = createMockFetch();

      const metadata = await manager.loadOctree(
        'my-source',
        'http://example.com/data.json',
        mockFetch,
      );

      expect(metadata.sourceId).toBe('my-source');
    });

    it('应该创建八叉树实例', async () => {
      const mockFetch = createMockFetch();

      await manager.loadOctree('pc1', 'http://example.com/metadata.json', mockFetch);

      const octree = manager.getOctree('pc1');
      expect(octree).toBeDefined();
      expect(octree?.getName()).toBe('test-pointcloud');
      expect(octree?.root).toBeDefined();
    });

    it('应该拒绝重复加载', async () => {
      const mockFetch = createMockFetch();

      await manager.loadOctree('pc1', 'http://example.com/metadata.json', mockFetch);

      await expect(
        manager.loadOctree('pc1', 'http://example.com/another.json', mockFetch),
      ).rejects.toThrow('already loaded');
    });

    it('应该处理 fetch 失败', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(
        manager.loadOctree('pc1', 'http://example.com/notfound.json', mockFetch),
      ).rejects.toThrow('Failed to fetch');
    });

    it('应该处理无效元数据', async () => {
      const mockFetch = createMockFetch({ invalid: 'data' });

      await expect(
        manager.loadOctree('pc1', 'http://example.com/invalid.json', mockFetch),
      ).rejects.toThrow('Missing bounding box');
    });
  });

  describe('八叉树管理', () => {
    it('应该能够获取八叉树', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      const octree = manager.getOctree('pc1');
      expect(octree).toBeDefined();

      const notFound = manager.getOctree('unknown');
      expect(notFound).toBeUndefined();
    });

    it('应该能够获取元数据', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      const metadata = manager.getMetadata('pc1');
      expect(metadata).toBeDefined();
      expect(metadata?.sourceId).toBe('pc1');
    });

    it('应该能够检查八叉树是否存在', async () => {
      const mockFetch = createMockFetch();

      expect(manager.hasOctree('pc1')).toBe(false);

      await manager.loadOctree('pc1', 'url', mockFetch);

      expect(manager.hasOctree('pc1')).toBe(true);
    });

    it('应该能够移除八叉树', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      const removed = manager.removeOctree('pc1');

      expect(removed).toBe(true);
      expect(manager.hasOctree('pc1')).toBe(false);
      expect(manager.getOctree('pc1')).toBeUndefined();
    });

    it('应该在移除不存在的八叉树时返回 false', () => {
      const removed = manager.removeOctree('unknown');
      expect(removed).toBe(false);
    });

    it('应该能够获取所有数据源ID', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);
      await manager.loadOctree('pc2', 'url', mockFetch);

      const sourceIds = manager.getSourceIds();

      expect(sourceIds).toHaveLength(2);
      expect(sourceIds).toContain('pc1');
      expect(sourceIds).toContain('pc2');
    });
  });

  describe('节点管理', () => {
    it('应该索引根节点', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      const root = manager.getNode('pc1', 'r');
      expect(root).toBeDefined();
      expect(root?.name).toBe('r');
    });

    it('应该能够注册节点', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      const octree = manager.getOctree('pc1')!;
      const childNode = octree.root.createChild(0);

      manager.registerNode('pc1', childNode);

      const retrieved = manager.getNode('pc1', 'r0');
      expect(retrieved).toBe(childNode);
    });

    it('应该能够通过全局ID获取节点', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      const node = manager.getNodeByGlobalId('pc1::r');
      expect(node).toBeDefined();
      expect(node?.name).toBe('r');
    });

    it('应该能够注销节点', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      const octree = manager.getOctree('pc1')!;
      const childNode = octree.root.createChild(0);
      manager.registerNode('pc1', childNode);

      manager.unregisterNode('pc1', 'r0');

      const node = manager.getNode('pc1', 'r0');
      expect(node).toBeUndefined();
    });
  });

  describe('统计信息', () => {
    it('应该提供正确的统计信息', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      const stats = manager.getStats();

      expect(stats.octreeCount).toBe(1);
      expect(stats.totalNodes).toBe(1); // 只有根节点
      expect(stats.loadedNodes).toBe(0); // 未加载
      expect(stats.totalPoints).toBe(1000000);
    });

    it('应该在没有八叉树时返回空统计', () => {
      const stats = manager.getStats();

      expect(stats.octreeCount).toBe(0);
      expect(stats.totalNodes).toBe(0);
      expect(stats.loadedNodes).toBe(0);
      expect(stats.totalPoints).toBe(0);
    });
  });

  describe('清理', () => {
    it('应该能够清空所有八叉树', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);
      await manager.loadOctree('pc2', 'url', mockFetch);

      manager.clear();

      expect(manager.getSourceIds()).toHaveLength(0);
    });

    it('应该能够销毁管理器', async () => {
      const mockFetch = createMockFetch();
      await manager.loadOctree('pc1', 'url', mockFetch);

      manager.dispose();

      expect(manager.hasOctree('pc1')).toBe(false);
    });
  });
});

describe('Octree Utils', () => {
  describe('getNodeLevel', () => {
    it('应该正确计算层级', () => {
      expect(utils.getNodeLevel('r')).toBe(0);
      expect(utils.getNodeLevel('r0')).toBe(1);
      expect(utils.getNodeLevel('r01')).toBe(2);
      expect(utils.getNodeLevel('r0123')).toBe(4);
    });

    it('应该对无效名称返回 -1', () => {
      expect(utils.getNodeLevel('invalid')).toBe(-1);
    });
  });

  describe('getParentNodeName', () => {
    it('应该返回父节点名称', () => {
      expect(utils.getParentNodeName('r0')).toBe('r');
      expect(utils.getParentNodeName('r01')).toBe('r0');
      expect(utils.getParentNodeName('r0123')).toBe('r012');
    });

    it('应该对根节点返回 null', () => {
      expect(utils.getParentNodeName('r')).toBe(null);
    });
  });

  describe('getChildNodeName', () => {
    it('应该生成子节点名称', () => {
      expect(utils.getChildNodeName('r', 0)).toBe('r0');
      expect(utils.getChildNodeName('r0', 3)).toBe('r03');
      expect(utils.getChildNodeName('r01', 7)).toBe('r017');
    });

    it('应该拒绝无效索引', () => {
      expect(() => utils.getChildNodeName('r', -1)).toThrow();
      expect(() => utils.getChildNodeName('r', 8)).toThrow();
    });
  });

  describe('makeGlobalNodeId', () => {
    it('应该生成全局ID', () => {
      expect(utils.makeGlobalNodeId('pc1', 'r')).toBe('pc1::r');
      expect(utils.makeGlobalNodeId('source', 'r0123')).toBe('source::r0123');
    });
  });

  describe('parseGlobalNodeId', () => {
    it('应该解析全局ID', () => {
      const result = utils.parseGlobalNodeId('pc1::r0');
      expect(result.sourceId).toBe('pc1');
      expect(result.nodeName).toBe('r0');
    });

    it('应该拒绝无效ID', () => {
      expect(() => utils.parseGlobalNodeId('invalid')).toThrow();
    });
  });

  describe('isValidNodeName', () => {
    it('应该验证有效名称', () => {
      expect(utils.isValidNodeName('r')).toBe(true);
      expect(utils.isValidNodeName('r0')).toBe(true);
      expect(utils.isValidNodeName('r01234567')).toBe(true);
    });

    it('应该拒绝无效名称', () => {
      expect(utils.isValidNodeName('')).toBe(false);
      expect(utils.isValidNodeName('x')).toBe(false);
      expect(utils.isValidNodeName('r8')).toBe(false);
      expect(utils.isValidNodeName('ra')).toBe(false);
    });
  });
});
