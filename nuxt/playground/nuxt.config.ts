export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '../src/module'],
  devtools: { enabled: true },
  compatibilityDate: '2024-09-11',
  future: {
    compatibilityVersion: 4,
  },
})
