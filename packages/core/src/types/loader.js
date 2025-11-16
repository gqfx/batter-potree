/**
 * Loader interfaces
 *
 * These interfaces define the contract for loading point cloud data.
 * The core library should work with any loader that implements these interfaces.
 */
/**
 * Load state for asynchronous resources
 */
export var LoadState;
((LoadState) => {
  /** Not yet loaded */
  LoadState['UNLOADED'] = 'unloaded';
  /** Currently loading */
  LoadState['LOADING'] = 'loading';
  /** Successfully loaded */
  LoadState['LOADED'] = 'loaded';
  /** Failed to load */
  LoadState['FAILED'] = 'failed';
})(LoadState || (LoadState = {}));
//# sourceMappingURL=loader.js.map
