import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import VueRouter from 'vue-router/vite'
// import VueDevTools from 'vite-plugin-vue-devtools'
import TailwindCSS from '@tailwindcss/vite'
import { nosticsCollector } from '@nostics/unplugin/dev-server-collector'
import { PiniaColadaDevtools } from '@pinia/colada-devtools/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
let devtoolsBase = '/'

// https://vitejs.dev/config/
export default defineConfig({
  devtools: {
    build: {
      withApp: true,
    },
  },
  plugins: [
    //
    VueRouter(),
    Vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => {
            return tag.startsWith('pinia-colada-')
          },
        },
      },
    }),
    // VueDevTools(),
    PiniaColadaDevtools({ production: true }),
    {
      // Vite DevTools 0.7.3 emits the static hub but only injects its dock in dev.
      name: 'playground:production-devtools',
      apply: (_config, env) => env.command === 'build' && !env.isSsrBuild,
      configResolved(config) {
        devtoolsBase = config.base
      },
      transformIndexHtml: {
        order: 'post',
        handler() {
          return [
            {
              tag: 'script',
              attrs: { type: 'module', src: `${devtoolsBase}__devtools/embedded.js` },
              injectTo: 'body',
            },
          ]
        },
      },
    },
    TailwindCSS(),
    nosticsCollector.vite({ debug: true }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@pinia/colada': resolve(__dirname, '../src/index.ts'),
      '@pinia/colada-plugin-retry': resolve(__dirname, '../plugins/retry/src/index.ts'),
      '@pinia/colada-plugin-debug': resolve(__dirname, '../plugins/debug/src/index.ts'),
      '@pinia/colada-plugin-delay': resolve(__dirname, '../plugins/delay/src/index.ts'),
    },
  },
})
