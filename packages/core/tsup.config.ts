import { defineConfig } from 'tsup';

/**
 * @better-potree/core 包的构建配置
 *
 * 使用 tsup 生成：
 * - ESM 格式 (index.js)
 * - CJS 格式 (index.cjs)
 * - TypeScript 类型声明 (index.d.ts)
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
  external: ['eventemitter3', 'zustand', 'three', /^three\/.*/],

  // Tree shaking
  treeshake: true,

  // 代码分割（库模式下不需要）
  splitting: false,

  // 不压缩（保持可读性）
  minify: false,

  // 输出目录
  outDir: 'dist',
});
