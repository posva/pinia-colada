import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: ['@pinia/nuxt', MyModule],
  app: {
    head: {
      title: 'SSR head fallback',
      titleTemplate: '%s | Colada SSR head',
    },
  },
  nitro: {
    prerender: {
      routes: ['/posts/one', '/posts/two'],
    },
  },
})
