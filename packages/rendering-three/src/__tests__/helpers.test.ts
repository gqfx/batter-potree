/**
 * Unit tests for helper classes
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import {
  BoundingBoxHelper,
  OctreeNodeHelper,
  FrustumHelper,
  MeasurementHelper,
  AnnotationHelper,
} from '../helpers/index';

describe('BoundingBoxHelper', () => {
  describe('Constructor', () => {
    it('should create helper with default box', () => {
      const helper = new BoundingBoxHelper();

      expect(helper).toBeInstanceOf(THREE.Box3Helper);
    });

    it('should create helper with custom box', () => {
      const box = new THREE.Box3(
        new THREE.Vector3(-1, -1, -1),
        new THREE.Vector3(1, 1, 1)
      );
      const helper = new BoundingBoxHelper(box);

      expect(helper.box).toBe(box);
    });

    it('should create helper with custom color', () => {
      const helper = new BoundingBoxHelper(undefined, 0xff0000);

      expect(helper).toBeDefined();
    });
  });

  describe('updateBox', () => {
    it('should update the bounding box', () => {
      const helper = new BoundingBoxHelper();
      const newBox = new THREE.Box3(
        new THREE.Vector3(-5, -5, -5),
        new THREE.Vector3(5, 5, 5)
      );

      helper.updateBox(newBox);

      expect(helper.box).toBe(newBox);
    });

    it('should handle multiple updates', () => {
      const helper = new BoundingBoxHelper();

      const box1 = new THREE.Box3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );
      helper.updateBox(box1);
      expect(helper.box).toBe(box1);

      const box2 = new THREE.Box3(
        new THREE.Vector3(2, 2, 2),
        new THREE.Vector3(3, 3, 3)
      );
      helper.updateBox(box2);
      expect(helper.box).toBe(box2);
    });
  });
});

describe('OctreeNodeHelper', () => {
  describe('Constructor', () => {
    it('should create helper with bounds', () => {
      const min = new THREE.Vector3(-1, -1, -1);
      const max = new THREE.Vector3(1, 1, 1);
      const helper = new OctreeNodeHelper(min, max);

      expect(helper).toBeInstanceOf(THREE.LineSegments);
      expect(helper.geometry).toBeDefined();
    });

    it('should create helper with custom color', () => {
      const min = new THREE.Vector3(0, 0, 0);
      const max = new THREE.Vector3(1, 1, 1);
      const helper = new OctreeNodeHelper(min, max, 0xff0000);

      expect(helper).toBeDefined();
      expect((helper.material as THREE.LineBasicMaterial).color).toBeDefined();
    });

    it('should create geometry with correct vertex count', () => {
      const min = new THREE.Vector3(0, 0, 0);
      const max = new THREE.Vector3(1, 1, 1);
      const helper = new OctreeNodeHelper(min, max);

      const posAttr = helper.geometry.getAttribute('position');
      // 12 edges * 2 vertices = 24 vertices
      expect(posAttr.count).toBe(24);
    });
  });

  describe('updateBounds', () => {
    it('should update node bounds', () => {
      const helper = new OctreeNodeHelper(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );

      const newMin = new THREE.Vector3(-5, -5, -5);
      const newMax = new THREE.Vector3(5, 5, 5);

      helper.updateBounds(newMin, newMax);

      const posAttr = helper.geometry.getAttribute('position');
      expect(posAttr.count).toBe(24);
    });

    it('should handle zero-size bounds', () => {
      const helper = new OctreeNodeHelper(
        new THREE.Vector3(1, 1, 1),
        new THREE.Vector3(2, 2, 2)
      );

      const point = new THREE.Vector3(0, 0, 0);
      helper.updateBounds(point, point);

      const posAttr = helper.geometry.getAttribute('position');
      expect(posAttr.count).toBe(24);
    });

    it('should update bounding sphere', () => {
      const helper = new OctreeNodeHelper(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );

      helper.updateBounds(
        new THREE.Vector3(-10, -10, -10),
        new THREE.Vector3(10, 10, 10)
      );

      expect(helper.geometry.boundingSphere).toBeDefined();
    });
  });
});

describe('FrustumHelper', () => {
  describe('Constructor', () => {
    it('should create helper with perspective camera', () => {
      const camera = new THREE.PerspectiveCamera(75, 1.5, 0.1, 1000);
      const helper = new FrustumHelper(camera);

      expect(helper).toBeInstanceOf(THREE.LineSegments);
      expect(helper.geometry).toBeDefined();
    });

    it('should create helper with orthographic camera', () => {
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      const helper = new FrustumHelper(camera);

      expect(helper).toBeInstanceOf(THREE.LineSegments);
    });

    it('should create helper with custom color', () => {
      const camera = new THREE.PerspectiveCamera();
      const helper = new FrustumHelper(camera, 0x00ff00);

      expect(helper).toBeDefined();
    });
  });

  describe('updateFrustum', () => {
    it('should update frustum from camera', () => {
      const camera = new THREE.PerspectiveCamera();
      const helper = new FrustumHelper(camera);

      const newCamera = new THREE.PerspectiveCamera(90, 2.0, 0.5, 500);
      expect(() => helper.updateFrustum(newCamera)).not.toThrow();
    });

    it('should handle orthographic camera update', () => {
      const camera = new THREE.PerspectiveCamera();
      const helper = new FrustumHelper(camera);

      const orthoCamera = new THREE.OrthographicCamera(-5, 5, 5, -5);
      expect(() => helper.updateFrustum(orthoCamera)).not.toThrow();
    });
  });
});

describe('MeasurementHelper', () => {
  describe('Constructor', () => {
    it('should create empty measurement helper', () => {
      const helper = new MeasurementHelper();

      expect(helper).toBeInstanceOf(THREE.Group);
      expect(helper.children.length).toBe(0);
    });
  });

  describe('addPoint', () => {
    it('should add point marker', () => {
      const helper = new MeasurementHelper();
      const position = new THREE.Vector3(1, 2, 3);

      helper.addPoint(position);

      expect(helper.children.length).toBe(1);
      expect(helper.children[0]).toBeInstanceOf(THREE.Points);
    });

    it('should add point with custom color', () => {
      const helper = new MeasurementHelper();
      const position = new THREE.Vector3(0, 0, 0);

      helper.addPoint(position, 0x00ff00);

      expect(helper.children.length).toBe(1);
    });

    it('should add point with custom size', () => {
      const helper = new MeasurementHelper();
      const position = new THREE.Vector3(0, 0, 0);

      helper.addPoint(position, 0xff0000, 0.5);

      expect(helper.children.length).toBe(1);
    });

    it('should add multiple points', () => {
      const helper = new MeasurementHelper();

      helper.addPoint(new THREE.Vector3(0, 0, 0));
      helper.addPoint(new THREE.Vector3(1, 1, 1));
      helper.addPoint(new THREE.Vector3(2, 2, 2));

      expect(helper.children.length).toBe(3);
    });
  });

  describe('addLine', () => {
    it('should add line between points', () => {
      const helper = new MeasurementHelper();
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(1, 1, 1);

      helper.addLine(start, end);

      expect(helper.children.length).toBe(1);
      expect(helper.children[0]).toBeInstanceOf(THREE.Line);
    });

    it('should add line with custom color', () => {
      const helper = new MeasurementHelper();
      const start = new THREE.Vector3(0, 0, 0);
      const end = new THREE.Vector3(5, 5, 5);

      helper.addLine(start, end, 0xff00ff);

      expect(helper.children.length).toBe(1);
    });

    it('should add multiple lines', () => {
      const helper = new MeasurementHelper();

      helper.addLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
      helper.addLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0));
      helper.addLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));

      expect(helper.children.length).toBe(3);
    });

    it('should create line with correct geometry', () => {
      const helper = new MeasurementHelper();
      const start = new THREE.Vector3(1, 2, 3);
      const end = new THREE.Vector3(4, 5, 6);

      helper.addLine(start, end);

      const line = helper.children[0] as THREE.Line;
      const positions = line.geometry.getAttribute('position');
      expect(positions.count).toBe(2);
    });
  });

  describe('clearMeasurements', () => {
    it('should clear all points and lines', () => {
      const helper = new MeasurementHelper();

      helper.addPoint(new THREE.Vector3(0, 0, 0));
      helper.addPoint(new THREE.Vector3(1, 1, 1));
      helper.addLine(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 1, 1));

      helper.clearMeasurements();

      expect(helper.children.length).toBe(0);
    });

    it('should handle clearing empty helper', () => {
      const helper = new MeasurementHelper();

      expect(() => helper.clearMeasurements()).not.toThrow();
      expect(helper.children.length).toBe(0);
    });

    it('should be idempotent', () => {
      const helper = new MeasurementHelper();

      helper.addPoint(new THREE.Vector3(0, 0, 0));
      helper.clearMeasurements();
      helper.clearMeasurements();

      expect(helper.children.length).toBe(0);
    });
  });
});

describe('AnnotationHelper', () => {
  describe('Constructor', () => {
    it('should create empty annotation helper', () => {
      const helper = new AnnotationHelper();

      expect(helper).toBeInstanceOf(THREE.Group);
      expect(helper.children.length).toBe(0);
    });
  });

  describe('addLabel', () => {
    it('should add label sprite', () => {
      const helper = new AnnotationHelper();
      const position = new THREE.Vector3(1, 2, 3);

      const sprite = helper.addLabel(position, 'Test Label');

      expect(sprite).toBeInstanceOf(THREE.Sprite);
      expect(helper.children.length).toBe(1);
      expect(helper.children).toContain(sprite);
    });

    it('should add label with custom colors', () => {
      const helper = new AnnotationHelper();
      const position = new THREE.Vector3(0, 0, 0);

      const sprite = helper.addLabel(position, 'Custom', '#ff0000', '#00ff00');

      expect(sprite).toBeInstanceOf(THREE.Sprite);
      expect(helper.children.length).toBe(1);
    });

    it('should position sprite correctly', () => {
      const helper = new AnnotationHelper();
      const position = new THREE.Vector3(5, 10, 15);

      const sprite = helper.addLabel(position, 'Positioned');

      expect(sprite.position.x).toBe(5);
      expect(sprite.position.y).toBe(10);
      expect(sprite.position.z).toBe(15);
    });

    it('should add multiple labels', () => {
      const helper = new AnnotationHelper();

      helper.addLabel(new THREE.Vector3(0, 0, 0), 'Label 1');
      helper.addLabel(new THREE.Vector3(1, 1, 1), 'Label 2');
      helper.addLabel(new THREE.Vector3(2, 2, 2), 'Label 3');

      expect(helper.children.length).toBe(3);
    });

    it('should create sprite with texture', () => {
      const helper = new AnnotationHelper();
      const sprite = helper.addLabel(new THREE.Vector3(0, 0, 0), 'Test');

      expect(sprite.material.map).toBeInstanceOf(THREE.Texture);
    });
  });

  describe('removeLabel', () => {
    it('should remove specific label', () => {
      const helper = new AnnotationHelper();
      const sprite1 = helper.addLabel(new THREE.Vector3(0, 0, 0), 'Label 1');
      const sprite2 = helper.addLabel(new THREE.Vector3(1, 1, 1), 'Label 2');

      helper.removeLabel(sprite1);

      expect(helper.children.length).toBe(1);
      expect(helper.children).not.toContain(sprite1);
      expect(helper.children).toContain(sprite2);
    });

    it('should handle removing non-existent label', () => {
      const helper = new AnnotationHelper();
      helper.addLabel(new THREE.Vector3(0, 0, 0), 'Label');

      const randomSprite = new THREE.Sprite();
      expect(() => helper.removeLabel(randomSprite)).not.toThrow();
    });

    it('should dispose material and texture', () => {
      const helper = new AnnotationHelper();
      const sprite = helper.addLabel(new THREE.Vector3(0, 0, 0), 'Test');

      helper.removeLabel(sprite);

      // After removal, should be safe to dispose again
      expect(() => sprite.material.dispose()).not.toThrow();
    });
  });

  describe('clearLabels', () => {
    it('should clear all labels', () => {
      const helper = new AnnotationHelper();

      helper.addLabel(new THREE.Vector3(0, 0, 0), 'Label 1');
      helper.addLabel(new THREE.Vector3(1, 1, 1), 'Label 2');
      helper.addLabel(new THREE.Vector3(2, 2, 2), 'Label 3');

      helper.clearLabels();

      expect(helper.children.length).toBe(0);
    });

    it('should handle clearing empty helper', () => {
      const helper = new AnnotationHelper();

      expect(() => helper.clearLabels()).not.toThrow();
      expect(helper.children.length).toBe(0);
    });

    it('should be idempotent', () => {
      const helper = new AnnotationHelper();

      helper.addLabel(new THREE.Vector3(0, 0, 0), 'Test');
      helper.clearLabels();
      helper.clearLabels();

      expect(helper.children.length).toBe(0);
    });

    it('should dispose all materials and textures', () => {
      const helper = new AnnotationHelper();

      helper.addLabel(new THREE.Vector3(0, 0, 0), 'Label 1');
      helper.addLabel(new THREE.Vector3(1, 1, 1), 'Label 2');

      expect(() => helper.clearLabels()).not.toThrow();
    });
  });
});
