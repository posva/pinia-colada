import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Dts from 'vite-plugin-dts'
import UiPro from '@nuxt/ui-pro/vite'
import VueRouter from 'unplugin-vue-router/vite'
import TailwindCSS from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@pinia/colada-devtools/shared': resolve(__dirname, './src/shared/index.ts'),
      // load the correct version during build
      '~~styles.css': resolve(__dirname, './src/panel/styles.css'),
    },
  },

  build: {
    sourcemap: true,
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
    UiPro({
      ui: {
        colors: {
          primary: 'green',
          neutral: 'slate',
        },
      },
    }),
    Dts({ rollupTypes: true }),
    // TailwindCSS(),
  ],
})
