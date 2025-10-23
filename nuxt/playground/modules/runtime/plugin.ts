import { defineNuxtPlugin } from '#app'
import { setDefaultPiniaColadaOptions, PiniaColadaQueryHooksPlugin } from '@pinia/colada'

/**
 * Demo module plugin that provides default Pinia Colada configurations.
 *
 * IMPORTANT: This plugin must run BEFORE the main Pinia Colada plugin.
 * That's why the module registers it with `order: -10` (see demo-module.ts).
 *
 * ARCHITECTURE PATTERN FOR MODULE AUTHORS:
 * ========================================
 * If you're building a Nuxt module that needs to provide Pinia Colada defaults:
 *
 * 1. Create a runtime plugin (like this file)
 * 2. Call setDefaultPiniaColadaOptions() in the plugin's setup
 * 3. Register the plugin in your module with order: -10
 *
 * Example structure:
 * ```
 * my-auth-module/
 *   ├── module.ts              (module definition)
 *   └── runtime/
 *       └── plugin.ts          (calls setDefaultPiniaColadaOptions)
 * ```
 *
 * WHY USE A RUNTIME PLUGIN?
 * =========================
 * - Module setup() runs at BUILD TIME (during nuxt dev/build)
 * - Plugins run at RUNTIME (when the app actually runs)
 * - setDefaultPiniaColadaOptions() needs to be called at runtime
 *   because that's when the global state is shared across all code
 *
 * MERGING BEHAVIOR:
 * =================
 * Multiple modules can all call setDefaultPiniaColadaOptions():
 * - Arrays (plugins) → Concatenated (all included)
 * - Objects (queryOptions) → Merged (later values override)
 * - User's colada.options.ts → Highest priority (overrides all modules)
 */
export default defineNuxtPlugin({
  name: 'demo-colada-module',
  setup() {
    console.log('[demo-module] Setting Pinia Colada defaults...')

    // Provide default options that will be merged with user's config
    setDefaultPiniaColadaOptions({
      // Add plugins for global query hooks
      plugins: [
        PiniaColadaQueryHooksPlugin({
          onSuccess(data, entry) {
            console.log('[demo-module] ✅ Query succeeded:', entry.key.join('/'))
          },
          onError(error, entry) {
            console.error('[demo-module] ❌ Query failed:', entry.key.join('/'), error.message)
          },
        }),
      ],

      // Set default query options
      queryOptions: {
        staleTime: 3000, // 3 seconds
        refetchOnWindowFocus: false,
      },
    })

    console.log('[demo-module] ✅ Defaults set successfully')
  },
})
