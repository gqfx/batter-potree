/**
 * Unit tests for exports
 */

import { describe, it, expect } from 'vitest';
import { EarthControls, MouseButton } from '../index';
import type { EarthControlsEvents } from '../index';

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
    };
    expect(_events).toBeDefined();
  });
});
