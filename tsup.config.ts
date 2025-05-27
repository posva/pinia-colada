import { defineConfig } from 'tsup'
import type { Options } from 'tsup'

const commonOptions = {
  // splitting: false,
  sourcemap: true,
  format: ['cjs', 'esm'],
  target: 'esnext',
  external: ['vue', 'pinia', '@pinia/colada', '@vue/devtools-api', '@pinia/colada-devtools'],
  loader: {
    '.html': 'empty',
  },
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
} satisfies Options

export default defineConfig([
  {
    ...commonOptions,
    clean: true,
    entry: ['src/index.ts'],
    globalName: 'PiniaColada',
  },
])
