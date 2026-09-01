import { fileURLToPath } from 'node:url'
import { defineDevframe } from 'devframe'
import type { DevframeDefinition } from 'devframe'
import pkg from '../package.json' with { type: 'json' }
import piniaColadaIcon from './client/logo.svg'

/** Dock options required when installing the raw devframe in a hub. */
export const piniaColadaDevframeDock = {
  clientScript: {
    importFrom: '@pinia/colada-devtools/devframe/client-script',
  },
} as const

export function createPiniaColadaDevframe(): DevframeDefinition {
  return defineDevframe({
    id: 'pinia-colada',
    name: 'Pinia Colada',
    version: pkg.version,
    packageName: pkg.name,
    importMetaUrl: import.meta.url,
    homepage: pkg.homepage,
    description: pkg.description,
    // Keep the dock icon independent from the adapter's asset mount path.
    icon: piniaColadaIcon,
    clientAssets: fileURLToPath(new URL('../dist-client', import.meta.url)),
    setup() {},
  })
}

export default createPiniaColadaDevframe
