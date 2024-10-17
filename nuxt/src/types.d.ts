import type { PiniaColadaOptions } from '@pinia/colada'

declare module 'nuxt/schema' {
  interface AppConfigInput {
    /**
     * Pinia Colada plugin options.
     */
    colada?: PiniaColadaOptions
  }
}

export {}
