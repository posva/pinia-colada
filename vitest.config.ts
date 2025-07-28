import { defineConfig } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { globbySync } from 'globby'
import fs from 'node:fs'

const pluginsProjects = globbySync('./plugins/*', { onlyDirectories: true })
  .map((dir) => {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(fileURLToPath(new URL(`${dir}/package.json`, import.meta.url)), 'utf-8'),
      )
      return {
        name: pkg.name,
        root: dir,
      }
    } catch (error) {
      console.error(`Error reading package.json from "${dir}"`, error)
      return null
    }
  })
  .filter((v) => v != null)

export default defineConfig({
  plugins: [Vue()],

  // this allows plugins to correctly import the dev version of pinia
  resolve: {
    alias: {
      '@pinia/colada': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      '@/test-utils': fileURLToPath(new URL('./test-utils', import.meta.url)),
    },
  },

  test: {
    projects: [
      // you can use a list of glob patterns to define your workspaces
      // Vitest expects a list of config files
      // or directories where there is a config file
      '.',
      // './plugins/*',
      // you can even run the same tests,
      // but with different configs in the same "vitest" process
      // () => ({}),
      ...pluginsProjects.map((project) => ({
        extends: './vitest.config.ts',
        test: {
          ...project,
        },
      })),
    ],
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
