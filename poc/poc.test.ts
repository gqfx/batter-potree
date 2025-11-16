/**
 * POC 测试文件
 *
 * 用于 Phase 0 POC 验证的测试用例
 * 这个文件验证 @better-potree/core 包可以被正确引用
 */

import { describe, it, expect } from 'vitest';

describe('POC - 基础项目结构', () => {
  it('应该能够运行测试', () => {
    expect(true).toBe(true);
  });

  it('应该支持 TypeScript 类型检查', () => {
    const message: string = 'Hello, Better-Potree!';
    expect(message).toBeTypeOf('string');
  });

  it('应该能够引用 core 包', async () => {
    // 动态导入以验证包可以被正确引用
    const core = await import('@better-potree/core');
    expect(core).toBeDefined();
  });
});
