/**
 * Renderer interfaces
 *
 * These interfaces define the contract between the core library and rendering implementations.
 * The core library should only depend on these interfaces, not on concrete THREE.js rendering classes.
 */
/**
 * Generic scene manager interface
 * Manages 3D objects in the scene without depending on specific rendering implementations
 */
export interface ISceneManager {
    /**
     * Add an object to the scene
     */
    add(object: unknown): void;
    /**
     * Remove an object from the scene
     */
    remove(object: unknown): void;
    /**
     * Get all objects in the scene
     */
    getObjects(): unknown[];
}
/**
 * Generic renderer interface
 * Provides core rendering capabilities without depending on WebGL specifics
 */
export interface IRenderer {
    /**
     * Get renderer DOM element dimensions
     */
    getSize(): {
        width: number;
        height: number;
    };
    /**
     * Get the rendering context (for advanced use cases)
     */
    getContext?(): unknown;
    /**
     * Render a scene with a camera
     */
    render(scene: unknown, camera: unknown): void;
}
/**
 * Parameters for point cloud rendering
 */
export interface IPointCloudRenderParams {
    /** Field of view in radians */
    fov: number;
    /** Screen width in pixels */
    screenWidth: number;
    /** Screen height in pixels */
    screenHeight: number;
    /** Point spacing */
    spacing: number;
    /** Near clipping plane distance */
    near: number;
    /** Far clipping plane distance */
    far: number;
}
/**
 * Material interface for point cloud rendering
 */
export interface IPointCloudMaterial {
    /** Update material parameters */
    update(params: IPointCloudRenderParams): void;
    /** Active attribute name for rendering (e.g., "rgba", "intensity") */
    activeAttributeName?: string;
}
//# sourceMappingURL=renderer.d.ts.map