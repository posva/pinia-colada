import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Vue from '@vitejs/plugin-vue'
import Dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    //
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
  ],

  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      // entry: [resolve(__dirname, 'src/custom-element.ts'), resolve(__dirname, 'src/index.ts')],
      name: 'PiniaColadaDevtools',
      formats: ['es'],
      fileName: 'index',
      // the proper extensions will be added
      // fileName: (format, name) => {
      //   if (name === 'index') {
      //     return 'index.js'
      //   }
      //   return 'client.js'
      // },
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['vue', '@pinia/colada', 'pinia', '@pinia/colada-devtools-panel'],
    },
  },
})
