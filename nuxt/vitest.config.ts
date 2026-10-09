import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: '@pinia/colada-nuxt',
    environment: 'node',
    include: ['test/**/*.spec.ts'],
  },
})
