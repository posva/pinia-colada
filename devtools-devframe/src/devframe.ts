import { fileURLToPath } from 'node:url'
import { defineDevframe } from 'devframe'
import pkg from '../package.json' with { type: 'json' }

export function createPiniaColadaDevframe() {
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
    clientAssets: fileURLToPath(new URL('../client/dist', import.meta.url)),
    // nothing to do on the server: the panel talks to the inspected app
    // directly over the in-page channel (see `src/channel.ts`), so this
    // devframe exposes no RPC functions and no shared state
    setup() {},
  })
}

export default createPiniaColadaDevframe
