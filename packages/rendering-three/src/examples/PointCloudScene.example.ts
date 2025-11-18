/**
 * PointCloudScene Usage Example
 *
 * This example demonstrates how to use PointCloudScene
 * to manage and render point cloud nodes with LOD control.
 */

import { PointCloudColorMode } from '@better-potree/core';
import * as THREE from 'three';
import { PointCloudScene } from './PointCloudScene';

/**
 * Example 1: Basic usage
 */
function basicUsage() {
  // Create scene with material configuration
  const scene = new PointCloudScene({
    materialConfig: {
      size: 1.5,
      colorMode: PointCloudColorMode.RGB,
    },
    octreeSpacing: 1.0,
  });

  // Create geometry for root node
  const positions = new Float32Array([
    0,
    0,
    0, // Point 1
    1,
    1,
    1, // Point 2
    2,
    2,
    2, // Point 3
  ]);

  const colors = new Float32Array([
    1,
    0,
    0, // Red
    0,
    1,
    0, // Green
    0,
    0,
    1, // Blue
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Add root node
  scene.addNode('r', geometry, {
    level: 0,
    numPoints: 3,
  });

  console.log(`Nodes: ${scene.nodeCount}, Points: ${scene.visiblePointCount}`);

  return scene;
}

/**
 * Example 2: LOD hierarchy management
 */
function lodHierarchy() {
  const scene = new PointCloudScene();

  // Create sample geometry
  const createGeometry = (numPoints: number) => {
    const positions = new Float32Array(numPoints * 3);
    for (let i = 0; i < numPoints; i++) {
      positions[i * 3] = Math.random() * 10;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = Math.random() * 10;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  };

  // Add root and children
  scene.addNode('r', createGeometry(100), { level: 0 });
  scene.addNode('r0', createGeometry(200), { level: 1 });
  scene.addNode('r1', createGeometry(200), { level: 1 });
  scene.addNode('r00', createGeometry(400), { level: 2 });
  scene.addNode('r01', createGeometry(400), { level: 2 });

  console.log(`Total nodes: ${scene.nodeCount}`);
  console.log(`Initial visible points: ${scene.visiblePointCount}`);

  // Simulate LOD update - only show root and first level
  const visibleNodes = new Set(['r', 'r0', 'r1']);
  scene.updateVisibility(visibleNodes);

  console.log(`After LOD: ${scene.visiblePointCount} visible points`);
  console.log(`Visible nodes: ${scene.getVisibleNodeIds().join(', ')}`);

  return scene;
}

/**
 * Example 3: Integration with Three.js render loop
 */
function renderLoopIntegration() {
  // Setup Three.js scene
  const threeScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Create point cloud scene
  const pointCloudScene = new PointCloudScene({
    materialConfig: {
      size: 2.0,
      colorMode: PointCloudColorMode.RGB,
    },
  });

  // Add some nodes (would normally come from loader)
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);
  const colors = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pointCloudScene.addNode('r', geometry);

  // Add to Three.js scene
  threeScene.add(pointCloudScene);

  // Camera setup
  camera.position.z = 5;

  // Render loop
  function animate() {
    requestAnimationFrame(animate);

    // Update camera uniforms
    pointCloudScene.updateCamera(camera);

    // Update screen size if needed
    pointCloudScene.updateScreenSize(window.innerWidth, window.innerHeight);

    // Render
    renderer.render(threeScene, camera);
  }

  animate();

  return { threeScene, pointCloudScene, camera, renderer };
}

/**
 * Example 4: Dynamic node management
 */
function dynamicNodeManagement() {
  const scene = new PointCloudScene();

  // Helper to create geometry
  const createGeometry = () => {
    const positions = new Float32Array([0, 0, 0, 1, 1, 1]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  };

  // Add initial nodes
  scene.addNode('r', createGeometry());
  scene.addNode('r0', createGeometry());
  console.log(`Initial: ${scene.nodeCount} nodes`);

  // Add more nodes dynamically
  scene.addNode('r1', createGeometry());
  scene.addNode('r00', createGeometry());
  console.log(`After additions: ${scene.nodeCount} nodes`);

  // Remove a node
  scene.removeNode('r0');
  console.log(`After removal: ${scene.nodeCount} nodes`);

  // Update node metadata
  scene.updateNodeMetadata('r', {
    vnStart: 10,
    pcIndex: 2,
  });

  const metadata = scene.getNodeMetadata('r');
  console.log(`Node 'r' metadata:`, metadata);

  return scene;
}

/**
 * Example 5: Material updates
 */
function materialUpdates() {
  const scene = new PointCloudScene();

  // Add some nodes
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  scene.addNode('r', geometry);

  // Change material properties directly
  scene.material.size = 3.0;
  scene.material.colorMode = PointCloudColorMode.INTENSITY;

  console.log(`Material size: ${scene.material.size}`);
  console.log(`Material color mode: ${scene.material.colorMode}`);

  // Or replace entire material
  const { PointCloudMaterial } = require('./materials/PointCloudMaterial');
  const newMaterial = new PointCloudMaterial({
    size: 5.0,
    colorMode: PointCloudColorMode.ELEVATION,
  });

  scene.updateMaterial(newMaterial);
  console.log(`New material applied`);

  return scene;
}

/**
 * Example 6: Cleanup
 */
function cleanup() {
  const scene = new PointCloudScene();

  // Add dispose handler
  scene.addDisposeHandler(() => {
    console.log('Custom cleanup logic');
  });

  // Add some nodes
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
  scene.addNode('r', geometry);

  // Later: dispose all resources
  scene.dispose();
  console.log(`Cleaned up: ${scene.nodeCount} nodes remain`);
}

// Export examples
export {
  basicUsage,
  cleanup,
  dynamicNodeManagement,
  lodHierarchy,
  materialUpdates,
  renderLoopIntegration,
};

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('\n=== Example 1: Basic Usage ===');
  basicUsage();

  console.log('\n=== Example 2: LOD Hierarchy ===');
  lodHierarchy();

  console.log('\n=== Example 4: Dynamic Node Management ===');
  dynamicNodeManagement();

  console.log('\n=== Example 5: Material Updates ===');
  materialUpdates();

  console.log('\n=== Example 6: Cleanup ===');
  cleanup();
}
