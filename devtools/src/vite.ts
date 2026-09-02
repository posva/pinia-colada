import { fileURLToPath } from 'node:url'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import { piniaColadaDevframe, piniaColadaDevframeDock } from './index.ts'

export function PiniaColadaDevtools(): Plugin {
  const clientScriptPath = normalizePath(
    fileURLToPath(new URL('./client-script.js', import.meta.url)),
  )

  return createPluginFromDevframe(piniaColadaDevframe, {
    dock: {
      ...piniaColadaDevframeDock,
      // Nuxt DevTools 4 doesn't advertise bare client-module resolution yet.
      // /@fs keeps this module in the inspected app's Vite graph, so its Pinia
      // and Pinia Colada imports resolve to the app's own instances.
      clientScript: {
        importFrom: `/@fs/${clientScriptPath}`,
      },
    },
    setup(ctx) {
      const dock = ctx.docks.views.get('pinia-colada')
      if (!dock || dock.type !== 'iframe' || !ctx.viteConfig) return

      const base = ctx.viteConfig.base.endsWith('/')
        ? ctx.viteConfig.base
        : `${ctx.viteConfig.base}/`

      ctx.docks.update({
        ...dock,
        clientScript: {
          importFrom: `${base}@fs/${clientScriptPath}`,
        },
      })
    },
  })
}
