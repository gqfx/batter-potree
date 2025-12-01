/**
 * Unit tests for exports
 */

import { describe, expect, it } from 'vitest';
import type { EarthControlsEvents } from '../index';
import { EarthControls, MouseButton } from '../index';

describe('Package Exports', () => {
  it('should export EarthControls', () => {
    expect(EarthControls).toBeDefined();
    expect(typeof EarthControls).toBe('function');
  });

  it('should export MouseButton enum', () => {
    expect(MouseButton).toBeDefined();
    expect(MouseButton.LEFT).toBe(0);
    expect(MouseButton.MIDDLE).toBe(1);
    expect(MouseButton.RIGHT).toBe(2);
  });

  it('should export EarthControlsEvents type', () => {
    // Type-only export, just verify it compiles
    const _events: EarthControlsEvents = {
      start: undefined,
      change: undefined,
      end: undefined,
      onSceneMoved: undefined,
      clearEffect: undefined,
    };
    expect(_events).toBeDefined();
  });
});
