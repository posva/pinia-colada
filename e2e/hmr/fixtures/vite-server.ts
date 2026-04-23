import { test as base, expect } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

type ViteFixtures = {
  devServer: ViteDevServer
  baseURL: string
  projectRoot: string
  applyEditFile: (sourceFilePath: string, newContentFilePath: string) => void
  deleteFile: (filePath: string) => void
  playgroundName: string
}

export const test = base.extend<ViteFixtures>({
  // @ts-expect-error: worker-scoped option
  playgroundName: ['', { scope: 'worker', option: true }],

  // @ts-expect-error: computed per worker
  projectRoot: [
    async ({ playgroundName }, use, testInfo) => {
      const fixtureDir = fileURLToPath(
        new URL(
          `../playground-tmp-${playgroundName}-worker-${testInfo.workerIndex}`,
          import.meta.url,
        ),
      )
      await use(path.resolve(fixtureDir))
    },
    { scope: 'worker' },
  ],

  // @ts-expect-error: use() receives the server
  devServer: [
    async ({ projectRoot }, use) => {
      const fixtureDir = projectRoot
      const sourceDir = fileURLToPath(new URL('../playground', import.meta.url))

      fs.rmSync(fixtureDir, { force: true, recursive: true })
      fs.cpSync(sourceDir, fixtureDir, {
        recursive: true,
        filter: (src) => {
          return (
            !src.includes('node_modules') &&
            !src.includes('.cache') &&
            !src.endsWith('.sock') &&
            !src.includes('.output') &&
            !src.includes('.vite')
          )
        },
      })

      const server = await createServer({
        configFile: path.join(fixtureDir, 'vite.config.ts'),
        server: { host: '127.0.0.1', port: 0, strictPort: false },
        logLevel: 'error',
      })

      await server.listen()

      if (!server.httpServer) throw new Error('No httpServer from Vite')

      await use(server)

      await server.close()
    },
    { scope: 'worker' },
  ],

  baseURL: async ({ devServer }, use) => {
    const http = devServer.httpServer!
    const addr = http.address() as AddressInfo
    await use(`http://127.0.0.1:${addr.port}`)
  },

  applyEditFile: async ({ projectRoot }, use) => {
    await use((sourceFilePath: string, newContentFilePath: string) => {
      fs.writeFileSync(
        path.join(projectRoot, sourceFilePath),
        fs.readFileSync(path.join(projectRoot, newContentFilePath), 'utf8'),
        'utf8',
      )
    })
  },

  deleteFile: async ({ projectRoot }, use) => {
    await use((filePath: string) => {
      fs.unlinkSync(path.join(projectRoot, filePath))
    })
  },
})

export { expect }
