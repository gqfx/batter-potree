# Better Potree 开发文档目录

本目录包含 Better Potree 项目的所有开发文档。文档已按照重要性和类型组织。

## 📚 核心文档（根目录）

### 必读文档

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 项目架构设计文档（基于实际代码实现）
  - 项目结构和包依赖
  - 核心系统设计（ECS、LOD、Streaming）
  - 渲染管道和性能优化
  - 技术栈和工具链

- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - 项目当前状态（2025-11-20）
  - 开发进度和完成情况
  - 测试覆盖率和已知问题
  - 下一步计划和优先级

- **[llm-development-plan.md](./llm-development-plan.md)** - 完整开发路线图
  - 53 个开发任务定义
  - Phase 0-4 详细计划
  - 实施指南和验收标准

### 参考文档

- **[POTREE_COMPARISON_ANALYSIS.md](./POTREE_COMPARISON_ANALYSIS.md)** - 与原版 Potree 对比分析
  - 功能对比矩阵
  - 迁移优先级
  - 实施建议

- **[FIX_PLAN.md](./FIX_PLAN.md)** - 当前问题清单
  - 已知 Bug 和待修复问题
  - 优先级排序

- **[browser-compatibility.md](./browser-compatibility.md)** - 浏览器兼容性测试报告

- **[ecs-performance-report.md](./ecs-performance-report.md)** - ECS 性能评估报告（决策文档）

- **[gemini_guide.md](./gemini_guide.md)** - AI 协作指南

## 📁 子目录

### [phase4/](./phase4/) - Phase 4 开发报告

Phase 4 是当前开发阶段的所有文档：

- `PHASE4_IMPLEMENTATION_PLAN.md` - Phase 4 实施计划
- `PHASE4_TODO_LIST.md` - Phase 4 待办清单
- `PHASE4_P0_COMPLETION_REPORT.md` - P0（核心功能）完成报告
- `PHASE4_P0_CRITICAL_GAPS_ANALYSIS.md` - P0 关键缺陷分析
- `PHASE4_P0.9_COMPLETION_REPORT.md` - P0.9 完成报告
- `PHASE4_P0.9_INTEGRATION_TEST_REPORT.md` - P0.9 集成测试报告
- `PHASE4_P0.9_FINAL_SUMMARY.md` - P0.9 最终总结
- `PHASE4_P1-P3_COMPLETION_REPORT.md` - P1-P3 完成报告
- `PHASE4_E2E_TEST_REPORT.md` - E2E 测试报告

### [performance/](./performance/) - 性能优化任务

性能优化相关的专项任务文档：

- `task-302-lod-optimization.md` - LOD 算法优化建议
- `task-303-rendering-optimization.md` - 渲染优化建议
- `task-304-worker-optimization.md` - Worker 优化建议
- `task-305-memory-optimization.md` - 内存管理优化建议

### [archive/](./archive/) - 历史文档归档

已完成阶段的文档和旧版本文档：

#### `archive/completed-phases/` - 已完成阶段报告
- `phase1-week1-report.md` - Phase 1 Week 1 完成报告
- `phase1-week2-report.md` - Phase 1 Week 2 完成报告
- `PHASE2_COMPLETION_REPORT.md` - Phase 2 完成报告
- `phase3-report.md` - Phase 3 完成报告

#### `archive/old-versions/` - 旧版本文档
- `architecture-v8.md` - 旧版架构文档（已被 ARCHITECTURE.md 替代）
- `PROJECT_COMPLETION_SUMMARY.md` - 过时的项目完成总结（已被 PROJECT_STATUS.md 替代）

#### `archive/old-plans/` - 旧版计划文档
- `llm-development-plan.md` - 旧版开发计划（已合并到主计划）
- `llm-plan-extension.md` - 计划扩展文档（已合并）
- `package-restructure-plan.md` - 包重构计划（已完成）
- `package-restructure-tasks.md` - 包重构任务（已完成）

#### `archive/early-drafts/` - 早期草稿
- `dirs.md` - 目录结构草稿
- `ecs.md` - ECS 设计草稿
- `ecs-update.md` - ECS 更新草稿
- `plan.md` - 早期计划草稿
- `todo.md` - 早期待办清单

## 🔍 快速导航

### 想要了解项目架构？
→ 阅读 [ARCHITECTURE.md](./ARCHITECTURE.md)

### 想要知道当前开发进度？
→ 阅读 [PROJECT_STATUS.md](./PROJECT_STATUS.md)

### 想要了解完整开发计划？
→ 阅读 [llm-development-plan.md](./llm-development-plan.md)

### 想要查看当前待修复问题？
→ 阅读 [FIX_PLAN.md](./FIX_PLAN.md)

### 想要了解 Phase 4 详细进展？
→ 查看 [phase4/](./phase4/) 目录

### 想要查看历史开发报告？
→ 查看 [archive/completed-phases/](./archive/completed-phases/) 目录

## 📝 文档维护说明

### 文档更新原则

1. **核心文档优先** - ARCHITECTURE.md 和 PROJECT_STATUS.md 应保持最新
2. **避免重复** - 不要创建内容重复的文档
3. **及时归档** - 已完成阶段的文档应移至 archive/
4. **清晰命名** - 文档名称应清晰表达内容和用途

### 文档组织规则

- **根目录** - 仅保留当前活跃和核心参考文档
- **phase4/** - 当前开发阶段的所有相关文档
- **performance/** - 性能优化相关的专项任务
- **archive/** - 历史文档，按类型分类归档

### 新增文档指南

- 开发报告 → `phase4/` 或新建 `phase5/`
- 性能优化任务 → `performance/`
- 已完成的阶段报告 → `archive/completed-phases/`
- 被替代的旧版文档 → `archive/old-versions/`

---

**最后更新**: 2025-11-20
**文档版本**: 1.0
**维护者**: Better Potree 开发团队
