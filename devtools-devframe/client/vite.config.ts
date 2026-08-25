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
// build the panel host against the devtools sources — same toolchain as
// devtools/vite.config.ts, pointed at the workspace files
const devtoolsDir = resolve(__dirname, '../../devtools')
const UiComponentRe = /^U[A-Z][a-z]/

// SPA mounted at an arbitrary base by the devframe host
export default defineConfig({
  base: './',
  resolve: {
    alias: [
      {
        find: /^@pinia\/colada$/,
        replacement: resolve(__dirname, '../../src/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/panel$/,
        replacement: resolve(devtoolsDir, './src/panel/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/shared$/,
        replacement: resolve(devtoolsDir, './src/shared/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/app-bridge$/,
        replacement: resolve(devtoolsDir, './src/app-bridge.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/panel\/index\.css$/,
        // wrapper adding an explicit tailwind @source for the devtools files
        replacement: resolve(__dirname, './src/panel-styles.css'),
      },
    ],
  },
  plugins: [
    VueRouter({
      root: devtoolsDir,
      routesFolder: [
        {
          src: resolve(devtoolsDir, './src/panel/pages'),
        },
      ],
      experimental: {
        paramParsers: {
          dir: resolve(devtoolsDir, './src/params'),
        },
      },
    }),
    Vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return tag.startsWith('pinia-colada-')
          },
        },
      },
    }),
    Icons({ compiler: 'vue3' }),
    Components({
      dirs: [resolve(devtoolsDir, './src/panel/components')],
      // the devtools package owns the generated components.d.ts
      dts: false,
      // avoid declaring the .ce components twice
      globsExclude: ['**/*.ce.vue'],
      resolvers: [
        (componentName) => {
          if (UiComponentRe.test(componentName)) {
            return {
              name: `default`,
              // normalizePath: on Windows resolve() yields backslash paths that
              // Vite's import-analysis can't resolve as an import specifier.
              from: normalizePath(
                resolve(devtoolsDir, `./src/panel/components/${componentName}.ce.vue`),
              ),
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
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
