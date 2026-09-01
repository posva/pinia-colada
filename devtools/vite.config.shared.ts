import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import Dts from 'unplugin-dts/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    sourcemap: true,
    // minify: false,
    outDir: resolve(__dirname, './dist-shared'),
    lib: {
      entry: resolve(__dirname, './src/shared/index.ts'),
      name: 'PiniaColadaDevtools_Shared',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['vue', '@pinia/colada', 'pinia'],
    },
  },

  plugins: [
    Dts({
      bundleTypes: true,
      entryRoot: resolve(__dirname, './src/shared'),
      include: ['src/shared/**/*'],
      exclude: ['node_modules/**'],
    }),
  ],
})
