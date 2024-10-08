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
      const caches = useQueryCache()
      for (const key of keys) {
        caches.ensure({
          ...USE_QUERY_DEFAULTS,
          key,
          query: async () => 'ok',
        })
      }
    }

    it('filters based on key', () => {
      const caches = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(caches.getEntries({ key: ['a'] })).toHaveLength(2)
      expect(caches.getEntries({ key: ['b'] })).toHaveLength(1)
      expect(caches.getEntries({ key: ['c'] })).toHaveLength(0)
      expect(caches.getEntries({ key: ['a', 'a'] })).toHaveLength(1)
      expect(caches.getEntries({ key: ['a', 'b'] })).toHaveLength(0)
      expect(caches.getEntries({ key: ['a', 'a', 'a'] })).toHaveLength(0)
      expect(caches.getEntries({ key: ['a', 'a'] })).toMatchObject([
        { key: ['a', 'a'] },
      ])
    })

    it('filters based on exact key', () => {
      const caches = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(caches.getEntries({ exact: true, key: ['a'] })).toHaveLength(1)
      expect(caches.getEntries({ exact: true, key: ['a', 'a'] })).toMatchObject(
        [{ key: ['a', 'a'] }],
      )
    })

    it('filters based on predicate', () => {
      const caches = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(
        caches.getEntries({ predicate: (entry) => entry.key[0] === 'a' }),
      ).toHaveLength(2)
    })

    it('filters based on predicate and key', () => {
      const caches = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      const predicate = vi.fn(() => true)
      expect(caches.getEntries({ key: ['a'], predicate })).toHaveLength(2)
      expect(predicate).toHaveBeenCalledTimes(2)
    })

    it('filters based on status', async () => {
      const caches = useQueryCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(caches.getEntries({ status: 'error' })).toHaveLength(0)
      expect(caches.getEntries({ status: 'success' })).toHaveLength(0)
      expect(caches.getEntries({ status: 'pending' })).toHaveLength(3)
      caches.getEntries({ status: 'pending' }).forEach((entry) => {
        caches.refresh(entry)
      })
      await flushPromises()
      expect(caches.getEntries({ status: 'error' })).toHaveLength(0)
      expect(caches.getEntries({ status: 'success' })).toHaveLength(3)
      expect(caches.getEntries({ status: 'pending' })).toHaveLength(0)
    })
  })
})
