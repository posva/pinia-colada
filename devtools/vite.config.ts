import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Dts from 'vite-plugin-dts'
import VueRouter from 'unplugin-vue-router/vite'
import TailwindCSS from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
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
      // '@pinia/colada-devtools/panel/index.css': resolve(__dirname, './src/panel/styles.css'),
      // '^@pinia/colada-devtools/shared$': resolve(__dirname, './src/shared/index.ts'),
      // '^@pinia/colada-devtools/panel$': resolve(__dirname, './src/panel/index.ts'),
      // '^@pinia/colada-devtools$': resolve(__dirname, './src/index.ts'),
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
    Dts({ rollupTypes: true }),
    TailwindCSS(),
  ],
})
