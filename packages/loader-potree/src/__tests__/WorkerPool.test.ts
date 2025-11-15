/**
 * Unit tests for WorkerPool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkerPool, createWorkerPool } from '../workers/WorkerPool';
import type { IWorkerDecodeRequest, IWorkerDecodeResponse } from '@better-potree/types';
import { PointAttributes } from '@better-potree/core';

// Mock Worker class
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage = vi.fn();
  terminate = vi.fn();

  // Simulate successful message
  simulateMessage(data: IWorkerDecodeResponse) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data }));
    }
  }

  // Simulate error
  simulateError(message: string) {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { message }));
    }
  }
}

// Helper functions to create mock request/response (declared at module scope)
const createMockRequest = (): IWorkerDecodeRequest => {
  const buffer = new ArrayBuffer(100);
  const pointAttributes = new PointAttributes(['POSITION_CARTESIAN']);

  return {
    buffer,
    pointAttributes,
    version: '1.7',
    offset: [0, 0, 0],
    scale: 0.001,
    spacing: 0.1,
    hasChildren: 0,
    name: 'r',
  };
};

const createMockResponse = (): IWorkerDecodeResponse => ({
  buffer: new ArrayBuffer(100),
  numPoints: 100,
  mean: [0, 0, 0],
  tightBoundingBox: {
    min: [-1, -1, -1],
    max: [1, 1, 1],
  },
  attributeBuffers: {},
});

describe('WorkerPool', () => {
  let workerPool: WorkerPool;
  let mockWorkers: MockWorker[];
  let workerFactory: () => Worker;

  beforeEach(() => {
    mockWorkers = [];
    workerFactory = vi.fn(() => {
      const worker = new MockWorker() as unknown as Worker;
      mockWorkers.push(worker as unknown as MockWorker);
      return worker;
    });

    // Mock navigator.hardwareConcurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 4,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (workerPool) {
      workerPool.dispose();
    }
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create workers based on navigator.hardwareConcurrency', () => {
      workerPool = createWorkerPool(workerFactory);

      expect(workerPool.getWorkerCount()).toBe(4);
      expect(mockWorkers.length).toBe(4);
    });

    it('should create specified number of workers', () => {
      workerPool = createWorkerPool(workerFactory, 2);

      expect(workerPool.getWorkerCount()).toBe(2);
      expect(mockWorkers.length).toBe(2);
    });

    it('should use 4 workers as default if hardwareConcurrency is unavailable', () => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      workerPool = createWorkerPool(workerFactory);

      expect(workerPool.getWorkerCount()).toBe(4);
    });

    it('should attach onmessage and onerror handlers to workers', () => {
      workerPool = createWorkerPool(workerFactory, 2);

      expect(mockWorkers[0].onmessage).toBeTruthy();
      expect(mockWorkers[0].onerror).toBeTruthy();
      expect(mockWorkers[1].onmessage).toBeTruthy();
      expect(mockWorkers[1].onerror).toBeTruthy();
    });
  });

  describe('decode()', () => {
    it('should assign task to available worker', async () => {
      workerPool = createWorkerPool(workerFactory, 2);
      const request = createMockRequest();

      const promise = workerPool.decode(request);

      expect(mockWorkers[0].postMessage).toHaveBeenCalledWith(
        request,
        [request.buffer]
      );

      // Simulate response
      mockWorkers[0].simulateMessage(createMockResponse());

      await promise;
    });

    it('should resolve with worker response', async () => {
      workerPool = createWorkerPool(workerFactory, 2);
      const request = createMockRequest();
      const response = createMockResponse();

      const promise = workerPool.decode(request);

      // Simulate response
      mockWorkers[0].simulateMessage(response);

      const result = await promise;
      expect(result).toEqual(response);
    });

    it('should queue task if no workers available', async () => {
      workerPool = createWorkerPool(workerFactory, 1);

      const request1 = createMockRequest();
      const request2 = createMockRequest();

      const promise1 = workerPool.decode(request1);
      const promise2 = workerPool.decode(request2);

      // First request should be assigned immediately
      expect(mockWorkers[0].postMessage).toHaveBeenCalledTimes(1);
      expect(workerPool.getBusyWorkerCount()).toBe(1);
      expect(workerPool.getQueuedTaskCount()).toBe(1);

      // Complete first task
      mockWorkers[0].simulateMessage(createMockResponse());
      await promise1;

      // Second task should now be assigned
      expect(mockWorkers[0].postMessage).toHaveBeenCalledTimes(2);
      expect(workerPool.getQueuedTaskCount()).toBe(0);

      // Complete second task
      mockWorkers[0].simulateMessage(createMockResponse());
      await promise2;
    });

    it('should handle multiple concurrent tasks', async () => {
      workerPool = createWorkerPool(workerFactory, 4);

      const requests = [
        createMockRequest(),
        createMockRequest(),
        createMockRequest(),
        createMockRequest(),
      ];

      const promises = requests.map((req) => workerPool.decode(req));

      // All 4 workers should be busy
      expect(workerPool.getBusyWorkerCount()).toBe(4);
      expect(workerPool.getQueuedTaskCount()).toBe(0);

      // Complete all tasks
      for (let i = 0; i < 4; i++) {
        mockWorkers[i].simulateMessage(createMockResponse());
      }

      await Promise.all(promises);

      // All workers should be free
      expect(workerPool.getBusyWorkerCount()).toBe(0);
    });

    it('should reject on worker error response', async () => {
      workerPool = createWorkerPool(workerFactory, 1);
      const request = createMockRequest();

      const promise = workerPool.decode(request);

      // Simulate error response
      mockWorkers[0].simulateMessage({ error: 'Decode failed' } as any);

      await expect(promise).rejects.toThrow('Decode failed');
    });

    it('should reject on worker error event', async () => {
      workerPool = createWorkerPool(workerFactory, 1);
      const request = createMockRequest();

      const promise = workerPool.decode(request);

      // Simulate error event
      mockWorkers[0].simulateError('Worker crashed');

      await expect(promise).rejects.toThrow('Worker error: Worker crashed');
    });

    it('should process next task after error', async () => {
      workerPool = createWorkerPool(workerFactory, 1);

      const request1 = createMockRequest();
      const request2 = createMockRequest();

      const promise1 = workerPool.decode(request1);
      const promise2 = workerPool.decode(request2);

      // First task fails
      mockWorkers[0].simulateError('Worker error');
      await expect(promise1).rejects.toThrow();

      // Second task should be processed
      expect(mockWorkers[0].postMessage).toHaveBeenCalledTimes(2);
      expect(workerPool.getQueuedTaskCount()).toBe(0);

      // Complete second task
      mockWorkers[0].simulateMessage(createMockResponse());
      await promise2;
    });

    it('should reject if pool is disposed', async () => {
      workerPool = createWorkerPool(workerFactory, 1);
      workerPool.dispose();

      const request = createMockRequest();

      await expect(workerPool.decode(request)).rejects.toThrow('WorkerPool has been disposed');
    });

    it('should use transferable objects for buffer', async () => {
      workerPool = createWorkerPool(workerFactory, 1);
      const request = createMockRequest();

      const promise = workerPool.decode(request);

      expect(mockWorkers[0].postMessage).toHaveBeenCalledWith(
        request,
        [request.buffer]
      );

      mockWorkers[0].simulateMessage(createMockResponse());
      await promise;
    });
  });

  describe('Status methods', () => {
    it('should report correct worker count', () => {
      workerPool = createWorkerPool(workerFactory, 3);
      expect(workerPool.getWorkerCount()).toBe(3);
    });

    it('should report correct busy worker count', async () => {
      workerPool = createWorkerPool(workerFactory, 3);

      expect(workerPool.getBusyWorkerCount()).toBe(0);

      const request1 = createMockRequest();
      const request2 = createMockRequest();

      const promise1 = workerPool.decode(request1);
      const promise2 = workerPool.decode(request2);

      expect(workerPool.getBusyWorkerCount()).toBe(2);

      mockWorkers[0].simulateMessage(createMockResponse());
      await promise1;

      expect(workerPool.getBusyWorkerCount()).toBe(1);

      mockWorkers[1].simulateMessage(createMockResponse());
      await promise2;

      expect(workerPool.getBusyWorkerCount()).toBe(0);
    });

    it('should report correct queued task count', async () => {
      workerPool = createWorkerPool(workerFactory, 2);

      expect(workerPool.getQueuedTaskCount()).toBe(0);

      const requests = [
        createMockRequest(),
        createMockRequest(),
        createMockRequest(),
      ];

      const promises = requests.map((req) => workerPool.decode(req));

      // 2 workers busy, 1 task queued
      expect(workerPool.getQueuedTaskCount()).toBe(1);

      // Complete first task
      mockWorkers[0].simulateMessage(createMockResponse());
      await promises[0];

      // Queue should be empty now
      expect(workerPool.getQueuedTaskCount()).toBe(0);

      // Complete remaining
      mockWorkers[1].simulateMessage(createMockResponse());
      mockWorkers[0].simulateMessage(createMockResponse());
      await Promise.all(promises);
    });

    it('should report busy state correctly', async () => {
      workerPool = createWorkerPool(workerFactory, 2);

      expect(workerPool.isBusy()).toBe(false);

      const request = createMockRequest();
      const promise = workerPool.decode(request);

      expect(workerPool.isBusy()).toBe(true);

      mockWorkers[0].simulateMessage(createMockResponse());
      await promise;

      expect(workerPool.isBusy()).toBe(false);
    });

    it('should report busy when tasks are queued', () => {
      workerPool = createWorkerPool(workerFactory, 1);

      const request1 = createMockRequest();
      const request2 = createMockRequest();

      workerPool.decode(request1);
      workerPool.decode(request2);

      expect(workerPool.isBusy()).toBe(true);
    });
  });

  describe('dispose()', () => {
    it('should terminate all workers', () => {
      workerPool = createWorkerPool(workerFactory, 3);
      workerPool.dispose();

      expect(mockWorkers[0].terminate).toHaveBeenCalled();
      expect(mockWorkers[1].terminate).toHaveBeenCalled();
      expect(mockWorkers[2].terminate).toHaveBeenCalled();
    });

    it('should reject all queued tasks', async () => {
      workerPool = createWorkerPool(workerFactory, 1);

      const request1 = createMockRequest();
      const request2 = createMockRequest();

      const promise1 = workerPool.decode(request1);
      const promise2 = workerPool.decode(request2);

      workerPool.dispose();

      await expect(promise1).rejects.toThrow('WorkerPool disposed');
      await expect(promise2).rejects.toThrow('WorkerPool disposed');
    });

    it('should be idempotent', () => {
      workerPool = createWorkerPool(workerFactory, 2);

      workerPool.dispose();
      workerPool.dispose();

      expect(mockWorkers[0].terminate).toHaveBeenCalledTimes(1);
      expect(mockWorkers[1].terminate).toHaveBeenCalledTimes(1);
    });

    it('should reject new tasks after disposal', async () => {
      workerPool = createWorkerPool(workerFactory, 1);
      workerPool.dispose();

      const request = createMockRequest();

      await expect(workerPool.decode(request)).rejects.toThrow('WorkerPool has been disposed');
    });

    it('should not process queued tasks after disposal', async () => {
      workerPool = createWorkerPool(workerFactory, 1);

      const request1 = createMockRequest();
      const request2 = createMockRequest();

      const promise1 = workerPool.decode(request1);
      const promise2 = workerPool.decode(request2);

      // Dispose before completing tasks
      workerPool.dispose();

      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();

      // Even if we simulate a message, it shouldn't process
      mockWorkers[0].simulateMessage(createMockResponse());
    });
  });

  describe('Error handling', () => {
    it('should handle message without current task gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      workerPool = createWorkerPool(workerFactory, 1);

      // Simulate a message without a task
      mockWorkers[0].simulateMessage(createMockResponse());

      expect(consoleWarnSpy).toHaveBeenCalledWith('Received message from worker without current task');

      consoleWarnSpy.mockRestore();
    });

    it('should handle worker error without current task', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      workerPool = createWorkerPool(workerFactory, 1);

      // Simulate an error without a task
      mockWorkers[0].simulateError('Random error');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should continue processing after worker error', async () => {
      workerPool = createWorkerPool(workerFactory, 2);

      const request1 = createMockRequest();
      const request2 = createMockRequest();
      const request3 = createMockRequest();

      const promise1 = workerPool.decode(request1);
      const promise2 = workerPool.decode(request2);
      const promise3 = workerPool.decode(request3);

      // First worker errors
      mockWorkers[0].simulateError('Worker error');
      await expect(promise1).rejects.toThrow();

      // Other workers should continue
      mockWorkers[1].simulateMessage(createMockResponse());
      await promise2;

      // First worker should pick up queued task
      mockWorkers[0].simulateMessage(createMockResponse());
      await promise3;
    });
  });

  describe('createWorkerPool factory', () => {
    it('should create WorkerPool with custom worker factory', () => {
      const customFactory = vi.fn(() => new MockWorker() as unknown as Worker);
      const pool = createWorkerPool(customFactory, 2);

      expect(customFactory).toHaveBeenCalledTimes(2);
      expect(pool.getWorkerCount()).toBe(2);

      pool.dispose();
    });

    it('should use default worker count if not specified', () => {
      const pool = createWorkerPool(workerFactory);

      expect(pool.getWorkerCount()).toBe(4);

      pool.dispose();
    });
  });

  describe('WorkerPool base class', () => {
    it('should throw error if createWorker is not overridden', () => {
      expect(() => {
        new WorkerPool(2);
      }).toThrow('Worker creation must be implemented by subclass or via injection');
    });
  });
});
