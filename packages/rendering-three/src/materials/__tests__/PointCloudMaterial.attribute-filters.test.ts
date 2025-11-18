/**
 * PointCloudMaterial attribute filters tests
 * @module @better-potree/rendering-three/materials/__tests__
 */

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PointCloudMaterial } from '../PointCloudMaterial.js';

describe('PointCloudMaterial - Attribute Filters', () => {
  describe('GPS Time Filter', () => {
    it('should enable GPS time filter when range is provided in config', () => {
      const material = new PointCloudMaterial({
        filterGPSTimeRange: [1000, 2000],
      });

      expect(material.defines?.clip_gps_enabled).toBe(true);
      expect(material.uniforms?.uFilterGPSTimeRange?.value).toBeInstanceOf(THREE.Vector2);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.x).toBe(1000);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.y).toBe(2000);
    });

    it('should not enable GPS time filter when range is not provided', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.clip_gps_enabled).toBeUndefined();
      expect(material.uniforms?.uFilterGPSTimeRange).toBeUndefined();
    });

    it('should update GPS time filter range dynamically', () => {
      const material = new PointCloudMaterial();

      // Enable filter
      material.setFilterGPSTimeRange([500, 1500]);
      expect(material.defines?.clip_gps_enabled).toBe(true);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.x).toBe(500);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.y).toBe(1500);

      // Disable filter
      material.setFilterGPSTimeRange(null);
      expect(material.defines?.clip_gps_enabled).toBeUndefined();
    });
  });

  describe('Return Number Filter', () => {
    it('should enable return number filter when range is provided in config', () => {
      const material = new PointCloudMaterial({
        filterReturnNumberRange: [1, 3],
      });

      expect(material.defines?.clip_return_number_enabled).toBe(true);
      expect(material.uniforms?.uFilterReturnNumberRange?.value).toBeInstanceOf(THREE.Vector2);
      expect(material.uniforms?.uFilterReturnNumberRange?.value.x).toBe(1);
      expect(material.uniforms?.uFilterReturnNumberRange?.value.y).toBe(3);
    });

    it('should not enable return number filter when range is not provided', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.clip_return_number_enabled).toBeUndefined();
      expect(material.uniforms?.uFilterReturnNumberRange).toBeUndefined();
    });

    it('should update return number filter range dynamically', () => {
      const material = new PointCloudMaterial();

      // Enable filter - show only first returns
      material.setFilterReturnNumberRange([1, 1]);
      expect(material.defines?.clip_return_number_enabled).toBe(true);
      expect(material.uniforms?.uFilterReturnNumberRange?.value.x).toBe(1);
      expect(material.uniforms?.uFilterReturnNumberRange?.value.y).toBe(1);

      // Disable filter
      material.setFilterReturnNumberRange(null);
      expect(material.defines?.clip_return_number_enabled).toBeUndefined();
    });
  });

  describe('Number of Returns Filter', () => {
    it('should enable number of returns filter when range is provided in config', () => {
      const material = new PointCloudMaterial({
        filterNumberOfReturnsRange: [2, 15],
      });

      expect(material.defines?.clip_number_of_returns_enabled).toBe(true);
      expect(material.uniforms?.uFilterNumberOfReturnsRange?.value).toBeInstanceOf(THREE.Vector2);
      expect(material.uniforms?.uFilterNumberOfReturnsRange?.value.x).toBe(2);
      expect(material.uniforms?.uFilterNumberOfReturnsRange?.value.y).toBe(15);
    });

    it('should not enable number of returns filter when range is not provided', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.clip_number_of_returns_enabled).toBeUndefined();
      expect(material.uniforms?.uFilterNumberOfReturnsRange).toBeUndefined();
    });

    it('should update number of returns filter range dynamically', () => {
      const material = new PointCloudMaterial();

      // Enable filter
      material.setFilterNumberOfReturnsRange([3, 5]);
      expect(material.defines?.clip_number_of_returns_enabled).toBe(true);
      expect(material.uniforms?.uFilterNumberOfReturnsRange?.value.x).toBe(3);
      expect(material.uniforms?.uFilterNumberOfReturnsRange?.value.y).toBe(5);

      // Disable filter
      material.setFilterNumberOfReturnsRange(null);
      expect(material.defines?.clip_number_of_returns_enabled).toBeUndefined();
    });
  });

  describe('Point Source ID Filter', () => {
    it('should enable point source ID filter when range is provided in config', () => {
      const material = new PointCloudMaterial({
        filterPointSourceIDRange: [10, 20],
      });

      expect(material.defines?.clip_point_source_id_enabled).toBe(true);
      expect(material.uniforms?.uFilterPointSourceIDRange?.value).toBeInstanceOf(THREE.Vector2);
      expect(material.uniforms?.uFilterPointSourceIDRange?.value.x).toBe(10);
      expect(material.uniforms?.uFilterPointSourceIDRange?.value.y).toBe(20);
    });

    it('should not enable point source ID filter when range is not provided', () => {
      const material = new PointCloudMaterial();

      expect(material.defines?.clip_point_source_id_enabled).toBeUndefined();
      expect(material.uniforms?.uFilterPointSourceIDRange).toBeUndefined();
    });

    it('should update point source ID filter range dynamically', () => {
      const material = new PointCloudMaterial();

      // Enable filter
      material.setFilterPointSourceIDRange([5, 15]);
      expect(material.defines?.clip_point_source_id_enabled).toBe(true);
      expect(material.uniforms?.uFilterPointSourceIDRange?.value.x).toBe(5);
      expect(material.uniforms?.uFilterPointSourceIDRange?.value.y).toBe(15);

      // Disable filter
      material.setFilterPointSourceIDRange(null);
      expect(material.defines?.clip_point_source_id_enabled).toBeUndefined();
    });
  });

  describe('Multiple Filters', () => {
    it('should support multiple filters simultaneously', () => {
      const material = new PointCloudMaterial({
        filterGPSTimeRange: [1000, 2000],
        filterReturnNumberRange: [1, 3],
        filterPointSourceIDRange: [10, 20],
      });

      // All filters should be enabled
      expect(material.defines?.clip_gps_enabled).toBe(true);
      expect(material.defines?.clip_return_number_enabled).toBe(true);
      expect(material.defines?.clip_point_source_id_enabled).toBe(true);

      // All uniforms should be set
      expect(material.uniforms?.uFilterGPSTimeRange?.value.x).toBe(1000);
      expect(material.uniforms?.uFilterReturnNumberRange?.value.x).toBe(1);
      expect(material.uniforms?.uFilterPointSourceIDRange?.value.x).toBe(10);
    });

    it('should allow independent enable/disable of each filter', () => {
      const material = new PointCloudMaterial({
        filterGPSTimeRange: [1000, 2000],
        filterReturnNumberRange: [1, 3],
      });

      // Initially two filters enabled
      expect(material.defines?.clip_gps_enabled).toBe(true);
      expect(material.defines?.clip_return_number_enabled).toBe(true);
      expect(material.defines?.clip_point_source_id_enabled).toBeUndefined();

      // Add third filter
      material.setFilterPointSourceIDRange([10, 20]);
      expect(material.defines?.clip_point_source_id_enabled).toBe(true);

      // Remove first filter
      material.setFilterGPSTimeRange(null);
      expect(material.defines?.clip_gps_enabled).toBeUndefined();
      expect(material.defines?.clip_return_number_enabled).toBe(true);
      expect(material.defines?.clip_point_source_id_enabled).toBe(true);
    });
  });

    describe('Shader Recompilation', () => {
    it('should add defines when filter is enabled', () => {
      const material = new PointCloudMaterial();

      material.setFilterGPSTimeRange([1000, 2000]);
      expect(material.defines?.clip_gps_enabled).toBe(true);
    });

    it('should remove defines when filter is disabled', () => {
      const material = new PointCloudMaterial({
        filterGPSTimeRange: [1000, 2000],
      });

      material.setFilterGPSTimeRange(null);
      expect(material.defines?.clip_gps_enabled).toBeUndefined();
    });

    it('should not change defines when only updating range values', () => {
      const material = new PointCloudMaterial({
        filterGPSTimeRange: [1000, 2000],
      });

      const definesBefore = material.defines?.clip_gps_enabled;

      // Update range while keeping filter enabled
      material.setFilterGPSTimeRange([1500, 2500]);
      expect(material.defines?.clip_gps_enabled).toBe(definesBefore);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.x).toBe(1500);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.y).toBe(2500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-width range (single value filter)', () => {
      const material = new PointCloudMaterial();

      // Show only return number 1
      material.setFilterReturnNumberRange([1, 1]);
      expect(material.uniforms?.uFilterReturnNumberRange?.value.x).toBe(1);
      expect(material.uniforms?.uFilterReturnNumberRange?.value.y).toBe(1);
    });

    it('should handle negative values in range', () => {
      const material = new PointCloudMaterial();

      // GPS time can be negative
      material.setFilterGPSTimeRange([-1000, 1000]);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.x).toBe(-1000);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.y).toBe(1000);
    });

    it('should handle very large ranges', () => {
      const material = new PointCloudMaterial();

      material.setFilterGPSTimeRange([0, 1000000000]);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.x).toBe(0);
      expect(material.uniforms?.uFilterGPSTimeRange?.value.y).toBe(1000000000);
    });
  });
});
