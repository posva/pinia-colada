import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const fromDevtools = (path: string) => resolve(import.meta.dirname, '..', path)

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    vite: 'src/vite.ts',
    'client-script': 'src/client-script/index.ts',
    'vite-hub': 'src/vite-hub.ts',
  },
  outDir: '../dist-devframe',
  clean: true,
  format: ['esm'],
  fixedExtension: false,
  target: 'esnext',
  sourcemap: true,
  dts: true,
  alias: {
    '@pinia/colada-devtools/shared': fromDevtools('src/shared/index.ts'),
  },
  deps: {
    dts: {
      neverBundle: true,
    },
    onlyBundle: false,
    neverBundle: [
      '@devframes/hub-ui',
      '@devframes/vite',
      '@pinia/colada',
      '@vitejs/devtools-kit',
      'devframe',
      'pinia',
      'vue',
      'vite',
    ],
  },
})
