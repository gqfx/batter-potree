var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
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

// src/loaders/Version.ts
var Version = class _Version {
  constructor(version) {
    this.version = version;
    const vmLength = version.indexOf(".") === -1 ? version.length : version.indexOf(".");
    this.versionMajor = Number.parseInt(version.substring(0, vmLength), 10);
    const minorStr = version.substring(vmLength + 1);
    this.versionMinor = minorStr.length > 0 ? Number.parseInt(minorStr, 10) : 0;
  }
  /**
   * Check if this version is newer than the given version
   */
  newerThan(version) {
    const v = new _Version(version);
    if (this.versionMajor > v.versionMajor) {
      return true;
    }
    if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
      return true;
    }
    return false;
  }
  /**
   * Check if this version is equal or higher than the given version
   */
  equalOrHigher(version) {
    const v = new _Version(version);
    if (this.versionMajor > v.versionMajor) {
      return true;
    }
    if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
      return true;
    }
    return false;
  }
  /**
   * Check if this version is up to (not newer than) the given version
   */
  upTo(version) {
    return !this.newerThan(version);
  }
  /**
   * Get string representation
   */
  toString() {
    return this.version;
  }
};

// src/loaders/workers/BinaryDecoderWorker.ts
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
function decodeSphereMapping(view, attrOffset, pointByteSize, numPoints) {
  const normals = new Float32Array(numPoints * 3);
  for (let j = 0; j < numPoints; j++) {
    const bx = view.getUint8(attrOffset + j * pointByteSize);
    const by = view.getUint8(attrOffset + j * pointByteSize + 1);
    const ex = bx / 255;
    const ey = by / 255;
    let nx = ex * 2 - 1;
    let ny = ey * 2 - 1;
    let nz = 1;
    const nw = -1;
    const l = nx * -nx + ny * -ny + nz * -nw;
    nz = l;
    nx = nx * Math.sqrt(l);
    ny = ny * Math.sqrt(l);
    nx = nx * 2;
    ny = ny * 2;
    nz = nz * 2 - 1;
    normals[3 * j + 0] = nx;
    normals[3 * j + 1] = ny;
    normals[3 * j + 2] = nz;
  }
  return normals;
}
function decodeOct16Normals(view, attrOffset, pointByteSize, numPoints) {
  const normals = new Float32Array(numPoints * 3);
  for (let j = 0; j < numPoints; j++) {
    const bx = view.getUint8(attrOffset + j * pointByteSize);
    const by = view.getUint8(attrOffset + j * pointByteSize + 1);
    const u = bx / 255 * 2 - 1;
    const v = by / 255 * 2 - 1;
    const z = 1 - Math.abs(u) - Math.abs(v);
    let x = 0;
    let y = 0;
    if (z >= 0) {
      x = u;
      y = v;
    } else {
      x = -(v / Math.sign(v) - 1) / Math.sign(u);
      y = -(u / Math.sign(u) - 1) / Math.sign(v);
    }
    const length = Math.sqrt(x * x + y * y + z * z);
    x = x / length;
    y = y / length;
    const nz = z / length;
    normals[3 * j + 0] = x;
    normals[3 * j + 1] = y;
    normals[3 * j + 2] = nz;
  }
  return normals;
}
function decodePointCloudData(event) {
  performance.mark("binary-decoder-start");
  const buffer = event.data.buffer;
  const pointAttributes = event.data.pointAttributes;
  console.log("[BinaryDecoder] Input buffer.byteLength:", buffer.byteLength);
  console.log("[BinaryDecoder] pointAttributes.byteSize:", pointAttributes.byteSize);
  console.log("[BinaryDecoder] pointAttributes.attributes:", pointAttributes.attributes.map((a) => ({ name: a.name, byteSize: a.byteSize })));
  const numPoints = buffer.byteLength / pointAttributes.byteSize;
  console.log("[BinaryDecoder] Calculated numPoints:", numPoints);
  const view = new DataView(buffer);
  const version = new Version(event.data.version);
  const nodeOffset = event.data.offset;
  const scale = event.data.scale;
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
  const attributeBuffers = {};
  const getAttributeOffset = (attrName) => {
    let offset = 0;
    for (const attr of pointAttributes.attributes) {
      if (attr.name === attrName) {
        return offset;
      }
      offset += attr.byteSize;
    }
    return 0;
  };
  for (const pointAttribute of pointAttributes.attributes) {
    const attrOffset = getAttributeOffset(pointAttribute.name);
    if (pointAttribute.name === "POSITION_CARTESIAN") {
      const positions = new Float32Array(numPoints * 3);
      for (let j = 0; j < numPoints; j++) {
        let x, y, z;
        if (version.newerThan("1.3")) {
          x = view.getUint32(attrOffset + j * pointAttributes.byteSize + 0, true) * scale;
          y = view.getUint32(attrOffset + j * pointAttributes.byteSize + 4, true) * scale;
          z = view.getUint32(attrOffset + j * pointAttributes.byteSize + 8, true) * scale;
        } else {
          x = view.getFloat32(attrOffset + j * pointAttributes.byteSize + 0, true) + nodeOffset[0];
          y = view.getFloat32(attrOffset + j * pointAttributes.byteSize + 4, true) + nodeOffset[1];
          z = view.getFloat32(attrOffset + j * pointAttributes.byteSize + 8, true) + nodeOffset[2];
        }
        positions[3 * j + 0] = x;
        positions[3 * j + 1] = y;
        positions[3 * j + 2] = z;
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
    } else if (pointAttribute.name === "rgba") {
      const colors = new Uint8Array(numPoints * 4);
      for (let j = 0; j < numPoints; j++) {
        colors[4 * j + 0] = view.getUint8(attrOffset + j * pointAttributes.byteSize + 0);
        colors[4 * j + 1] = view.getUint8(attrOffset + j * pointAttributes.byteSize + 1);
        colors[4 * j + 2] = view.getUint8(attrOffset + j * pointAttributes.byteSize + 2);
        colors[4 * j + 3] = 255;
      }
      attributeBuffers[pointAttribute.name] = {
        buffer: colors.buffer,
        attribute: pointAttribute
      };
    } else if (pointAttribute.name === "rgb") {
      const colors = new Uint8Array(numPoints * 4);
      const requiredSize = numPoints * pointAttributes.byteSize;
      if (buffer.byteLength < requiredSize) {
        console.error(`[BinaryDecoder] Buffer too small for rgb: have ${buffer.byteLength}, need ${requiredSize}`);
        throw new Error(`Buffer size mismatch: expected ${requiredSize} bytes, got ${buffer.byteLength} bytes`);
      }
      for (let j = 0; j < numPoints; j++) {
        const offset = attrOffset + j * pointAttributes.byteSize;
        if (offset + 6 > buffer.byteLength) {
          console.error(`[BinaryDecoder] RGB read would exceed buffer: offset=${offset}, bufferSize=${buffer.byteLength}`);
          colors[4 * j + 0] = 128;
          colors[4 * j + 1] = 128;
          colors[4 * j + 2] = 128;
          colors[4 * j + 3] = 255;
          continue;
        }
        const r = view.getUint16(offset + 0, true);
        const g = view.getUint16(offset + 2, true);
        const b = view.getUint16(offset + 4, true);
        colors[4 * j + 0] = Math.min(255, r);
        colors[4 * j + 1] = Math.min(255, g);
        colors[4 * j + 2] = Math.min(255, b);
        colors[4 * j + 3] = 255;
      }
      attributeBuffers["rgba"] = {
        buffer: colors.buffer,
        attribute: pointAttribute
      };
    } else if (pointAttribute.name === "NORMAL_SPHEREMAPPED") {
      const normals = decodeSphereMapping(view, attrOffset, pointAttributes.byteSize, numPoints);
      attributeBuffers[pointAttribute.name] = {
        buffer: normals.buffer,
        attribute: pointAttribute
      };
    } else if (pointAttribute.name === "NORMAL_OCT16") {
      const normals = decodeOct16Normals(view, attrOffset, pointAttributes.byteSize, numPoints);
      attributeBuffers[pointAttribute.name] = {
        buffer: normals.buffer,
        attribute: pointAttribute
      };
    } else if (pointAttribute.name === "NORMAL") {
      const normals = new Float32Array(numPoints * 3);
      for (let j = 0; j < numPoints; j++) {
        const x = view.getFloat32(attrOffset + j * pointAttributes.byteSize + 0, true);
        const y = view.getFloat32(attrOffset + j * pointAttributes.byteSize + 4, true);
        const z = view.getFloat32(attrOffset + j * pointAttributes.byteSize + 8, true);
        normals[3 * j + 0] = x;
        normals[3 * j + 1] = y;
        normals[3 * j + 2] = z;
      }
      attributeBuffers[pointAttribute.name] = {
        buffer: normals.buffer,
        attribute: pointAttribute
      };
    } else {
      const f32 = new Float32Array(numPoints);
      const TypedArray = typedArrayMapping[pointAttribute.type.name];
      const preciseBuffer = new TypedArray(numPoints);
      let min = Infinity;
      let max = -Infinity;
      let offset = 0;
      let attrScale = 1;
      const getterMap = createGetterMap(view);
      const getter = getterMap[pointAttribute.type.name];
      if (!getter) {
        continue;
      }
      if (pointAttribute.type.size > 4) {
        for (let j = 0; j < numPoints; j++) {
          let value = getter(attrOffset + j * pointAttributes.byteSize, true);
          if (typeof value === "bigint") {
            value = Number(value);
          }
          if (!Number.isNaN(value)) {
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
        }
        const initialRange = pointAttribute.initialRange;
        if (initialRange != null) {
          offset = initialRange[0];
          attrScale = 1 / (initialRange[1] - initialRange[0]);
        } else {
          offset = min;
          attrScale = 1 / (max - min);
        }
      }
      for (let j = 0; j < numPoints; j++) {
        let value = getter(attrOffset + j * pointAttributes.byteSize, true);
        if (typeof value === "bigint") {
          value = Number(value);
        }
        if (!Number.isNaN(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
        f32[j] = (value - offset) * attrScale;
        preciseBuffer[j] = value;
      }
      const attributeWithRange = pointAttribute;
      attributeWithRange.range = [min, max];
      attributeBuffers[pointAttribute.name] = {
        buffer: f32.buffer,
        preciseBuffer: preciseBuffer.buffer,
        attribute: pointAttribute,
        offset,
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
      const vectorData = new Float32Array(numVectorElements * numPoints);
      let iElement = 0;
      for (const sourceName of attributes) {
        const sourceBuffer = attributeBuffers[sourceName];
        if (!sourceBuffer) continue;
        const { offset, scale: scale2 } = sourceBuffer;
        const sourceView = new DataView(sourceBuffer.buffer);
        for (let j = 0; j < numPoints; j++) {
          const value = sourceView.getFloat32(j * 4, true);
          vectorData[j * numVectorElements + iElement] = value / scale2 + offset;
        }
        iElement++;
      }
      attributeBuffers[name] = {
        buffer: vectorData.buffer,
        attribute: {
          name,
          type: { name: "float", size: 4, ordinal: 0 },
          numElements: numVectorElements,
          byteSize: numVectorElements * 4
        }
      };
    }
  }
  performance.mark("binary-decoder-end");
  performance.clearMarks();
  performance.clearMeasures();
  const response = {
    buffer,
    mean,
    attributeBuffers,
    tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
    numPoints
  };
  return response;
}
self.onmessage = (event) => {
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
    const result = decodePointCloudData({ data: decodeRequest });
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
//# sourceMappingURL=BinaryDecoderWorker.js.map