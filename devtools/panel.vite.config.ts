import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, normalizePath } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import TailwindCSS from '@tailwindcss/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const devtoolsDir = __dirname
const panelDir = resolve(devtoolsDir, './src/panel')
const UiComponentRe = /^U[A-Z][a-z]/

// Panel SPA mounted at an arbitrary base by the devframe host
export default defineConfig({
  root: panelDir,
  base: './',
  build: {
    outDir: resolve(devtoolsDir, './dist-client'),
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      {
        find: /^@pinia\/colada$/,
        replacement: resolve(devtoolsDir, '../src/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/shared$/,
        replacement: resolve(devtoolsDir, './src/shared/index.ts'),
      },
    ],
  },
  plugins: [
    VueRouter({
      root: devtoolsDir,
      routesFolder: [
        {
          src: resolve(panelDir, './pages'),
        },
      ],
      experimental: {
        paramParsers: {
          dir: resolve(devtoolsDir, './src/params'),
        },
      },
    }),
    Vue(),
    Icons({ compiler: 'vue3' }),
    Components({
      dirs: [resolve(panelDir, './components')],
      dts: false,
      resolvers: [
        (componentName) => {
          if (UiComponentRe.test(componentName)) {
            return {
              name: `default`,
              // normalizePath: on Windows resolve() yields backslash paths that
              // Vite's import-analysis can't resolve as an import specifier.
              from: normalizePath(resolve(panelDir, `./components/${componentName}.vue`)),
            }
          }
        },
        IconsResolver({
          alias: {
            park: 'icon-park',
          },
        }),
      ],
    }),
    TailwindCSS(),
  ],
})
