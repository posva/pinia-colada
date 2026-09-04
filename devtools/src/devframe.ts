import type { DevframeDefinition } from 'devframe'
import pkg from '../package.json' with { type: 'json' }

// Each host adds its own asset locations: packaged adapters use dist-client
// and the bundled icon, while the local fixture uses Vite's source graph.
export const piniaColadaDevframeDefaults = {
  id: 'pinia-colada',
  name: 'Pinia Colada',
  version: pkg.version,
  packageName: pkg.name,
  homepage: pkg.homepage,
  description: pkg.description,
  setup() {},
} satisfies Omit<DevframeDefinition, 'importMetaUrl'>
