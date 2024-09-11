import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    MyModule,
  ],
})
