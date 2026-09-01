// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createHostContext } from 'devframe/node'
import { createPiniaColadaDevframe } from '../devframe/src/index'

describe('Pinia Colada devframe MCP surface', () => {
  it('exposes and updates read-only cache tools and resources', async () => {
    const definition = createPiniaColadaDevframe()
    const ctx = await createHostContext({
      cwd: process.cwd(),
      mode: 'dev',
      importMetaUrl: definition.importMetaUrl,
      host: {
        mountStatic() {},
        resolveOrigin: () => 'http://localhost',
        getStorageDir: () => process.cwd(),
      },
    })

    await definition.setup(ctx)

    expect(ctx.agent.list().tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'pinia-colada:list-queries', safety: 'read' }),
        expect.objectContaining({ id: 'pinia-colada:list-mutations', safety: 'read' }),
      ]),
    )
    expect(ctx.agent.list().resources).toContainEqual(
      expect.objectContaining({ id: 'pinia-colada:cache', uri: 'pinia-colada://cache' }),
    )

    const invokeLocal = ctx.rpc.invokeLocal.bind(ctx.rpc) as (
      method: string,
      id: string,
      args: unknown[],
    ) => Promise<unknown>
    await invokeLocal('pinia-colada:cache-event', 'queries:all', [
      [
        {
          keyHash: 'todos',
          key: ['todos'],
          state: { status: 'success', data: [{ id: 1 }], error: null },
          asyncStatus: 'idle',
          active: true,
          stale: false,
        },
        {
          keyHash: 'users',
          key: ['users'],
          state: { status: 'pending', data: undefined, error: null },
          asyncStatus: 'loading',
          active: false,
          stale: true,
        },
      ],
    ])

    await expect(
      ctx.agent.invoke('pinia-colada:list-queries', {
        status: 'success',
        active: true,
        keyIncludes: 'todo',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        synchronized: true,
        total: 1,
        queries: [expect.objectContaining({ keyHash: 'todos' })],
      }),
    )

    await invokeLocal('pinia-colada:cache-event', 'queries:update', [
      {
        keyHash: 'todos',
        key: ['todos'],
        state: { status: 'error', data: undefined, error: 'failed' },
        asyncStatus: 'idle',
        active: false,
        stale: true,
      },
    ])
    await invokeLocal('pinia-colada:cache-event', 'queries:update', [
      {
        state: { status: 'success', data: 'invalid', error: null },
      },
    ])

    await expect(ctx.agent.invoke('pinia-colada:list-queries', {})).resolves.toEqual(
      expect.objectContaining({
        total: 2,
        queries: expect.arrayContaining([
          expect.objectContaining({
            keyHash: 'todos',
            state: { status: 'error', data: undefined, error: 'failed' },
          }),
        ]),
      }),
    )

    await invokeLocal('pinia-colada:cache-event', 'queries:delete', [{ keyHash: 'todos' }])

    await expect(ctx.agent.read('pinia-colada:cache')).resolves.toEqual({
      json: expect.objectContaining({
        synchronized: true,
        queries: [expect.objectContaining({ keyHash: 'users' })],
      }),
    })
  })
})
