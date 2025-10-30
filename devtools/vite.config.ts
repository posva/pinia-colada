import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueDevtools from 'vite-plugin-vue-devtools'
import Dts from 'vite-plugin-dts'
import VueRouter from 'unplugin-vue-router/vite'
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
        'vue-router',
        'pinia',
        '@pinia/colada-devtools/shared',
        '@pinia/colada-devtools/panel',
        // TODO: check if needed
        '@pinia/colada-devtools/panel/index.css',
      ],
    },
  },

  plugins: [
    // some plugins are needed during dev and build in different places
    // they should be split and duplicated accordingly, but this was faster
    VueRouter({
      routesFolder: [
        {
          src: resolve(__dirname, './src/panel/pages'),
        },
      ],
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
              from: resolve(__dirname, `./src/panel/components/${componentName}.ce.vue`),
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
    Dts({ rollupTypes: true }),
    TailwindCSS(),
  ],
})
