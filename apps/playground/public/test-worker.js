// 最简单的测试 Worker
console.log('[Test Worker] Worker loaded successfully');

self.onmessage = function(event) {
  console.log('[Test Worker] Message received:', event.data);
  self.postMessage({ success: true, echo: event.data });
};
