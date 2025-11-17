import { defineConfig } from '@rsbuild/core';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';
import path from 'path';

export default defineConfig({
  plugins: [pluginTypeCheck()],
  html: {
    template: './src/index.html',
  },
  source: {
    entry: {
      index: './src/main.ts',
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  resolve: {
    // Force workspace packages to resolve to their dist directories
    alias: {
      '@better-potree/core': path.resolve(__dirname, '../../packages/core/dist/index.js'),
      '@better-potree/rendering': path.resolve(__dirname, '../../packages/rendering/dist/index.js'),
      '@better-potree/rendering-three': path.resolve(__dirname, '../../packages/rendering-three/dist/index.js'),
      '@better-potree/viewer': path.resolve(__dirname, '../../packages/viewer/dist/index.js'),
    },
  },
  tools: {
    rspack: {
      resolve: {
        // Map .js extensions to .ts files for TypeScript ESM imports
        extensionAlias: {
          '.js': ['.ts', '.tsx', '.js'],
          '.mjs': ['.mts', '.mjs'],
        },
        extensions: ['.ts', '.tsx', '.js', '.json'],
      },
      module: {
        rules: [
          {
            test: /\.(glsl|vs|fs|vert|frag)$/,
            type: 'asset/source',
          },
        ],
      },
    },
  },
});
