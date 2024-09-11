import { PiniaColada, type PiniaColadaOptions } from '@pinia/colada'
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin({
  dependsOn: ['pinia'],
  setup(nuxtApp) {
    nuxtApp.vueApp.use(PiniaColada, {

      // for some reason there is no autocomplete
    } satisfies PiniaColadaOptions)
  },
})
