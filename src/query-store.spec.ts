import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { UseQueryEntry } from './query-store'
import { useQueryCache } from './query-store'
import { USE_QUERY_DEFAULTS } from './query-options'
import { flushPromises } from '@vue/test-utils'

describe('Query Cache store', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
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
      expect(queryCache.getEntries({ key: ['a', 'a'] })).toMatchObject([
        { key: ['a', 'a'] },
      ])
    })

    it('filters based on exact key', () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(queryCache.getEntries({ exact: true, key: ['a'] })).toHaveLength(1)
      expect(queryCache.getEntries({ exact: true, key: ['a', 'a'] })).toMatchObject(
        [{ key: ['a', 'a'] }],
      )
    })

    it('filters based on predicate', () => {
      const queryCache = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(
        queryCache.getEntries({ predicate: (entry) => entry.key[0] === 'a' }),
      ).toHaveLength(2)
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
  })

  it('creates a query entry when setting the data if it does not exist', () => {
    const queryCache = useQueryCache()
    queryCache.setQueryData(['a'], 'ok')
    const [entry] = queryCache.getEntries({ key: ['a'] })
    expect(entry).toBeDefined()
    expect(entry.state.value.data).toBe('ok')
  })
})
