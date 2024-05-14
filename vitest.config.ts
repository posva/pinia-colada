import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [Vue()],

  test: {
    environment: 'happy-dom',
    fakeTimers: {
      // easier to read, some date in 2001
      now: 1_000_000_000_000,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcovonly', 'html'],
      all: true,
      include: ['src'],
      exclude: ['src/index.ts', 'src/**/*.test-d.ts'],
    },
  },
})
