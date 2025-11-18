/**
 * Viewer event definitions
 */

import type {
  IPointCloudOctree,
  IPointCloudOctreeNode,
  IWorkerDecodeResponse,
} from '@better-potree/core';
import type * as THREE from 'three';

/**
 * Viewer event data types
 */
export interface ViewerEvents {
  [key: string]: unknown;

  /**
   * Fired when a point cloud is loaded
   */
  'pointcloud-loaded': {
    pointCloud: IPointCloudOctree;
    name: string;
  };

  /**
   * Fired when a point cloud is removed
   */
  'pointcloud-removed': {
    pointCloud: IPointCloudOctree;
    name: string;
  };

  /**
   * Fired when a point cloud's visibility changes
   */
  'pointcloud-visibility-changed': {
    pointCloud: IPointCloudOctree;
    name: string;
    visible: boolean;
  };

  /**
   * Fired when a point cloud's transform changes
   */
  'pointcloud-transform-changed': {
    pointCloud: IPointCloudOctree;
    name: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };

  /**
   * Fired when a node is successfully loaded
   */
  'node-loaded': {
    pointCloud: IPointCloudOctree;
    node: IPointCloudOctreeNode;
    data: IWorkerDecodeResponse;
  };

  /**
   * Fired when a node fails to load
   */
  'node-load-failed': {
    node: IPointCloudOctreeNode;
    error: Error;
    retries: number;
  };

  /**
   * Fired when the camera is changed
   */
  'camera-changed': {
    camera: THREE.Camera;
    position: THREE.Vector3;
    target: THREE.Vector3;
  };

  /**
   * Fired when navigation mode changes
   */
  'navigation-changed': {
    mode: string;
  };

  /**
   * Fired when point budget changes
   */
  'point-budget-changed': {
    budget: number;
  };

  /**
   * Fired when point size changes
   */
  'point-size-changed': {
    size: number;
  };

  /**
   * Fired when background color changes
   */
  'background-changed': {
    color: THREE.Color;
  };

  /**
   * Fired when EDL settings change
   */
  'edl-changed': {
    enabled: boolean;
    radius?: number;
    strength?: number;
  };

  /**
   * Fired when a clip volume is added
   */
  'clip-volume-added': {
    volume: any; // Will be typed properly when ClipVolume is implemented
  };

  /**
   * Fired when a clip volume is removed
   */
  'clip-volume-removed': {
    volume: any;
  };

  /**
   * Fired before each render frame
   */
  update: {
    deltaTime: number;
    timestamp: number;
  };

  /**
   * Fired after each render frame
   */
  render: {
    deltaTime: number;
    timestamp: number;
  };

  /**
   * Fired when viewer is destroyed
   */
  destroy: Record<string, never>;
}
