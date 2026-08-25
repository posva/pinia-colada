import { fileURLToPath } from 'node:url'
import { defineDevframe } from 'devframe'
import pkg from '../package.json' with { type: 'json' }
import { serverFunctions } from './rpc.ts'

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
    setup(ctx) {
      const my = ctx.scope('pinia-colada')
      serverFunctions.forEach((fn) => my.rpc.register(fn))
    },
  })
}

export default createPiniaColadaDevframe
