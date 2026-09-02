import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  addImports,
  addPlugin,
  addTemplate,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
  hasNuxtModuleCompatibility,
  tryResolveModule,
} from '@nuxt/kit'

export default defineNuxtModule<Record<string, never>>({
  meta: {
    name: 'pinia-colada',
    // NOTE: there is no config in nuxtConfig
    configKey: 'colada',
    compatibility: {
      nuxt: '^3.17.7 || ^4.0.0 || ^5.0.0',
    },
  },
  // Default configuration options of the Nuxt module
  async setup(_options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    const coladaOptionsPath = resolve(nuxt.options.rootDir, 'colada.options')

    // avoids having multiple copies of @pinia/colada
    nuxt.options.vite.optimizeDeps ??= {}
    nuxt.options.vite.optimizeDeps.exclude ??= []
    if (!nuxt.options.vite.optimizeDeps.exclude.includes('@pinia/colada')) {
      nuxt.options.vite.optimizeDeps.exclude.push('@pinia/colada')
    }

    nuxt.hook('modules:done', async () => {
      if (!nuxt.options.dev) return
      if (nuxt.options.builder !== '@nuxt/vite-builder') return
      if (!(await hasNuxtModuleCompatibility('@nuxt/devtools', '>=4.0.0-0', nuxt))) return

      const devtoolsPath = await tryResolveModule('@pinia/colada-devtools/vite', import.meta.url)
      if (!devtoolsPath) return

      addVitePlugin(
        async () => {
          const { PiniaColadaDevtools } = await import(pathToFileURL(devtoolsPath).href)
          return PiniaColadaDevtools()
        },
        { server: false },
      )
    })

    // Do not add the extension since the `.ts` will be transpiled to `.mjs` after `npm run prepack`
    addPlugin(resolve('./runtime/plugin'))
    addPlugin(resolve('./runtime/payload-plugin'))

    // Otherwise we end up duplicating pinia
    nuxt.options.build.transpile.push(runtimeDir)

    nuxt.hook('prepare:types', (opts) => {
      opts.references.push({ path: resolve('./types/build.d.ts') })
    })

    addTemplate({
      filename: 'colada.options.mjs',
      getContents() {
        if (!existsSync(coladaOptionsPath + '.ts') && !existsSync(coladaOptionsPath + '.js')) {
          return 'export default {}'
        }

        return `export { default as default } from "${coladaOptionsPath}";`
      },
    })

    type Import = Exclude<Parameters<typeof addImports>[0], unknown[]>
    addImports([
      // queries
      { from: '@pinia/colada', name: 'useQuery' },
      { from: '@pinia/colada', name: 'useInfiniteQuery' },
      { from: '@pinia/colada', name: 'useQueryState' },
      { from: '@pinia/colada', name: 'defineQueryOptions' },
      { from: '@pinia/colada', name: 'defineQuery' },
      { from: '@pinia/colada', name: 'useQueryCache' },
      // mutations
      { from: '@pinia/colada', name: 'useMutation' },
      { from: '@pinia/colada', name: 'useMutationCache' },
      { from: '@pinia/colada', name: 'defineMutation' },
    ] satisfies Array<
      Import & {
        from: '@pinia/colada'
        name: keyof typeof import('@pinia/colada')
      }
    >)
  },
})
