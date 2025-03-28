import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { describe, beforeEach, it, expect, vi } from 'vitest'
import { createApp } from 'vue'
import { MUTATION_STORE_ID, useMutationCache } from './mutation-store'
import type { UseMutationEntry } from './mutation-store'
import { flushPromises } from '@vue/test-utils'
import type { UseMutationOptions } from './mutation-options'
import { mockConsoleError, mockWarn } from '../test/mock-warn'
import { useMutation } from './use-mutation'
import { logTree } from './tree-map'

describe('Mutation Cache store', () => {
  let app!: ReturnType<typeof createApp>
  beforeEach(() => {
    const pinia = createPinia()
    app = createApp({})
    app.use(pinia)
    setActivePinia(pinia)
  })

  function createEntries(keys: UseMutationEntry['key'][]) {
    const mutationCache = useMutationCache()
    for (const key of keys) {
      const options = {
        key,
        mutation: async () => 'ok',
      } satisfies UseMutationOptions
      const entry = mutationCache.ensure(options)
      mutationCache.ensure(options, entry, undefined)
    }
  }

  describe('filter mutations', () => {
    it('filters based on key', () => {
      const mutationCache = useMutationCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(mutationCache.getEntries({ key: ['a'] })).toHaveLength(2)
      expect(mutationCache.getEntries({ key: ['b'] })).toHaveLength(1)
      expect(mutationCache.getEntries({ key: ['c'] })).toHaveLength(0)
      expect(mutationCache.getEntries({ key: ['a', 'a'] })).toHaveLength(1)
      expect(mutationCache.getEntries({ key: ['a', 'b'] })).toHaveLength(0)
      expect(mutationCache.getEntries({ key: ['a', 'a', 'a'] })).toHaveLength(0)
      expect(mutationCache.getEntries({ key: ['a', 'a'] })).toMatchObject([{ key: ['a', 'a'] }])
    })

    it('can filter unkeyed entries', () => {
      const mutationCache = useMutationCache()
      createEntries([[], undefined])
      expect(mutationCache.getEntries()).toHaveLength(2)
      expect(mutationCache.getEntries({ key: ['$0'] })).toHaveLength(1)
      expect(mutationCache.getEntries({ key: ['$1'] })).toHaveLength(1)
    })

    it('filters based on exact key', () => {
      const mutationCache = useMutationCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      // we need to pass the id to make them work
      expect(mutationCache.getEntries({ exact: true, key: ['a', '$0'] })).toHaveLength(1)
      expect(mutationCache.getEntries({ exact: true, key: ['a', 'a', '$2'] })).toMatchObject([
        { key: ['a', 'a'] },
      ])
    })

    it('filters based on predicate', () => {
      const mutationCache = useMutationCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(
        mutationCache.getEntries({ predicate: (entry) => entry.key?.[0] === 'a' }),
      ).toHaveLength(2)
    })

    it('filters based on predicate and key', () => {
      const mutationCache = useMutationCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      const predicate = vi.fn(() => true)
      expect(mutationCache.getEntries({ key: ['a'], predicate })).toHaveLength(2)
      expect(predicate).toHaveBeenCalledTimes(2)
    })

    it('filters based on status', async () => {
      const mutationCache = useMutationCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(mutationCache.getEntries({ status: 'error' })).toHaveLength(0)
      expect(mutationCache.getEntries({ status: 'success' })).toHaveLength(0)
      expect(mutationCache.getEntries({ status: 'pending' })).toHaveLength(3)
      mutationCache.getEntries({ status: 'pending' }).forEach((entry) => {
        mutationCache.mutate(entry, undefined)
      })
      await flushPromises()
      expect(mutationCache.getEntries({ status: 'error' })).toHaveLength(0)
      expect(mutationCache.getEntries({ status: 'success' })).toHaveLength(3)
      expect(mutationCache.getEntries({ status: 'pending' })).toHaveLength(0)
    })

    it('filters based on multiple statuses', async () => {
      const mutationCache = useMutationCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      expect(
        mutationCache.getEntries({
          status: 'pending',
          predicate(entry) {
            return entry.key?.[0] === 'a'
          },
        }),
      ).toHaveLength(2)

      expect(
        mutationCache.getEntries({
          status: 'success',
          predicate(entry) {
            return entry.key?.[0] === 'a'
          },
        }),
      ).toHaveLength(0)
    })
  })

  describe('warns', () => {
    mockConsoleError()
    mockWarn()

    it('errors if the user tries to directly set tha cache', () => {
      const mutationCache = useMutationCache()
      mutationCache.caches = {} as any
      expect('mutation cache instance cannot be set directly').toHaveBeenErroredTimes(1)
    })
  })

  it('can remove an entry without removing the children', async () => {
    const mutationCache = useMutationCache()
    const e1 = mutationCache.ensure({
      key: ['a', 'b', 'c'],
      mutation: async () => 'abc',
    })
    await mutationCache.mutate(e1, undefined)

    const e2 = mutationCache.ensure({
      key: ['a', 'b', 'd'],
      mutation: async () => 'abd',
    })
    await mutationCache.mutate(e2, undefined)

    const e3 = mutationCache.ensure({
      key: ['a', 'b'],
      mutation: async () => 'ab',
    })
    await mutationCache.mutate(e3, undefined)

    const [entry] = mutationCache.getEntries({ key: ['a', 'b'] })
    expect(entry).toBeDefined()
    mutationCache.remove(entry!)
    expect(mutationCache.getEntries({ key: ['a', 'b', 'c'] })).toHaveLength(1)
  })

  describe('plugins', () => {
    it('triggers the create hook for each mutation', () => {
      const pinia = getActivePinia()!
      const mutationCache = useMutationCache(pinia)
      const onActionCreate = vi.fn()
      mutationCache.$onAction((action) => {
        if (action.name === 'create') {
          onActionCreate(action)
        }
      })
      expect(onActionCreate).toHaveBeenCalledTimes(0)

      const options = {
        mutation: async () => 42,
      } satisfies UseMutationOptions

      // the app allows inject and avoid warnings
      const app = createApp({})
      app.use(pinia)
      app.runWithContext(() => {
        useMutation(options)
        useMutation(options)
      })
      expect(onActionCreate).toHaveBeenCalledTimes(2)
    })
  })
})
