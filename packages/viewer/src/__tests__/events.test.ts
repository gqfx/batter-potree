/**
 * Unit tests for Viewer event types
 */

import type { IPointCloudOctree } from '@better-potree/types';
import type * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { ViewerEvents } from '../events';

describe('ViewerEvents', () => {
  describe('event type definitions', () => {
    it('should define pointcloud-loaded event', () => {
      const event: ViewerEvents['pointcloud-loaded'] = {
        pointCloud: {} as IPointCloudOctree,
        name: 'test',
      };

      expect(event).toHaveProperty('pointCloud');
      expect(event).toHaveProperty('name');
      expect(event.name).toBe('test');
    });

    it('should define pointcloud-removed event', () => {
      const event: ViewerEvents['pointcloud-removed'] = {
        pointCloud: {} as IPointCloudOctree,
        name: 'test',
      };

      expect(event).toHaveProperty('pointCloud');
      expect(event).toHaveProperty('name');
      expect(event.name).toBe('test');
    });

    it('should define camera-changed event', () => {
      const event: ViewerEvents['camera-changed'] = {
        camera: {} as THREE.Camera,
        position: {} as THREE.Vector3,
        target: {} as THREE.Vector3,
      };

      expect(event).toHaveProperty('camera');
      expect(event).toHaveProperty('position');
      expect(event).toHaveProperty('target');
    });

    it('should define navigation-changed event', () => {
      const event: ViewerEvents['navigation-changed'] = {
        mode: 'orbit',
      };

      expect(event).toHaveProperty('mode');
      expect(event.mode).toBe('orbit');
    });

    it('should define point-budget-changed event', () => {
      const event: ViewerEvents['point-budget-changed'] = {
        budget: 1_000_000,
      };

      expect(event).toHaveProperty('budget');
      expect(event.budget).toBe(1_000_000);
    });

    it('should define point-size-changed event', () => {
      const event: ViewerEvents['point-size-changed'] = {
        size: 2.0,
      };

      expect(event).toHaveProperty('size');
      expect(event.size).toBe(2.0);
    });

    it('should define background-changed event', () => {
      const event: ViewerEvents['background-changed'] = {
        color: {} as THREE.Color,
      };

      expect(event).toHaveProperty('color');
    });

    it('should define edl-changed event with enabled only', () => {
      const event: ViewerEvents['edl-changed'] = {
        enabled: true,
      };

      expect(event).toHaveProperty('enabled');
      expect(event.enabled).toBe(true);
    });

    it('should define edl-changed event with all properties', () => {
      const event: ViewerEvents['edl-changed'] = {
        enabled: true,
        radius: 1.4,
        strength: 0.4,
      };

      expect(event).toHaveProperty('enabled');
      expect(event).toHaveProperty('radius');
      expect(event).toHaveProperty('strength');
      expect(event.enabled).toBe(true);
      expect(event.radius).toBe(1.4);
      expect(event.strength).toBe(0.4);
    });

    it('should define clip-volume-added event', () => {
      const event: ViewerEvents['clip-volume-added'] = {
        volume: { name: 'test-volume' },
      };

      expect(event).toHaveProperty('volume');
    });

    it('should define clip-volume-removed event', () => {
      const event: ViewerEvents['clip-volume-removed'] = {
        volume: { name: 'test-volume' },
      };

      expect(event).toHaveProperty('volume');
    });

    it('should define update event', () => {
      const event: ViewerEvents['update'] = {
        deltaTime: 16.67,
        timestamp: 1234567890,
      };

      expect(event).toHaveProperty('deltaTime');
      expect(event).toHaveProperty('timestamp');
      expect(event.deltaTime).toBe(16.67);
      expect(event.timestamp).toBe(1234567890);
    });

    it('should define render event', () => {
      const event: ViewerEvents['render'] = {
        deltaTime: 16.67,
        timestamp: 1234567890,
      };

      expect(event).toHaveProperty('deltaTime');
      expect(event).toHaveProperty('timestamp');
      expect(event.deltaTime).toBe(16.67);
      expect(event.timestamp).toBe(1234567890);
    });

    it('should define destroy event', () => {
      const event: ViewerEvents['destroy'] = {};

      expect(event).toEqual({});
    });
  });

  describe('event type compatibility', () => {
    it('should allow optional properties in edl-changed', () => {
      const event1: ViewerEvents['edl-changed'] = {
        enabled: true,
      };

      const event2: ViewerEvents['edl-changed'] = {
        enabled: false,
        radius: 2.0,
      };

      const event3: ViewerEvents['edl-changed'] = {
        enabled: true,
        strength: 0.5,
      };

      const event4: ViewerEvents['edl-changed'] = {
        enabled: true,
        radius: 1.8,
        strength: 0.6,
      };

      expect(event1.enabled).toBe(true);
      expect(event2.radius).toBe(2.0);
      expect(event3.strength).toBe(0.5);
      expect(event4.radius).toBe(1.8);
      expect(event4.strength).toBe(0.6);
    });

    it('should enforce required properties', () => {
      // This is a compile-time test - if it compiles, the test passes
      // TypeScript will error if we try to create events without required properties

      const updateEvent: ViewerEvents['update'] = {
        deltaTime: 0,
        timestamp: 0,
      };

      const budgetEvent: ViewerEvents['point-budget-changed'] = {
        budget: 100_000,
      };

      expect(updateEvent.deltaTime).toBeDefined();
      expect(updateEvent.timestamp).toBeDefined();
      expect(budgetEvent.budget).toBeDefined();
    });
  });

  describe('event name types', () => {
    it('should have correct event names as string literals', () => {
      const eventNames: (keyof ViewerEvents)[] = [
        'pointcloud-loaded',
        'pointcloud-removed',
        'camera-changed',
        'navigation-changed',
        'point-budget-changed',
        'point-size-changed',
        'background-changed',
        'edl-changed',
        'clip-volume-added',
        'clip-volume-removed',
        'update',
        'render',
        'destroy',
      ];

      expect(eventNames.length).toBe(13);
    });
  });
});
