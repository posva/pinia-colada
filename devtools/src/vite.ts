import { fileURLToPath } from 'node:url'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'
import { piniaColadaDevframe, piniaColadaDevframeDock } from './index.ts'

export interface PiniaColadaDevtoolsOptions {
  /**
   * Include the devtools in production builds. Also requires Vite DevTools
   * static output (`DevTools({ build: { withApp: true } })`).
   * @default false
   */
  production?: boolean
}

export function PiniaColadaDevtools(options: PiniaColadaDevtoolsOptions = {}): Plugin {
  const clientScriptPath = normalizePath(
    fileURLToPath(new URL('./client-script.js', import.meta.url)),
  )

  const plugin = createPluginFromDevframe(piniaColadaDevframe, {
    dock: {
      ...piniaColadaDevframeDock,
      // Nuxt DevTools 4 doesn't advertise bare client-module resolution yet.
      // /@fs keeps this module in the inspected app's Vite graph, so its Pinia
      // and Pinia Colada imports resolve to the app's own instances.
      clientScript: {
        ...piniaColadaDevframeDock.clientScript,
        importFrom: `/@fs/${clientScriptPath}`,
      },
    },
    setup(ctx) {
      const dock = ctx.docks.views.get('pinia-colada')
      if (!dock || dock.type !== 'iframe' || !ctx.viteConfig) return

      if (ctx.viteConfig.command === 'build') {
        // The app build bundles and starts the bridge below. A static hub
        // cannot resolve /@fs URLs or bare imports in its client imports map.
        ctx.docks.update({ ...dock, clientScript: undefined })
        return
      }

      const base = ctx.viteConfig.base.endsWith('/')
        ? ctx.viteConfig.base
        : `${ctx.viteConfig.base}/`

      ctx.docks.update({
        ...dock,
        clientScript: {
          ...dock.clientScript,
          importFrom: `${base}@fs/${clientScriptPath}`,
        },
      })
    },
  })

  return {
    ...plugin,
    apply: (_config, env) =>
      !env.isSsrBuild && (env.command === 'serve' || options.production === true),
    transformIndexHtml: {
      order: 'pre',
      handler(_html, ctx) {
        if (ctx.server) return
        return [
          {
            tag: 'script',
            attrs: { type: 'module' },
            children: `import setup from ${JSON.stringify(clientScriptPath)}; setup();`,
            injectTo: 'body',
          },
        ]
      },
    },
  }
}
