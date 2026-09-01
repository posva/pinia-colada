import { fileURLToPath } from 'node:url'
import { createUi } from '@devframes/hub-ui'
import { viteDevframeHub } from '@devframes/vite/hub'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import { createPiniaColadaDevframe } from './index.ts'

export function PiniaColadaDevtoolsHub(): Plugin {
  const clientScript = normalizePath(fileURLToPath(new URL('./client-script.js', import.meta.url)))
  const devframe = {
    ...createPiniaColadaDevframe(),
    // The standalone hub mounts devframe assets below its own base
    // (`/__devframes/pinia-colada/` by default). Resolve from the hub's
    // connection metadata instead of the Vite DevTools-specific hosted path.
    icon: './pinia-colada/logo.svg',
  }

  return viteDevframeHub({
    quiet: true,
    devframes: [devframe],
    clientScripts: {
      'pinia-colada': { importFrom: `/@fs/${clientScript}` },
    },
    ui: createUi(),
  })
}
