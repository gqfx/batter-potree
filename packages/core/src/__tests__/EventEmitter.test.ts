/**
 * Unit tests for Event System
 */

import { describe, it, expect, vi } from 'vitest';
import { TypedEventEmitter } from '../events/EventEmitter';
import type { PointCloudEvents } from '../events/types';

describe('TypedEventEmitter', () => {
  it('should emit and receive events', () => {
    const emitter = new TypedEventEmitter<PointCloudEvents>();
    const listener = vi.fn();

    emitter.on('name-changed', listener);
    emitter.emit('name-changed', { name: 'test', pointCloud: {} as any });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should support once listeners', () => {
    const emitter = new TypedEventEmitter<PointCloudEvents>();
    const listener = vi.fn();

    emitter.once('name-changed', listener);
    emitter.emit('name-changed', { name: 'test1', pointCloud: {} as any });
    emitter.emit('name-changed', { name: 'test2', pointCloud: {} as any });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should remove listeners', () => {
    const emitter = new TypedEventEmitter<PointCloudEvents>();
    const listener = vi.fn();

    emitter.on('name-changed', listener);
    emitter.off('name-changed', listener);
    emitter.emit('name-changed', { name: 'test', pointCloud: {} as any });

    expect(listener).not.toHaveBeenCalled();
  });
});
