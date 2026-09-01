import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, normalizePath } from 'vite'
import Vue from '@vitejs/plugin-vue'
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
        find: /^@pinia\/colada-devtools\/panel\/index\.css$/,
        replacement: resolve(__dirname, './src/panel/styles.css'),
      },
      {
        find: /^@pinia\/colada-devtools\/shared$/,
        replacement: resolve(__dirname, './src/shared/index.ts'),
      },
    ],
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    NODE_ENV: process.env.NODE_ENV === 'production' ? `process.env.NODE_ENV` : '"development"',
  },

  build: {
    sourcemap: true,
    // minify: false,
    outDir: resolve(__dirname, './dist-panel'),
    lib: {
      entry: resolve(__dirname, './src/panel/index.ts'),
      name: 'PiniaColadaDevtools_Panel',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['@pinia/colada-devtools/shared'],
    },
  },

  plugins: [
    VueRouter({
      root: __dirname,
      routesFolder: [{ src: resolve(__dirname, './src/panel/pages') }],
      experimental: {
        paramParsers: {
          dir: resolve(__dirname, './src/params'),
        },
      },
    }),
    Vue(),
    Icons({ compiler: 'vue3' }),
    Components({
      dirs: [resolve(__dirname, './src/panel/components')],
      dts: false,
      resolvers: [
        (componentName) => {
          if (UiComponentRe.test(componentName)) {
            return {
              name: 'default',
              from: normalizePath(
                resolve(__dirname, `./src/panel/components/${componentName}.vue`),
              ),
            }
          }
        },
        IconsResolver({ alias: { park: 'icon-park' } }),
      ],
    }),
    Dts({
      bundleTypes: true,
      entryRoot: resolve(__dirname, './src/panel'),
      include: ['env.d.ts', 'src/panel/**/*', 'src/shared/**/*'],
      exclude: ['node_modules/**'],
    }),
    TailwindCSS(),
  ],
})
