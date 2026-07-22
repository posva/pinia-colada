import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, normalizePath } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueDevtools from 'vite-plugin-vue-devtools'
import Dts from 'unplugin-dts/vite'
import VueRouter from 'vue-router/vite'
import TailwindCSS from '@tailwindcss/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const UiComponentRe = /^U[A-Z][a-z]/

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@pinia\/colada$/,
        replacement: resolve(__dirname, '../src/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools$/,
        replacement: resolve(__dirname, './src/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/panel$/,
        replacement: resolve(__dirname, './src/panel/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/shared$/,
        replacement: resolve(__dirname, './src/shared/index.ts'),
      },
      {
        find: /^@pinia\/colada-devtools\/panel\/index\.css$/,
        replacement: resolve(__dirname, './src/panel/styles.css'),
      },
    ],
  },

  define: {
    // NOTE: needed to avoid HMR not working when using the devtools
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    // allows to be changed when consuming the devtools
    NODE_ENV: process.env.NODE_ENV === 'production' ? `process.env.NODE_ENV` : '"development"',
  },

  build: {
    sourcemap: true,
    // to debug
    // minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'PiniaColadaDevtools',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'vue',
        '@pinia/colada',
        '@pinia/colada-devtools/shared',
        '@pinia/colada-devtools/panel',
      ],
    },
  },

  plugins: [
    // some plugins are needed during dev and build in different places
    // they should be split and duplicated accordingly, but this was faster
    VueRouter({
      root: resolve(__dirname, '.'),
      routesFolder: [
        {
          src: resolve(__dirname, './src/panel/pages'),
        },
      ],
      experimental: {
        paramParsers: {
          dir: 'src/params',
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
    VueDevtools(),
    Components({
      dirs: [resolve(__dirname, './src/panel/components')],
      // to avoid erasing the generated dts file during dev
      dts: process.env.NODE_ENV !== 'production',
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
                resolve(__dirname, `./src/panel/components/${componentName}.ce.vue`),
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
    Dts({
      bundleTypes: true,
      // keep these out from dist/ to avoid pollution
      exclude: ['node_modules/**', 'components.d.ts', 'typed-router.d.ts', 'vite.config.*'],
    }),
    TailwindCSS(),
  ],
})
