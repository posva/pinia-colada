import { fileURLToPath } from 'node:url'
import type { DevframeDefinition } from 'devframe'
import { createPiniaColadaDevframeDefinition } from './devframe.ts'
import piniaColadaIcon from './panel/logo.svg'

/** Dock options required when installing the raw devframe in a hub. */
export const piniaColadaDevframeDock = {
  clientScript: {
    importFrom: '@pinia/colada-devtools/client-script',
  },
} as const

export function createPiniaColadaDevframe(): DevframeDefinition {
  return createPiniaColadaDevframeDefinition({
    importMetaUrl: import.meta.url,
    // Keep the dock icon independent from the adapter's asset mount path.
    icon: piniaColadaIcon,
    clientAssets: fileURLToPath(new URL('../dist-client', import.meta.url)),
  })
}

// FIXME: remove the default export, only use named
export default createPiniaColadaDevframe
