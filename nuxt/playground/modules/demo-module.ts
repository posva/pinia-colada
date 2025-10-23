import { addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

/**
 * Demo Nuxt module showing the CLEANEST pattern for providing Pinia Colada defaults.
 *
 * KEY CONCEPT:
 * ============
 * Modules that want to provide default Pinia Colada configurations should:
 * 1. Create a runtime plugin that calls setDefaultPiniaColadaOptions()
 * 2. Register that plugin with `order: -10` (runs before main Pinia Colada plugin)
 *
 * WHY THIS PATTERN?
 * =================
 * - ✅ Clean and explicit (no magic, no virtual modules)
 * - ✅ Works perfectly with SSR (plugins run at runtime)
 * - ✅ Self-contained (each module manages its own defaults)
 * - ✅ Scalable (multiple modules can all add their defaults)
 * - ✅ Easy to debug (clear execution order via plugin ordering)
 *
 * EXECUTION ORDER:
 * ================
 * Build Time:
 *   - This setup() runs and registers the runtime plugin
 *
 * Runtime (SSR + Client):
 *   1. Pinia plugin (dependency)
 *   2. THIS plugin (order: -10) → calls setDefaultPiniaColadaOptions()
 *   3. Main Pinia Colada plugin (order: 0) → installs PiniaColada with merged config
 *   4. App code runs
 *
 * REAL-WORLD USAGE:
 * =================
 * Copy this pattern for your own modules:
 * ```ts
 * // In your-module/module.ts
 * export default defineNuxtModule({
 *   setup() {
 *     const { resolve } = createResolver(import.meta.url)
 *     addPlugin({
 *       src: resolve('./runtime/plugin'),
 *       order: -10,
 *     })
 *   }
 * })
 *
 * // In your-module/runtime/plugin.ts
 * export default defineNuxtPlugin({
 *   setup() {
 *     setDefaultPiniaColadaOptions({
 *       plugins: [YourPlugin()],
 *       queryOptions: { staleTime: 5000 }
 *     })
 *   }
 * })
 * ```
 */
export default defineNuxtModule({
  meta: {
    name: 'demo-colada-module',
    configKey: 'demoColada',
  },
  setup(_options, _nuxt) {
    const { resolve } = createResolver(import.meta.url)

    console.log('[demo-module] Registering Pinia Colada defaults plugin...')

    // Register runtime plugin with order: -10 to run BEFORE main Pinia Colada plugin
    // This ensures setDefaultPiniaColadaOptions() is called before PiniaColada is installed
    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'all', // Run on both server and client
      order: -10,  // Run before main Pinia Colada plugin (which runs at default order 0)
    })

    console.log('[demo-module] ✅ Plugin registered successfully')
  },
})
