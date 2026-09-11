import { fileURLToPath } from 'node:url'
import { viteDevframeHub } from '@devframes/vite/hub'
import { normalizePath } from 'vite'
import { piniaColadaDevframe, piniaColadaDevframeDock } from './index.ts'

/** Mount Pinia Colada Devtools as a standalone DevFrame hub in Vite. */
export function PiniaColadaDevtoolsStandalone(): ReturnType<typeof viteDevframeHub> {
  // dist/client-script.js
  const clientScript = normalizePath(fileURLToPath(new URL('./client-script.js', import.meta.url)))

  return viteDevframeHub({
    quiet: true,
    mcp: true,
    devframes: [piniaColadaDevframe],
    clientScripts: {
      'pinia-colada': {
        ...piniaColadaDevframeDock.clientScript,
        importFrom: `/@fs/${clientScript}`,
      },
    },
  })
}
