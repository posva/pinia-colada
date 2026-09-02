import { resolve } from 'node:path'
import { defineConfig } from 'tsdown'

const fromDevtools = (path: string) => resolve(import.meta.dirname, path)

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    vite: 'src/vite.ts',
    'client-script': 'src/client-script.ts',
    standalone: 'src/standalone.ts',
  },
  outDir: 'dist',
  clean: true,
  format: ['esm'],
  fixedExtension: false,
  target: 'esnext',
  sourcemap: false,
  dts: true,
  loader: {
    '.svg': 'dataurl',
  },
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
