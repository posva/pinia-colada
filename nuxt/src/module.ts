import { addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule<never>({
  meta: {
    name: 'pinia-colada',
    // NOTE: there is no config in nuxtConfig
    configKey: 'colada',
  },
  // Default configuration options of the Nuxt module
  setup(_options, _nuxt) {
    const resolver = createResolver(import.meta.url)

    // TODO: add types.d.ts

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolver.resolve('./runtime/plugin'))
    addPlugin(resolver.resolve('./runtime/payload-plugin'))
  },
})
