import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'

import baseConfig from './vite.config'

const __dirname = dirname(fileURLToPath(import.meta.url))

const UiComponentRe = /^U[A-Z][a-z]/

export default defineConfig({
  resolve: {
    ...baseConfig.resolve,
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
    ...(baseConfig.plugins || []),
    Components({
      dirs: [resolve(__dirname, './src/panel/components')],
      dts: true,
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
  ],
})
