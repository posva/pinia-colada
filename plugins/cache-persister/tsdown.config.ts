import { defineConfig } from 'tsdown'
import type { UserConfig } from 'tsdown'

const commonOptions = {
  sourcemap: true,
  format: ['cjs', 'esm'],
  external: ['vue', 'pinia', '@pinia/colada'],
  dts: {
    build: true,
  },
  target: 'esnext',
} satisfies UserConfig

export default defineConfig([
  {
    ...commonOptions,
    clean: true,
    entry: ['src/index.ts'],
    globalName: 'PiniaColadaCachePersister',
  },
])
