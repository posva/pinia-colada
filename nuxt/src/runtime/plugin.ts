import { PiniaColada } from '@pinia/colada'
import { defineNuxtPlugin } from '#imports'
import coladaOptions from '#build/colada.options'

export default defineNuxtPlugin({
  name: 'Pinia Colada',
  dependsOn: ['pinia'],
  setup(nuxtApp) {
    nuxtApp.vueApp.use(PiniaColada, coladaOptions)
  },
})
