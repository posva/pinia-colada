import type { UserConfig } from 'tsdown'

export const commonOptions = {
  sourcemap: true,
  format: ['esm'],
  deps: {
    onlyBundle: [],
    neverBundle: ['vue', 'pinia', '@pinia/colada'],
  },
  dts: {
    build: true,
  },
  target: 'esnext',
  clean: true,
  entry: ['src/index.ts'],
} satisfies UserConfig
