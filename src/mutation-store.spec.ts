import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { describe, beforeEach, it, expect, vi } from 'vite-plus/test'
import { createApp } from 'vue'
import { useMutationCache, isMutationCache } from './mutation-store'
import type { UseMutationEntry } from './mutation-store'
import { flushPromises } from '@vue/test-utils'
import {
  USE_MUTATION_DEFAULTS,
  type UseMutationOptions,
  type UseMutationOptionsWithDefaults,
} from './mutation-options'
import { mockConsoleError, mockWarn } from '@posva/test-utils'
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
        ...USE_MUTATION_DEFAULTS,
        key,
        mutation: async () => 'ok',
      } satisfies UseMutationOptionsWithDefaults
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
      expect(mutationCache.getEntries({ key: ['a', 'a'] })).toMatchObject([{ key: ['a', 'a'] }])
    })

    it('can filter unkeyed entries', () => {
      const mutationCache = useMutationCache()
      createEntries([[], undefined])
      expect(mutationCache.getEntries()).toHaveLength(2)
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

    it('errors when mutating an entry that was not ensured', () => {
      const mutationCache = useMutationCache()

      const options = {
        ...USE_MUTATION_DEFAULTS,
        mutation: async () => 'test',
      } satisfies UseMutationOptionsWithDefaults

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
        ...USE_MUTATION_DEFAULTS,
        key: ['a', 'b', 'c'],
        mutation: async () => 'abc',
      }),
      undefined,
    )
    await mutationCache.mutate(e1)

    const e2 = mutationCache.ensure(
      mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        key: ['a', 'b', 'd'],
        mutation: async () => 'abd',
      }),
      undefined,
    )
    await mutationCache.mutate(e2)

    const e3 = mutationCache.ensure(
      mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        key: ['a', 'b'],
        mutation: async () => 'ab',
      }),
      undefined,
    )
    await mutationCache.mutate(e3)

    const entry = mutationCache.get(e3.id)
    expect(entry).toBeDefined()
    mutationCache.remove(entry!)
    expect(mutationCache.getEntries({ key: ['a', 'b', 'c'] })).toHaveLength(1)
  })

  it('can get an individual entry', async () => {
    const mutationCache = useMutationCache()
    const entry = mutationCache.ensure(
      mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        key: ['a', 'b', 'c'],
        mutation: async () => 'abc',
      }),
      undefined,
    )
    await mutationCache.mutate(entry)
    expect(mutationCache.get(entry.id)).toBeDefined()
    expect(mutationCache.get(entry.id)).toBe(entry)
  })

  it('returns undefined for non-existent entries', () => {
    const mutationCache = useMutationCache()
    expect(mutationCache.get(999)).toBeUndefined()
  })

  describe('isMutationCache', () => {
    it('can check if an object is a mutation cache', () => {
      const mutationCache = useMutationCache()
      expect(isMutationCache(mutationCache)).toBe(true)
    })

    it('returns false for non-cache objects', () => {
      expect(isMutationCache({})).toBe(false)
      expect(isMutationCache(null)).toBe(false)
      expect(isMutationCache(undefined)).toBe(false)
      expect(isMutationCache({ $id: 'wrong-id' })).toBe(false)
    })

    it('returns false for query cache', async () => {
      const pinia = getActivePinia()!
      // Import useQueryCache inline to avoid circular dependency
      const { useQueryCache } = await import('./query-store')
      const queryCache = useQueryCache(pinia)
      expect(isMutationCache(queryCache)).toBe(false)
    })
  })

  describe('extensibility', () => {
    it('has an ext property that starts empty', () => {
      const mutationCache = useMutationCache()
      const entry = mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        mutation: async () => 'ok',
      })
      expect(entry.ext).toBeDefined()
    })

    it('calls extend hook when entry is ensured', () => {
      const pinia = getActivePinia()!
      const mutationCache = useMutationCache(pinia)
      const extendSpy = vi.fn()

      mutationCache.$onAction((action) => {
        if (action.name === 'extend') {
          extendSpy(action)
        }
      })

      const entry = mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        mutation: async () => 'ok',
      })
      mutationCache.ensure(entry, undefined)

      expect(extendSpy).toHaveBeenCalledTimes(1)
    })

    it('only calls extend once per entry', () => {
      const pinia = getActivePinia()!
      const mutationCache = useMutationCache(pinia)
      const extendSpy = vi.fn()

      mutationCache.$onAction((action) => {
        if (action.name === 'extend') {
          extendSpy(action)
        }
      })

      const entry = mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        mutation: async () => 'ok',
      })
      mutationCache.ensure(entry, undefined)
      // Ensure the same entry again
      const entry2 = mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        mutation: async () => 'ok',
      })
      mutationCache.ensure(entry2, undefined)

      // extend should be called twice (once per unique entry)
      expect(extendSpy).toHaveBeenCalledTimes(2)
    })

    it('allows plugins to extend entries via ext', () => {
      const pinia = getActivePinia()!
      const mutationCache = useMutationCache(pinia)

      mutationCache.$onAction((action) => {
        if (action.name === 'extend') {
          const entry = action.args[0] as UseMutationEntry
          // Plugin extends the entry
          ;(entry.ext as Record<string, unknown>).customProperty = 'test-value'
        }
      })

      const entry = mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        mutation: async () => 'ok',
      })
      mutationCache.ensure(entry, undefined)

      expect(entry.ext).toHaveProperty('customProperty', 'test-value')
    })
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

  it('can get an individual entry by mutation ID', () => {
    const mutationCache = useMutationCache()
    const entry = mutationCache.ensure(
      mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        key: ['a', 'b', 'c'],
        mutation: async () => 'abc',
      }),
      undefined,
    )

    expect(mutationCache.get(entry.id)).toBeDefined()
    expect(mutationCache.get(entry.id)).toBe(entry)
  })

  it('can store and retrieve multiple entries with the same user key', () => {
    const mutationCache = useMutationCache()
    const options = {
      ...USE_MUTATION_DEFAULTS,
      key: ['same', 'key'],
      mutation: async () => 'ok',
    } satisfies UseMutationOptionsWithDefaults

    const entry1 = mutationCache.ensure(mutationCache.create(options), undefined)
    const entry2 = mutationCache.ensure(mutationCache.create(options), undefined)
    const entry3 = mutationCache.ensure(mutationCache.create(options), undefined)

    // All three should be different entries with different IDs
    expect(entry1.id).not.toBe(entry2.id)
    expect(entry2.id).not.toBe(entry3.id)

    // All should be retrievable by ID
    expect(mutationCache.get(entry1.id)).toBe(entry1)
    expect(mutationCache.get(entry2.id)).toBe(entry2)
    expect(mutationCache.get(entry3.id)).toBe(entry3)

    // All should be findable by user key
    const entries = mutationCache.getEntries({ key: ['same', 'key'] })
    expect(entries).toHaveLength(3)
    expect(entries).toContain(entry1)
    expect(entries).toContain(entry2)
    expect(entries).toContain(entry3)
  })

  it('handles unkeyed mutations correctly', () => {
    const mutationCache = useMutationCache()

    const entry1 = mutationCache.ensure(
      mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        mutation: async () => 'ok',
      }),
      undefined,
    )
    const entry2 = mutationCache.ensure(
      mutationCache.create({
        ...USE_MUTATION_DEFAULTS,
        mutation: async () => 'ok',
      }),
      undefined,
    )

    expect(entry1.key).toBeUndefined()
    expect(entry2.key).toBeUndefined()
    expect(entry1.id).not.toBe(entry2.id)

    // Should be retrievable by ID
    expect(mutationCache.get(entry1.id)).toBe(entry1)
    expect(mutationCache.get(entry2.id)).toBe(entry2)

    // Both should appear in getEntries()
    expect(mutationCache.getEntries()).toHaveLength(2)
  })
})
