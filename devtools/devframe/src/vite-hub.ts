import { fileURLToPath } from 'node:url'
import { createUi } from '@devframes/hub-ui'
import { viteDevframeHub } from '@devframes/vite/hub'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import { createPiniaColadaDevframe } from './index.ts'

export function PiniaColadaDevtoolsHub(): Plugin {
  const clientScript = normalizePath(fileURLToPath(new URL('./client-script.js', import.meta.url)))

  return viteDevframeHub({
    quiet: true,
    devframes: [createPiniaColadaDevframe() as never],
    clientScripts: {
      'pinia-colada': { importFrom: `/@fs/${clientScript}` },
    },
    ui: createUi() as never,
  })
}
