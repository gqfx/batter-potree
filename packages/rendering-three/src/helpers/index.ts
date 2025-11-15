/**
 * Bounding box helper for point clouds
 * @module @better-potree/rendering-three/helpers
 */

import * as THREE from 'three';

/**
 * Helper for visualizing point cloud bounding boxes
 */
export class BoundingBoxHelper extends THREE.Box3Helper {
  constructor(box?: THREE.Box3, color: THREE.ColorRepresentation = 0xffff00) {
    super(box || new THREE.Box3(), color);
  }

  /**
   * Update the bounding box
   */
  public updateBox(box: THREE.Box3): void {
    this.box = box;
  }
}

/**
 * Helper for visualizing octree nodes
 */
export class OctreeNodeHelper extends THREE.LineSegments {
  private static readonly EDGES: readonly (readonly [number, number])[] = [
    [0, 1], [1, 3], [3, 2], [2, 0], // Bottom face
    [4, 5], [5, 7], [7, 6], [6, 4], // Top face
    [0, 4], [1, 5], [2, 6], [3, 7], // Vertical edges
  ] as const;

  constructor(min: THREE.Vector3, max: THREE.Vector3, color: THREE.ColorRepresentation = 0x00ff00) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color });

    super(geometry, material);

    this.updateBounds(min, max);
  }

  /**
   * Update the node bounds
   */
  public updateBounds(min: THREE.Vector3, max: THREE.Vector3): void {
    const vertices = [
      min.x, min.y, min.z, // 0
      max.x, min.y, min.z, // 1
      min.x, max.y, min.z, // 2
      max.x, max.y, min.z, // 3
      min.x, min.y, max.z, // 4
      max.x, min.y, max.z, // 5
      min.x, max.y, max.z, // 6
      max.x, max.y, max.z, // 7
    ];

    const indices: number[] = [];
    for (const edge of OctreeNodeHelper.EDGES) {
      const [start, end] = edge;
      indices.push(start, end);
    }

    const positions = new Float32Array(indices.length * 3);
    for (let i = 0; i < indices.length; i++) {
      const vertexIndex = indices[i];
      if (vertexIndex !== undefined) {
        positions[i * 3] = vertices[vertexIndex * 3] ?? 0;
        positions[i * 3 + 1] = vertices[vertexIndex * 3 + 1] ?? 0;
        positions[i * 3 + 2] = vertices[vertexIndex * 3 + 2] ?? 0;
      }
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.computeBoundingSphere();
  }
}

/**
 * Helper for visualizing frustum
 */
export class FrustumHelper extends THREE.LineSegments {
  constructor(camera: THREE.Camera, color: THREE.ColorRepresentation = 0xff00ff) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({ color });

    super(geometry, material);

    this.updateFrustum(camera);
  }

  /**
   * Update the frustum from camera
   */
  public updateFrustum(camera: THREE.Camera): void {
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // TODO: Extract frustum corners and create visualization
    // This is a simplified placeholder implementation
    // A full implementation would compute the actual corner points from the frustum planes
  }
}

/**
 * Helper for visualizing measurements
 */
export class MeasurementHelper extends THREE.Group {
  private lines: THREE.Line[] = [];
  private points: THREE.Points[] = [];

  constructor() {
    super();
  }

  /**
   * Add a point marker
   */
  public addPoint(position: THREE.Vector3, color: THREE.ColorRepresentation = 0xff0000, size = 0.1): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([position.x, position.y, position.z], 3));

    const material = new THREE.PointsMaterial({ color, size, sizeAttenuation: false });
    const pointMesh = new THREE.Points(geometry, material);

    this.points.push(pointMesh);
    this.add(pointMesh);
  }

  /**
   * Add a line between two points
   */
  public addLine(start: THREE.Vector3, end: THREE.Vector3, color: THREE.ColorRepresentation = 0x00ff00): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
      start.x, start.y, start.z,
      end.x, end.y, end.z,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(geometry, material);

    this.lines.push(line);
    this.add(line);
  }

  /**
   * Clear all measurements
   */
  public clearMeasurements(): void {
    for (const line of this.lines) {
      this.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }

    for (const point of this.points) {
      this.remove(point);
      point.geometry.dispose();
      (point.material as THREE.Material).dispose();
    }

    this.lines = [];
    this.points = [];
  }
}

/**
 * Helper for visualizing annotations
 */
export class AnnotationHelper extends THREE.Group {
  private labels: THREE.Sprite[] = [];

  constructor() {
    super();
  }

  /**
   * Add an annotation label
   */
  public addLabel(
    position: THREE.Vector3,
    text: string,
    backgroundColor = '#000000',
    textColor = '#ffffff'
  ): THREE.Sprite {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context');
    }

    canvas.width = 256;
    canvas.height = 64;

    // Draw background
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    context.font = '24px Arial';
    context.fillStyle = textColor;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);

    // Create sprite
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    sprite.scale.set(2, 0.5, 1);

    this.labels.push(sprite);
    this.add(sprite);

    return sprite;
  }

  /**
   * Remove a label
   */
  public removeLabel(sprite: THREE.Sprite): void {
    const index = this.labels.indexOf(sprite);
    if (index !== -1) {
      this.labels.splice(index, 1);
      this.remove(sprite);
      sprite.material.dispose();
      if (sprite.material.map) {
        sprite.material.map.dispose();
      }
    }
  }

  /**
   * Clear all labels
   */
  public clearLabels(): void {
    for (const label of this.labels) {
      this.remove(label);
      label.material.dispose();
      if (label.material.map) {
        label.material.map.dispose();
      }
    }
    this.labels = [];
  }
}
