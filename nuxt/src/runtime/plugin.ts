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
      queryOptions: {
        ...coladaOptions.queryOptions,
        // Disable GC during SSR to prevent setTimeout closures from retaining
        // entry objects in memory across requests
        gcTime: import.meta.server ? false : coladaOptions.queryOptions?.gcTime,
      },
    } satisfies PiniaColadaOptions)

    const queryCache = useQueryCache()
    if (import.meta.server) {
      nuxtApp.hook('app:rendered', ({ ssrContext }) => {
        if (ssrContext) {
          ssrContext.payload.pinia_colada = markRaw(serializeQueryCache(queryCache))
          // FIXME: there is a bug between pinia and nuxt that makes skipSerialize not work:
          // it seems both mjs and cjs are included when doing a generate. This doesn't happen
          // in SSR. Clearing the cache after serialization avoids it being serialized twice, which
          // fails because query options are not serializable
          queryCache.caches.clear()
        }
      })
    } else if (nuxtApp.payload && nuxtApp.payload.pinia_colada) {
      // we are inside of an injectable context so `useQueryCache()` works
      hydrateQueryCache(queryCache, nuxtApp.payload.pinia_colada)
    }
  },
})
