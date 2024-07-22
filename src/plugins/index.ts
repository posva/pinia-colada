import type { Pinia } from 'pinia'
import type { useQueryCache } from '../query-store'

/**
 * Context passed to a Pinia Colada plugin.
 */
export interface PiniaColadaPluginContext {
  /**
   * The query cache used by the application.
   */
  cache: ReturnType<typeof useQueryCache>

  /**
   * The Pinia instance used by the application.
   */
  pinia: Pinia
}

/**
 * A Pinia Colada plugin.
 */
export interface PiniaColadaPlugin {
  (context: PiniaColadaPluginContext): void
}
