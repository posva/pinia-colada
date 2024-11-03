import { useQueryCache, PiniaColada, serializeTreeMap, type PiniaColadaOptions, hydrateQueryCache } from '@pinia/colada'
import { markRaw } from 'vue'
import { defineNuxtPlugin } from '#imports'
import coladaOptions from '#build/colada.options'

export default defineNuxtPlugin({
  name: 'Pinia Colada',
  dependsOn: ['pinia'],
  setup(nuxtApp) {
    nuxtApp.vueApp.use(PiniaColada, {
      ...coladaOptions,
    } satisfies PiniaColadaOptions)

    const pinia = nuxtApp.vueApp.config.globalProperties.$pinia
    if (import.meta.server) {
      nuxtApp.hook('app:rendered', ({ ssrContext }) => {
        if (ssrContext && pinia.state.value._pc_query?.caches) {
          ssrContext.payload.pinia_colada = markRaw(serializeTreeMap(
            // FIXME: this is empty in a new app...
            pinia.state.value._pc_query?.caches,
          ))
        }
      })
    }
    else if (nuxtApp.payload && nuxtApp.payload.pinia_colada) {
      hydrateQueryCache(useQueryCache(pinia), nuxtApp.payload.pinia_colada)
    }
  },
})
