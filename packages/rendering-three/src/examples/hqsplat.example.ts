/**
 * HQ Splat (High Quality Point Rendering) Example
 *
 * This example demonstrates how to use HQ Splat for high-quality point cloud rendering
 * with improved visual appearance through circular splats, lighting, and smooth edges.
 *
 * @module @better-potree/rendering-three/examples/hqsplat
 */

import * as THREE from 'three';
import { PointCloudMaterial } from '../materials/PointCloudMaterial.js';
import { PointShape, PointSizeType, PointCloudColorMode } from '@better-potree/core';

/**
 * Example 1: Basic HQ Splat setup
 *
 * Creates a point cloud material with HQ Splat (PARABOLOID shape) for improved visual quality.
 */
export function example1_basicHQSplat() {
  // Create material with PARABOLOID shape (HQ Splat)
  const material = new PointCloudMaterial({
    shape: PointShape.PARABOLOID, // Enable HQ Splat
    size: 2.0,
    minSize: 1.0,
    maxSize: 10.0,
    colorMode: PointCloudColorMode.RGB,
    opacity: 1.0,
  });

  // Create point cloud geometry
  const positions = new Float32Array([
    0, 0, 0,
    1, 0, 0,
    0, 1, 0,
    1, 1, 0,
  ]);

  const colors = new Float32Array([
    1.0, 0.0, 0.0, // Red
    0.0, 1.0, 0.0, // Green
    0.0, 0.0, 1.0, // Blue
    1.0, 1.0, 0.0, // Yellow
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Create point cloud mesh
  const points = new THREE.Points(geometry, material);

  return { material, geometry, points };
}

/**
 * Example 2: Comparing different point shapes
 *
 * Demonstrates the visual difference between SQUARE, CIRCLE, and PARABOLOID (HQ Splat).
 */
export function example2_compareShapes() {
  const shapes = [
    { shape: PointShape.SQUARE, name: 'Square (Default)' },
    { shape: PointShape.CIRCLE, name: 'Circle (Basic Round)' },
    { shape: PointShape.PARABOLOID, name: 'Paraboloid (HQ Splat)' },
  ];

  const materials = shapes.map(({ shape, name }) => ({
    shape,
    name,
    material: new PointCloudMaterial({
      shape,
      size: 5.0,
      colorMode: PointCloudColorMode.RGB,
    }),
  }));

  return materials;
}

/**
 * Example 3: HQ Splat with different size types
 *
 * Shows how HQ Splat works with FIXED, ATTENUATED, and ADAPTIVE point sizing.
 */
export function example3_hqSplatWithSizeTypes() {
  const sizeTypes = [
    {
      type: PointSizeType.FIXED,
      name: 'Fixed Size',
      description: 'Points have constant pixel size regardless of distance',
    },
    {
      type: PointSizeType.ATTENUATED,
      name: 'Attenuated Size',
      description: 'Points scale with distance (perspective)',
    },
    {
      type: PointSizeType.ADAPTIVE,
      name: 'Adaptive Size',
      description: 'Points adapt to LOD and maintain visual density',
    },
  ];

  const materials = sizeTypes.map(({ type, name, description }) => ({
    type,
    name,
    description,
    material: new PointCloudMaterial({
      shape: PointShape.PARABOLOID,
      sizeType: type,
      size: 3.0,
      minSize: 1.0,
      maxSize: 20.0,
    }),
  }));

  return materials;
}

/**
 * Example 4: HQ Splat with different color modes
 *
 * Demonstrates HQ Splat with various coloring modes (RGB, elevation, intensity, etc.).
 */
export function example4_hqSplatWithColorModes() {
  const colorModes = [
    {
      mode: PointCloudColorMode.RGB,
      name: 'RGB Colors',
      description: 'Use point RGB attributes',
    },
    {
      mode: PointCloudColorMode.ELEVATION,
      name: 'Elevation Gradient',
      description: 'Color based on Z coordinate',
      elevationRange: [0, 100] as [number, number],
    },
    {
      mode: PointCloudColorMode.INTENSITY,
      name: 'Intensity',
      description: 'Grayscale based on point intensity',
      intensityRange: [0, 255] as [number, number],
    },
    {
      mode: PointCloudColorMode.CLASSIFICATION,
      name: 'Classification',
      description: 'Color based on point classification',
    },
    {
      mode: PointCloudColorMode.NORMAL,
      name: 'Normals',
      description: 'Visualize point normals',
    },
  ];

  const materials = colorModes.map(({ mode, name, description, elevationRange, intensityRange }) => ({
    mode,
    name,
    description,
    material: new PointCloudMaterial({
      shape: PointShape.PARABOLOID,
      colorMode: mode,
      size: 4.0,
      ...(elevationRange && { elevationRange }),
      ...(intensityRange && { intensityRange }),
    }),
  }));

  return materials;
}

/**
 * Example 5: HQ Splat with EDL (Eye-Dome Lighting)
 *
 * Combines HQ Splat with EDL for maximum visual quality.
 * EDL adds depth-based shading for better depth perception.
 */
export function example5_hqSplatWithEDL() {
  const material = new PointCloudMaterial({
    shape: PointShape.PARABOLOID,
    size: 3.0,
    colorMode: PointCloudColorMode.RGB,
    useEDL: true, // Enable Eye-Dome Lighting
  });

  return material;
}

/**
 * Example 6: HQ Splat with clip boxes
 *
 * Shows how to use HQ Splat with spatial clipping.
 */
export function example6_hqSplatWithClipping() {
  // Create a clip box
  const clipBox = new THREE.Matrix4();
  clipBox.makeTranslation(0, 0, 0);
  clipBox.scale(new THREE.Vector3(10, 10, 10));

  const material = new PointCloudMaterial({
    shape: PointShape.PARABOLOID,
    size: 3.0,
    clipBoxes: [clipBox],
  });

  return material;
}

/**
 * Example 7: Animating between shapes
 *
 * Demonstrates how to dynamically switch between point shapes.
 */
export function example7_animateShapes() {
  const material = new PointCloudMaterial({
    shape: PointShape.SQUARE,
    size: 4.0,
  });

  let currentShapeIndex = 0;
  const shapes: PointShape[] = [PointShape.SQUARE, PointShape.CIRCLE, PointShape.PARABOLOID];

  // Function to cycle through shapes
  const nextShape = () => {
    currentShapeIndex = (currentShapeIndex + 1) % shapes.length;
    const nextShapeValue = shapes[currentShapeIndex];
    if (nextShapeValue) {
      material.shape = nextShapeValue;
    }
  };

  return { material, nextShape, shapes };
}

/**
 * Example 8: Performance comparison
 *
 * Compares rendering performance between different point shapes.
 */
export function example8_performanceComparison() {
  const testConfigs = [
    {
      name: 'Square (Fastest)',
      shape: PointShape.SQUARE,
      expectedPerformance: 'Baseline',
    },
    {
      name: 'Circle (Fast)',
      shape: PointShape.CIRCLE,
      expectedPerformance: '~5% slower than square',
    },
    {
      name: 'HQ Splat (Moderate)',
      shape: PointShape.PARABOLOID,
      expectedPerformance: '~10-15% slower than square',
    },
  ];

  const materials = testConfigs.map(({ name, shape, expectedPerformance }) => ({
    name,
    shape,
    expectedPerformance,
    material: new PointCloudMaterial({
      shape,
      size: 3.0,
      sizeType: PointSizeType.ADAPTIVE,
    }),
  }));

  return materials;
}

/**
 * Example 9: Complete scene setup with HQ Splat
 *
 * Full example showing how to set up a complete scene with HQ Splat rendering.
 */
export function example9_completeSceneSetup() {
  // Create scene
  const scene = new THREE.Scene();

  // Create camera
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000,
  );
  camera.position.set(5, 5, 5);
  camera.lookAt(0, 0, 0);

  // Create renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Create HQ Splat material
  const material = new PointCloudMaterial({
    shape: PointShape.PARABOLOID,
    sizeType: PointSizeType.ADAPTIVE,
    size: 2.0,
    minSize: 1.0,
    maxSize: 10.0,
    colorMode: PointCloudColorMode.RGB,
    useEDL: true,
  });

  // Update material with camera and screen size
  material.updateCamera(camera);
  material.updateScreenSize(window.innerWidth, window.innerHeight);

  // Create point cloud geometry (example with random points)
  const pointCount = 100000;
  const positions = new Float32Array(pointCount * 3);
  const colors = new Float32Array(pointCount * 3);

  for (let i = 0; i < pointCount; i++) {
    const i3 = i * 3;
    // Random positions in a sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.random() * 10;

    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    // Random colors
    colors[i3] = Math.random();
    colors[i3 + 1] = Math.random();
    colors[i3 + 2] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);

    // Rotate point cloud
    points.rotation.y += 0.001;

    // Update material (in case camera moved)
    material.updateCamera(camera);

    renderer.render(scene, camera);
  };

  // Handle window resize
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    material.updateScreenSize(width, height);
  };

  window.addEventListener('resize', handleResize);

  return { scene, camera, renderer, material, points, animate, handleResize };
}

/**
 * Example 10: Best practices for HQ Splat
 */
export function example10_bestPractices() {
  return {
    recommendations: [
      {
        title: 'Use Adaptive Sizing',
        description:
          'Combine PARABOLOID with ADAPTIVE size type for best visual quality at different distances',
        code: `
const material = new PointCloudMaterial({
  shape: PointShape.PARABOLOID,
  sizeType: PointSizeType.ADAPTIVE,
  size: 2.0,
});
        `,
      },
      {
        title: 'Set Appropriate Size Limits',
        description: 'Use minSize and maxSize to prevent points from becoming too small or too large',
        code: `
const material = new PointCloudMaterial({
  shape: PointShape.PARABOLOID,
  minSize: 1.0,  // Prevent points from disappearing
  maxSize: 10.0, // Prevent excessive overdraw
});
        `,
      },
      {
        title: 'Update Material with Camera Changes',
        description: 'Call updateCamera() when the camera changes for correct point sizing',
        code: `
// In your render loop or camera control handler
material.updateCamera(camera);
material.updateScreenSize(width, height);
        `,
      },
      {
        title: 'Combine with EDL for Maximum Quality',
        description: 'Enable EDL for depth-enhanced visualization',
        code: `
const material = new PointCloudMaterial({
  shape: PointShape.PARABOLOID,
  useEDL: true,
});
        `,
      },
      {
        title: 'Consider Performance Trade-offs',
        description:
          'HQ Splat is ~10-15% slower than SQUARE. Use SQUARE for maximum performance if quality is not critical.',
      },
    ],
  };
}
