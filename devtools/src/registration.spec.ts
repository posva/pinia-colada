// @vitest-environment node

import { once } from 'node:events'
import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEVTOOLS_MOUNT_PATH } from '@vitejs/devtools-kit/constants'
import { listLiveDevframeInstances, registerDevframeInstance } from 'devframe/internal'
import type { Plugin, ViteDevServer } from 'vite'
import { PiniaColadaDevtools } from './vite.ts'

let httpServer: Server | undefined
let instancesDir: string | undefined

afterEach(async () => {
  if (httpServer?.listening) {
    const closed = once(httpServer, 'close')
    httpServer.close()
    await closed
  }
  if (instancesDir) await rm(instancesDir, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

async function configureServer(plugin: Plugin, server: ViteDevServer) {
  const hook = plugin.configureServer
  if (!hook) throw new Error('The plugin has no configureServer hook.')
  const handler = typeof hook === 'function' ? hook : hook.handler
  await handler.call({} as never, server)
}

describe('devframe instance registration', () => {
  it('replaces a stale instance on the same Vite DevTools endpoint', async () => {
    instancesDir = await mkdtemp(join(tmpdir(), 'pinia-colada-devframe-'))
    vi.stubEnv('DEVFRAME_INSTANCES_DIR', instancesDir)

    httpServer = createServer((request, response) => {
      if (request.url === `${DEVTOOLS_MOUNT_PATH}__connection.json`) {
        response.setHeader('content-type', 'application/json')
        response.end(
          JSON.stringify({
            backend: 'websocket',
            websocket: { path: `${DEVTOOLS_MOUNT_PATH}__ws` },
            mcp: { path: '__mcp' },
          }),
        )
        return
      }
      response.statusCode = 404
      response.end()
    })

    await configureServer(PiniaColadaDevtools(), {
      config: { root: '/pinia-colada', server: {} },
      httpServer,
    } as ViteDevServer)

    const listening = once(httpServer, 'listening')
    httpServer.listen(0, '127.0.0.1')
    await listening

    const address = httpServer.address()
    if (!address || typeof address === 'string') throw new Error('Expected a TCP server.')

    registerDevframeInstance({
      pid: process.pid + 1,
      port: address.port,
      origin: `http://localhost:${address.port}`,
      basePath: DEVTOOLS_MOUNT_PATH,
      id: 'medula',
      name: 'medula',
      rootDir: '/medula',
      mcp: { path: `${DEVTOOLS_MOUNT_PATH}__mcp` },
      startedAt: 1,
    })

    const { live, pruned } = await listLiveDevframeInstances({ instancesDir })
    expect(pruned).toMatchObject([{ id: 'medula', rootDir: '/medula' }])
    expect(live).toMatchObject([
      {
        id: 'pinia-colada',
        name: 'Pinia Colada',
        rootDir: '/pinia-colada',
        mcp: { path: `${DEVTOOLS_MOUNT_PATH}__mcp` },
      },
    ])

    const closed = once(httpServer, 'close')
    httpServer.close()
    await closed
    expect((await readdir(instancesDir)).filter((file) => file.endsWith('.json'))).toEqual([])
  })
})
