import { fileURLToPath } from 'node:url'
import { createUi } from '@devframes/hub-ui'
import { viteDevframeHub } from '@devframes/vite/hub'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import { piniaColadaDevframe } from './index.ts'

/** Mount Pinia Colada Devtools as a standalone DevFrame hub in Vite. */
export function PiniaColadaDevtoolsStandalone(): Plugin {
  const clientScript = normalizePath(fileURLToPath(new URL('./client-script.js', import.meta.url)))

  return viteDevframeHub({
    quiet: true,
    devframes: [piniaColadaDevframe],
    clientScripts: {
      'pinia-colada': { importFrom: `/@fs/${clientScript}` },
    },
    ui: createUi(),
  })
}
