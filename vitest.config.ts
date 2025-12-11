import { defineConfig, type TestProjectInlineConfiguration } from 'vitest/config'
import Vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const pluginsProjects: TestProjectInlineConfiguration[] = fs
  .globSync('./plugins/*/')
  .map((dir) => {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(fileURLToPath(new URL(`${dir}/package.json`, import.meta.url)), 'utf-8'),
      )
      return {
        // inherit from root config
        extends: true,
        test: {
          name: '🔌 ' + pkg.name,
          root: dir,
        },
      } satisfies TestProjectInlineConfiguration
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
    },
  },

  test: {
    projects: [
      {
        // inherit from root config
        extends: true,
        test: {
          root: '.',
          name: {
            label: '🍹 @pinia/colada',
            color: 'white',
          },
        },
      },
      ...pluginsProjects,
      // TODO: once they upgrade to vitest 4
      // './nuxt',
    ],

    // common config for all projects
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
      include: ['src', 'plugins/*/src'],
      exclude: [
        //
        '**/src/index.ts',
        'src/utils.ts',
        // we are not event sure to keep them because we have
        // our own devtools
        'src/devtools',
        // just for show, so better not include in coverage
        // as it has no tests
        'plugins/debug',
        '**/*.test-d.ts',
      ],
    },
  },
})
