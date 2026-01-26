import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { serializeQueryCache, useQueryCache, hydrateQueryCache } from './query-store'
import { createPinia } from 'pinia'
import { createApp } from 'vue'

describe('query cache serialization', () => {
  const now = new Date(2000, 0, 1).getTime() // 1 Jan 2000 in local time as number of milliseconds
  beforeAll(() => {
    vi.useFakeTimers()
  })

  beforeEach(() => {
    vi.setSystemTime(now)
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  it('basic serialization', () => {
    const pinia = createPinia()
    const app = createApp({})
    app.use(pinia)
    const queryCache = useQueryCache(pinia)
    queryCache.setQueryData(['a'], 'a')
    queryCache.setQueryData(['a', 'b'], 'ab')
    queryCache.setQueryData(['a', 'b', 'c'], 'abc')
    queryCache.setQueryData(['d', 'e', 'f'], 'def')
    expect(serializeQueryCache(queryCache)).toEqual({
      '["a","b","c"]': ['abc', null, expect.any(Number), {}],
      '["a","b"]': ['ab', null, expect.any(Number), {}],
      '["a"]': ['a', null, expect.any(Number), {}],
      '["d","e","f"]': ['def', null, expect.any(Number), {}],
    })
  })

  it('works with empty', () => {
    const pinia = createPinia()
    const app = createApp({})
    app.use(pinia)
    const queryCache = useQueryCache(pinia)
    expect(serializeQueryCache(queryCache)).toEqual({})
  })

  it('creates relative timestamps', () => {
    const pinia = createPinia()
    const app = createApp({})
    app.use(pinia)
    const queryCache = useQueryCache(pinia)
    queryCache.setQueryData(['a'], 'a')
    queryCache.setQueryData(['a', 'b'], 'ab')
    vi.setSystemTime(now + 10)
    queryCache.setQueryData(['a', 'b', 'c'], 'abc')
    vi.setSystemTime(now + 20)
    queryCache.setQueryData(['d', 'e', 'f'], 'def')

    expect(serializeQueryCache(queryCache)).toEqual({
      '["a"]': ['a', null, 20, {}],
      '["a","b"]': ['ab', null, 20, {}],
      '["a","b","c"]': ['abc', null, 10, {}],
      '["d","e","f"]': ['def', null, 0, {}],
    })

    vi.setSystemTime(now + 30)
    queryCache.setQueryData(['a'], 'a')

    expect(serializeQueryCache(queryCache)).toEqual({
      '["a"]': ['a', null, 0, {}],
      '["a","b"]': ['ab', null, 30, {}],
      '["a","b","c"]': ['abc', null, 20, {}],
      '["d","e","f"]': ['def', null, 10, {}],
    })
  })

  it('creates relative timestamps with different keys', () => {
    const serverPinia = createPinia()
    const serverApp = createApp({})
    serverApp.use(serverPinia)
    const serverQC = useQueryCache(serverPinia)
    serverQC.setQueryData(['a'], 'a')
    serverQC.setQueryData(['a', 'b'], 'ab')
    vi.setSystemTime(now + 10)
    serverQC.setQueryData(['a', 'b', 'c'], 'abc')
    vi.setSystemTime(now + 20)
    serverQC.setQueryData(['d', 'e', 'f'], 'def')

    const serialized = serializeQueryCache(serverQC)

    // we are on client now
    const clientNow = new Date(2001, 0, 1).getTime()
    vi.setSystemTime(clientNow)

    const clientPinia = createPinia()
    const clientApp = createApp({})
    clientApp.use(clientPinia)
    const clientQC = useQueryCache(clientPinia)

    hydrateQueryCache(clientQC, serialized)

    expect(serializeQueryCache(clientQC)).toEqual(serialized)
  })

  describe('meta serialization', () => {
    it('serializes meta with query data', () => {
      const pinia = createPinia()
      const app = createApp({})
      app.use(pinia)
      const queryCache = useQueryCache(pinia)

      // Create entry with meta using create directly
      queryCache.caches.set(
        '["key"]',
        queryCache.create(['key'], null, 'data', null, 0, { priority: 'high' }),
      )

      const serialized = serializeQueryCache(queryCache)
      expect(serialized['["key"]']).toEqual([
        'data',
        null,
        expect.any(Number),
        { priority: 'high' },
      ])
    })

    it('hydrates meta from serialized cache', () => {
      const serverPinia = createPinia()
      const serverApp = createApp({})
      serverApp.use(serverPinia)
      const serverQC = useQueryCache(serverPinia)

      serverQC.caches.set(
        '["key"]',
        serverQC.create(['key'], null, 'data', null, 0, { priority: 'high' }),
      )

      const serialized = serializeQueryCache(serverQC)

      // Client side
      const clientPinia = createPinia()
      const clientApp = createApp({})
      clientApp.use(clientPinia)
      const clientQC = useQueryCache(clientPinia)

      hydrateQueryCache(clientQC, serialized)

      const entry = clientQC.getEntries({ key: ['key'] })[0]
      expect(entry?.meta).toEqual({ priority: 'high' })
    })

    it('handles missing meta in serialized data (backward compatibility)', () => {
      const clientPinia = createPinia()
      const clientApp = createApp({})
      clientApp.use(clientPinia)
      const clientQC = useQueryCache(clientPinia)

      // Simulate old serialized format without meta
      hydrateQueryCache(clientQC, {
        '["key"]': ['data', null, 0],
      })

      const entry = clientQC.getEntries({ key: ['key'] })[0]
      expect(entry?.meta).toEqual({})
    })

    it('serializes empty meta correctly', () => {
      const pinia = createPinia()
      const app = createApp({})
      app.use(pinia)
      const queryCache = useQueryCache(pinia)

      // Create entry without meta (defaults to {})
      queryCache.caches.set('["key"]', queryCache.create(['key'], null, 'data', null, 0))

      const serialized = serializeQueryCache(queryCache)
      expect(serialized['["key"]']).toEqual(['data', null, expect.any(Number), {}])
    })
  })
})
