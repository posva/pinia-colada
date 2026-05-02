import { fileURLToPath } from 'node:url'
import { addImports, addPlugin, createResolver, defineNuxtModule, useLogger } from '@nuxt/kit'
import { loadConfig, watchConfig } from 'c12'
import type { Nuxt } from 'nuxt/schema'
import type { ConsolaInstance } from 'consola'
import { relative } from 'node:path'

async function loadColadaConfig(nuxt: Nuxt, options: ModuleOptions, logger: ConsolaInstance) {
  const watch = nuxt.options.dev && options.watch
  const loader: typeof watchConfig = watch
    ? (opts) =>
        watchConfig({
          ...opts,
          onWatch: (e) => {
            logger.info(
              relative(nuxt.options.rootDir, e.path),
              `${e.type}, restarting the Nuxt server...`,
            )
            nuxt.hooks.callHook('restart', { hard: true })
          },
        })
    : (loadConfig as typeof watchConfig)

  const config = await loader({
    name: 'colada',
    cwd: nuxt.options.rootDir,
  })

  if (watch) {
    nuxt.hook('close', () => config.unwatch())
  }

  return config
}

export interface ModuleOptions {
  /**
   * Development HMR
   * @default false
   */
  watch?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'pinia-colada',
    configKey: 'colada',
    compatibility: {
      nuxt: '^3.17.7 || ^4.0.0',
    },
  },
  defaults: {
    watch: false,
  },
  async setup(options, nuxt) {
    const logger: ConsolaInstance = useLogger('@pinia/colada-nuxt')
    const { resolve } = createResolver(import.meta.url)
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))
    const { configFile } = await loadColadaConfig(nuxt, options, logger)

    if (!configFile) {
      logger.warn('No colada configuration found')
    }

    nuxt.options.alias['#colada/config'] = configFile!

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

export { defineColadaConfig } from './config'
