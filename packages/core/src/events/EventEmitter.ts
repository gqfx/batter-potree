/**
 * Type-safe event emitter using eventemitter3
 */

import EventEmitter from 'eventemitter3';

/**
 * Generic typed event map
 */
export type EventMap = Record<string, unknown>;

/**
 * Extract event names from event map
 */
export type EventNames<T extends EventMap> = keyof T & string;

/**
 * Type-safe event emitter wrapper around eventemitter3
 */
export class TypedEventEmitter<TEventMap extends EventMap> {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  /**
   * Add event listener
   */
  on<K extends EventNames<TEventMap>>(
    event: K,
    listener: (data: TEventMap[K]) => void,
  ): this {
    this.emitter.on(event, listener);
    return this;
  }

  /**
   * Add one-time event listener
   */
  once<K extends EventNames<TEventMap>>(
    event: K,
    listener: (data: TEventMap[K]) => void,
  ): this {
    this.emitter.once(event, listener);
    return this;
  }

  /**
   * Remove event listener
   */
  off<K extends EventNames<TEventMap>>(
    event: K,
    listener: (data: TEventMap[K]) => void,
  ): this {
    this.emitter.off(event, listener);
    return this;
  }

  /**
   * Emit event
   */
  emit<K extends EventNames<TEventMap>>(event: K, data: TEventMap[K]): boolean {
    return this.emitter.emit(event, data);
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners<K extends EventNames<TEventMap>>(event?: K): this {
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
  listenerCount<K extends EventNames<TEventMap>>(event: K): number {
    return this.emitter.listenerCount(event);
  }
}
