/**
 * Common type definitions
 */
import type * as THREE from 'three';
export * from './camera.js';
export * from './loader.js';
export * from './potree.js';
export * from './renderer.js';
/**
 * Potree configuration
 */
export interface PotreeConfig {
    pointBudget?: number;
    fov?: number;
    edlEnabled?: boolean;
    edlRadius?: number;
    edlStrength?: number;
    pointSize?: number;
    minNodeSize?: number;
    showBoundingBox?: boolean;
}
/**
 * Navigation modes
 */
export declare enum NavigationMode {
    ORBIT = "orbit",
    FLY = "fly",
    EARTH = "earth",
    FPS = "fps"
}
/**
 * Point size types
 */
export declare enum PointSizeType {
    FIXED = "fixed",
    ATTENUATED = "attenuated",
    ADAPTIVE = "adaptive"
}
/**
 * Point shape types
 */
export declare enum PointShape {
    SQUARE = "square",
    CIRCLE = "circle",
    PARABOLOID = "paraboloid"
}
/**
 * Point cloud quality types
 */
export declare enum PointQuality {
    SQUARES = "squares",
    CIRCLES = "circles",
    INTERPOLATION = "interpolation",
    HQ_SPLATS = "hq_splats"
}
/**
 * Classification types
 */
export interface Classification {
    value: number;
    name: string;
    color: THREE.Color;
    visible: boolean;
}
/**
 * Measurement types
 */
export declare enum MeasurementType {
    POINT = "point",
    DISTANCE = "distance",
    AREA = "area",
    VOLUME = "volume",
    ANGLE = "angle",
    HEIGHT = "height",
    CIRCLE = "circle",
    AZIMUTH = "azimuth"
}
/**
 * Clip volume types
 */
export declare enum ClipVolumeType {
    BOX = "box",
    SPHERE = "sphere",
    POLYGON = "polygon"
}
/**
 * Clip mode
 */
export declare enum ClipMode {
    DISABLED = "disabled",
    CLIP_OUTSIDE = "clip_outside",
    HIGHLIGHT_INSIDE = "highlight_inside"
}
/**
 * EDL (Eye-Dome Lighting) configuration
 */
export interface EDLConfig {
    enabled: boolean;
    radius?: number;
    strength?: number;
    opacity?: number;
}
/**
 * Point cloud metadata
 */
export interface PointCloudMetadata {
    version: string;
    name: string;
    description?: string;
    points: number;
    projection?: string;
    hierarchy: {
        firstChunkSize: number;
        stepSize: number;
        depth: number;
    };
    tightBoundingBox?: {
        min: [number, number, number];
        max: [number, number, number];
    };
    boundingBox?: {
        min: [number, number, number];
        max: [number, number, number];
    };
    scale: [number, number, number];
    offset: [number, number, number];
    spacing: number;
    pointAttributes: string[];
}
/**
 * Renderer interface for point cloud visualization
 */
export interface IRenderer {
    /**
     * Render the scene with the given camera
     */
    render(scene: IScene, camera: THREE.Camera): void;
    /**
     * Set the size of the render target
     */
    setSize(width: number, height: number): void;
    /**
     * Get the underlying DOM element
     */
    getDomElement(): HTMLCanvasElement;
    /**
     * Dispose of renderer resources
     */
    dispose(): void;
    /**
     * Get the underlying Three.js renderer (if applicable)
     */
    getThreeRenderer?(): THREE.WebGLRenderer;
}
/**
 * Scene interface for managing 3D objects
 */
export interface IScene {
    /**
     * Add an object to the scene
     */
    add(object: THREE.Object3D): void;
    /**
     * Remove an object from the scene
     */
    remove(object: THREE.Object3D): void;
    /**
     * Get the underlying Three.js scene (if applicable)
     */
    getThreeScene?(): THREE.Scene;
}
/**
 * Point cloud visualization mode
 */
export declare enum PointCloudColorMode {
    RGB = "RGB",
    INTENSITY = "INTENSITY",
    CLASSIFICATION = "CLASSIFICATION",
    ELEVATION = "ELEVATION",
    LEVEL_OF_DETAIL = "LEVEL_OF_DETAIL",
    RETURN_NUMBER = "RETURN_NUMBER",
    SOURCE_ID = "SOURCE_ID",
    NORMAL = "NORMAL"
}
/**
 * Point cloud rendering parameters
 */
export interface PointCloudRenderParams {
    /** Point size in pixels */
    pointSize?: number;
    /** Minimum point size */
    minSize?: number;
    /** Maximum point size */
    maxSize?: number;
    /** Color mode */
    colorMode?: PointCloudColorMode;
    /** Opacity */
    opacity?: number;
    /** Elevation range for elevation coloring */
    elevationRange?: [number, number];
    /** Intensity range for intensity coloring */
    intensityRange?: [number, number];
}
//# sourceMappingURL=index.d.ts.map