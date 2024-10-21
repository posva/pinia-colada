import { existsSync } from 'node:fs'
import {
  addPlugin,
  addPluginTemplate,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'

export default defineNuxtModule<never>({
  meta: {
    name: 'pinia-colada',
    // NOTE: there is no config in nuxtConfig
    configKey: 'colada',
  },
  // Default configuration options of the Nuxt module
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const coladaOptionsPath = resolve(nuxt.options.rootDir, 'colada.options')

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve('./runtime/plugin'))
    addPlugin(resolve('./runtime/payload-plugin'))

    nuxt.hook('prepare:types', (opts) => {
      opts.references.push({ path: resolve('./types/build.d.ts') })
    })

    addTemplate({
      filename: 'colada.options.mjs',
      getContents() {
        if (
          !existsSync(coladaOptionsPath + '.ts')
          && !existsSync(coladaOptionsPath + '.js')
        ) {
          return 'export default {}'
        }

        return `export { default as default } from "${coladaOptionsPath}";`
      },
    })
  },
})
