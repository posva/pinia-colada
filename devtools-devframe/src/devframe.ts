import { fileURLToPath } from 'node:url'
import { defineDevframe } from 'devframe'
import pkg from '../package.json' with { type: 'json' }
import { serverFunctions } from './rpc.ts'
import { QUERIES_STATE_KEY, MUTATIONS_STATE_KEY } from './state.ts'
import type { EntriesState } from './state.ts'

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
    async setup(ctx) {
      const my = ctx.scope('pinia-colada')
      serverFunctions.forEach((fn) => my.rpc.register(fn))
      // hosted here so both the app page and the panel find them on connect
      await my.rpc.sharedState<EntriesState>(QUERIES_STATE_KEY, {
        initialValue: { entries: {} },
      })
      await my.rpc.sharedState<EntriesState>(MUTATIONS_STATE_KEY, {
        initialValue: { entries: {} },
      })
    },
  })
}

export default createPiniaColadaDevframe
