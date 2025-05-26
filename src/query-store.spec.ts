import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import type { UseQueryEntry, _UseQueryEntryNodeValueSerialized } from './query-store'
import { useQueryCache } from './query-store'
import { USE_QUERY_DEFAULTS } from './query-options'
import { flushPromises } from '@vue/test-utils'
import { createApp, watch } from 'vue'
import { useQuery } from './use-query'

describe('Query Cache store', () => {
  let app!: ReturnType<typeof createApp>
  beforeEach(() => {
    const pinia = createPinia()
    app = createApp({})
    app.use(pinia)
    setActivePinia(pinia)
  })

  it('should not trigger too often', async () => {
    const queryCache = useQueryCache()
    queryCache.setQueryData(['a', 0], 'a0')
    queryCache.setQueryData(['a', 1], 'a1')

    const spy = vi.fn()
    const stop = watch(() => queryCache.getQueryData(['a', 0]), spy, { flush: 'sync' })
    expect(spy).toHaveBeenCalledTimes(0)
    queryCache.setQueryData(['a', 0], 'a1')
    expect(spy).toHaveBeenCalledTimes(1)
    queryCache.setQueryData(['a', 1], 'a2')
    expect(spy).toHaveBeenCalledTimes(1)
    queryCache.setQueryData(['a', 0], 'a2')
    expect(spy).toHaveBeenCalledTimes(2)

    stop()
  })

  describe('filter queries', () => {
    function createEntries(keys: UseQueryEntry['key'][]) {
      const queryCache = useQueryCache()
      for (const key of keys) {
        queryCache.ensure({
          ...USE_QUERY_DEFAULTS,
          key,
          query: async () => 'ok',
        })
      }
    }

    it('filters based on key', () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(queryCache.getEntries({ key: ['a'] })).toHaveLength(2)
      expect(queryCache.getEntries({ key: ['b'] })).toHaveLength(1)
      expect(queryCache.getEntries({ key: ['c'] })).toHaveLength(0)
      expect(queryCache.getEntries({ key: ['a', 'a'] })).toHaveLength(1)
      expect(queryCache.getEntries({ key: ['a', 'b'] })).toHaveLength(0)
      expect(queryCache.getEntries({ key: ['a', 'a', 'a'] })).toHaveLength(0)
      expect(queryCache.getEntries({ key: ['a', 'a'] })).toMatchObject([{ key: ['a', 'a'] }])
    })

    // https://github.com/posva/pinia-colada/issues/149
    it('filters partial matches on keys', () => {
      const k_1 = [
        '__ORPC__',
        ['planet', 'list', 'infinite'],
        { type: 'query', input: { keyword: 'abc', limit: 9 } },
      ]
      const k_2 = [
        '__ORPC__',
        ['planet', 'list', 'infinite'],
        { type: 'query', input: { keyword: 'other', limit: 9 } },
      ]

      const queryCache = useQueryCache()
      queryCache.setQueryData(k_1, 'abc')
      queryCache.setQueryData(k_2, 'other')

      expect(queryCache.getEntries({ key: ['__ORPC__', ['planet']] })).toHaveLength(2)
      expect(queryCache.getEntries({ key: ['__ORPC__', ['planet'], {}] })).toHaveLength(2)
      expect(queryCache.getEntries({ key: ['__ORPC__', ['planet', 'nope']] })).toHaveLength(0)

      expect(
        queryCache.getEntries({ key: ['__ORPC__', ['planet'], { type: 'query' }] }),
      ).toHaveLength(2)
      expect(
        queryCache.getEntries({ key: ['__ORPC__', ['planet'], { type: 'query', input: {} }] }),
      ).toHaveLength(2)
      expect(
        queryCache.getEntries({
          key: ['__ORPC__', ['planet'], { type: 'query', input: { keyword: 'abc' } }],
        }),
      ).toHaveLength(1)
      expect(
        queryCache.getEntries({
          key: ['__ORPC__', ['planet'], { type: 'query', input: { limit: 9 } }],
        }),
      ).toHaveLength(2)
    })

    it('filters based on exact key', () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(queryCache.getEntries({ exact: true, key: ['a'] })).toHaveLength(1)
      expect(queryCache.getEntries({ exact: true, key: ['a', 'a'] })).toMatchObject([
        { key: ['a', 'a'] },
      ])
    })

    it('returns nothing if exact but no key', () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      // @ts-expect-error: not valid in TS
      expect(queryCache.getEntries({ exact: true })).toHaveLength(0)
    })

    it('filters based on predicate', () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(queryCache.getEntries({ predicate: (entry) => entry.key[0] === 'a' })).toHaveLength(2)
    })

    it('filters based on predicate and key', () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      const predicate = vi.fn(() => true)
      expect(queryCache.getEntries({ key: ['a'], predicate })).toHaveLength(2)
      expect(predicate).toHaveBeenCalledTimes(2)
    })

    it('filters based on status', async () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(queryCache.getEntries({ status: 'error' })).toHaveLength(0)
      expect(queryCache.getEntries({ status: 'success' })).toHaveLength(0)
      expect(queryCache.getEntries({ status: 'pending' })).toHaveLength(3)
      queryCache.getEntries({ status: 'pending' }).forEach((entry) => {
        queryCache.refresh(entry)
      })
      await flushPromises()
      expect(queryCache.getEntries({ status: 'error' })).toHaveLength(0)
      expect(queryCache.getEntries({ status: 'success' })).toHaveLength(3)
      expect(queryCache.getEntries({ status: 'pending' })).toHaveLength(0)
    })

    it('filters based on multiple statuses', async () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(
        queryCache.getEntries({
          status: 'pending',
          predicate(entry) {
            return entry.key[0] === 'a'
          },
        }),
      ).toHaveLength(2)

      expect(
        queryCache.getEntries({
          status: 'success',
          predicate(entry) {
            return entry.key[0] === 'a'
          },
        }),
      ).toHaveLength(0)
    })
  })

  it('creates a query entry when setting the data if it does not exist', () => {
    const queryCache = useQueryCache()
    queryCache.setQueryData(['a'], 'ok')
    const [entry] = queryCache.getEntries({ key: ['a'] })
    expect(entry).toBeDefined()
    if (!entry) throw new Error('ko')
    expect(entry.state.value.data).toBe('ok')
  })

  it('can remove an entry without removing the children', () => {
    const queryCache = useQueryCache()
    queryCache.setQueryData(['a', 'b', 'c'], 'abc')
    queryCache.setQueryData(['a', 'b', 'd'], 'abd')
    queryCache.setQueryData(['a', 'b'], 'ab')
    const [entry] = queryCache.getEntries({ key: ['a', 'b'], exact: true })
    expect(entry).toBeDefined()
    queryCache.remove(entry!)
    expect(queryCache.getEntries({ key: ['a', 'b', 'c'] })).toHaveLength(1)
  })

  it('sets the data of multiple entries with setQueriesData', () => {
    const queryCache = useQueryCache()
    queryCache.setQueryData(['a', 'b', 'c'], 'abc')
    queryCache.setQueryData(['a', 'b', 'd'], 'abd')
    queryCache.setQueryData(['a', 'b'], 'ab')
    queryCache.setQueriesData<string>({ key: ['a', 'b'] }, (data) => `!${data ?? 'empty'}`)
    expect(queryCache.getQueryData(['a', 'b'])).toBe('!ab')
    expect(queryCache.getQueryData(['a', 'b', 'c'])).toBe('!abc')
    expect(queryCache.getQueryData(['a', 'b', 'd'])).toBe('!abd')
  })

  describe('plugins', () => {
    it('triggers the create hook once when creating data', () => {
      const pinia = getActivePinia()!
      const queryCache = useQueryCache(pinia)
      const onActionCreate = vi.fn()
      queryCache.$onAction((action) => {
        if (action.name === 'create') {
          onActionCreate(action)
        }
      })
      expect(onActionCreate).toHaveBeenCalledTimes(0)

      const options = {
        key: ['key'],
        query: async () => 42,
      }

      // the app allows inject and avoid warnings
      const app = createApp({})
      app.use(pinia)
      app.runWithContext(() => {
        useQuery(options)
        useQuery(options)
      })
      expect(onActionCreate).toHaveBeenCalledTimes(1)
    })
  })
})
