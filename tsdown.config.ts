import { defineConfig } from 'vite-plus/lib'
import type { UserConfig } from 'vite-plus/lib'

const commonOptions = {
  sourcemap: true,
  format: ['esm'],
  external: ['vue', 'pinia', '@pinia/colada', '@vue/devtools-api'],
  target: 'esnext',
  tsconfig: 'tsconfig.pinia-colada.json',
  dts: true,
} satisfies UserConfig

export default defineConfig([
  {
    ...commonOptions,
    clean: true,
    entry: ['src/index.ts'],
    globalName: 'PiniaColada',
  },
])
