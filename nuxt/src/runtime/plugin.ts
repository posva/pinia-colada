import {
  useQueryCache,
  PiniaColada,
  serializeQueryCache,
  type PiniaColadaOptions,
  hydrateQueryCache,
} from '@pinia/colada'
import { markRaw } from 'vue'
import { defineNuxtPlugin } from '#app'
import coladaOptions from '#build/colada.options'

export default defineNuxtPlugin({
  name: 'Pinia Colada',
  // makes this plugin run after the Pinia plugin
  dependsOn: ['pinia'],
  setup(nuxtApp) {
    nuxtApp.vueApp.use(PiniaColada, {
      ...coladaOptions,
    } satisfies PiniaColadaOptions)

    const queryCache = useQueryCache()
    if (import.meta.server) {
      nuxtApp.hook('app:rendered', ({ ssrContext }) => {
        if (ssrContext) {
          ssrContext.payload.pinia_colada = markRaw(serializeQueryCache(queryCache))
        }
      })
    } else if (nuxtApp.payload && nuxtApp.payload.pinia_colada) {
      // we are inside of an injectable context so `useQueryCache()` works
      hydrateQueryCache(queryCache, nuxtApp.payload.pinia_colada)
    }
  },
})
