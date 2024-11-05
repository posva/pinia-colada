import type { Pinia } from 'pinia'
import type { QueryCache } from '../query-store'
import type { EffectScope } from 'vue'

/**
 * Context passed to a Pinia Colada plugin.
 */
export interface PiniaColadaPluginContext {
  /**
   * The query cache used by the application.
   */
  queryCache: QueryCache

  /**
   * The Pinia instance used by the application.
   */
  pinia: Pinia

  /**
   * An effect scope to collect effects. It should be used if you use any reactivity API like `ref()`, `watch()`, `computed()`, etc.
   * @see https://vuejs.org/api/reactivity-advanced.html#effectscope
   */
  scope: EffectScope
}

/**
 * A Pinia Colada plugin.
 */
export interface PiniaColadaPlugin {
  (context: PiniaColadaPluginContext): void
}
