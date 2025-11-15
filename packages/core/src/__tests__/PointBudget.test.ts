/**
 * Tests for LOD system
 */

import { describe, it, expect } from 'vitest';
import { PointBudget } from '../lod/PointBudget';

describe('PointBudget', () => {
  it('should manage point budget', () => {
    const budget = new PointBudget(1000);

    expect(budget.budget).toBe(1000);
    expect(budget.used).toBe(0);
    expect(budget.remaining).toBe(1000);
  });

  it('should allocate points', () => {
    const budget = new PointBudget(1000);

    expect(budget.allocate(500)).toBe(true);
    expect(budget.used).toBe(500);
    expect(budget.remaining).toBe(500);
  });

  it('should reject over-budget allocation', () => {
    const budget = new PointBudget(1000);

    budget.allocate(800);
    expect(budget.allocate(300)).toBe(false);
    expect(budget.used).toBe(800);
  });

  it('should reset budget', () => {
    const budget = new PointBudget(1000);

    budget.allocate(500);
    budget.reset();

    expect(budget.used).toBe(0);
    expect(budget.remaining).toBe(1000);
  });
});
