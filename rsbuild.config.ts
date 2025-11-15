import { defineConfig } from '@rsbuild/core';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

export default defineConfig({
  plugins: [pluginTypeCheck()],
  source: {
    entry: {
      index: './src/index.ts',
    },
  },
  output: {
    target: 'web',
    distPath: {
      root: 'dist',
    },
    // Support multiple output formats
    assetPrefix: '/',
  },
  tools: {
    rspack: {
      module: {
        rules: [
          // Support GLSL shader files
          {
            test: /\.(glsl|vs|fs|vert|frag)$/,
            type: 'asset/source',
          },
        ],
      },
    },
  },
});
