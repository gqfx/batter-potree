/**
 * Loader interfaces
 *
 * These interfaces define the contract for loading point cloud data.
 * The core library should work with any loader that implements these interfaces.
 */
/**
 * Load state for asynchronous resources
 */
export declare enum LoadState {
  /** Not yet loaded */
  UNLOADED = 'unloaded',
  /** Currently loading */
  LOADING = 'loading',
  /** Successfully loaded */
  LOADED = 'loaded',
  /** Failed to load */
  FAILED = 'failed',
}
/**
 * Generic loader interface
 * @template T The type of data being loaded
 */
export interface ILoader<T> {
  /**
   * Load data from a URL
   * @param url The URL to load from
   * @returns Promise that resolves with the loaded data
   */
  load(url: string): Promise<T>;
  /**
   * Abort any pending load operations
   */
  abort?(): void;
}
/**
 * Point cloud node loader interface
 * Specialized loader for octree node data
 */
export interface INodeLoader {
  /**
   * Load a specific node's point data
   * @param nodeName The node identifier (e.g., "r", "r0", "r01")
   * @param baseUrl The base URL for the point cloud
   * @returns Promise that resolves when the node is loaded
   */
  loadNode(nodeName: string, baseUrl: string): Promise<void>;
  /**
   * Get the current load state
   */
  getLoadState(nodeName: string): LoadState;
}
/**
 * Progress callback for loading operations
 */
export interface ILoadProgress {
  /** Number of items loaded */
  loaded: number;
  /** Total number of items to load */
  total: number;
  /** Progress percentage (0-100) */
  percentage: number;
}
/**
 * Loader options
 */
export interface ILoaderOptions {
  /** Maximum number of concurrent requests */
  maxConcurrentRequests?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Progress callback */
  onProgress?: (progress: ILoadProgress) => void;
  /** Error callback */
  onError?: (error: Error) => void;
}
//# sourceMappingURL=loader.d.ts.map
