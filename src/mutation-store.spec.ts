import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { describe, beforeEach, it, expect, vi } from 'vitest'
import { createApp } from 'vue'
import { useMutationCache } from './mutation-store'
import type { UseMutationEntry } from './mutation-store'
import { flushPromises } from '@vue/test-utils'
import type { UseMutationOptions } from './mutation-options'
import { mockConsoleError, mockWarn } from '../test-utils/mock-warn'
import { useMutation } from './use-mutation'

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
      const entry = mutationCache.create(options)
      mutationCache.ensure(entry, undefined)
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
      expect(mutationCache.getEntries({ key: ['a', 'a'] })).toMatchObject([
        { key: ['a', 'a', '$2'] },
      ])
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
        { key: ['a', 'a', '$2'] },
      ])
    })

    it('filters all entries if exact with no key', () => {
      const mutationCache = useMutationCache()
      createEntries([['a'], ['b'], ['a', 'a']])
      // @ts-expect-error: exact must have a key
      expect(mutationCache.getEntries({ exact: true })).toHaveLength(0)
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
        mutationCache.mutate(entry)
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

    it('warns when a mutation entry is created with a reserved key part at the start', () => {
      const mutationCache = useMutationCache()

      const options = {
        key: ['$1'], // Using a reserved key format at the start
        mutation: async () => 'test',
      } satisfies UseMutationOptions

      const entry = mutationCache.create(options)
      mutationCache.ensure(entry, undefined)

      expect('A mutation entry was created with a reserved key part "$1"').toHaveBeenWarnedTimes(1)
    })

    it('warns when a mutation entry is created with a reserved key part in the middle', () => {
      const mutationCache = useMutationCache()

      const options = {
        key: ['users', '$42', 'profile'], // Using a reserved key format in the middle
        mutation: async () => 'test',
      } satisfies UseMutationOptions

      const entry = mutationCache.create(options)
      mutationCache.ensure(entry, undefined)

      expect('A mutation entry was created with a reserved key part "$42"').toHaveBeenWarnedTimes(1)
    })

    it('warns when a mutation entry is created with a reserved key part at the end', () => {
      const mutationCache = useMutationCache()

      const options = {
        key: ['users', 'profile', '$123'], // Using a reserved key format at the end
        mutation: async () => 'test',
      } satisfies UseMutationOptions

      const entry = mutationCache.create(options)
      mutationCache.ensure(entry, undefined)

      expect('A mutation entry was created with a reserved key part "$123"').toHaveBeenWarnedTimes(
        1,
      )
    })

    it('errors when mutating an entry that was not ensured', () => {
      const mutationCache = useMutationCache()

      const options = {
        mutation: async () => 'test',
      } satisfies UseMutationOptions

      const entry = mutationCache.create(options)

      mutationCache.mutate(entry).catch(() => {})

      expect(
        'A mutation entry without a key was mutated before being ensured',
      ).toHaveBeenErroredTimes(1)
    })
  })

  it('can remove an entry without removing the children', async () => {
    const mutationCache = useMutationCache()
    const e1 = mutationCache.ensure(
      mutationCache.create({
        key: ['a', 'b', 'c'],
        mutation: async () => 'abc',
      }),
      undefined,
    )
    await mutationCache.mutate(e1)

    const e2 = mutationCache.ensure(
      mutationCache.create({
        key: ['a', 'b', 'd'],
        mutation: async () => 'abd',
      }),
      undefined,
    )
    await mutationCache.mutate(e2)

    const e3 = mutationCache.ensure(
      mutationCache.create({
        key: ['a', 'b'],
        mutation: async () => 'ab',
      }),
      undefined,
    )
    await mutationCache.mutate(e3)

    const [entry] = mutationCache.getEntries({ key: ['a', 'b', '$2'] })
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
