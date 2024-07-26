import { type Options, defineConfig } from 'tsup'

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
    globalName: 'PiniaColada',
  },
  // TODO: move plugins to specific packages
  // {
  //   ...commonOptions,
  //   entry: ['src/plugins/entries/retries.ts'],
  //   outDir: 'dist/plugins',
  // },
])
