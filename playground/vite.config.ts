import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'unplugin-vue-router/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [VueRouter(), Vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@pinia/colada': fileURLToPath(
        new URL('../src/index.ts', import.meta.url)
      ),
    },
  },
})
