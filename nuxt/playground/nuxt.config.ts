import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '../src/module',
    // Demo module that uses setDefaultPiniaColadaOptions()
    './modules/demo-module',
  ],
  devtools: {
    enabled: true,
  },
  compatibilityDate: '2024-09-11',
  future: {
    compatibilityVersion: 4,
  },
  vite: {
    resolve: {
      alias: {
        pinia: fileURLToPath(new URL('../../node_modules/pinia/dist/pinia.mjs', import.meta.url)),
        '@pinia/colada': fileURLToPath(new URL('../../src/index.ts', import.meta.url)),
        '@pinia/colada-plugin-retry': fileURLToPath(
          new URL('../../plugins/retry/src/index.ts', import.meta.url),
        ),
        '@pinia/colada-plugin-debug': fileURLToPath(
          new URL('../../plugins/debug/src/index.ts', import.meta.url),
        ),
        '@pinia/colada-plugin-delay': fileURLToPath(
          new URL('../../plugins/delay/src/index.ts', import.meta.url),
        ),
      },
    },
  },
})
