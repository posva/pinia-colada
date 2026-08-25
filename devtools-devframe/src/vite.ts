import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { createPluginFromDevframe } from '@vitejs/devtools-kit/node'
import { createPiniaColadaDevframe } from './devframe.ts'

const devtoolsSrc = (path: string) =>
  fileURLToPath(new URL(`../../devtools/src/${path}`, import.meta.url))

export function PiniaColadaDevtools() {
  return [
    createPluginFromDevframe(createPiniaColadaDevframe(), {
      dock: {
        // runs in the inspected app page, through the app's own module graph
        clientScript: { importFrom: '@pinia/colada-devtools-devframe/client-script' },
      },
    }),
    {
      name: 'pinia-colada-devtools:aliases',
      // the client script reuses the devtools sources — resolve them from the
      // workspace instead of the published dist
      config: () => ({
        resolve: {
          alias: [
            {
              find: /^@pinia\/colada-devtools\/shared$/,
              replacement: devtoolsSrc('shared/index.ts'),
            },
            {
              find: /^@pinia\/colada-devtools\/app-bridge$/,
              replacement: devtoolsSrc('app-bridge.ts'),
            },
          ],
        },
      }),
    } satisfies Plugin,
  ]
}
