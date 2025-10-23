import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { addImports, addPlugin, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule<never>({
  meta: {
    name: 'pinia-colada',
    configKey: 'colada',
    compatibility: {
      nuxt: '^3.17.7 || ^4.0.0',
    },
  },
  // Default configuration options of the Nuxt module
  setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    const coladaOptionsPath = resolve(nuxt.options.rootDir, 'colada.options')

    // avoids having multiple copies of @pinia/colada
    nuxt.options.vite.optimizeDeps ??= {}
    nuxt.options.vite.optimizeDeps.exclude ??= []
    if (!nuxt.options.vite.optimizeDeps.exclude.includes('@pinia/colada')) {
      nuxt.options.vite.optimizeDeps.exclude.push('@pinia/colada')
    }

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve('./runtime/plugin'))
    addPlugin(resolve('./runtime/payload-plugin'))

    // Otherwise we end up duplicating pinia
    nuxt.options.build.transpile.push(runtimeDir)

    nuxt.hook('prepare:types', (opts) => {
      opts.references.push({ path: resolve('./types/build.d.ts') })
    })

    // Check for root-level colada.options file
    const hasRootOptionsFile = existsSync(coladaOptionsPath + '.ts') || existsSync(coladaOptionsPath + '.js')

    // Generate a simple template that exports the options file if it exists
    addTemplate({
      filename: 'colada.options.mjs',
      getContents() {
        if (!hasRootOptionsFile) {
          return 'export default {}'
        }

        return `export { default } from "${coladaOptionsPath}";`
      },
    })

    addImports([
      // queries
      { from: '@pinia/colada', name: 'useQuery' },
      { from: '@pinia/colada', name: 'defineQueryOptions' },
      { from: '@pinia/colada', name: 'defineQuery' },
      { from: '@pinia/colada', name: 'useQueryCache' },
      // mutations
      { from: '@pinia/colada', name: 'useMutation' },
      { from: '@pinia/colada', name: 'defineMutation' },
    ] satisfies Array<{
      from: '@pinia/colada'
      name: keyof typeof import('@pinia/colada')
    }>)
  },
})
