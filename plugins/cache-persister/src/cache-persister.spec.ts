import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, useQuery, useQueryCache } from '@pinia/colada'
import type { UseQueryOptions } from '@pinia/colada'
import { PiniaColadaCachePersister, resetCacheReady, isCacheReady } from './cache-persister'
import type { PiniaColadaStorage } from './cache-persister'

describe('PiniaColadaCachePersister', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
    resetCacheReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  enableAutoUnmount(afterEach)

  function createMockStorage(): Storage & { data: Record<string, string> } {
    const data: Record<string, string> = {}
    return {
      data,
      getItem: vi.fn((key: string) => data[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        data[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete data[key]
      }),
      clear: vi.fn(() => {
        Object.keys(data).forEach((key) => delete data[key])
      }),
      get length() {
        return Object.keys(data).length
      },
      key: vi.fn((index: number) => Object.keys(data)[index] ?? null),
    }
  }

  function createAsyncStorage(): PiniaColadaStorage & {
    data: Record<string, string>
  } {
    const data: Record<string, string> = {}
    return {
      data,
      getItem: vi.fn(async (key: string) => {
        await Promise.resolve()
        return data[key] ?? null
      }),
      setItem: vi.fn(async (key: string, value: string) => {
        await Promise.resolve()
        data[key] = value
      }),
      removeItem: vi.fn(async (key: string) => {
        await Promise.resolve()
        delete data[key]
      }),
    }
  }

  function factory(
    queryOptions: UseQueryOptions,
    persisterOptions: Parameters<typeof PiniaColadaCachePersister>[0] = {},
  ) {
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return useQuery(queryOptions)
        },
      }),
      {
        global: {
          plugins: [
            createPinia(),
            [PiniaColada, { plugins: [PiniaColadaCachePersister(persisterOptions)] }],
          ],
        },
      },
    )

    return { wrapper }
  }

  describe('persistence', () => {
    it('persists cache to storage after debounce', async () => {
      const storage = createMockStorage()
      const query = vi.fn(async () => 'test-data')

      factory({ key: ['test'], query }, { storage, debounce: 100 })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      // Before debounce, nothing persisted
      expect(storage.setItem).not.toHaveBeenCalled()

      // After debounce
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(storage.setItem).toHaveBeenCalled()
      const stored = JSON.parse(storage.data['pinia-colada-cache']!)
      expect(stored['["test"]']).toBeDefined()
      expect(stored['["test"]'][0]).toBe('test-data')
    })

    it('uses custom storage key', async () => {
      const storage = createMockStorage()
      const query = vi.fn(async () => 'data')

      factory({ key: ['k'], query }, { storage, key: 'my-custom-key', debounce: 0 })

      await flushPromises()
      vi.advanceTimersByTime(0)
      await flushPromises()

      expect(storage.setItem).toHaveBeenCalledWith('my-custom-key', expect.any(String))
    })

    it('throttles multiple changes with trailing call', async () => {
      const storage = createMockStorage()
      const query = vi.fn(async () => 'data')

      factory({ key: ['test'], query }, { storage, debounce: 100 })

      await flushPromises()
      const queryCache = useQueryCache()

      // First update schedules persist
      queryCache.setQueryData(['test'], 'update-1')
      await flushPromises()

      // More updates during throttle window
      queryCache.setQueryData(['test'], 'update-2')
      await flushPromises()
      queryCache.setQueryData(['test'], 'update-3')
      await flushPromises()

      // First throttle window completes - persists update-3
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(storage.setItem).toHaveBeenCalledTimes(1)
      let stored = JSON.parse(storage.data['pinia-colada-cache']!)
      expect(stored['["test"]'][0]).toBe('update-3')

      // Trailing call was scheduled, advance to complete it
      vi.advanceTimersByTime(100)
      await flushPromises()

      // Second call for trailing persist (same data, but ensures trailing works)
      expect(storage.setItem).toHaveBeenCalledTimes(2)
    })

    it('persists periodically during continuous activity', async () => {
      const storage = createMockStorage()
      const query = vi.fn(async () => 'data')

      factory({ key: ['test'], query }, { storage, debounce: 50 })

      await flushPromises()
      const queryCache = useQueryCache()

      // Simulate continuous activity over 150ms
      queryCache.setQueryData(['test'], 'v1')
      await flushPromises()

      vi.advanceTimersByTime(25)
      queryCache.setQueryData(['test'], 'v2')
      await flushPromises()

      vi.advanceTimersByTime(25)
      // First throttle window (50ms) completes here
      queryCache.setQueryData(['test'], 'v3')
      await flushPromises()

      vi.advanceTimersByTime(25)
      queryCache.setQueryData(['test'], 'v4')
      await flushPromises()

      // Complete all pending throttle windows
      vi.advanceTimersByTime(100)
      await flushPromises()

      // Should have persisted multiple times during activity (throttle behavior)
      // Not just once at the end like pure debounce would
      expect(vi.mocked(storage.setItem).mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('persists on setQueryData', async () => {
      const storage = createMockStorage()
      const query = vi.fn(async () => 'initial')

      factory({ key: ['test'], query }, { storage, debounce: 0 })

      await flushPromises()
      vi.advanceTimersByTime(0)
      await flushPromises()

      const queryCache = useQueryCache()
      queryCache.setQueryData(['test'], 'updated')
      await flushPromises()
      vi.advanceTimersByTime(0)
      await flushPromises()

      const stored = JSON.parse(storage.data['pinia-colada-cache']!)
      expect(stored['["test"]'][0]).toBe('updated')
    })
  })

  describe('restoration', () => {
    it('restores cache from storage on init', async () => {
      const storage = createMockStorage()
      // Pre-populate storage with cached data
      storage.data['pinia-colada-cache'] = JSON.stringify({
        '["restored"]': ['restored-data', null, 0, {}],
      })

      const query = vi.fn(async () => 'fresh-data')

      factory({ key: ['restored'], query, staleTime: 60_000 }, { storage })

      await flushPromises()

      // Data should be restored, query should not be called (not stale)
      const queryCache = useQueryCache()
      expect(queryCache.getQueryData(['restored'])).toBe('restored-data')
    })

    it('isCacheReady resolves after restore', async () => {
      const storage = createMockStorage()
      storage.data['pinia-colada-cache'] = JSON.stringify({
        '["test"]': ['cached', null, 0, {}],
      })

      let ready = false
      isCacheReady().then(() => {
        ready = true
      })

      expect(ready).toBe(false)

      factory({ key: ['test'], query: async () => 'x' }, { storage })

      await flushPromises()
      expect(ready).toBe(true)
    })

    it('isCacheReady resolves even with empty storage', async () => {
      const storage = createMockStorage()

      let ready = false
      isCacheReady().then(() => {
        ready = true
      })

      factory({ key: ['test'], query: async () => 'x' }, { storage })

      await flushPromises()
      expect(ready).toBe(true)
    })

    it('handles corrupt storage data gracefully', async () => {
      const storage = createMockStorage()
      storage.data['pinia-colada-cache'] = 'not valid json {'

      const query = vi.fn(async () => 'fresh')

      // Should not throw
      factory({ key: ['test'], query }, { storage })

      await flushPromises()
      expect(query).toHaveBeenCalled()
    })

    it('resolves isCacheReady when no storage is provided (SSR)', async () => {
      let ready = false
      isCacheReady().then(() => {
        ready = true
      })

      // Use null to bypass destructuring default (undefined triggers default localStorage)
      factory({ key: ['test'], query: async () => 'x' }, { storage: null as any })

      await flushPromises()
      expect(ready).toBe(true)
    })
  })

  describe('filtering', () => {
    it('only persists queries matching filter', async () => {
      const storage = createMockStorage()

      const wrapper = mount(
        defineComponent({
          template: '<div></div>',
          setup() {
            useQuery({ key: ['users', 1], query: async () => 'user-1' })
            useQuery({ key: ['posts', 1], query: async () => 'post-1' })
            return {}
          },
        }),
        {
          global: {
            plugins: [
              createPinia(),
              [
                PiniaColada,
                {
                  plugins: [
                    PiniaColadaCachePersister({
                      storage,
                      filter: { key: ['users'] },
                      debounce: 0,
                    }),
                  ],
                },
              ],
            ],
          },
        },
      )

      await flushPromises()
      vi.advanceTimersByTime(0)
      await flushPromises()

      const stored = JSON.parse(storage.data['pinia-colada-cache']!)
      expect(stored['["users",1]']).toBeDefined()
      expect(stored['["posts",1]']).toBeUndefined()

      wrapper.unmount()
    })

    it('uses predicate filter', async () => {
      const storage = createMockStorage()

      const wrapper = mount(
        defineComponent({
          template: '<div></div>',
          setup() {
            useQuery({ key: ['a'], query: async () => 'a-data' })
            useQuery({ key: ['b'], query: async () => 'b-data' })
            return {}
          },
        }),
        {
          global: {
            plugins: [
              createPinia(),
              [
                PiniaColada,
                {
                  plugins: [
                    PiniaColadaCachePersister({
                      storage,
                      filter: {
                        predicate: (entry) => entry.key[0] === 'a',
                      },
                      debounce: 0,
                    }),
                  ],
                },
              ],
            ],
          },
        },
      )

      await flushPromises()
      vi.advanceTimersByTime(0)
      await flushPromises()

      const stored = JSON.parse(storage.data['pinia-colada-cache']!)
      expect(stored['["a"]']).toBeDefined()
      expect(stored['["b"]']).toBeUndefined()

      wrapper.unmount()
    })
  })

  describe('async storage', () => {
    it('works with async storage', async () => {
      const storage = createAsyncStorage()
      const query = vi.fn(async () => 'async-data')

      factory({ key: ['async-test'], query }, { storage, debounce: 0 })

      await flushPromises()
      vi.advanceTimersByTime(0)
      await flushPromises()

      expect(storage.setItem).toHaveBeenCalled()
      expect(storage.data['pinia-colada-cache']).toBeDefined()
    })

    it('restores from async storage', async () => {
      const storage = createAsyncStorage()
      storage.data['pinia-colada-cache'] = JSON.stringify({
        '["async-restored"]': ['async-cached', null, 0, {}],
      })

      factory(
        { key: ['async-restored'], query: async () => 'fresh', staleTime: 60_000 },
        { storage },
      )

      await flushPromises()

      const queryCache = useQueryCache()
      expect(queryCache.getQueryData(['async-restored'])).toBe('async-cached')
    })

    it('isCacheReady waits for async restore', async () => {
      const storage = createAsyncStorage()
      storage.data['pinia-colada-cache'] = JSON.stringify({
        '["wait"]': ['waited', null, 0, {}],
      })

      let ready = false

      factory({ key: ['wait'], query: async () => 'x' }, { storage })

      isCacheReady().then(() => {
        ready = true
      })

      // Should not be ready immediately
      expect(ready).toBe(false)

      await flushPromises()
      expect(ready).toBe(true)
    })

    it('handles async storage setItem rejection gracefully', async () => {
      const storage = createAsyncStorage()
      // Make setItem reject
      storage.setItem = vi.fn(async () => {
        throw new Error('Quota exceeded')
      })

      const query = vi.fn(async () => 'data')

      // Should not throw
      factory({ key: ['test'], query }, { storage, debounce: 0 })

      await flushPromises()
      vi.advanceTimersByTime(0)
      await flushPromises()

      // setItem was called but error was swallowed
      expect(storage.setItem).toHaveBeenCalled()
    })
  })

  describe('removal', () => {
    it('updates storage when entry is removed', async () => {
      const storage = createMockStorage()

      const wrapper = mount(
        defineComponent({
          template: '<div></div>',
          setup() {
            // gcTime: 1 (not 0) because 0 is falsy and disables GC
            useQuery({ key: ['to-remove'], query: async () => 'data', gcTime: 1 })
            return {}
          },
        }),
        {
          global: {
            plugins: [
              createPinia(),
              [PiniaColada, { plugins: [PiniaColadaCachePersister({ storage, debounce: 1 })] }],
            ],
          },
        },
      )

      await flushPromises()
      vi.advanceTimersByTime(1)
      await flushPromises()

      // Verify initial persistence
      let stored = JSON.parse(storage.data['pinia-colada-cache']!)
      expect(stored['["to-remove"]']).toBeDefined()

      // Unmount to trigger GC after gcTime
      wrapper.unmount()
      vi.advanceTimersByTime(1)
      await flushPromises()

      // After removal and debounce
      vi.advanceTimersByTime(1)
      await flushPromises()

      stored = JSON.parse(storage.data['pinia-colada-cache']!)
      expect(stored['["to-remove"]']).toBeUndefined()
    })
  })
})
