var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/eventemitter3@5.0.1/node_modules/eventemitter3/index.js
var require_eventemitter3 = __commonJS({
  "../../node_modules/.pnpm/eventemitter3@5.0.1/node_modules/eventemitter3/index.js"(exports, module) {
    "use strict";
    var has = Object.prototype.hasOwnProperty;
    var prefix = "~";
    function Events() {
    }
    if (Object.create) {
      Events.prototype = /* @__PURE__ */ Object.create(null);
      if (!new Events().__proto__) prefix = false;
    }
    function EE(fn, context, once) {
      this.fn = fn;
      this.context = context;
      this.once = once || false;
    }
    function addListener(emitter, event, fn, context, once) {
      if (typeof fn !== "function") {
        throw new TypeError("The listener must be a function");
      }
      var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
      if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
      else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
      else emitter._events[evt] = [emitter._events[evt], listener];
      return emitter;
    }
    function clearEvent(emitter, evt) {
      if (--emitter._eventsCount === 0) emitter._events = new Events();
      else delete emitter._events[evt];
    }
    function EventEmitter2() {
      this._events = new Events();
      this._eventsCount = 0;
    }
    EventEmitter2.prototype.eventNames = function eventNames() {
      var names = [], events, name;
      if (this._eventsCount === 0) return names;
      for (name in events = this._events) {
        if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
      }
      if (Object.getOwnPropertySymbols) {
        return names.concat(Object.getOwnPropertySymbols(events));
      }
      return names;
    };
    EventEmitter2.prototype.listeners = function listeners(event) {
      var evt = prefix ? prefix + event : event, handlers = this._events[evt];
      if (!handlers) return [];
      if (handlers.fn) return [handlers.fn];
      for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
        ee[i] = handlers[i].fn;
      }
      return ee;
    };
    EventEmitter2.prototype.listenerCount = function listenerCount(event) {
      var evt = prefix ? prefix + event : event, listeners = this._events[evt];
      if (!listeners) return 0;
      if (listeners.fn) return 1;
      return listeners.length;
    };
    EventEmitter2.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return false;
      var listeners = this._events[evt], len = arguments.length, args, i;
      if (listeners.fn) {
        if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
        switch (len) {
          case 1:
            return listeners.fn.call(listeners.context), true;
          case 2:
            return listeners.fn.call(listeners.context, a1), true;
          case 3:
            return listeners.fn.call(listeners.context, a1, a2), true;
          case 4:
            return listeners.fn.call(listeners.context, a1, a2, a3), true;
          case 5:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
          case 6:
            return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
        }
        for (i = 1, args = new Array(len - 1); i < len; i++) {
          args[i - 1] = arguments[i];
        }
        listeners.fn.apply(listeners.context, args);
      } else {
        var length = listeners.length, j;
        for (i = 0; i < length; i++) {
          if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
          switch (len) {
            case 1:
              listeners[i].fn.call(listeners[i].context);
              break;
            case 2:
              listeners[i].fn.call(listeners[i].context, a1);
              break;
            case 3:
              listeners[i].fn.call(listeners[i].context, a1, a2);
              break;
            case 4:
              listeners[i].fn.call(listeners[i].context, a1, a2, a3);
              break;
            default:
              if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
              listeners[i].fn.apply(listeners[i].context, args);
          }
        }
      }
      return true;
    };
    EventEmitter2.prototype.on = function on(event, fn, context) {
      return addListener(this, event, fn, context, false);
    };
    EventEmitter2.prototype.once = function once(event, fn, context) {
      return addListener(this, event, fn, context, true);
    };
    EventEmitter2.prototype.removeListener = function removeListener(event, fn, context, once) {
      var evt = prefix ? prefix + event : event;
      if (!this._events[evt]) return this;
      if (!fn) {
        clearEvent(this, evt);
        return this;
      }
      var listeners = this._events[evt];
      if (listeners.fn) {
        if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
          clearEvent(this, evt);
        }
      } else {
        for (var i = 0, events = [], length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
            events.push(listeners[i]);
          }
        }
        if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
        else clearEvent(this, evt);
      }
      return this;
    };
    EventEmitter2.prototype.removeAllListeners = function removeAllListeners(event) {
      var evt;
      if (event) {
        evt = prefix ? prefix + event : event;
        if (this._events[evt]) clearEvent(this, evt);
      } else {
        this._events = new Events();
        this._eventsCount = 0;
      }
      return this;
    };
    EventEmitter2.prototype.off = EventEmitter2.prototype.removeListener;
    EventEmitter2.prototype.addListener = EventEmitter2.prototype.on;
    EventEmitter2.prefixed = prefix;
    EventEmitter2.EventEmitter = EventEmitter2;
    if ("undefined" !== typeof module) {
      module.exports = EventEmitter2;
    }
  }
});

// ../../node_modules/.pnpm/brotli-wasm@3.0.1/node_modules/brotli-wasm/pkg.web/brotli_wasm.js
var brotli_wasm_exports = {};
__export(brotli_wasm_exports, {
  BrotliStreamResult: () => BrotliStreamResult,
  BrotliStreamResultCode: () => BrotliStreamResultCode,
  CompressStream: () => CompressStream,
  DecompressStream: () => DecompressStream,
  compress: () => compress,
  decompress: () => decompress,
  default: () => brotli_wasm_default
});
function getObject(idx) {
  return heap[idx];
}
function getUint8Memory0() {
  if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
    cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachegetUint8Memory0;
}
function getStringFromWasm0(ptr, len) {
  return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}
function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];
  heap[idx] = obj;
  return idx;
}
function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === void 0) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr2 = malloc(buf.length);
    getUint8Memory0().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len);
  const mem = getUint8Memory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3);
    const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
    const ret = encodeString(arg, view);
    offset += ret.written;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}
function getInt32Memory0() {
  if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
    cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
  }
  return cachegetInt32Memory0;
}
function dropObject(idx) {
  if (idx < 36) return;
  heap[idx] = heap_next;
  heap_next = idx;
}
function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1);
  getUint8Memory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function addBorrowedObject(obj) {
  if (stack_pointer == 1) throw new Error("out of js stack");
  heap[--stack_pointer] = obj;
  return stack_pointer;
}
function getArrayU8FromWasm0(ptr, len) {
  return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}
function compress(buf, raw_options) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(buf, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.compress(retptr, ptr0, len0, addBorrowedObject(raw_options));
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    var r2 = getInt32Memory0()[retptr / 4 + 2];
    var r3 = getInt32Memory0()[retptr / 4 + 3];
    if (r3) {
      throw takeObject(r2);
    }
    var v1 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 1);
    return v1;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
    heap[stack_pointer++] = void 0;
  }
}
function decompress(buf) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(buf, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.decompress(retptr, ptr0, len0);
    var r0 = getInt32Memory0()[retptr / 4 + 0];
    var r1 = getInt32Memory0()[retptr / 4 + 1];
    var r2 = getInt32Memory0()[retptr / 4 + 2];
    var r3 = getInt32Memory0()[retptr / 4 + 3];
    if (r3) {
      throw takeObject(r2);
    }
    var v1 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_free(r0, r1 * 1);
    return v1;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function isLikeNone(x) {
  return x === void 0 || x === null;
}
async function load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") != "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}
async function init(input) {
  if (typeof input === "undefined") {
    input = new URL("brotli_wasm_bg.wasm", import.meta.url);
  }
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_is_undefined = function(arg0) {
    const ret = getObject(arg0) === void 0;
    return ret;
  };
  imports.wbg.__wbindgen_is_object = function(arg0) {
    const val = getObject(arg0);
    const ret = typeof val === "object" && val !== null;
    return ret;
  };
  imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
    const ret = new Error(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
  };
  imports.wbg.__wbindgen_json_serialize = function(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = JSON.stringify(obj === void 0 ? null : obj);
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbg_new_693216e109162396 = function() {
    const ret = new Error();
    return addHeapObject(ret);
  };
  imports.wbg.__wbg_stack_0ddaca5d1abfb52f = function(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
  };
  imports.wbg.__wbg_error_09919627ac0992f5 = function(arg0, arg1) {
    try {
      console.error(getStringFromWasm0(arg0, arg1));
    } finally {
      wasm.__wbindgen_free(arg0, arg1);
    }
  };
  imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
    takeObject(arg0);
  };
  imports.wbg.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
  };
  if (typeof input === "string" || typeof Request === "function" && input instanceof Request || typeof URL === "function" && input instanceof URL) {
    input = fetch(input);
  }
  const { instance, module } = await load(await input, imports);
  wasm = instance.exports;
  init.__wbindgen_wasm_module = module;
  return wasm;
}
var wasm, heap, cachedTextDecoder, cachegetUint8Memory0, heap_next, WASM_VECTOR_LEN, cachedTextEncoder, encodeString, cachegetInt32Memory0, stack_pointer, BrotliStreamResultCode, BrotliStreamResult, CompressStream, DecompressStream, brotli_wasm_default;
var init_brotli_wasm = __esm({
  "../../node_modules/.pnpm/brotli-wasm@3.0.1/node_modules/brotli-wasm/pkg.web/brotli_wasm.js"() {
    "use strict";
    heap = new Array(32).fill(void 0);
    heap.push(void 0, null, true, false);
    cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    cachegetUint8Memory0 = null;
    heap_next = heap.length;
    WASM_VECTOR_LEN = 0;
    cachedTextEncoder = new TextEncoder("utf-8");
    encodeString = typeof cachedTextEncoder.encodeInto === "function" ? function(arg, view) {
      return cachedTextEncoder.encodeInto(arg, view);
    } : function(arg, view) {
      const buf = cachedTextEncoder.encode(arg);
      view.set(buf);
      return {
        read: arg.length,
        written: buf.length
      };
    };
    cachegetInt32Memory0 = null;
    stack_pointer = 32;
    BrotliStreamResultCode = Object.freeze({ ResultSuccess: 1, "1": "ResultSuccess", NeedsMoreInput: 2, "2": "NeedsMoreInput", NeedsMoreOutput: 3, "3": "NeedsMoreOutput" });
    BrotliStreamResult = class _BrotliStreamResult {
      static __wrap(ptr) {
        const obj = Object.create(_BrotliStreamResult.prototype);
        obj.ptr = ptr;
        return obj;
      }
      __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;
        return ptr;
      }
      free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_brotlistreamresult_free(ptr);
      }
      /**
      * Result code.
      *
      * See [`BrotliStreamResultCode`] for available values.
      *
      * When error, the error code is not passed here but rather goes to `Err`.
      */
      get code() {
        const ret = wasm.__wbg_get_brotlistreamresult_code(this.ptr);
        return ret >>> 0;
      }
      /**
      * Result code.
      *
      * See [`BrotliStreamResultCode`] for available values.
      *
      * When error, the error code is not passed here but rather goes to `Err`.
      * @param {number} arg0
      */
      set code(arg0) {
        wasm.__wbg_set_brotlistreamresult_code(this.ptr, arg0);
      }
      /**
      * Output buffer
      */
      get buf() {
        try {
          const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
          wasm.__wbg_get_brotlistreamresult_buf(retptr, this.ptr);
          var r0 = getInt32Memory0()[retptr / 4 + 0];
          var r1 = getInt32Memory0()[retptr / 4 + 1];
          var v0 = getArrayU8FromWasm0(r0, r1).slice();
          wasm.__wbindgen_free(r0, r1 * 1);
          return v0;
        } finally {
          wasm.__wbindgen_add_to_stack_pointer(16);
        }
      }
      /**
      * Output buffer
      * @param {Uint8Array} arg0
      */
      set buf(arg0) {
        const ptr0 = passArray8ToWasm0(arg0, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_brotlistreamresult_buf(this.ptr, ptr0, len0);
      }
      /**
      * Consumed bytes of the input buffer
      */
      get input_offset() {
        const ret = wasm.__wbg_get_brotlistreamresult_input_offset(this.ptr);
        return ret >>> 0;
      }
      /**
      * Consumed bytes of the input buffer
      * @param {number} arg0
      */
      set input_offset(arg0) {
        wasm.__wbg_set_brotlistreamresult_input_offset(this.ptr, arg0);
      }
    };
    CompressStream = class _CompressStream {
      static __wrap(ptr) {
        const obj = Object.create(_CompressStream.prototype);
        obj.ptr = ptr;
        return obj;
      }
      __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;
        return ptr;
      }
      free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_compressstream_free(ptr);
      }
      /**
      * @param {number | undefined} quality
      */
      constructor(quality) {
        const ret = wasm.compressstream_new(!isLikeNone(quality), isLikeNone(quality) ? 0 : quality);
        return _CompressStream.__wrap(ret);
      }
      /**
      * @param {Uint8Array | undefined} input_opt
      * @param {number} output_size
      * @returns {BrotliStreamResult}
      */
      compress(input_opt, output_size) {
        try {
          const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
          var ptr0 = isLikeNone(input_opt) ? 0 : passArray8ToWasm0(input_opt, wasm.__wbindgen_malloc);
          var len0 = WASM_VECTOR_LEN;
          wasm.compressstream_compress(retptr, this.ptr, ptr0, len0, output_size);
          var r0 = getInt32Memory0()[retptr / 4 + 0];
          var r1 = getInt32Memory0()[retptr / 4 + 1];
          var r2 = getInt32Memory0()[retptr / 4 + 2];
          if (r2) {
            throw takeObject(r1);
          }
          return BrotliStreamResult.__wrap(r0);
        } finally {
          wasm.__wbindgen_add_to_stack_pointer(16);
        }
      }
      /**
      * @returns {number}
      */
      total_out() {
        const ret = wasm.compressstream_total_out(this.ptr);
        return ret >>> 0;
      }
    };
    DecompressStream = class _DecompressStream {
      static __wrap(ptr) {
        const obj = Object.create(_DecompressStream.prototype);
        obj.ptr = ptr;
        return obj;
      }
      __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;
        return ptr;
      }
      free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_decompressstream_free(ptr);
      }
      /**
      */
      constructor() {
        const ret = wasm.decompressstream_new();
        return _DecompressStream.__wrap(ret);
      }
      /**
      * @param {Uint8Array} input
      * @param {number} output_size
      * @returns {BrotliStreamResult}
      */
      decompress(input, output_size) {
        try {
          const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
          const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_malloc);
          const len0 = WASM_VECTOR_LEN;
          wasm.decompressstream_decompress(retptr, this.ptr, ptr0, len0, output_size);
          var r0 = getInt32Memory0()[retptr / 4 + 0];
          var r1 = getInt32Memory0()[retptr / 4 + 1];
          var r2 = getInt32Memory0()[retptr / 4 + 2];
          if (r2) {
            throw takeObject(r1);
          }
          return BrotliStreamResult.__wrap(r0);
        } finally {
          wasm.__wbindgen_add_to_stack_pointer(16);
        }
      }
      /**
      * @returns {number}
      */
      total_out() {
        const ret = wasm.decompressstream_total_out(this.ptr);
        return ret >>> 0;
      }
    };
    brotli_wasm_default = init;
  }
});

// ../../node_modules/.pnpm/brotli-wasm@3.0.1/node_modules/brotli-wasm/index.web.js
var index_web_exports = {};
__export(index_web_exports, {
  default: () => index_web_default
});
var index_web_default;
var init_index_web = __esm({
  "../../node_modules/.pnpm/brotli-wasm@3.0.1/node_modules/brotli-wasm/index.web.js"() {
    "use strict";
    init_brotli_wasm();
    index_web_default = brotli_wasm_default().then(() => brotli_wasm_exports);
  }
});

// ../core/src/attributes/PointAttribute.ts
var POINT_ATTRIBUTE_TYPES = {
  ["double" /* DOUBLE */]: { name: "double", size: 8, ordinal: 0 },
  ["float" /* FLOAT */]: { name: "float", size: 4, ordinal: 1 },
  ["int8" /* INT8 */]: { name: "int8", size: 1, ordinal: 2 },
  ["uint8" /* UINT8 */]: { name: "uint8", size: 1, ordinal: 3 },
  ["int16" /* INT16 */]: { name: "int16", size: 2, ordinal: 4 },
  ["uint16" /* UINT16 */]: { name: "uint16", size: 2, ordinal: 5 },
  ["int32" /* INT32 */]: { name: "int32", size: 4, ordinal: 6 },
  ["uint32" /* UINT32 */]: { name: "uint32", size: 4, ordinal: 7 },
  ["int64" /* INT64 */]: { name: "int64", size: 8, ordinal: 8 },
  ["uint64" /* UINT64 */]: { name: "uint64", size: 8, ordinal: 9 }
};
var _PointAttribute = class _PointAttribute {
  constructor(name, dataType, numElements) {
    this.name = name;
    this.type = POINT_ATTRIBUTE_TYPES[dataType];
    this.numElements = numElements;
    this.byteSize = this.numElements * this.type.size;
    this.description = "";
    this.range = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  }
};
/**
 * Standard attributes as static constants (like Potree)
 */
_PointAttribute.POSITION_CARTESIAN = new _PointAttribute(
  "POSITION_CARTESIAN" /* POSITION_CARTESIAN */,
  "float" /* FLOAT */,
  3
);
_PointAttribute.RGBA_PACKED = new _PointAttribute(
  "COLOR_PACKED" /* COLOR_PACKED */,
  "int8" /* INT8 */,
  4
);
_PointAttribute.COLOR_PACKED = _PointAttribute.RGBA_PACKED;
_PointAttribute.RGB_PACKED = new _PointAttribute(
  "COLOR_PACKED" /* COLOR_PACKED */,
  "int8" /* INT8 */,
  3
);
_PointAttribute.NORMAL_FLOATS = new _PointAttribute(
  "NORMAL_FLOATS" /* NORMAL_FLOATS */,
  "float" /* FLOAT */,
  3
);
_PointAttribute.INTENSITY = new _PointAttribute(
  "INTENSITY" /* INTENSITY */,
  "uint16" /* UINT16 */,
  1
);
_PointAttribute.CLASSIFICATION = new _PointAttribute(
  "CLASSIFICATION" /* CLASSIFICATION */,
  "uint8" /* UINT8 */,
  1
);
_PointAttribute.NORMAL_SPHEREMAPPED = new _PointAttribute(
  "NORMAL_SPHEREMAPPED" /* NORMAL_SPHEREMAPPED */,
  "uint8" /* UINT8 */,
  2
);
_PointAttribute.NORMAL_OCT16 = new _PointAttribute(
  "NORMAL_OCT16" /* NORMAL_OCT16 */,
  "uint8" /* UINT8 */,
  2
);
_PointAttribute.NORMAL = new _PointAttribute(
  "NORMAL" /* NORMAL */,
  "float" /* FLOAT */,
  3
);
_PointAttribute.RETURN_NUMBER = new _PointAttribute(
  "RETURN_NUMBER" /* RETURN_NUMBER */,
  "uint8" /* UINT8 */,
  1
);
_PointAttribute.NUMBER_OF_RETURNS = new _PointAttribute(
  "NUMBER_OF_RETURNS" /* NUMBER_OF_RETURNS */,
  "uint8" /* UINT8 */,
  1
);
_PointAttribute.SOURCE_ID = new _PointAttribute(
  "SOURCE_ID" /* SOURCE_ID */,
  "uint16" /* UINT16 */,
  1
);
_PointAttribute.INDICES = new _PointAttribute(
  "INDICES" /* INDICES */,
  "uint32" /* UINT32 */,
  1
);
_PointAttribute.SPACING = new _PointAttribute(
  "SPACING" /* SPACING */,
  "float" /* FLOAT */,
  1
);
_PointAttribute.GPS_TIME = new _PointAttribute(
  "GPS_TIME" /* GPS_TIME */,
  "double" /* DOUBLE */,
  1
);
var PointAttribute = _PointAttribute;

// ../../node_modules/.pnpm/eventemitter3@5.0.1/node_modules/eventemitter3/index.mjs
var import_index = __toESM(require_eventemitter3(), 1);

// ../core/src/workers/WorkerPoolManager.ts
var _WorkerPoolManager = class _WorkerPoolManager {
  constructor(options = {}) {
    this.workers = /* @__PURE__ */ new Map();
    this.busyWorkers = /* @__PURE__ */ new Map();
    this.taskQueues = /* @__PURE__ */ new Map();
    this.workerTaskMap = /* @__PURE__ */ new Map();
    this.disposed = false;
    this.maxWorkersPerUrl = options.maxWorkersPerUrl ?? navigator.hardwareConcurrency ?? 4;
  }
  /**
   * 获取单例实例
   *
   * @param options - 配置选项(仅首次调用有效)
   * @returns 管理器实例
   */
  static getInstance(options) {
    if (!_WorkerPoolManager.instance) {
      _WorkerPoolManager.instance = new _WorkerPoolManager(options);
    }
    return _WorkerPoolManager.instance;
  }
  /**
   * 重置单例实例(用于测试)
   */
  static resetInstance() {
    if (_WorkerPoolManager.instance) {
      _WorkerPoolManager.instance.dispose();
      _WorkerPoolManager.instance = null;
    }
  }
  /**
   * 获取 Worker
   *
   * 从池中获取空闲 Worker,如果没有则创建新的
   *
   * @param url - Worker 脚本 URL
   * @returns Worker 实例
   */
  getWorker(url) {
    if (this.disposed) {
      throw new Error("WorkerPoolManager has been disposed");
    }
    if (!this.workers.has(url)) {
      this.workers.set(url, []);
      this.busyWorkers.set(url, /* @__PURE__ */ new Set());
      this.taskQueues.set(url, []);
    }
    const pool = this.workers.get(url);
    const busy = this.busyWorkers.get(url);
    if (pool.length > 0) {
      const worker = pool.pop();
      busy.add(worker);
      return worker;
    }
    const totalWorkers = pool.length + busy.size;
    if (totalWorkers < this.maxWorkersPerUrl) {
      const worker = new Worker(url);
      busy.add(worker);
      return worker;
    }
    throw new Error(`No available workers for ${url}, please use execute() for automatic queuing`);
  }
  /**
   * 归还 Worker
   *
   * 将 Worker 归还到池中供复用
   *
   * @param url - Worker 脚本 URL
   * @param worker - Worker 实例
   */
  returnWorker(url, worker) {
    const pool = this.workers.get(url);
    const busy = this.busyWorkers.get(url);
    const queue = this.taskQueues.get(url);
    if (!pool || !busy || !queue) {
      return;
    }
    busy.delete(worker);
    if (queue.length > 0) {
      const task = queue.shift();
      this.assignTaskToWorker(url, worker, task);
    } else {
      pool.push(worker);
    }
  }
  /**
   * 执行任务(自动管理 Worker 生命周期)
   *
   * @param url - Worker 脚本 URL
   * @param data - 任务数据
   * @param transferables - 可转移对象
   * @returns Promise 返回结果
   */
  async execute(url, data, transferables) {
    if (this.disposed) {
      throw new Error("WorkerPoolManager has been disposed");
    }
    return new Promise((resolve, reject) => {
      const task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        data,
        transferables: transferables ?? [],
        resolve,
        reject
      };
      this.submitTask(url, task);
    });
  }
  /**
   * 提交任务
   */
  submitTask(url, task) {
    if (!this.workers.has(url)) {
      this.workers.set(url, []);
      this.busyWorkers.set(url, /* @__PURE__ */ new Set());
      this.taskQueues.set(url, []);
    }
    const pool = this.workers.get(url);
    const busy = this.busyWorkers.get(url);
    const queue = this.taskQueues.get(url);
    if (pool.length > 0) {
      const worker = pool.pop();
      busy.add(worker);
      this.assignTaskToWorker(url, worker, task);
      return;
    }
    const totalWorkers = pool.length + busy.size;
    if (totalWorkers < this.maxWorkersPerUrl) {
      const worker = new Worker(url);
      busy.add(worker);
      this.assignTaskToWorker(url, worker, task);
      return;
    }
    queue.push(task);
  }
  /**
   * 分配任务给 Worker
   */
  assignTaskToWorker(url, worker, task) {
    this.workerTaskMap.set(worker, task);
    const handleMessage = (event) => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      this.workerTaskMap.delete(worker);
      const response = event.data;
      if (response.error) {
        task.reject(new Error(response.error));
      } else {
        task.resolve(response.result ?? response);
      }
      this.returnWorker(url, worker);
    };
    const handleError = (event) => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      this.workerTaskMap.delete(worker);
      task.reject(new Error(event.message || "Worker error"));
      this.returnWorker(url, worker);
    };
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    const message = {
      taskId: task.id,
      data: task.data
    };
    if (task.transferables && task.transferables.length > 0) {
      worker.postMessage(message, task.transferables);
    } else {
      worker.postMessage(message);
    }
  }
  /**
   * 获取统计信息
   */
  getStats() {
    let totalWorkers = 0;
    let busyWorkers = 0;
    let idleWorkers = 0;
    let queuedTasks = 0;
    const perUrl = {};
    for (const [url, pool] of this.workers) {
      const busy = this.busyWorkers.get(url)?.size ?? 0;
      const idle = pool.length;
      const queued = this.taskQueues.get(url)?.length ?? 0;
      const total = busy + idle;
      totalWorkers += total;
      busyWorkers += busy;
      idleWorkers += idle;
      queuedTasks += queued;
      perUrl[url] = { total, busy, idle, queued };
    }
    return {
      urls: Array.from(this.workers.keys()),
      totalWorkers,
      busyWorkers,
      idleWorkers,
      queuedTasks,
      perUrl
    };
  }
  /**
   * 清理资源
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const [url, pool] of this.workers) {
      for (const worker of pool) {
        worker.terminate();
      }
      const busy = this.busyWorkers.get(url);
      if (busy) {
        for (const worker of busy) {
          worker.terminate();
        }
      }
      const queue = this.taskQueues.get(url);
      if (queue) {
        for (const task of queue) {
          task.reject(new Error("WorkerPoolManager disposed"));
        }
      }
    }
    this.workers.clear();
    this.busyWorkers.clear();
    this.taskQueues.clear();
    this.workerTaskMap.clear();
  }
};
_WorkerPoolManager.instance = null;
var WorkerPoolManager = _WorkerPoolManager;

// src/loaders/workers/BrotliDecoderWorker.ts
var brotliDecompress = null;
var typedArrayMapping = {
  int8: Int8Array,
  int16: Int16Array,
  int32: Int32Array,
  int64: Float64Array,
  uint8: Uint8Array,
  uint16: Uint16Array,
  uint32: Uint32Array,
  uint64: Float64Array,
  float: Float32Array,
  double: Float64Array
};
var createGetterMap = (view) => ({
  int8: view.getInt8.bind(view),
  int16: view.getInt16.bind(view),
  int32: view.getInt32.bind(view),
  int64: view.getBigInt64.bind(view),
  uint8: view.getUint8.bind(view),
  uint16: view.getUint16.bind(view),
  uint32: view.getUint32.bind(view),
  uint64: view.getBigUint64.bind(view),
  float: view.getFloat32.bind(view),
  double: view.getFloat64.bind(view)
});
function dealign24b(mortoncode) {
  let x = mortoncode;
  x = (x & 2130440) >> 2 | (x & 266305) >> 0;
  x = (x & 786624) >> 4 | (x & 12291) >> 0;
  x = (x & 61440) >> 8 | (x & 15) >> 0;
  x = (x & 0) >> 16 | (x & 255) >> 0;
  return x;
}
async function initBrotli() {
  if (brotliDecompress) return;
  try {
    const brotli = await Promise.resolve().then(() => (init_index_web(), index_web_exports));
    const brotliModule = await brotli.default;
    brotliDecompress = brotliModule.decompress;
  } catch (error) {
    console.error("[BrotliDecoder] Failed to initialize brotli-wasm:", error);
    throw new Error("Brotli decoder initialization failed");
  }
}
function decodeMortonPosition(view, startOffset, numPoints, scale, offset, min) {
  const positions = new Float32Array(numPoints * 3);
  let byteOffset = startOffset;
  for (let j = 0; j < numPoints; j++) {
    const mc_0 = view.getUint32(byteOffset + 4, true);
    const mc_1 = view.getUint32(byteOffset + 0, true);
    const mc_2 = view.getUint32(byteOffset + 12, true);
    const mc_3 = view.getUint32(byteOffset + 8, true);
    byteOffset += 16;
    let X = dealign24b((mc_3 & 16777215) >>> 0) | dealign24b((mc_3 >>> 24 | mc_2 << 8) >>> 0) << 8;
    let Y = dealign24b((mc_3 & 16777215) >>> 1) | dealign24b((mc_3 >>> 24 | mc_2 << 8) >>> 1) << 8;
    let Z = dealign24b((mc_3 & 16777215) >>> 2) | dealign24b((mc_3 >>> 24 | mc_2 << 8) >>> 2) << 8;
    if (mc_1 !== 0 || mc_2 !== 0) {
      X = X | dealign24b((mc_1 & 16777215) >>> 0) << 16 | dealign24b((mc_1 >>> 24 | mc_0 << 8) >>> 0) << 24;
      Y = Y | dealign24b((mc_1 & 16777215) >>> 1) << 16 | dealign24b((mc_1 >>> 24 | mc_0 << 8) >>> 1) << 24;
      Z = Z | dealign24b((mc_1 & 16777215) >>> 2) << 16 | dealign24b((mc_1 >>> 24 | mc_0 << 8) >>> 2) << 24;
    }
    const x = X * scale[0] + offset[0] - min.x;
    const y = Y * scale[1] + offset[1] - min.y;
    const z = Z * scale[2] + offset[2] - min.z;
    positions[3 * j + 0] = x;
    positions[3 * j + 1] = y;
    positions[3 * j + 2] = z;
  }
  return { positions, byteOffset };
}
function decodeMortonRGBA(view, startOffset, numPoints) {
  const colors = new Uint8Array(numPoints * 4);
  let byteOffset = startOffset;
  for (let j = 0; j < numPoints; j++) {
    const mc_0 = view.getUint32(byteOffset + 4, true);
    const mc_1 = view.getUint32(byteOffset + 0, true);
    byteOffset += 8;
    const r = dealign24b((mc_1 & 16777215) >>> 0) | dealign24b((mc_1 >>> 24 | mc_0 << 8) >>> 0) << 8;
    const g = dealign24b((mc_1 & 16777215) >>> 1) | dealign24b((mc_1 >>> 24 | mc_0 << 8) >>> 1) << 8;
    const b = dealign24b((mc_1 & 16777215) >>> 2) | dealign24b((mc_1 >>> 24 | mc_0 << 8) >>> 2) << 8;
    colors[4 * j + 0] = r > 255 ? r / 256 : r;
    colors[4 * j + 1] = g > 255 ? g / 256 : g;
    colors[4 * j + 2] = b > 255 ? b / 256 : b;
    colors[4 * j + 3] = 255;
  }
  return { colors, byteOffset };
}
async function decodePointCloudData(event) {
  performance.mark("brotli-decoder-start");
  const compressedBuffer = event.data.buffer;
  const pointAttributes = event.data.pointAttributes;
  const numPoints = event.data.numPoints;
  const nodeOffset = event.data.offset;
  const scaleArray = Array.isArray(event.data.scale) ? event.data.scale : [event.data.scale, event.data.scale, event.data.scale];
  await initBrotli();
  if (!brotliDecompress) {
    throw new Error("Brotli decoder not initialized");
  }
  let decompressedBuffer;
  if (numPoints === 0) {
    decompressedBuffer = new ArrayBuffer(0);
  } else {
    try {
      const compressed = new Uint8Array(compressedBuffer);
      const decompressed = brotliDecompress(compressed);
      decompressedBuffer = decompressed.buffer;
    } catch (error) {
      console.error("[BrotliDecoder] Decompression failed:", error);
      decompressedBuffer = new ArrayBuffer(numPoints * pointAttributes.byteSize);
    }
  }
  const view = new DataView(decompressedBuffer);
  const attributeBuffers = {};
  let byteOffset = 0;
  const tightBoxMin = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY
  ];
  const tightBoxMax = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  ];
  const mean = [0, 0, 0];
  const bbMin = { x: 0, y: 0, z: 0 };
  for (const pointAttribute of pointAttributes.attributes) {
    if (["POSITION_CARTESIAN", "position"].includes(pointAttribute.name)) {
      const result = decodeMortonPosition(
        view,
        byteOffset,
        numPoints,
        scaleArray,
        nodeOffset,
        bbMin
      );
      byteOffset = result.byteOffset;
      const positions = result.positions;
      for (let j = 0; j < numPoints; j++) {
        const x = positions[3 * j + 0] ?? 0;
        const y = positions[3 * j + 1] ?? 0;
        const z = positions[3 * j + 2] ?? 0;
        mean[0] += x / numPoints;
        mean[1] += y / numPoints;
        mean[2] += z / numPoints;
        tightBoxMin[0] = Math.min(tightBoxMin[0], x);
        tightBoxMin[1] = Math.min(tightBoxMin[1], y);
        tightBoxMin[2] = Math.min(tightBoxMin[2], z);
        tightBoxMax[0] = Math.max(tightBoxMax[0], x);
        tightBoxMax[1] = Math.max(tightBoxMax[1], y);
        tightBoxMax[2] = Math.max(tightBoxMax[2], z);
      }
      attributeBuffers[pointAttribute.name] = {
        buffer: positions.buffer,
        attribute: pointAttribute
      };
    } else if (["RGBA", "rgba"].includes(pointAttribute.name)) {
      const result = decodeMortonRGBA(view, byteOffset, numPoints);
      byteOffset = result.byteOffset;
      attributeBuffers[pointAttribute.name] = {
        buffer: result.colors.buffer,
        attribute: pointAttribute
      };
    } else {
      const buff = new ArrayBuffer(numPoints * 4);
      const f32 = new Float32Array(buff);
      const TypedArray = typedArrayMapping[pointAttribute.type.name];
      const preciseBuffer = new TypedArray(numPoints);
      let attrOffset = 0;
      let attrScale = 1;
      const getterMap = createGetterMap(view);
      const getter = getterMap[pointAttribute.type.name];
      if (!getter) {
        console.warn(`[BrotliDecoder] Unknown attribute type: ${pointAttribute.type.name}`);
        continue;
      }
      if (pointAttribute.type.size > 4) {
        const range = pointAttribute.range;
        if (range) {
          attrOffset = range[0];
          attrScale = 1 / (range[1] - range[0]);
        }
      }
      for (let j = 0; j < numPoints; j++) {
        if (byteOffset + pointAttribute.byteSize > decompressedBuffer.byteLength) {
          console.error(
            `[BrotliDecoder] Buffer overflow for ${pointAttribute.name}: offset=${byteOffset}, size=${pointAttribute.byteSize}, bufferLength=${decompressedBuffer.byteLength}`
          );
          break;
        }
        let value = getter(byteOffset, true);
        byteOffset += pointAttribute.byteSize;
        if (typeof value === "bigint") {
          value = Number(value);
        }
        f32[j] = (value - attrOffset) * attrScale;
        preciseBuffer[j] = value;
      }
      attributeBuffers[pointAttribute.name] = {
        buffer: buff,
        preciseBuffer: preciseBuffer.buffer,
        attribute: pointAttribute,
        offset: attrOffset,
        scale: attrScale
      };
    }
  }
  {
    const indices = new Uint32Array(numPoints);
    for (let i = 0; i < numPoints; i++) {
      indices[i] = i;
    }
    attributeBuffers.INDICES = {
      buffer: indices.buffer,
      attribute: PointAttribute.INDICES
    };
  }
  const vectors = pointAttributes.vectors;
  if (vectors && vectors.length > 0) {
    for (const vector of vectors) {
      const { name, attributes } = vector;
      const numVectorElements = attributes.length;
      const vectorBuffer = new ArrayBuffer(numVectorElements * numPoints * 4);
      const vectorF32 = new Float32Array(vectorBuffer);
      let iElement = 0;
      for (const sourceName of attributes) {
        const sourceBuffer = attributeBuffers[sourceName];
        if (!sourceBuffer) continue;
        const { offset, scale } = sourceBuffer;
        const sourceView = new DataView(sourceBuffer.buffer);
        for (let j = 0; j < numPoints; j++) {
          const value = sourceView.getFloat32(j * 4, true);
          vectorF32[j * numVectorElements + iElement] = value / scale + offset;
        }
        iElement++;
      }
      attributeBuffers[name] = {
        buffer: vectorBuffer,
        attribute: {
          name,
          type: { name: "float", size: 4, ordinal: 0 },
          numElements: numVectorElements,
          byteSize: numVectorElements * 4
        }
      };
    }
  }
  performance.mark("brotli-decoder-end");
  performance.clearMarks();
  performance.clearMeasures();
  const response = {
    buffer: decompressedBuffer,
    mean,
    attributeBuffers,
    tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
    numPoints
  };
  return response;
}
self.onmessage = async (event) => {
  try {
    let decodeRequest;
    let taskId;
    if ("taskId" in event.data && "data" in event.data) {
      taskId = event.data.taskId;
      decodeRequest = event.data.data;
    } else {
      decodeRequest = event.data;
    }
    if (!decodeRequest.buffer) {
      throw new Error("Missing buffer in decode request");
    }
    if (!decodeRequest.pointAttributes) {
      throw new Error("Missing pointAttributes in decode request");
    }
    if (typeof decodeRequest.pointAttributes.byteSize !== "number") {
      throw new Error(`Invalid pointAttributes.byteSize: ${decodeRequest.pointAttributes.byteSize}`);
    }
    if (!Array.isArray(decodeRequest.pointAttributes.attributes)) {
      throw new Error("Invalid pointAttributes.attributes: not an array");
    }
    const result = await decodePointCloudData({ data: decodeRequest });
    if (taskId) {
      self.postMessage({ taskId, result });
    } else {
      self.postMessage(result);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? `${error.message}
Stack: ${error.stack}` : String(error);
    if ("taskId" in event.data) {
      self.postMessage({
        taskId: event.data.taskId,
        error: errorMessage
      });
    } else {
      self.postMessage({
        error: errorMessage
      });
    }
  }
};
//# sourceMappingURL=BrotliDecoderWorker.js.map