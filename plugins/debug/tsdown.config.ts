import { defineConfig } from 'tsdown'
import type { Options } from 'tsdown'

const commonOptions = {
  // splitting: false,
  sourcemap: true,
  format: ['cjs', 'esm'],
  external: ['vue', 'pinia', '@pinia/colada'],
  dts: true,
  target: 'esnext',
} satisfies Options

export default defineConfig([
  {
    ...commonOptions,
    clean: true,
    entry: ['src/index.ts'],
    globalName: 'PiniaColadaDebug',
  },
])
