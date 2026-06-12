import { defineConfig } from 'tsdown'
import type { UserConfig } from 'tsdown'

const commonOptions = {
  sourcemap: true,
  format: ['esm'],
  plugins: [
    // only needed for esbuild if we don't add the /*#__PURE__*/ annotation in diagnostics.ts
    // the build is ~40% faster without any plugin
    // nosticsStrip.rolldown(),
  ],
  deps: {
    onlyBundle: [],
    neverBundle: ['vue', 'pinia', '@pinia/colada', '@vue/devtools-api'],
  },
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
