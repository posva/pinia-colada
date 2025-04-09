import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import VueDevTools from 'vite-plugin-vue-devtools'
import TailwindCSS from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    //
    VueRouter(),
    Vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return tag.startsWith('pinia-colada-')
          },
        },
      },
    }),
    VueDevTools(),
    TailwindCSS(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@pinia/colada': resolve(__dirname, '../src/index.ts'),
      '@pinia/colada-plugin-retry': resolve(__dirname, '../plugins/retry/src/index.ts'),
      '@pinia/colada-plugin-debug': resolve(__dirname, '../plugins/debug/src/index.ts'),
      '@pinia/colada-plugin-delay': resolve(__dirname, '../plugins/delay/src/index.ts'),
    },
  },
})
