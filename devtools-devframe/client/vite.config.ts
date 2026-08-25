import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, normalizePath } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
import TailwindCSS from '@tailwindcss/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
// reuse the devtools aliases (they are absolute paths); the plugins are
// declared here instead of reused because this build must not run the
// devtools' Dts/VueDevtools plugins
import devtoolsConfig from '../../devtools/vite.config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const devtoolsDir = resolve(__dirname, '../../devtools')
const UiComponentRe = /^U[A-Z][a-z]/

// SPA mounted at an arbitrary base by the devframe host
export default defineConfig({
  base: './',
  resolve: {
    alias: [
      {
        find: /^@pinia\/colada-devtools\/panel\/index\.css$/,
        // must come before the devtools alias for the same specifier: wrapper
        // adding an explicit tailwind @source for the devtools files
        replacement: resolve(__dirname, './src/panel-styles.css'),
      },
      {
        find: /^@pinia\/colada-devtools\/app-bridge$/,
        replacement: resolve(devtoolsDir, './src/app-bridge.ts'),
      },
      ...(devtoolsConfig.resolve!.alias as { find: RegExp; replacement: string }[]),
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
})
