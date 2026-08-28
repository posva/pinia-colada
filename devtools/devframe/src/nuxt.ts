import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { PiniaColadaDevtools } from './vite.ts'

/** Register the Pinia Colada devframe in Nuxt DevTools' Vite DevTools hub. */
export default defineNuxtModule({
  meta: {
    name: '@pinia/colada-devtools/devframe',
    compatibility: {
      nuxt: '^4.0.0',
    },
  },
  setup() {
    addVitePlugin(PiniaColadaDevtools(), { server: false })
  },
})
