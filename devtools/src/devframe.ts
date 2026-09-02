import { defineDevframe } from 'devframe'
import type { DevframeDefinition } from 'devframe'
import pkg from '../package.json' with { type: 'json' }

interface PiniaColadaDevframeOptions {
  importMetaUrl: string
  icon: NonNullable<DevframeDefinition['icon']>
  clientAssets?: DevframeDefinition['clientAssets']
}

// The definition metadata is shared, but each host supplies assets from a
// different location: packaged adapters use dist-client and the bundled icon,
// while the local fixture serves the panel and icon from Vite's source graph.
export function createPiniaColadaDevframeDefinition({
  importMetaUrl,
  icon,
  clientAssets,
}: PiniaColadaDevframeOptions): DevframeDefinition {
  return defineDevframe({
    id: 'pinia-colada',
    name: 'Pinia Colada',
    version: pkg.version,
    packageName: pkg.name,
    importMetaUrl,
    homepage: pkg.homepage,
    description: pkg.description,
    icon,
    clientAssets,
    setup() {},
  })
}
