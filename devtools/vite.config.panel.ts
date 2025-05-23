import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import baseConfig from './vite.config'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    ...baseConfig.resolve,
  },

  build: {
    sourcemap: true,
    // minify: false,
    outDir: resolve(__dirname, './dist-panel'),
    lib: {
      entry: resolve(__dirname, './src/panel/index.ts'),
      name: 'PiniaColadaDevtools_Panel',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@pinia/colada-devtools/shared'],
    },
  },

  plugins: [...(baseConfig.plugins || [])],
})
