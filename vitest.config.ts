import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [Vue()],

  // this allows plugins to correctly import the dev version of pinia
  resolve: {
    alias: {
      '@pinia/colada': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },

  test: {
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'happy-dom',
    fakeTimers: {
      // easier to read, some date in 2001
      now: 1_000_000_000_000,
    },
    typecheck: {
      enabled: true,
    },
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcovonly', 'html'],
      all: true,
      include: ['src', 'plugins/*/src'],
      exclude: ['**/src/index.ts', '**/*.test-d.ts'],
    },
  },
})
