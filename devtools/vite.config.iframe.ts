import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

import baseConfig from './vite.config'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    ...baseConfig.resolve,
  },

  define: {
    process: {
      env: {
        NODE_ENV: 'production',
      },
    },
  },

  build: {
    sourcemap: true,
    // minify: false,
    outDir: resolve(__dirname, './dist-iframe'),
    lib: {
      entry: resolve(__dirname, './src/panel/index.ts'),
      name: 'PiniaColadaDevtools',
      formats: ['iife'],
      fileName: 'index',
    },
    rollupOptions: {
      // input: resolve(__dirname, './iframe.html'),
      // external: ['@pinia/colada-devtools/shared'],
    },
  },

  plugins: [...(baseConfig.plugins || [])],
})
