import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueDevtools from 'vite-plugin-vue-devtools'
import Dts from 'vite-plugin-dts'
import VueRouter from 'unplugin-vue-router/vite'
import TailwindCSS from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

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

  build: {
    sourcemap: true,
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
        // TODO; check if needed
        '@pinia/colada-devtools/panel/index.css',
      ],
    },
  },

  plugins: [
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
    Dts({ rollupTypes: true }),
    TailwindCSS(),
  ],
})
