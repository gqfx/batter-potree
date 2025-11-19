import { defineConfig } from '@rsbuild/core';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';
import path from 'node:path';

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
  dev: {
    // 使用 setupMiddlewares 添加静态文件服务
    setupMiddlewares: [
      (middlewares, _server) => {
        const fs = require('node:fs');
        const pathModule = require('node:path');

        // 在所有中间件之前添加
        middlewares.unshift((req: any, res: any, next: any) => {
          if (req.url?.startsWith('/pointcloud/')) {
            const filePath = req.url.replace('/pointcloud', 'D:/3d_models/pointcloud');

            // 检查路径是否存在
            if (!fs.existsSync(filePath)) {
              res.statusCode = 404;
              res.end(`File not found: ${filePath}`);
              return;
            }

            // 检查是否为目录 - 如果是目录，跳过（让浏览器继续加载目录下的文件）
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              next();
              return;
            }

            // 读取文件并发送
            const content = fs.readFileSync(filePath);

            // 设置正确的 Content-Type
            const ext = pathModule.extname(filePath).toLowerCase();
            if (ext === '.json' || ext === '.js') {
              res.setHeader('Content-Type', 'application/json');
            } else if (ext === '.bin') {
              res.setHeader('Content-Type', 'application/octet-stream');
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(content);
            return;
          }
          next();
        });
      },
    ],
  },
  resolve: {
    // Force workspace packages to resolve to their dist directories
    alias: {
      '@better-potree/core': path.resolve(__dirname, '../../packages/core/dist/index.js'),
      '@better-potree/rendering': path.resolve(__dirname, '../../packages/rendering/dist/index.js'),
      '@better-potree/rendering-three': path.resolve(
        __dirname,
        '../../packages/rendering-three/dist/index.js',
      ),
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
