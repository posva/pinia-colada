import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

const root = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  root,
  clearScreen: false,
  plugins: [Vue()],
  resolve: {
    alias: [
      {
        find: /^@pinia\/colada$/,
        replacement: fileURLToPath(new URL('../../../src/index.ts', import.meta.url)),
      },
    ],
  },
  define: {
    __DEV__: 'true',
  },
})
