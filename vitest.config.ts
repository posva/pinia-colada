import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [Vue()],

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
      include: ['src'],
      exclude: ['src/index.ts', 'src/**/*.test-d.ts'],
    },
  },
})
