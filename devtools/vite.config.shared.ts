import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      // '@pinia/colada-devtools/shared': resolve(__dirname, './src/shared/index.ts'),
    },
  },

  build: {
    sourcemap: true,
    outDir: resolve(__dirname, './dist-shared'),
    lib: {
      entry: resolve(__dirname, './src/shared/index.ts'),
      name: 'PiniaColadaDevtools_Shared',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', '@pinia/colada', 'pinia'],
    },
  },

  plugins: [
    Vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return tag.startsWith('pinia-colada-')
          },
        },
      },
      // FIXME: should go away in an update
    }) as Plugin,
    Dts({ rollupTypes: true }),
  ],
})
