/**
 * Type-safe event emitter using eventemitter3
 */
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
export declare class TypedEventEmitter<TEventMap extends EventMap> {
    private emitter;
    constructor();
    /**
     * Add event listener
     */
    on<K extends EventNames<TEventMap>>(event: K, listener: (data: TEventMap[K]) => void): this;
    /**
     * Add one-time event listener
     */
    once<K extends EventNames<TEventMap>>(event: K, listener: (data: TEventMap[K]) => void): this;
    /**
     * Remove event listener
     */
    off<K extends EventNames<TEventMap>>(event: K, listener: (data: TEventMap[K]) => void): this;
    /**
     * Emit event
     */
    emit<K extends EventNames<TEventMap>>(event: K, data: TEventMap[K]): boolean;
    /**
     * Remove all listeners for an event or all events
     */
    removeAllListeners<K extends EventNames<TEventMap>>(event?: K): this;
    /**
     * Get listener count for an event
     */
    listenerCount<K extends EventNames<TEventMap>>(event: K): number;
}
//# sourceMappingURL=EventEmitter.d.ts.map