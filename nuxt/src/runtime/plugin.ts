import {
  useQueryCache,
  PiniaColada,
  serializeQueryCache,
  hydrateQueryCache,
  setDefaultPiniaColadaOptions,
} from '@pinia/colada'
import { markRaw } from 'vue'
import { defineNuxtPlugin } from '#app'
import coladaOptions from '#build/colada.options'

/**
 * Main Pinia Colada plugin for Nuxt.
 *
 * ARCHITECTURE NOTES:
 * ===================
 * This plugin runs at the default order (0) and handles:
 * 1. Merging user's colada.options.ts file into global defaults
 * 2. Installing PiniaColada with the merged configuration
 * 3. Handling SSR serialization/hydration
 *
 * HOW MODULES PROVIDE DEFAULTS:
 * ==============================
 * External modules (e.g., auth modules, UI libraries) that want to provide
 * default Pinia Colada configurations should register their own Nuxt plugins
 * with `order: -10` (runs BEFORE this plugin). Those plugins should call
 * `setDefaultPiniaColadaOptions()` to contribute their defaults.
 *
 * Example:
 * ```ts
 * // In your Nuxt module
 * export default defineNuxtModule({
 *   setup(_options, nuxt) {
 *     addPlugin({
 *       src: resolve('./runtime/plugin'),
 *       order: -10, // Run before main Pinia Colada plugin
 *     })
 *   }
 * })
 *
 * // In your runtime/plugin.ts
 * export default defineNuxtPlugin({
 *   name: 'my-module-colada-defaults',
 *   setup() {
 *     setDefaultPiniaColadaOptions({
 *       plugins: [MyPlugin()],
 *       queryOptions: { staleTime: 5000 }
 *     })
 *   }
 * })
 * ```
 *
 * EXECUTION ORDER:
 * ================
 * 1. Pinia plugin (dependency)
 * 2. Module plugins with order: -10 → call setDefaultPiniaColadaOptions()
 * 3. THIS PLUGIN (order: 0) → merge colada.options.ts + install PiniaColada
 * 4. Other plugins and app code
 *
 * MERGING BEHAVIOR:
 * =================
 * - Arrays (plugins): Concatenated (all plugins included)
 * - Objects (queryOptions, mutationOptions): Shallow merged
 * - User's colada.options.ts has highest priority
 */
export default defineNuxtPlugin({
  name: 'Pinia Colada',
  // Makes this plugin run after the Pinia plugin
  dependsOn: ['pinia'],
  setup(nuxtApp) {
    // Merge user's file-based options (colada.options.ts) into global defaults
    // This has highest priority and will override any module-provided defaults
    if (Object.keys(coladaOptions).length > 0) {
      setDefaultPiniaColadaOptions(coladaOptions)
    }

    // Install PiniaColada - it will use all merged global defaults
    // (from modules + colada.options.ts)
    nuxtApp.vueApp.use(PiniaColada)

    // === SSR Serialization & Hydration ===
    const queryCache = useQueryCache()

    if (import.meta.server) {
      // Server: Serialize query cache to send to client
      nuxtApp.hook('app:rendered', ({ ssrContext }) => {
        if (ssrContext) {
          ssrContext.payload.pinia_colada = markRaw(serializeQueryCache(queryCache))
          // FIXME: there is a bug between pinia and nuxt that makes skipSerialize not work:
          // it seems both mjs and cjs are included when doing a generate. This doesn't happen
          // in SSR. Clearing the cache after serialization avoids it being serialized twice, which
          // fails because query options are not serializable
          queryCache.caches.clear()
        }
      })
    }
    else if (nuxtApp.payload && nuxtApp.payload.pinia_colada) {
      // Client: Hydrate query cache from server payload
      hydrateQueryCache(queryCache, nuxtApp.payload.pinia_colada)
    }
  },
})
