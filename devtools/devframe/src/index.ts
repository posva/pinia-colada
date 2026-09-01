import { fileURLToPath } from 'node:url'
import { defineDevframe } from 'devframe'
import type { DevframeDefinition } from 'devframe'
import pkg from '../../package.json' with { type: 'json' }

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
    // served from the SPA's own static assets at the default mount base
    icon: '/__pinia-colada/logo.svg',
    clientAssets: fileURLToPath(new URL('./client', import.meta.url)),
    setup() {},
  })
}

export default createPiniaColadaDevframe
