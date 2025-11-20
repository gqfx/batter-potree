import { defineConfig } from 'tsup';

/**
 * @better-potree/viewer 包的构建配置
 *
 * 使用 tsup 生成：
 * - ESM 格式 (index.js)
 * - CJS 格式 (index.cjs)
 * - TypeScript 类型声明 (index.d.ts)
 */
export default defineConfig([
  // 主包配置
  {
    // 入口文件
    entry: {
      index: 'src/index.ts',
    },

    // 输出格式
    format: ['esm', 'cjs'],

    // 生成类型声明文件
    dts: true,

    // 生成 source map
    sourcemap: true,

    // 清理输出目录
    clean: true,

    // 不打包依赖
    external: [
      '@better-potree/core',
      '@better-potree/rendering',
      '@better-potree/rendering-three',
      'three',
      /^three\/.*/,
    ],

    // Tree shaking
    treeshake: true,

    // 代码分割（库模式下不需要）
    splitting: false,

    // 不压缩（保持可读性）
    minify: false,

    // 输出目录
    outDir: 'dist',
  },
  // Worker 文件配置 - 需要打包所有依赖
  {
    entry: {
      'loaders/workers/BinaryDecoderWorker': 'src/loaders/workers/BinaryDecoderWorker.ts',
    },

    // 只生成 ESM 格式（Worker 需要 module 类型）
    format: ['esm'],

    // 不生成类型声明
    dts: false,

    // 生成 source map
    sourcemap: true,

    // 不清理（避免删除主包输出）
    clean: false,

    // Worker 需要打包所有依赖，包括 three
    // 不设置 external，让所有依赖都被打包
    external: [],

    // 不使用代码分割
    splitting: false,

    // 不压缩
    minify: false,

    // 输出目录
    outDir: 'dist',

    // 确保 @better-potree/core 和 three 都被打包进去
    noExternal: [
      '@better-potree/core',
      'three',
    ],
  },
]);
