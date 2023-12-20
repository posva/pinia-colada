import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  // splitting: false,
  sourcemap: true,
  clean: true,
  format: ['cjs', 'esm', 'iife'],
  globalName: 'PiniaColada',
  external: ['vue', 'pinia'],
  dts: true,
})
