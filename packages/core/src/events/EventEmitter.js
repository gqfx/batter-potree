/**
 * Type-safe event emitter using eventemitter3
 */
import EventEmitter from 'eventemitter3';
/**
 * Type-safe event emitter wrapper around eventemitter3
 */
export class TypedEventEmitter {
  constructor() {
    this.emitter = new EventEmitter();
  }
  /**
   * Add event listener
   */
  on(event, listener) {
    this.emitter.on(event, listener);
    return this;
  }
  /**
   * Add one-time event listener
   */
  once(event, listener) {
    this.emitter.once(event, listener);
    return this;
  }
  /**
   * Remove event listener
   */
  off(event, listener) {
    this.emitter.off(event, listener);
    return this;
  }
  /**
   * Emit event
   */
  emit(event, data) {
    return this.emitter.emit(event, data);
  }
  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event) {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
    return this;
  }
  /**
   * Get listener count for an event
   */
  listenerCount(event) {
    return this.emitter.listenerCount(event);
  }
}
//# sourceMappingURL=EventEmitter.js.map
