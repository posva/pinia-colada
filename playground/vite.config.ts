import { URL, fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'
import VueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VueRouter(),
    Vue(),
    VueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@pinia/colada': fileURLToPath(
        new URL('../src/index.ts', import.meta.url),
      ),
      '@pinia/colada-plugin-retry': fileURLToPath(
        new URL('../plugins/retry/src/index.ts', import.meta.url),
      ),
      '@pinia/colada-plugin-debug': fileURLToPath(
        new URL('../plugins/debug/src/index.ts', import.meta.url),
      ),
    },
  },
})
