/**
 * Unit tests for EarthControls
 */

import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EarthControls, MouseButton } from '../EarthControls';

// Mock HTMLElement dimensions
class MockHTMLElement {
  clientWidth = 1920;
  clientHeight = 1080;
  listeners: Map<string, Set<EventListenerOrEventListenerObject>> = new Map();

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: AddEventListenerOptions | boolean,
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        if (typeof listener === 'function') {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      });
    }
    return true;
  }
}

// Mock document for global event listeners
const mockDocument = {
  listeners: new Map<string, Set<EventListenerOrEventListenerObject>>(),

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    _options?: AddEventListenerOptions | boolean,
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  },

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  },

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        if (typeof listener === 'function') {
          listener(event);
        } else {
          listener.handleEvent(event);
        }
      });
    }
    return true;
  },
};

// Replace global document
vi.stubGlobal('document', mockDocument);

// Mock Touch API (not available in jsdom)
class MockTouch implements Touch {
  identifier: number;
  target: EventTarget;
  clientX: number;
  clientY: number;
  screenX: number;
  screenY: number;
  pageX: number;
  pageY: number;
  radiusX: number;
  radiusY: number;
  rotationAngle: number;
  force: number;

  constructor(init: TouchInit) {
    this.identifier = init.identifier;
    this.target = init.target as EventTarget;
    this.clientX = init.clientX ?? 0;
    this.clientY = init.clientY ?? 0;
    this.screenX = init.screenX ?? this.clientX;
    this.screenY = init.screenY ?? this.clientY;
    this.pageX = init.pageX ?? this.clientX;
    this.pageY = init.pageY ?? this.clientY;
    this.radiusX = 0;
    this.radiusY = 0;
    this.rotationAngle = 0;
    this.force = 0;
  }
}

vi.stubGlobal('Touch', MockTouch);

describe('EarthControls', () => {
  let camera: THREE.PerspectiveCamera;
  let domElement: MockHTMLElement;
  let controls: EarthControls;

  beforeEach(() => {
    // Create camera
    camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    // Create DOM element
    domElement = new MockHTMLElement();

    // Create controls
    controls = new EarthControls(camera as THREE.Camera, domElement as any);

    // Clear document listeners
    mockDocument.listeners.clear();
  });

  afterEach(() => {
    controls.dispose();
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with camera and domElement', () => {
      expect(controls.camera).toBe(camera);
      expect(controls.domElement).toBe(domElement);
    });

    it('should set default parameters', () => {
      expect(controls.rotationSpeed).toBe(10);
      expect(controls.zoomSpeed).toBe(1);
      expect(controls.fadeFactor).toBe(20);
      expect(controls.enabled).toBe(true);
      expect(controls.pivot).toBeNull();
    });

    it('should attach event listeners to domElement', () => {
      const listeners = domElement.listeners;
      expect(listeners.has('mousedown')).toBe(true);
      expect(listeners.has('wheel')).toBe(true);
      expect(listeners.has('contextmenu')).toBe(true);
      expect(listeners.has('touchstart')).toBe(true);
    });
  });

  describe('setPivot', () => {
    it('should set pivot point', () => {
      const pivot = new THREE.Vector3(5, 5, 5);
      controls.setPivot(pivot);

      expect(controls.pivot).toBeInstanceOf(THREE.Vector3);
      expect(controls.pivot!.x).toBe(5);
      expect(controls.pivot!.y).toBe(5);
      expect(controls.pivot!.z).toBe(5);
    });

    it('should clone the pivot point', () => {
      const pivot = new THREE.Vector3(1, 2, 3);
      controls.setPivot(pivot);

      pivot.set(9, 9, 9);

      expect(controls.pivot!.x).toBe(1);
      expect(controls.pivot!.y).toBe(2);
      expect(controls.pivot!.z).toBe(3);
    });
  });

  describe('Mouse Events', () => {
    describe('onMouseDown', () => {
      it('should handle left mouse button down', () => {
        const event = new MouseEvent('mousedown', {
          button: MouseButton.LEFT,
          clientX: 100,
          clientY: 200,
        });

        domElement.dispatchEvent(event);

        // Should attach global listeners
        expect(mockDocument.listeners.has('mousemove')).toBe(true);
        expect(mockDocument.listeners.has('mouseup')).toBe(true);
      });

      it('should handle right mouse button down', () => {
        const startListener = vi.fn();
        controls.on('start', startListener);

        const event = new MouseEvent('mousedown', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 200,
        });

        domElement.dispatchEvent(event);

        expect(startListener).toHaveBeenCalledTimes(1);
      });

      it('should not handle mouse down when disabled', () => {
        controls.enabled = false;
        const startListener = vi.fn();
        controls.on('start', startListener);

        const event = new MouseEvent('mousedown', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 200,
        });

        domElement.dispatchEvent(event);

        expect(startListener).not.toHaveBeenCalled();
      });
    });

    describe('onMouseMove', () => {
      it('should handle mouse move during drag', () => {
        const changeListener = vi.fn();
        controls.on('change', changeListener);
        controls.setPivot(new THREE.Vector3(0, 0, 0));

        // Start drag
        const downEvent = new MouseEvent('mousedown', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 100,
        });
        domElement.dispatchEvent(downEvent);

        // Move mouse
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
        });
        mockDocument.dispatchEvent(moveEvent);

        expect(changeListener).toHaveBeenCalled();
      });

      it('should not handle mouse move when not dragging', () => {
        const changeListener = vi.fn();
        controls.on('change', changeListener);

        const moveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
        });
        mockDocument.dispatchEvent(moveEvent);

        expect(changeListener).not.toHaveBeenCalled();
      });

      it('should not handle mouse move when disabled', () => {
        controls.setPivot(new THREE.Vector3(0, 0, 0));

        // Start drag
        const downEvent = new MouseEvent('mousedown', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 100,
        });
        domElement.dispatchEvent(downEvent);

        controls.enabled = false;

        const changeListener = vi.fn();
        controls.on('change', changeListener);

        // Move mouse
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
        });
        mockDocument.dispatchEvent(moveEvent);

        expect(changeListener).not.toHaveBeenCalled();
      });

      it('should not rotate without pivot', () => {
        const changeListener = vi.fn();
        controls.on('change', changeListener);

        // Start drag without setting pivot
        const downEvent = new MouseEvent('mousedown', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 100,
        });
        domElement.dispatchEvent(downEvent);

        // Move mouse
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
        });
        mockDocument.dispatchEvent(moveEvent);

        expect(changeListener).not.toHaveBeenCalled();
      });

      it('should not rotate with left mouse button', () => {
        controls.setPivot(new THREE.Vector3(0, 0, 0));
        const changeListener = vi.fn();
        controls.on('change', changeListener);

        // Start drag with left button
        const downEvent = new MouseEvent('mousedown', {
          button: MouseButton.LEFT,
          clientX: 100,
          clientY: 100,
        });
        domElement.dispatchEvent(downEvent);

        // Move mouse
        const moveEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
        });
        mockDocument.dispatchEvent(moveEvent);

        expect(changeListener).not.toHaveBeenCalled();
      });
    });

    describe('onMouseUp', () => {
      it('should handle mouse up', () => {
        const endListener = vi.fn();
        controls.on('end', endListener);

        // Start drag
        const downEvent = new MouseEvent('mousedown', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 100,
        });
        domElement.dispatchEvent(downEvent);

        // End drag
        const upEvent = new MouseEvent('mouseup', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 100,
        });
        mockDocument.dispatchEvent(upEvent);

        expect(endListener).toHaveBeenCalledTimes(1);
      });

      it('should remove global listeners on mouse up', () => {
        // Start drag
        const downEvent = new MouseEvent('mousedown', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 100,
        });
        domElement.dispatchEvent(downEvent);

        expect(mockDocument.listeners.has('mousemove')).toBe(true);
        expect(mockDocument.listeners.has('mouseup')).toBe(true);

        // End drag
        const upEvent = new MouseEvent('mouseup', {
          button: MouseButton.RIGHT,
          clientX: 100,
          clientY: 100,
        });
        mockDocument.dispatchEvent(upEvent);

        // Listeners should be removed
        expect(mockDocument.listeners.get('mousemove')?.size).toBe(0);
        expect(mockDocument.listeners.get('mouseup')?.size).toBe(0);
      });
    });

    describe('onWheel', () => {
      it('should handle wheel up (zoom in)', () => {
        const event = new WheelEvent('wheel', {
          deltaY: -100,
        });

        domElement.dispatchEvent(event);

        // Internal wheelDelta should be updated (tested via update())
      });

      it('should handle wheel down (zoom out)', () => {
        const event = new WheelEvent('wheel', {
          deltaY: 100,
        });

        domElement.dispatchEvent(event);

        // Internal wheelDelta should be updated (tested via update())
      });

      it('should not handle wheel when disabled', () => {
        controls.enabled = false;

        const event = new WheelEvent('wheel', {
          deltaY: -100,
        });

        domElement.dispatchEvent(event);

        // No error should occur
      });
    });

    describe('onContextMenu', () => {
      it('should prevent context menu', () => {
        const event = new Event('contextmenu');
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        domElement.dispatchEvent(event);

        expect(preventDefaultSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Touch Events', () => {
    describe('onTouchStart', () => {
      it('should handle single touch start', () => {
        const startListener = vi.fn();
        controls.on('start', startListener);

        const touch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 100,
          clientY: 200,
        });

        const event = new TouchEvent('touchstart', {
          touches: [touch],
        });

        domElement.dispatchEvent(event);

        expect(startListener).toHaveBeenCalledTimes(1);
        expect(mockDocument.listeners.has('touchmove')).toBe(true);
        expect(mockDocument.listeners.has('touchend')).toBe(true);
      });

      it('should not handle touch start when disabled', () => {
        controls.enabled = false;
        const startListener = vi.fn();
        controls.on('start', startListener);

        const touch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 100,
          clientY: 200,
        });

        const event = new TouchEvent('touchstart', {
          touches: [touch],
        });

        domElement.dispatchEvent(event);

        expect(startListener).not.toHaveBeenCalled();
      });

      it('should ignore multi-touch start', () => {
        const startListener = vi.fn();
        controls.on('start', startListener);

        const touch1 = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 100,
          clientY: 200,
        });

        const touch2 = new Touch({
          identifier: 1,
          target: domElement as any,
          clientX: 200,
          clientY: 300,
        });

        const event = new TouchEvent('touchstart', {
          touches: [touch1, touch2],
        });

        domElement.dispatchEvent(event);

        // Should not emit start event for multi-touch
        expect(startListener).not.toHaveBeenCalled();
      });
    });

    describe('onTouchMove', () => {
      it('should handle touch move', () => {
        const changeListener = vi.fn();
        controls.on('change', changeListener);
        controls.setPivot(new THREE.Vector3(0, 0, 0));

        // Start touch
        const startTouch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 100,
          clientY: 100,
        });

        const startEvent = new TouchEvent('touchstart', {
          touches: [startTouch],
        });

        domElement.dispatchEvent(startEvent);

        // Move touch
        const moveTouch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 150,
          clientY: 150,
        });

        const moveEvent = new TouchEvent('touchmove', {
          touches: [moveTouch],
        });

        mockDocument.dispatchEvent(moveEvent);

        expect(changeListener).toHaveBeenCalled();
      });

      it('should not handle touch move when disabled', () => {
        controls.setPivot(new THREE.Vector3(0, 0, 0));

        // Start touch
        const startTouch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 100,
          clientY: 100,
        });

        const startEvent = new TouchEvent('touchstart', {
          touches: [startTouch],
        });

        domElement.dispatchEvent(startEvent);

        controls.enabled = false;

        const changeListener = vi.fn();
        controls.on('change', changeListener);

        // Move touch
        const moveTouch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 150,
          clientY: 150,
        });

        const moveEvent = new TouchEvent('touchmove', {
          touches: [moveTouch],
        });

        mockDocument.dispatchEvent(moveEvent);

        expect(changeListener).not.toHaveBeenCalled();
      });

      it('should not handle touch move without pivot', () => {
        const changeListener = vi.fn();
        controls.on('change', changeListener);

        // Start touch without setting pivot
        const startTouch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 100,
          clientY: 100,
        });

        const startEvent = new TouchEvent('touchstart', {
          touches: [startTouch],
        });

        domElement.dispatchEvent(startEvent);

        // Move touch
        const moveTouch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 150,
          clientY: 150,
        });

        const moveEvent = new TouchEvent('touchmove', {
          touches: [moveTouch],
        });

        mockDocument.dispatchEvent(moveEvent);

        expect(changeListener).not.toHaveBeenCalled();
      });
    });

    describe('onTouchEnd', () => {
      it('should handle touch end', () => {
        const endListener = vi.fn();
        controls.on('end', endListener);

        // Start touch
        const startTouch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 100,
          clientY: 100,
        });

        const startEvent = new TouchEvent('touchstart', {
          touches: [startTouch],
        });

        domElement.dispatchEvent(startEvent);

        // End touch
        const endEvent = new TouchEvent('touchend', {
          touches: [],
        });

        mockDocument.dispatchEvent(endEvent);

        expect(endListener).toHaveBeenCalledTimes(1);
      });

      it('should remove global listeners on touch end', () => {
        // Start touch
        const startTouch = new Touch({
          identifier: 0,
          target: domElement as any,
          clientX: 100,
          clientY: 100,
        });

        const startEvent = new TouchEvent('touchstart', {
          touches: [startTouch],
        });

        domElement.dispatchEvent(startEvent);

        expect(mockDocument.listeners.has('touchmove')).toBe(true);
        expect(mockDocument.listeners.has('touchend')).toBe(true);

        // End touch
        const endEvent = new TouchEvent('touchend', {
          touches: [],
        });

        mockDocument.dispatchEvent(endEvent);

        // Listeners should be removed
        expect(mockDocument.listeners.get('touchmove')?.size).toBe(0);
        expect(mockDocument.listeners.get('touchend')?.size).toBe(0);
      });
    });
  });

  describe('update', () => {
    it('should not update when disabled', () => {
      controls.enabled = false;
      controls.setPivot(new THREE.Vector3(0, 0, 0));

      const initialPosition = camera.position.clone();
      controls.update(0.016);

      expect(camera.position.x).toBe(initialPosition.x);
      expect(camera.position.y).toBe(initialPosition.y);
      expect(camera.position.z).toBe(initialPosition.z);
    });

    it('should apply zoom when wheelDelta is set', () => {
      controls.setPivot(new THREE.Vector3(0, 0, 0));

      const initialDistance = camera.position.distanceTo(controls.pivot!);

      // Simulate wheel event (zoom in)
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
      });
      domElement.dispatchEvent(wheelEvent);

      // Update should apply zoom
      controls.update(0.016);

      const newDistance = camera.position.distanceTo(controls.pivot!);
      expect(newDistance).toBeLessThan(initialDistance);
    });

    it('should not apply zoom without pivot', () => {
      const initialPosition = camera.position.clone();

      // Simulate wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
      });
      domElement.dispatchEvent(wheelEvent);

      controls.update(0.016);

      expect(camera.position.x).toBe(initialPosition.x);
      expect(camera.position.y).toBe(initialPosition.y);
      expect(camera.position.z).toBe(initialPosition.z);
    });

    it('should emit change event when zooming', () => {
      controls.setPivot(new THREE.Vector3(0, 0, 0));
      const changeListener = vi.fn();
      controls.on('change', changeListener);

      // Simulate wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
      });
      domElement.dispatchEvent(wheelEvent);

      controls.update(0.016);

      expect(changeListener).toHaveBeenCalled();
    });

    it('should apply fade to zoom delta', () => {
      controls.setPivot(new THREE.Vector3(0, 0, 0));

      // Simulate wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
      });
      domElement.dispatchEvent(wheelEvent);

      // First update applies zoom
      controls.update(0.016);

      // Multiple updates should gradually reduce zoom delta
      const position1 = camera.position.clone();
      controls.update(0.016);
      const position2 = camera.position.clone();
      controls.update(0.016);
      const position3 = camera.position.clone();

      const delta1 = position1.distanceTo(position2);
      const delta2 = position2.distanceTo(position3);

      // Each update should move less than the previous
      expect(delta2).toBeLessThan(delta1);
    });

    it('should reset wheelDelta after update', () => {
      controls.setPivot(new THREE.Vector3(0, 0, 0));

      // Simulate wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
      });
      domElement.dispatchEvent(wheelEvent);

      // First update applies the wheel delta
      controls.update(0.016);

      // Simulate another wheel event
      const wheelEvent2 = new WheelEvent('wheel', {
        deltaY: -100,
      });
      domElement.dispatchEvent(wheelEvent2);

      // Second update should apply new wheel delta (wheelDelta was reset)
      const position1 = camera.position.clone();
      controls.update(0.016);
      const position2 = camera.position.clone();

      // Should have moved due to new wheel event
      const distance = position1.distanceTo(position2);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('stop', () => {
    it('should stop all motion', () => {
      controls.setPivot(new THREE.Vector3(0, 0, 0));

      // Simulate wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
      });
      domElement.dispatchEvent(wheelEvent);

      controls.update(0.016);
      controls.stop();

      const position1 = camera.position.clone();
      controls.update(0.016);
      const position2 = camera.position.clone();

      expect(position1.x).toBe(position2.x);
      expect(position1.y).toBe(position2.y);
      expect(position1.z).toBe(position2.z);
    });
  });

  describe('dispose', () => {
    it('should remove all event listeners', () => {
      controls.dispose();

      // DOM element listeners should be removed
      expect(domElement.listeners.get('mousedown')?.size).toBe(0);
      expect(domElement.listeners.get('wheel')?.size).toBe(0);
      expect(domElement.listeners.get('contextmenu')?.size).toBe(0);
      expect(domElement.listeners.get('touchstart')?.size).toBe(0);
    });

    it('should remove all custom event listeners', () => {
      const listener = vi.fn();
      controls.on('change', listener);

      controls.dispose();

      controls.emit('change', undefined);

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Rotation', () => {
    it('should rotate camera around pivot', () => {
      // Position camera off to the side so rotation is more visible
      camera.position.set(10, 5, 0);
      camera.lookAt(0, 0, 0);
      controls.setPivot(new THREE.Vector3(0, 0, 0));

      const initialPosition = camera.position.clone();

      // Start drag
      const downEvent = new MouseEvent('mousedown', {
        button: MouseButton.RIGHT,
        clientX: 960,
        clientY: 540,
      });
      domElement.dispatchEvent(downEvent);

      // Move mouse to the right (horizontal rotation)
      const moveEvent = new MouseEvent('mousemove', {
        clientX: 1060,
        clientY: 540,
      });
      mockDocument.dispatchEvent(moveEvent);

      // Position should have changed (at least one coordinate)
      const positionChanged =
        camera.position.x !== initialPosition.x ||
        camera.position.y !== initialPosition.y ||
        camera.position.z !== initialPosition.z;
      expect(positionChanged).toBe(true);
    });

    it('should maintain distance to pivot during rotation', () => {
      controls.setPivot(new THREE.Vector3(0, 0, 0));

      const initialDistance = camera.position.distanceTo(controls.pivot!);

      // Perform rotation
      const downEvent = new MouseEvent('mousedown', {
        button: MouseButton.RIGHT,
        clientX: 960,
        clientY: 540,
      });
      domElement.dispatchEvent(downEvent);

      const moveEvent = new MouseEvent('mousemove', {
        clientX: 1060,
        clientY: 540,
      });
      mockDocument.dispatchEvent(moveEvent);

      const newDistance = camera.position.distanceTo(controls.pivot!);

      // Distance should be approximately the same (within floating point tolerance)
      expect(Math.abs(newDistance - initialDistance)).toBeLessThan(0.0001);
    });

    it('should look at pivot after rotation', () => {
      controls.setPivot(new THREE.Vector3(0, 0, 0));

      // Perform rotation
      const downEvent = new MouseEvent('mousedown', {
        button: MouseButton.RIGHT,
        clientX: 960,
        clientY: 540,
      });
      domElement.dispatchEvent(downEvent);

      const moveEvent = new MouseEvent('mousemove', {
        clientX: 1060,
        clientY: 540,
      });
      mockDocument.dispatchEvent(moveEvent);

      // Camera should be looking at pivot
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const toPivot = new THREE.Vector3().subVectors(controls.pivot!, camera.position).normalize();

      // Dot product should be close to 1 (vectors aligned)
      const dot = forward.dot(toPivot);
      expect(dot).toBeGreaterThan(0.99);
    });
  });

  describe('Parameters', () => {
    it('should allow changing rotationSpeed', () => {
      controls.setPivot(new THREE.Vector3(0, 0, 0));
      controls.rotationSpeed = 20;

      const downEvent = new MouseEvent('mousedown', {
        button: MouseButton.RIGHT,
        clientX: 960,
        clientY: 540,
      });
      domElement.dispatchEvent(downEvent);

      const moveEvent = new MouseEvent('mousemove', {
        clientX: 1060,
        clientY: 540,
      });
      mockDocument.dispatchEvent(moveEvent);

      // With higher rotation speed, rotation should be more pronounced
      // (Hard to test exact value due to quaternion math)
      expect(controls.rotationSpeed).toBe(20);
    });

    it('should allow changing zoomSpeed', () => {
      controls.zoomSpeed = 2;

      expect(controls.zoomSpeed).toBe(2);
    });

    it('should allow changing fadeFactor', () => {
      controls.fadeFactor = 10;

      expect(controls.fadeFactor).toBe(10);
    });
  });

  describe('MouseButton enum', () => {
    it('should have correct button values', () => {
      expect(MouseButton.LEFT).toBe(0);
      expect(MouseButton.MIDDLE).toBe(1);
      expect(MouseButton.RIGHT).toBe(2);
    });
  });
});
