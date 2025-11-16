import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@better-potree/core': resolve(__dirname, './packages/core/src'),
      '@better-potree/types': resolve(__dirname, './packages/types/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./packages/rendering-three/src/__tests__/setup.ts'],
    include: ['packages/*/src/**/*.test.ts', 'poc/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.spec.ts', '**/*.test.ts', '**/__tests__/setup.ts'],
    },
  },
});
