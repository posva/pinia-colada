import { defineConfig } from 'vite-plus/lib'
import type { UserConfig } from 'vite-plus/lib'

const commonOptions = {
  sourcemap: true,
  format: ['esm'],
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
    globalName: 'PiniaColadaDelay',
  },
])
