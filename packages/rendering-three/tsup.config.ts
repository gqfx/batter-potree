import { defineConfig } from 'tsup';

/**
 * @better-potree/rendering-three 包的构建配置
 *
 * 使用 tsup 生成：
 * - ESM 格式 (index.js)
 * - CJS 格式 (index.cjs)
 * - TypeScript 类型声明 (index.d.ts)
 * - 支持 GLSL shader 文件
 */
export default defineConfig({
  // 入口文件
  entry: ['src/index.ts'],

  // 输出格式
  format: ['esm', 'cjs'],

  // 生成类型声明文件
  dts: true,

  // 生成 source map
  sourcemap: true,

  // 清理输出目录
  clean: true,

  // 不打包依赖
  external: ['@better-potree/core', '@better-potree/rendering', 'three', /^three\/.*/],

  // Tree shaking
  treeshake: true,

  // 代码分割（库模式下不需要）
  splitting: false,

  // 不压缩（保持可读性）
  minify: false,

  // 输出目录
  outDir: 'dist',

  // esbuild 选项
  esbuildOptions(options) {
    // 配置 GLSL 文件加载器
    options.loader = {
      ...options.loader,
      '.glsl': 'text',
      '.vert': 'text',
      '.frag': 'text',
      '.vs': 'text',
      '.fs': 'text',
    };
  },
});
