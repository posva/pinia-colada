import { defineConfig } from 'tsdown'
import type { Options } from 'tsdown'

const commonOptions = {
  // splitting: false,
  sourcemap: true,
  format: ['cjs', 'esm'],
  external: ['vue', 'pinia', '@pinia/colada', '@vue/devtools-api'],
  target: 'esnext',
  tsconfig: 'tsconfig.pinia-colada.json',
  dts: true,
} satisfies Options

export default defineConfig([
  {
    ...commonOptions,
    clean: true,
    entry: ['src/index.ts'],
    globalName: 'PiniaColada',
  },
])
