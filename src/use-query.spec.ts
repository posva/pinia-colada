import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, nextTick, ref, shallowReactive } from 'vue'
import { mockWarn } from '../test/mock-warn'
import type { GlobalMountOptions } from '../test/utils'
import { isSpy } from '../test/utils'
import { useQuery } from './use-query'
import type { UseQueryEntry } from './query-store'
import { QUERY_STORE_ID, createQueryEntry, useQueryCache } from './query-store'
import { TreeMapNode, entryNodeSize } from './tree-map'
import type { UseQueryOptions } from './query-options'
import { QueryPlugin } from './query-plugin'

describe('useQuery', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers({
      // easier to read, some date in 2001
      now: 1_000_000_000_000,
    })
  })
  afterEach(async () => {
    // clear all gc timers to avoid log polluting across tests
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function mountSimple<TResult = number, TError = Error>(
    options: Partial<UseQueryOptions<TResult>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const query = options.query
      ? vi.fn(options.query)
      : vi.fn(async () => {
          return 42
        })
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useQuery<TResult, TError>({
              key: ['key'],
              ...options,
              // @ts-expect-error: generic unmatched but types work
              query,
            }),
          }
        },
      }),
      {
        global: {
          ...mountOptions,
          plugins: [...(mountOptions?.plugins || [createPinia()]), QueryPlugin],
        },
      },
    )
    return Object.assign([wrapper, query] as const, { wrapper, query })
  }

  describe('initial fetch', () => {
    it('fetches data and updates on mount', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.data).toBeUndefined()
      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
    })

    it('sets the fetching state', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.isFetching).toBe(true)
      await flushPromises()
      expect(wrapper.vm.isFetching).toBe(false)
    })

    it('sets the pending state', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.isPending).toBe(true)
      await flushPromises()
      expect(wrapper.vm.isPending).toBe(false)
    })

    it('sets the error state', async () => {
      const { wrapper } = mountSimple({
        query: async () => {
          throw new Error('foo')
        },
      })

      expect(wrapper.vm.error).toBeNull()
      await flushPromises()
      expect(wrapper.vm.error).toEqual(new Error('foo'))
    })

    it('exposes a status state', async () => {
      const { wrapper } = mountSimple()

      await flushPromises()
      expect(wrapper.vm.status).toBe('success')
    })

    // NOTE: is this worth adding?
    it.skip('it works with a synchronously thrown Error', async () => {
      const { wrapper } = mountSimple({
        query: () => {
          throw new Error('foo')
        },
      })

      expect(wrapper.vm.error).toBeNull()
      await flushPromises()
      expect(wrapper.vm.error).toEqual(new Error('foo'))
    })
  })

  describe('staleTime', () => {
    it('when refreshed, does not fetch again if staleTime has not been elapsed', async () => {
      const { wrapper, query } = mountSimple({ staleTime: 1000 })

      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
      expect(query).toHaveBeenCalledTimes(1)

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(500)
      wrapper.vm.refresh()
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe(42)
    })

    it('new mount does not fetch if staleTime is not elapsed', async () => {
      const pinia = createPinia()
      const [w1, f1] = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      await flushPromises()

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(500)

      const [w2, f2] = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      await flushPromises()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(0)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('when refreshed, fetches the data if the staleTime has been elapsed', async () => {
      const { wrapper, query } = mountSimple({ staleTime: 1000 })

      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)
      wrapper.vm.refresh()
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.data).toBe(42)
    })

    it('new mount fetches if staleTime is elapsed', async () => {
      const [w1, f1] = mountSimple({ staleTime: 1000 })

      await flushPromises()

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(1001)

      const [w2, f2] = mountSimple({ staleTime: 1000 })

      await flushPromises()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(1)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('new mount reuses a pending request even if the staleTime has been elapsed', async () => {
      const pinia = createPinia()
      const [w1, f1] = mountSimple({ staleTime: 0 }, { plugins: [pinia] })
      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(10)
      const [w2, f2] = mountSimple({ staleTime: 0 }, { plugins: [pinia] })

      await flushPromises()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(0)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('refresh reuses a pending request even if the staleTime has been elapsed', async () => {
      const pinia = createPinia()
      const { wrapper, query } = mountSimple(
        { staleTime: 0 },
        { plugins: [pinia] },
      )
      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(10)
      wrapper.vm.refresh()

      await flushPromises()

      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe(42)
    })

    it('ignores stale time if there is an error', async () => {
      const query = vi.fn().mockRejectedValueOnce(new Error('fail'))
      const { wrapper } = mountSimple({ staleTime: 1000, query })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      expect(wrapper.vm.data).toBe(undefined)
      query.mockResolvedValueOnce(42)

      wrapper.vm.refresh()
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.error).toEqual(null)
      expect(wrapper.vm.data).toBe(42)
    })
  })

  describe('gcTime', () => {
    it('keeps the cache while the component is mounted', async () => {
      mountSimple({ gcTime: 1000 })
      const cache = useQueryCache()

      await flushPromises()
      expect(cache.getQueryData(['key'])).toBe(42)
      await vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
      await vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
    })

    it('deletes the cache once the component is unmounted after the delay', async () => {
      const { wrapper } = mountSimple({ gcTime: 1000 })
      const cache = useQueryCache()

      await flushPromises()
      await vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
      wrapper.unmount()
      await vi.advanceTimersByTime(999)
      // still there
      expect(cache.getQueryData(['key'])).toBe(42)
      await vi.advanceTimersByTime(1)
      expect(cache.getQueryData(['key'])).toBeUndefined()
    })

    it('keeps the cache if the query is reused by a new component before the delay', async () => {
      const pinia = createPinia()
      const [w1] = mountSimple({ gcTime: 1000 }, { plugins: [pinia] })
      const cache = useQueryCache()

      await flushPromises()
      await vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
      w1.unmount()
      await vi.advanceTimersByTime(999)
      const [w2] = mountSimple({ gcTime: 1000 }, { plugins: [pinia] })
      // still there
      await vi.advanceTimersByTime(1)
      expect(cache.getQueryData(['key'])).toBe(42)
      // check that gcTime doesn't impact it
      await vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
      w2.unmount()
      await vi.advanceTimersByTime(999)
      expect(cache.getQueryData(['key'])).toBe(42)
      await vi.advanceTimersByTime(1)
      expect(cache.getQueryData(['key'])).toBeUndefined()
    })

    it('deletes the cache of an old key while the component is mounted', async () => {
      const key = ref(1)
      mountSimple({ key: () => [key.value], gcTime: 1000 })
      const cache = useQueryCache()

      await flushPromises()
      expect(cache.getQueryData(['1'])).toBe(42)

      // trigger a new entry
      key.value = 2
      await nextTick()

      // let the query finish
      await flushPromises()

      expect(cache.getQueryData(['2'])).toBe(42)
      // still not deleted
      expect(cache.getQueryData(['1'])).toBe(42)

      // trigger cleanup
      vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['1'])).toBeUndefined()
    })

    it('keeps the cache if the query key changes before the delay', async () => {
      const key = ref(1)
      mountSimple({ key: () => [key.value], gcTime: 1000 })
      const cache = useQueryCache()

      await flushPromises()

      // trigger a new entry
      key.value = 2
      await nextTick()

      // let the query finish
      await flushPromises()

      // check the values are still there
      expect(cache.getQueryData(['1'])).toBe(42)
      expect(cache.getQueryData(['2'])).toBe(42)

      vi.advanceTimersByTime(999)
      expect(cache.getQueryData(['1'])).toBe(42)

      // go back to 1
      key.value = 1
      await nextTick()
      await flushPromises()

      // should not have deleted it
      expect(cache.getQueryData(['1'])).toBe(42)
      expect(cache.getQueryData(['2'])).toBe(42)
    })

    it.todo('works with effectScope too')
  })

  describe('refresh data', () => {
    function mountDynamicKey<
      TResult = { id: number, when: number },
      TError = Error,
    >(
      options: Partial<UseQueryOptions<TResult>> & { initialId?: number } = {},
      mountOptions?: GlobalMountOptions,
    ) {
      let query!: MockInstance

      const wrapper = mount(
        defineComponent({
          render: () => null,
          setup() {
            const id = ref(options.initialId ?? 0)
            query = options.query
              ? isSpy(options.query)
                ? options.query
                : vi.fn(options.query)
              : vi.fn(async () => {
                  return { id: id.value, when: Date.now() }
                })

            return {
              id,
              async setId(newId: number) {
                id.value = newId
                // ensure the query runs
                await flushPromises()
                // renders again
                await nextTick()
              },
              ...useQuery<TResult, TError>({
                key: () => ['data', id.value],
                ...options,
                // @ts-expect-error: generic unmatched but types work
                query,
              }),
            }
          },
        }),
        {
          global: {
            ...mountOptions,
            plugins: [
              ...(mountOptions?.plugins || [createPinia()]),
              QueryPlugin,
            ],
          },
        },
      )
      return Object.assign([wrapper, query] as const, {
        wrapper,
        query,
      })
    }

    it('refreshes the data even with initial values after staleTime is elapsed', async () => {
      const pinia = createPinia()
      pinia.state.value[QUERY_STORE_ID] = {
        caches: shallowReactive(
          new TreeMapNode(
            ['key'],
            createQueryEntry(['key'], 60, null, Date.now()),
          ),
        ),
      }
      const { wrapper, query } = mountSimple(
        {
          staleTime: 100,
        },
        {
          plugins: [pinia],
        },
      )

      await flushPromises()
      expect(wrapper.vm.data).toBe(60)
      expect(query).toHaveBeenCalledTimes(0)

      await vi.advanceTimersByTime(101)
      wrapper.vm.refresh()
      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('refreshes the data if mounted and the key changes', async () => {
      const { wrapper, query } = mountDynamicKey({
        initialId: 0,
      })

      await flushPromises()
      expect(wrapper.vm.data?.id).toBe(0)
      expect(query).toHaveBeenCalledTimes(1)

      await wrapper.vm.setId(1)

      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.data?.id).toBe(1)
    })

    it('avoids a new fetch if the key changes but the data is not stale', async () => {
      const { wrapper, query } = mountDynamicKey({
        initialId: 0,
        staleTime: 1000,
      })

      await flushPromises()
      expect(wrapper.vm.data?.id).toBe(0)
      expect(query).toHaveBeenCalledTimes(1)

      await wrapper.vm.setId(1)
      await wrapper.vm.setId(0)

      expect(query).toHaveBeenCalledTimes(2)
    })

    it('does not refresh by default when mounting a new component that uses the same key', async () => {
      const pinia = createPinia()
      const query = vi.fn().mockResolvedValue({ id: 0, when: Date.now() })
      mountDynamicKey({ initialId: 0, query }, { plugins: [pinia] })
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      mountDynamicKey({ initialId: 0 }, { plugins: [pinia] })
      await flushPromises()
      // not called because data is fresh
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('refreshes when mounting a new component that uses the same key if data is stale', async () => {
      const pinia = createPinia()
      const query = vi.fn().mockResolvedValue({ id: 0, when: Date.now() })
      mountDynamicKey(
        // staleTime doesn't matter here
        { initialId: 0, staleTime: 10, query },
        { plugins: [pinia] },
      )
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTime(100)

      mountDynamicKey(
        { initialId: 0, staleTime: 10, query },
        { plugins: [pinia] },
      )
      await flushPromises()
      // called because data is stale
      expect(query).toHaveBeenCalledTimes(2)
    })

    it('keeps the error while refreshing a failed query', async () => {
      const query = vi.fn().mockRejectedValueOnce(new Error('fail'))
      const { wrapper } = mountDynamicKey({ query })

      await flushPromises()
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      expect(wrapper.vm.data).toBe(undefined)
      query.mockResolvedValueOnce(42)

      wrapper.vm.refresh()
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      await flushPromises()
      expect(wrapper.vm.error).toEqual(null)
    })

    it('refreshes if it failed no matter the staleTime', async () => {
      const query = vi.fn().mockRejectedValue(new Error('fail'))
      const { wrapper } = mountDynamicKey({ staleTime: 1000, query })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      wrapper.vm.refresh()
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(2)
    })

    it.todo('can avoid throwing', async () => {
      const { wrapper, query } = mountSimple({
        staleTime: 0,
      })

      await flushPromises()
      expect(wrapper.vm.error).toBeNull()

      query.mockRejectedValueOnce(new Error('ko'))

      await expect(wrapper.vm.refetch()).resolves.toBeUndefined()
    })
  })

  describe('shared state', () => {
    it('reuses the same state for the same key', async () => {
      const pinia = createPinia()
      mountSimple({ key: ['todos'] }, { plugins: [pinia] })
      mountSimple({ key: ['todos'] }, { plugins: [pinia] })
      await flushPromises()

      const cacheClient = useQueryCache()
      expect(entryNodeSize(cacheClient.caches)).toBe(1)

      mountSimple({ key: ['todos', 2] }, { plugins: [pinia] })
      await flushPromises()

      expect(entryNodeSize(cacheClient.caches)).toBe(2)
    })

    it('populates the entry registry', async () => {
      const pinia = createPinia()
      mountSimple({ key: ['todos', 5] }, { plugins: [pinia] })
      mountSimple({ key: ['todos', 2] }, { plugins: [pinia] })
      await flushPromises()

      const cacheClient = useQueryCache()
      expect(entryNodeSize(cacheClient.caches)).toBe(3)
    })

    it('order in object keys does not matter', async () => {
      const pinia = createPinia()
      mountSimple(
        { key: ['todos', { id: 5, a: true, b: 'hello' }] },
        { plugins: [pinia] },
      )
      mountSimple(
        { key: ['todos', { a: true, id: 5, b: 'hello' }] },
        { plugins: [pinia] },
      )
      mountSimple(
        { key: ['todos', { id: 5, a: true, b: 'hello' }] },
        { plugins: [pinia] },
      )
      await flushPromises()

      const cacheClient = useQueryCache()
      expect(entryNodeSize(cacheClient.caches)).toBe(2)
    })
  })

  describe('ssr', () => {
    it('works with no state', async () => {
      const pinia = createPinia()
      const { wrapper } = mountSimple({}, { plugins: [pinia] })

      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
    })

    it('uses initial data if present in store', async () => {
      const pinia = createPinia()

      const caches = shallowReactive(
        new TreeMapNode<UseQueryEntry>(
          ['key'],
          createQueryEntry(['key'], 2, null, Date.now()),
        ),
      )
      pinia.state.value[QUERY_STORE_ID] = { caches }
      const { wrapper } = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      // without waiting for times the data is present
      expect(wrapper.vm.data).toBe(2)
    })

    it('avoids fetching if initial data is fresh', async () => {
      const pinia = createPinia()

      const caches = shallowReactive(
        new TreeMapNode<UseQueryEntry>(
          ['key'],
          // fresh data
          createQueryEntry(['key'], 2, null, Date.now()),
        ),
      )
      pinia.state.value[QUERY_STORE_ID] = { caches }
      const { wrapper, query } = mountSimple(
        // 1s stale time
        { staleTime: 1000 },
        { plugins: [pinia] },
      )

      await flushPromises()
      // it should not fetch and use the initial data
      expect(query).toHaveBeenCalledTimes(0)
      expect(wrapper.vm.data).toBe(2)
    })

    it('sets the error if the initial data is an error', async () => {
      const pinia = createPinia()

      const caches = shallowReactive(
        new TreeMapNode<UseQueryEntry>(
          ['key'],
          // fresh data
          createQueryEntry(['key'], undefined, new Error('fail'), Date.now()),
        ),
      )
      pinia.state.value[QUERY_STORE_ID] = { caches }
      const { wrapper } = mountSimple(
        { refetchOnMount: false },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.status).toBe('error')
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      expect(wrapper.vm.data).toBe(undefined)
    })

    it('sets the initial error even with initialData', async () => {
      const pinia = createPinia()

      const caches = shallowReactive(
        new TreeMapNode<UseQueryEntry>(
          ['key'],
          // fresh data
          createQueryEntry(['key'], undefined, new Error('fail'), Date.now()),
        ),
      )
      pinia.state.value[QUERY_STORE_ID] = { caches }
      const { wrapper } = mountSimple(
        { refetchOnMount: false, initialData: () => 42 },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.status).toBe('error')
      expect(wrapper.vm.error).toEqual(new Error('fail'))
    })
  })

  describe('warns', () => {
    mockWarn()

    it.todo(
      'warns if the key uses a reactive property that does not belong to the query',
      async () => {
        const querySpy = vi.fn().mockResolvedValue(42)
        mount(
          {
            setup() {
              const id = ref(0)
              return {
                ...useQuery({
                  key: () => ['key', id.value],
                  query: querySpy,
                }),
              }
            },
            template: `<div></div>`,
          },
          {
            global: {
              plugins: [createPinia(), QueryPlugin],
            },
          },
        )

        await flushPromises()
        // first time, it saves the component instance
        expect(`computed a key of "key,0"`).not.toHaveBeenWarned()
        // if a new component instance is mounted while the previous one is still active, we warn
      },
    )

    it.todo('does not warn if the route is used in the key')

    it.todo(
      'does not warn if the query data belongs to a defineQuery',
      async () => {},
    )

    it.todo('can safelist other global properties not to warn')
  })
})
