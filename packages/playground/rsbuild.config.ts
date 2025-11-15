import { defineConfig } from '@rsbuild/core';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

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
  tools: {
    rspack: {
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
