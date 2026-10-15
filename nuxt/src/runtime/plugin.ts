import { defineNuxtPlugin } from '#app'
import coladaOptions from '#build/colada.options'
import {
  hydrateQueryCache,
  PiniaColada,
  PiniaColadaSSRNoGc,
  serializeQueryCache,
  useQueryCache,
  type PiniaColadaOptions,
} from '@pinia/colada'
import { markRaw } from 'vue'

export default defineNuxtPlugin({
  name: 'Pinia Colada',
  // makes this plugin run after the Pinia plugin
  // @ts-ignore The module-only type build does not include Pinia's plugin name.
  dependsOn: ['pinia'],
  setup(nuxtApp) {
    nuxtApp.vueApp.use(PiniaColada, {
      ...coladaOptions,
      // Disable GC during SSR: setTimeout closures would retain entries across
      // requests, and on SSG/build pipelines pending timers keep Node alive.
      plugins: [
        ...(coladaOptions.plugins ?? []),
        ...(import.meta.server ? [PiniaColadaSSRNoGc()] : []),
      ],
    } satisfies PiniaColadaOptions)

    const queryCache = useQueryCache()
    if (import.meta.server) {
      nuxtApp.hook('app:rendered', ({ ssrContext }) => {
        if (ssrContext) {
          ssrContext.payload.pinia_colada = markRaw(serializeQueryCache(queryCache))
          const piniaPayload = ssrContext.payload.pinia
          if (piniaPayload && Object.hasOwn(piniaPayload, queryCache.$id)) {
            const piniaState = { ...piniaPayload }
            Reflect.deleteProperty(piniaState, queryCache.$id)
            ssrContext.payload.pinia = piniaState
          }
        }
      })
    } else if (nuxtApp.payload && nuxtApp.payload.pinia_colada) {
      // we are inside of an injectable context so `useQueryCache()` works
      hydrateQueryCache(
        queryCache,
        nuxtApp.payload.pinia_colada as ReturnType<typeof serializeQueryCache>,
      )
    }
  },
})
