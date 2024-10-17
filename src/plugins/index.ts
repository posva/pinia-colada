import type { Pinia } from 'pinia'
import type { QueryCache } from '../query-store'

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
}

/**
 * A Pinia Colada plugin.
 */
export interface PiniaColadaPlugin {
  (context: PiniaColadaPluginContext): void
}
