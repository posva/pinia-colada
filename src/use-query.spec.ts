import type { MockInstance } from 'vitest'
import type { GlobalMountOptions } from '../test-utils/utils'
import type { UseQueryOptions } from './query-options'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, createApp, defineComponent, isRef, nextTick, ref } from 'vue'
import type { PropType } from 'vue'
import { mockConsoleError, mockWarn } from '../test-utils/mock-warn'
import { delay, isSpy, promiseWithResolvers } from '../test-utils/utils'
import { PiniaColada } from './pinia-colada'
import { hydrateQueryCache, QUERY_STORE_ID, useQueryCache } from './query-store'
import type { _UseQueryEntryNodeValueSerialized } from './query-store'
import { useQuery } from './use-query'

describe('useQuery', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(async () => {
    // clear all gc timers to avoid log polluting across tests
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  mockWarn()
  mockConsoleError()

  function mountSimple<
    TData = number | string,
    TError = Error,
    TDataInitial extends TData | undefined = undefined,
  >(
    options: Partial<UseQueryOptions<TData, TError, TDataInitial>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const query = options.query
      ? isSpy(options.query)
        ? options.query
        : vi.fn(options.query)
      : vi.fn(async () => 42)
    const pinia =
      mountOptions?.plugins?.find((plugin): plugin is Pinia => {
        return (
          'state' in plugin &&
          isRef(plugin.state) &&
          'use' in plugin &&
          'install' in plugin &&
          typeof plugin.use === 'function' &&
          typeof plugin.install === 'function' &&
          '_e' in plugin
        )
      }) || createPinia()
    let queryCache!: ReturnType<typeof useQueryCache>
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          queryCache = useQueryCache()
          const useQueryResult = useQuery<TData, TError, TDataInitial>({
            key: ['key'],
            ...options,
            // @ts-expect-error: generic unmatched but types work
            query,
          })
          return {
            ...useQueryResult,
          }
        },
      }),
      {
        global: {
          ...mountOptions,
          plugins: [...(mountOptions?.plugins || [pinia]), PiniaColada],
        },
      },
    )
    return Object.assign([wrapper, query] as const, { wrapper, query, pinia, queryCache })
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

      expect(wrapper.vm.isLoading).toBe(true)
      await flushPromises()
      expect(wrapper.vm.isLoading).toBe(false)
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

    it('works with a synchronously thrown Error', async () => {
      const { wrapper } = mountSimple({
        query: () => {
          throw new Error('foo')
        },
      })

      expect(wrapper.vm.error).toBeNull()
      await flushPromises()
      expect(wrapper.vm.error).toEqual(new Error('foo'))
    })

    it('fetches the first time with refetchOnMount false', async () => {
      const { query } = mountSimple({ refetchOnMount: false })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('fetches the first time with refetchOnMount false and placeholderData', async () => {
      const { query } = mountSimple({
        refetchOnMount: false,
        placeholderData: 24,
      })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('skips initial fetch if initialData is set', async () => {
      const { wrapper, query } = mountSimple({
        initialData: () => 24,
        staleTime: 1000,
      })

      expect(query).toHaveBeenCalledTimes(0)
      expect(wrapper.vm.data).toBe(24)
      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.vm.isPending).toBe(false)
      expect(wrapper.vm.status).toBe('success')
      expect(wrapper.vm.error).toBeNull()
    })

    it('still fetches with initialData is staleTime is 0', async () => {
      const { wrapper, query } = mountSimple({
        initialData: () => 24,
        staleTime: 0,
      })

      expect(query).toHaveBeenCalledTimes(1)
      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
      expect(wrapper.vm.isLoading).toBe(false)
      expect(wrapper.vm.isPending).toBe(false)
      expect(wrapper.vm.status).toBe('success')
      expect(wrapper.vm.error).toBeNull()
    })

    it('still fetches is refetch is immediately called with initialData', async () => {
      const wrapper = mount(
        defineComponent({
          render: () => '<p>{{ data }}</p>',
          setup() {
            const useQueryResult = useQuery({
              key: ['key'],
              query: async () => 'ok',
              initialData: () => 'initial',
              staleTime: 1000,
            })
            useQueryResult.refetch()
            return {
              ...useQueryResult,
            }
          },
        }),
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      expect(wrapper.vm.data).toBe('ok')
    })

    it('refetches data if key changes and has initialData and staleTime is 0', async () => {
      const key = ref(1)
      const { wrapper, query } = mountSimple({
        key: () => [key.value],
        query: async () => `ok: ${key.value}`,
        initialData: () => 'init',
        staleTime: 0,
      })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe('ok: 1')

      key.value = 2
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.data).toBe('ok: 2')
    })

    it('respects initialDataUpdatedAt as a number with initialData', async () => {
      const { wrapper, query } = mountSimple({
        initialData: () => 24,
        staleTime: 1000,
        initialDataUpdatedAt: Date.now() - 500, // 500ms ago
      })

      // Should not fetch - data is fresh (500ms < 1000ms staleTime)
      expect(query).toHaveBeenCalledTimes(0)
      expect(wrapper.vm.data).toBe(24)
      expect(wrapper.vm.status).toBe('success')

      // Advance 400ms (total 900ms, still fresh)
      vi.advanceTimersByTime(400)
      await wrapper.vm.refresh()
      expect(query).toHaveBeenCalledTimes(0)

      // Advance 200ms more (total 1100ms, now stale)
      vi.advanceTimersByTime(200)
      await wrapper.vm.refresh()
      expect(query).toHaveBeenCalledTimes(1)
      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
    })

    it('respects initialDataUpdatedAt as a function with initialData', async () => {
      const initialDataUpdatedAt = vi.fn(() => Date.now() - 800)
      const { wrapper, query } = mountSimple({
        initialData: () => 24,
        staleTime: 1000,
        initialDataUpdatedAt,
      })

      expect(initialDataUpdatedAt).toHaveBeenCalledTimes(1)
      expect(query).toHaveBeenCalledTimes(0)

      vi.advanceTimersByTime(250)
      await wrapper.vm.refresh()
      expect(initialDataUpdatedAt).toHaveBeenCalledTimes(1)
    })

    it('fetches immediately if initialDataUpdatedAt makes data stale', async () => {
      const { wrapper, query } = mountSimple({
        initialData: () => 24,
        staleTime: 1000,
        initialDataUpdatedAt: Date.now() - 2000, // 2000ms ago (stale)
      })

      // Should fetch immediately since data is stale
      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe(24) // Shows initial data while fetching

      await flushPromises()
      expect(wrapper.vm.data).toBe(42) // Updated with fresh data
    })

    it('defaults to Date.now() when initialDataUpdatedAt is not provided', async () => {
      const { wrapper, query } = mountSimple({
        initialData: () => 24,
        staleTime: 1000,
      })

      expect(query).toHaveBeenCalledTimes(0)
      expect(wrapper.vm.data).toBe(24)

      vi.advanceTimersByTime(1000)
      await wrapper.vm.refresh()
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('uses initialDataUpdatedAt for new entries when key changes', async () => {
      const key = ref(1)
      const initialDataUpdatedAt = vi.fn(() => Date.now() - 1500)
      const { wrapper, query } = mountSimple({
        key: () => [key.value],
        query: async () => `ok: ${key.value}`,
        initialData: () => 'init',
        staleTime: 1000,
        initialDataUpdatedAt,
      })

      // First entry should fetch immediately (old data)
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
      expect(initialDataUpdatedAt).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe('ok: 1')

      // Change key - new entry should also fetch
      key.value = 2
      await flushPromises()
      expect(initialDataUpdatedAt).toHaveBeenCalledTimes(2)
      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.data).toBe('ok: 2')
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
      const query = vi.fn().mockResolvedValue(42)
      const options = {
        key: ['id'],
        query,
        staleTime: 1000,
      } satisfies UseQueryOptions
      const [w1] = mountSimple(options, { plugins: [pinia] })

      await flushPromises()

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(500)

      const [w2] = mountSimple(options, { plugins: [pinia] })

      await flushPromises()

      expect(query).toHaveBeenCalledTimes(1)
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
      const query = vi.fn().mockResolvedValue(42)
      const options = {
        key: ['id'],
        query,
        staleTime: 0,
      } satisfies UseQueryOptions
      const [w1] = mountSimple(options, { plugins: [pinia] })
      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(10)
      const [w2] = mountSimple(options, { plugins: [pinia] })

      await flushPromises()

      expect(query).toHaveBeenCalledTimes(1)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('refresh reuses a pending request even if the staleTime has been elapsed', async () => {
      const pinia = createPinia()
      const { wrapper, query } = mountSimple({ staleTime: 0 }, { plugins: [pinia] })
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

    it('always fetches if staleTime is 0', async () => {
      const { wrapper, query } = mountSimple({ staleTime: 0 })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      wrapper.vm.refresh()
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(2)
    })

    it('does not fetch if staleTime is Infinity', async () => {
      const { wrapper, query } = mountSimple({ staleTime: Infinity })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      // should not trigger a new fetch because staleTime is Infinity, even if so long time has passed
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)
      wrapper.vm.refresh()
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe('gcTime', () => {
    it('keeps the cache while the component is mounted', async () => {
      mountSimple({ gcTime: 1000 })
      const cache = useQueryCache()

      await flushPromises()
      expect(cache.getQueryData(['key'])).toBe(42)
      vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
      vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
    })

    it('deletes the cache once the component is unmounted after the delay', async () => {
      const { wrapper } = mountSimple({ gcTime: 1000 })
      const cache = useQueryCache()

      await flushPromises()
      vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
      wrapper.unmount()
      vi.advanceTimersByTime(999)
      // still there
      expect(cache.getQueryData(['key'])).toBe(42)
      vi.advanceTimersByTime(1)
      expect(cache.getQueryData(['key'])).toBeUndefined()
    })

    it('keeps the cache if the query is reused by a new component before the delay', async () => {
      const pinia = createPinia()
      const query = vi.fn().mockResolvedValue(42)
      const options = {
        key: ['key'],
        query,
        gcTime: 1000,
      } satisfies UseQueryOptions
      const [w1] = mountSimple(options, { plugins: [pinia] })
      const cache = useQueryCache()

      await flushPromises()
      vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
      w1.unmount()
      vi.advanceTimersByTime(999)
      const [w2] = mountSimple(options, { plugins: [pinia] })
      // still there
      vi.advanceTimersByTime(1)
      expect(cache.getQueryData(['key'])).toBe(42)
      // check that gcTime doesn't impact it
      vi.advanceTimersByTime(1000)
      expect(cache.getQueryData(['key'])).toBe(42)
      w2.unmount()
      vi.advanceTimersByTime(999)
      expect(cache.getQueryData(['key'])).toBe(42)
      vi.advanceTimersByTime(1)
      expect(cache.getQueryData(['key'])).toBeUndefined()
    })

    it('deletes the cache of an old key while the component is mounted', async () => {
      const key = ref(1)
      mountSimple({ key: () => [key.value], gcTime: 1000 })
      const cache = useQueryCache()

      await flushPromises()
      expect(cache.getQueryData([1])).toBe(42)

      // trigger a new entry
      key.value = 2
      await nextTick()

      // let the query finish
      await flushPromises()

      expect(cache.getQueryData([2])).toBe(42)
      // still not deleted
      expect(cache.getQueryData([1])).toBe(42)

      // trigger cleanup
      vi.advanceTimersByTime(1000)
      expect(cache.getQueryData([1])).toBeUndefined()
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
      expect(cache.getQueryData([1])).toBe(42)
      expect(cache.getQueryData([2])).toBe(42)

      vi.advanceTimersByTime(999)
      expect(cache.getQueryData([1])).toBe(42)

      // go back to 1
      key.value = 1
      await nextTick()
      await flushPromises()

      // should not have deleted it
      expect(cache.getQueryData([1])).toBe(42)
      expect(cache.getQueryData([2])).toBe(42)
    })

    it.todo('works with effectScope too')

    it('keeps the cache forever if gcTime is false', async () => {
      const { wrapper } = mountSimple({ gcTime: false })
      const cache = useQueryCache()

      await flushPromises()
      expect(cache.getQueryData(['key'])).toBe(42)
      wrapper.unmount()
      vi.advanceTimersByTime(1_000_000)
      expect(cache.getQueryData(['key'])).toBe(42)
    })

    // https://github.com/posva/pinia-colada/issues/436
    it('frees the cache if the entry is recreated within a component', async () => {
      const key = ref(1)
      const { wrapper } = mountSimple({
        key: () => ['key', key.value],
        gcTime: 1000,
      })
      // we change it immediately to create an entry right away
      key.value++
      const cache = useQueryCache()

      await flushPromises()

      wrapper.unmount()
      vi.advanceTimersByTime(1000)
      expect(cache.getEntries({ key: ['key'] }).length).toBe(0)
    })
  })

  describe('placeholderData', () => {
    it('affects useQuery data, state, status', async () => {
      const { wrapper } = mountSimple({
        query: async () => 42,
        placeholderData: 24,
      })

      expect(wrapper.vm.isPlaceholderData).toBe(true)
      expect(wrapper.vm.state).toEqual({
        data: 24,
        error: null,
        status: 'success',
      })
      expect(wrapper.vm.data).toBe(24)
      expect(wrapper.vm.isLoading).toBe(true)
      expect(wrapper.vm.isPending).toBe(false)
      expect(wrapper.vm.status).toBe('success')
      expect(wrapper.vm.error).toBeNull()
      expect(wrapper.vm.asyncStatus).toBe('loading')

      await flushPromises()
      expect(wrapper.vm.isPlaceholderData).toBe(false)
      expect(wrapper.vm.data).toBe(42)
      expect(wrapper.vm.status).toBe('success')
      expect(wrapper.vm.asyncStatus).toBe('idle')
    })

    it('works with a function', async () => {
      const { wrapper } = mountSimple({
        query: async () => 42,
        placeholderData: () => 24,
      })

      expect(wrapper.vm.data).toBe(24)
      expect(wrapper.vm.isPlaceholderData).toBe(true)
      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
      expect(wrapper.vm.isPlaceholderData).toBe(false)
    })

    it('ignores the placeholderData if it returns undefined', async () => {
      const { wrapper } = mountSimple({
        query: async () => 42,
        placeholderData: () => {
          return undefined
        },
      })

      expect(wrapper.vm.data).toBe(undefined)
      expect(wrapper.vm.isPlaceholderData).toBe(false)
      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
    })

    it('shows even when not enabled', async () => {
      const { wrapper } = mountSimple({
        query: async () => 42,
        placeholderData: 24,
        enabled: false,
      })

      expect(wrapper.vm.data).toBe(24)
      expect(wrapper.vm.isPlaceholderData).toBe(true)
      await flushPromises()
      expect(wrapper.vm.data).toBe(24)
      expect(wrapper.vm.isPlaceholderData).toBe(true)
    })

    it('ignores the placeholderData if there is already data in the cache', async () => {
      const pinia = createPinia()
      const options = {
        key: ['id'],
        // spy to avoid warns because of mountSimple
        query: vi.fn(async () => 42),
        placeholderData: 24,
      } satisfies UseQueryOptions
      const [w1] = mountSimple(options, { plugins: [pinia] })

      await flushPromises()
      // ensure data is there
      expect(w1.vm.data).toBe(42)

      const [w2] = mountSimple(options, { plugins: [pinia] })
      // placeholder is not used
      expect(w2.vm.data).toBe(42)
      expect(w2.vm.isPlaceholderData).toBe(false)
    })

    it('ignores the placeholderData if there is already an error in the cache', async () => {
      const pinia = createPinia()
      const options: UseQueryOptions<number> = {
        key: ['id'],
        // spy to avoid warns because of mountSimple
        query: vi.fn(async () => {
          throw new Error('fail')
        }),
        placeholderData: 24,
      }
      const [w1] = mountSimple(options, { plugins: [pinia] })

      await flushPromises()
      // ensure the error
      expect(w1.vm.error).toEqual(new Error('fail'))

      const [w2] = mountSimple(options, { plugins: [pinia] })
      // placeholder is not used
      expect(w2.vm.data).toBe(undefined)
      expect(w2.vm.isPlaceholderData).toBe(false)
      expect(w2.vm.error).toEqual(new Error('fail'))
    })

    it('calls the placeholderData function with the previous data if the entry key changes', async () => {
      const key = ref(1)
      const placeholderData = vi.fn(() => 24)
      const { wrapper } = mountSimple({
        key: () => [key.value],
        query: async () => 42,
        placeholderData,
      })

      await flushPromises()

      key.value = 2
      await nextTick()
      expect(placeholderData).toHaveBeenCalledTimes(2)
      expect(placeholderData).toHaveBeenCalledWith(42)
      expect(wrapper.vm.data).toBe(24)
    })

    it('passes the previous placeholderData to the new placeholderData function if the key changes while loading', async () => {
      const key = ref(1)
      const placeholderData = vi.fn((previousValue) =>
        previousValue ? `previous-${previousValue}` : 'from-placeholder',
      )
      const { wrapper } = mountSimple({
        key: () => [key.value],
        query: async () => {
          await delay(100)
          return 'from-query'
        },
        placeholderData,
      })

      await flushPromises()

      vi.advanceTimersByTime(50)
      key.value++
      // enough to pass the previous with key 1
      vi.advanceTimersByTime(51)
      await nextTick()
      expect(placeholderData).toHaveBeenCalledTimes(2)
      expect(placeholderData).toHaveBeenNthCalledWith(1, undefined)
      expect(placeholderData).toHaveBeenNthCalledWith(2, 'from-placeholder')
      expect(wrapper.vm.data).toBe('previous-from-placeholder')

      key.value++
      await nextTick()
      expect(placeholderData).toHaveBeenCalledTimes(3)
      expect(placeholderData).toHaveBeenNthCalledWith(3, 'previous-from-placeholder')
      expect(wrapper.vm.data).toBe('previous-previous-from-placeholder')
    })

    it('does not change the cache state', async () => {
      const pinia = createPinia()
      const options = {
        key: ['id'],
        query: async () => 42,
        placeholderData: 24,
      } satisfies UseQueryOptions
      const [w1] = mountSimple(options, { plugins: [pinia] })

      // ensure data is there
      expect(w1.vm.data).toBe(24)

      const cache = useQueryCache(pinia)
      expect(
        cache
          .getEntries({
            key: ['id'],
          })
          .at(0)?.state.value,
      ).toEqual({
        status: 'pending',
        data: undefined,
        error: null,
      })
      expect(cache.getQueryData(['id'])).toBe(undefined)
      await flushPromises()
      expect(
        cache
          .getEntries({
            key: ['id'],
          })
          .at(0)?.state.value,
      ).toEqual({
        status: 'success',
        data: 42,
        error: null,
      })
      expect(cache.getQueryData(['id'])).toBe(42)
    })

    it('removes the placeholderData when setting the query data', async () => {
      const pinia = createPinia()
      const [w1, query] = mountSimple(
        {
          key: ['id'],
          placeholderData: 24,
        },
        { plugins: [pinia] },
      )

      // ensure data is there
      expect(w1.vm.data).toBe(24)

      const cache = useQueryCache(pinia)
      cache.setQueryData(['id'], 99)

      await nextTick()
      expect(w1.vm.data).toBe(99)

      await flushPromises()
      query.mockResolvedValueOnce(42)
    })

    it('uses the placeholderData immediately after changing the key', async () => {
      const key = ref(1)
      const placeholderData = { data: 'ok' }
      const { wrapper } = mountSimple({
        key: () => [key.value],
        query: async () => ({ data: 'done' }),
        placeholderData,
      })

      await flushPromises()

      key.value++
      await nextTick()
      expect(wrapper.vm.data).toBe(placeholderData)
      await flushPromises()
      expect(wrapper.vm.data).not.toBe(placeholderData)
      key.value++
      expect(wrapper.vm.data).toBe(placeholderData)
    })

    // NOTE: same as above but added for regression testing
    // https://github.com/posva/pinia-colada/issues/154
    it('uses the placeholderData even if the query is invalidated after after changing the key', async () => {
      const key = ref(1)
      const placeholderData = { data: 'ok' }
      const { wrapper } = mountSimple({
        key: () => ['common', key.value],
        query: async () => ({ data: 'done' }),
        placeholderData,
      })
      const queryCache = useQueryCache()

      await flushPromises()

      key.value++
      queryCache.invalidateQueries({ key: ['common'] })
      expect(wrapper.vm.data).toBe(placeholderData)
    })

    it('keeps data after an errored request that initially has a placeholderData', async () => {
      const { wrapper, query } = mountSimple({
        placeholderData: 24,
      })

      // let the first fetch succeed and take over the placeholderData
      await flushPromises()
      // then fail
      query.mockRejectedValueOnce(new Error('fail'))
      wrapper.vm.refetch()
      await flushPromises()
      expect(wrapper.vm.state).toMatchObject({
        data: 42,
        status: 'error',
        error: new Error('fail'),
      })
      expect(wrapper.vm.data).toBe(42)
      expect(wrapper.vm.error).toEqual(new Error('fail'))
    })

    it('keeps a pending status in the query cache', async () => {
      const { wrapper, pinia } = mountSimple({
        placeholderData: 24,
      })
      const queryCache = useQueryCache(pinia)
      expect(queryCache.getEntries({ key: ['key'], exact: true }).at(0)?.state.value).toMatchObject(
        {
          status: 'pending',
          data: undefined,
          error: null,
        },
      )
      expect(wrapper.vm.state).toMatchObject({
        status: 'success',
        data: 24,
        error: null,
      })

      await flushPromises()
    })

    it('keeps the placeholderData if the result of the query cancelled', async () => {
      const { wrapper, pinia } = mountSimple({
        placeholderData: 24,
        query: async () => {
          await delay(50)
          return 42
        },
      })

      await flushPromises()
      vi.advanceTimersByTime(25)
      const queryCache = useQueryCache(pinia)
      queryCache.cancelQueries({ key: ['key'] })
      vi.advanceTimersByTime(26)
      await flushPromises()
      expect(wrapper.vm.isPlaceholderData).toBe(true)
      expect(wrapper.vm.state).toMatchObject({
        data: 24,
        status: 'success',
        error: null,
      })
      expect(queryCache.getEntries({ key: ['key'] }).at(0)?.state.value).toMatchObject({
        data: undefined,
        status: 'pending',
        error: null,
      })
    })

    it('keeps the placeholderData if the result of the signal is aborted', async () => {
      const { wrapper, pinia } = mountSimple({
        placeholderData: 24,
        query: async ({ signal }) => {
          await delay(50)
          // ideally we would want to do `fetch('/...', { signal })` because it added
          // rejects with AbortError if the signal is aborted, no matter the reason passed
          signal.throwIfAborted()
          return 42
        },
      })

      await flushPromises()
      vi.advanceTimersByTime(25)
      const queryCache = useQueryCache(pinia)
      // queryCache.getEntries({ key: ['key']}).at(0)?.pending?.abortController.abort(new Error('aborted'))
      // NOTE: we cannot pass a reason so that signal.throwIfAborted() throws an AbortError()
      queryCache
        .getEntries({ key: ['key'] })
        .at(0)
        ?.pending?.abortController.abort()
      vi.advanceTimersByTime(26)
      await flushPromises()
      // expect(wrapper.vm.isPlaceholderData).toBe(true)
      expect(wrapper.vm.state).toMatchObject({
        data: 24,
        status: 'success',
        error: null,
      })
      expect(queryCache.getEntries({ key: ['key'] }).at(0)?.state.value).toMatchObject({
        data: undefined,
        status: 'pending',
        error: null,
      })
    })
  })

  describe('refresh data', () => {
    function mountDynamicKey<
      TData = { id: number; when: number },
      TError = Error,
      TDataInitial extends TData | undefined = undefined,
    >(
      options: Partial<UseQueryOptions<TData, TError, TDataInitial>> & { initialId?: number } = {},
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
              ...useQuery<TData, TError, TDataInitial>({
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
            plugins: [...(mountOptions?.plugins || [createPinia()]), PiniaColada],
          },
        },
      )
      return Object.assign([wrapper, query] as const, {
        wrapper,
        query,
      })
    }

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
      const options = {
        key: ['id'],
        query,
        initialId: 0,
      } satisfies UseQueryOptions & { initialId: number }
      mountDynamicKey(options, { plugins: [pinia] })
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      mountDynamicKey(options, { plugins: [pinia] })
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
      vi.advanceTimersByTime(100)

      mountDynamicKey({ initialId: 0, staleTime: 10, query }, { plugins: [pinia] })
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

    it('does not automatically refresh when enabled is false', async () => {
      const { wrapper, query } = mountDynamicKey({ enabled: false })

      await flushPromises()
      expect(query).toBeCalledTimes(0)

      // should refresh manually
      await wrapper.vm.refresh()
      await flushPromises()
      expect(query).toBeCalledTimes(1)

      await wrapper.vm.setId(2)
      expect(query).toBeCalledTimes(1)
    })

    it('triggers the query function when enabled becomes true', async () => {
      const enabled = ref(false)
      const { wrapper, query } = mountDynamicKey({ enabled })

      await flushPromises()
      expect(query).toBeCalledTimes(0)

      enabled.value = true
      await nextTick()
      await flushPromises()
      expect(query).toBeCalledTimes(1)

      await wrapper.vm.setId(2)
      expect(query).toBeCalledTimes(2)

      // no refetch when value is not toggled
      enabled.value = true
      await nextTick()
      await flushPromises()
      expect(query).toBeCalledTimes(2)
    })

    it('does not trigger the query function when enabled becomes true if data is not stale', async () => {
      const enabled = ref(true)
      const { query } = mountDynamicKey({ enabled })

      await flushPromises()
      expect(query).toBeCalledTimes(1)

      enabled.value = false
      await nextTick()
      await flushPromises()
      expect(query).toBeCalledTimes(1)

      enabled.value = true
      await nextTick()
      await flushPromises()
      expect(query).toBeCalledTimes(1)
    })

    it('can be fresh despite being disabled', async () => {
      mountSimple({ enabled: false, staleTime: 100 })

      await flushPromises()
      const queryCache = useQueryCache()
      const entry = queryCache.getEntries({ key: ['key'] })[0]
      expect(entry).toBeDefined()
      if (!entry) throw new Error('for typing')
      // no data
      expect(entry.stale).toBe(true)

      queryCache.setQueryData(['key'], 42)
      expect(entry.stale).toBe(false)

      vi.advanceTimersByTime(100)
      expect(entry.stale).toBe(true)
    })

    it('refetch still resolves on error', async () => {
      const { wrapper, query } = mountSimple({
        staleTime: 0,
      })

      await flushPromises()
      expect(wrapper.vm.error).toBeNull()

      query.mockRejectedValueOnce(new Error('ko'))
      await expect(wrapper.vm.refetch()).resolves.toBeDefined()
    })

    it('refresh still resolves on error', async () => {
      const { wrapper, query } = mountSimple({
        staleTime: 0,
      })

      await flushPromises()
      expect(wrapper.vm.error).toBeNull()

      query.mockRejectedValueOnce(new Error('ko'))
      await expect(wrapper.vm.refresh()).resolves.toBeDefined()
    })

    it('aborts the previous query when refreshing', async () => {
      let signal: AbortSignal | undefined
      const query = vi.fn(async (opts: { signal: AbortSignal }) => {
        signal ??= opts.signal
        // await delay(10)
        return 'ok'
      })
      const { wrapper } = mountSimple({ query })
      expect(signal).toBeDefined()
      expect(signal?.aborted).toBe(false)

      wrapper.vm.refetch()

      expect(signal?.aborted).toBe(true)

      await flushPromises()
      expect(wrapper.vm.data).toBe('ok')
    })
  })

  describe('abort signal', () => {
    it('passes an abort signal to the query function', async () => {
      const query = vi.fn(async () => 'ok')
      mountSimple({ query })

      expect(query).toHaveBeenCalledTimes(1)
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })

    it('uses the data if the signal is aborted but not consumed', async () => {
      let signal: AbortSignal | undefined
      const { resolve, promise } = promiseWithResolvers<void>()
      const { wrapper } = mountSimple({
        key: ['key'],
        async query(ctx) {
          signal = ctx.signal
          await promise
          return 'ok'
        },
      })
      const queryCache = useQueryCache()
      const entry = queryCache.getEntries({ key: ['key'] })[0]
      expect(entry).toBeDefined()
      if (!entry) throw new Error('ko')
      expect(entry.pending?.abortController.signal).toBe(signal)
      entry.pending?.abortController.abort(new Error('from test'))

      resolve()
      await flushPromises()
      expect(entry.state.value.data).toBe('ok')
      expect(wrapper.vm.data).toBe('ok')
    })

    it('does not use the data if the signal is aborted and consumed', async () => {
      const { resolve, promise } = promiseWithResolvers<void>()
      const { wrapper } = mountSimple({
        key: ['key'],
        async query({ signal }) {
          await promise
          signal.throwIfAborted()
          return 'ok'
        },
      })

      const queryCache = useQueryCache()
      const entry = queryCache.getEntries({ key: ['key'] })[0]
      expect(entry).toBeDefined()
      if (!entry?.pending) throw new Error('ko')
      entry.pending.abortController.abort(new Error('from test'))
      resolve()

      await flushPromises()
      expect(entry.state.value.data).toBe(undefined)
      expect(wrapper.vm.data).toBe(undefined)
    })

    it('can refresh after being aborted with an outside AbortError', async () => {
      const controller = new AbortController()
      const { signal } = controller
      controller.abort()
      let firstCall = 0
      const { wrapper } = mountSimple({
        key: ['key'],
        async query() {
          if (!firstCall++) {
            signal.throwIfAborted()
          }
          return 'ok'
        },
      })

      await flushPromises()

      // we intentionally don't check the state of the query as that's not what
      // we want to test here
      expect(wrapper.vm.state).not.toEqual({
        data: 'ok',
        error: null,
        status: 'success',
      })

      await wrapper.vm.refresh()

      expect(wrapper.vm.state).toEqual({
        data: 'ok',
        error: null,
        status: 'success',
      })
    })

    it('aborts the signal if the query is not active anymore (key changes)', async () => {
      const key = ref(1)
      const { wrapper, queryCache } = mountSimple({
        key: () => ['key', key.value],
        async query({ signal }) {
          await delay(100)
          if (signal.aborted) {
            return 'ok'
          }
          return 'ko'
        },
      })

      await flushPromises()
      expect(wrapper.vm.data).toBe(undefined)
      key.value = 2
      // we advance before letting the new query trigger
      vi.advanceTimersByTime(100)
      await flushPromises()
      expect(queryCache.getQueryData(['key', 1])).toBe('ok')
      expect(queryCache.getQueryData(['key', 2])).toBe(undefined)
    })

    it('aborts the signal if the query is not active anymore (unmount)', async () => {
      const { wrapper, queryCache } = mountSimple({
        key: () => ['key'],
        async query({ signal }) {
          await delay(100)
          if (signal.aborted) {
            return 'ok'
          }
          return 'ko'
        },
      })

      await flushPromises()
      expect(wrapper.vm.data).toBe(undefined)
      wrapper.unmount()
      // we advance before letting the new query trigger
      vi.advanceTimersByTime(100)
      await flushPromises()
      expect(queryCache.getQueryData(['key'])).toBe('ok')
    })
  })

  describe('refetchOnWindowFocus', () => {
    it('refreshes after staleTime if refetchOnWindowFocus returns true', async () => {
      const { query } = mountSimple({
        staleTime: 1000,
        refetchOnWindowFocus: () => true,
      })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)
      document.dispatchEvent(new Event('visibilitychange'))
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(2)
    })

    it('always refreshes if refetchOnWindowFocus is "always"', async () => {
      const { query } = mountSimple({
        refetchOnWindowFocus: 'always',
      })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      document.dispatchEvent(new Event('visibilitychange'))
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(2)
    })

    it('does not refresh if refetchOnWindowFocus is false', async () => {
      const { query } = mountSimple({
        staleTime: 1000,
        refetchOnWindowFocus: () => false,
      })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)
      document.dispatchEvent(new Event('visibilitychange'))
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe('refetchOnReconnect', () => {
    it('refreshes after staleTime if refetchOnReconnect returns true', async () => {
      const { query } = mountSimple({
        staleTime: 1000,
        refetchOnReconnect: () => true,
      })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)
      window.dispatchEvent(new Event('online'))
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(2)
    })

    it('always refreshes if refetchOnReconnect is "always"', async () => {
      const { query } = mountSimple({
        refetchOnReconnect: 'always',
      })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      window.dispatchEvent(new Event('online'))
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(2)
    })

    it('does not refresh if refetchOnReconnect is false', async () => {
      const { query } = mountSimple({
        staleTime: 1000,
        refetchOnReconnect: () => false,
      })

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)
      window.dispatchEvent(new Event('online'))
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  it('can be cancelled through the queryCache without refetching', async () => {
    const { query, queryCache } = mountSimple({
      key: ['key'],
      query: async () => {
        await delay(100)
        return 'ok'
      },
    })

    const entry = queryCache.getEntries({ key: ['key'] })[0]
    expect(entry).toBeDefined()
    if (!entry) throw new Error('ko')
    queryCache.cancel(entry)

    vi.advanceTimersByTime(100)
    await flushPromises()

    expect(query).toHaveBeenCalledTimes(1)
  })

  it('stays stale if it is cancelled before the query resolves', async () => {
    const { queryCache } = mountSimple({
      key: ['key'],
      query: async () => {
        await delay(100)
        return 'ok'
      },
    })

    const entry = queryCache.getEntries({ key: ['key'] })[0]
    expect(entry).toBeDefined()
    if (!entry) throw new Error('ko')
    queryCache.cancel(entry)

    vi.advanceTimersByTime(100)
    await flushPromises()

    expect(entry.stale).toBe(true)
  })

  it('stays not stale if it is cancelled but has resolved before', async () => {
    const { queryCache } = mountSimple({
      key: ['key'],
      query: async () => {
        await delay(100)
        return 'ok'
      },
      staleTime: 500,
    })

    vi.advanceTimersByTime(100)
    await flushPromises()

    const entry = queryCache.getEntries({ key: ['key'] })[0]
    expect(entry).toBeDefined()
    if (!entry) throw new Error('ko')
    expect(entry.stale).toBe(false)
    queryCache.refresh(entry!)
    queryCache.cancel(entry!)

    await flushPromises()
    expect(entry.stale).toBe(false)
  })

  it('propagates falsy errors', async () => {
    const { wrapper } = mountSimple({
      key: ['key'],
      query: async () => {
        // While it's a terrible pratcie to throw a literal, the error should propagate
        // eslint-disable-next-line no-throw-literal
        throw undefined
      },
    })

    await flushPromises()

    expect(wrapper.vm.data).toBe(undefined)
    expect(wrapper.vm.status).toBe('error')
    expect(wrapper.vm.error).toBe(undefined)
  })

  for (const reason of [false, null, 0, '', undefined, new Error('custom error')]) {
    it(`propagates AbortErrors from other signals, reason: ${reason instanceof Error ? 'Error' : `"${String(reason)}"`}`, async () => {
      const controller = new AbortController()
      controller.abort(reason)
      const { wrapper } = mountSimple({
        key: ['key'],
        query: async () => {
          throw controller.signal.reason
        },
      })

      await flushPromises()

      expect(wrapper.vm.state).toEqual({
        data: undefined,
        status: 'error',
        error: controller.signal.reason,
      })
    })
  }

  describe('streams', () => {
    async function* streamData() {
      yield 'hey'
      await delay(50)
      yield ' '
      await delay(50)
      yield 'you'
    }

    it('simple stream', async () => {
      const { wrapper, queryCache } = mountSimple({
        key: ['key'],
        async query() {
          let result = ''
          for await (const chunk of streamData()) {
            result += chunk
            queryCache.setQueryData(['key'], result)
          }
          return result
        },
      })

      await flushPromises()
      expect(wrapper.vm.data).toBe('hey')
      expect(wrapper.vm.isLoading).toBe(true)

      vi.advanceTimersByTime(50)
      await flushPromises()
      expect(wrapper.vm.data).toBe('hey ')
      expect(wrapper.vm.isLoading).toBe(true)

      vi.advanceTimersByTime(50)
      await flushPromises()
      expect(wrapper.vm.data).toBe('hey you')
      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('properly resets the state if the key changes in the midle of a stream', async () => {
      const key = ref(1)
      const { wrapper, queryCache } = mountSimple({
        key: () => ['key', key.value],
        async query({ signal }) {
          let result = `${key.value}: `
          for await (const chunk of streamData()) {
            result += chunk
            if (signal.aborted) {
              // we could also return the result
              throw new Error('aborted')
            }
            queryCache.setQueryData(['key', key.value], result)
          }
          return result
        },
      })

      await flushPromises()
      expect(wrapper.vm.data).toBe('1: hey')
      vi.advanceTimersByTime(50)
      await flushPromises()
      // change the key now
      key.value = 2
      // we need to manually cancel the query
      queryCache.cancelQueries({ key: ['key', 1] })
      await nextTick()
      // new entry should be empty
      expect(wrapper.vm.data).toBe(undefined)
      expect(wrapper.vm.isLoading).toBe(true)
      vi.advanceTimersByTime(50)
      await flushPromises()
      expect(wrapper.vm.data).toBe('2: hey')
      vi.advanceTimersByTime(50)
      await flushPromises()
      vi.advanceTimersByTime(50)
      await flushPromises()
      expect(wrapper.vm.data).toBe('2: hey you')
    })
  })

  describe('invalidation', () => {
    it('can be invalidated through the queryCache to refetch', async () => {
      const { query, pinia } = mountSimple({
        key: ['key'],
        query: async () => {
          await delay(100)
          return 'ok'
        },
      })

      const queryCache = useQueryCache(pinia)
      query.mockClear()
      queryCache.invalidateQueries({ key: ['key'] })
      expect(queryCache.getEntries({ key: ['key'] })[0]?.stale).toBe(true)
      expect(query).toHaveBeenCalledTimes(1)

      // despite advanting the time
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(query).toHaveBeenCalledTimes(1)
    })

    it('should invalidate but not refetch disabled queries', async () => {
      const { query, pinia } = mountSimple({ enabled: false })
      const queryCache = useQueryCache(pinia)

      await flushPromises()
      expect(query).not.toHaveBeenCalled()

      queryCache.invalidateQueries({ key: ['key'] })
      expect(queryCache.getEntries({ key: ['key'] })[0]?.stale).toBe(true)
      await flushPromises()

      expect(query).not.toHaveBeenCalled()
    })

    it('should invalidate but not refetch query when enabled function returns false', async () => {
      const { query, pinia } = mountSimple({ enabled: () => false })
      const queryCache = useQueryCache(pinia)

      await flushPromises()
      expect(query).not.toHaveBeenCalled()

      queryCache.invalidateQueries({ key: ['key'] })
      expect(queryCache.getEntries({ key: ['key'] })[0]?.stale).toBe(true)
      await flushPromises()

      expect(query).not.toHaveBeenCalled()
    })

    it('should only invalidate all and refetch active queries by default', async () => {
      const { pinia, wrapper, query } = mountSimple({ key: ['key'] })
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
      query.mockClear()

      const queryCache = useQueryCache(pinia)
      wrapper.unmount()
      await queryCache.invalidateQueries({ key: ['key'] })
      // stale but not refetched
      expect(queryCache.getEntries({ key: ['key'] })[0]?.stale).toBe(true)
      expect(query).toHaveBeenCalledTimes(0)
    })

    it('allows invalidating and refetching all queries active or not', async () => {
      const pinia = createPinia()

      const qRoot = vi.fn(async () => 'ok')
      const wRoot = mount(
        defineComponent({
          render: () => null,
          setup() {
            return { ...useQuery({ key: ['key'], query: qRoot }) }
          },
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      const q0 = vi.fn(async () => 'ok')
      const w0 = mount(
        defineComponent({
          render: () => null,
          setup() {
            return { ...useQuery({ key: ['key', 0], query: q0 }) }
          },
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      const q1 = vi.fn(async () => 'ok')
      const w1 = mount(
        defineComponent({
          render: () => null,
          setup() {
            return { ...useQuery({ key: ['key', 1], query: q1 }) }
          },
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      await flushPromises()
      qRoot.mockClear()
      q0.mockClear()
      q1.mockClear()

      // makes the query inactive
      wRoot.unmount()

      const queryCache = useQueryCache(pinia)

      // only `['key']` is active, others are just there
      const eRoot = queryCache.getEntries({ key: ['key'], exact: true })[0]
      const e0 = queryCache.getEntries({ key: ['key', 0], exact: true })[0]
      const e1 = queryCache.getEntries({ key: ['key', 1], exact: true })[0]

      expect(eRoot).toBeDefined()
      expect(e0).toBeDefined()
      expect(e1).toBeDefined()
      expect(eRoot?.stale).toBe(false)
      expect(e0?.stale).toBe(false)
      expect(e1?.stale).toBe(false)
      expect(eRoot?.active).toBe(false)
      expect(e0?.active).toBe(true)
      expect(e1?.active).toBe(true)

      await queryCache.invalidateQueries({ key: ['key'] }, 'all')
      // refetched and fresh
      expect(qRoot).toHaveBeenCalledTimes(1)
      expect(q0).toHaveBeenCalledTimes(1)
      expect(q1).toHaveBeenCalledTimes(1)

      // same state as above
      expect(eRoot?.stale).toBe(false)
      expect(e0?.stale).toBe(false)
      expect(e1?.stale).toBe(false)
      expect(eRoot?.active).toBe(false)
      expect(e0?.active).toBe(true)
      expect(e1?.active).toBe(true)

      // to avoid warnings and because it should work
      w0.unmount()
      w1.unmount()
    })

    it('allows invalidating without refetching any query active or not', async () => {
      const pinia = createPinia()

      const qRoot = vi.fn(async () => 'ok')
      const wRoot = mount(
        defineComponent({
          render: () => null,
          setup() {
            return { ...useQuery({ key: ['key'], query: qRoot }) }
          },
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      const q0 = vi.fn(async () => 'ok')
      const w0 = mount(
        defineComponent({
          render: () => null,
          setup() {
            return { ...useQuery({ key: ['key', 0], query: q0 }) }
          },
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      const q1 = vi.fn(async () => 'ok')
      const w1 = mount(
        defineComponent({
          render: () => null,
          setup() {
            return { ...useQuery({ key: ['key', 1], query: q1, enabled: false }) }
          },
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      await flushPromises()
      qRoot.mockClear()
      q0.mockClear()
      q1.mockClear()

      // makes the query inactive
      wRoot.unmount()

      const queryCache = useQueryCache(pinia)

      // only `['key']` is active, others are just there
      const eRoot = queryCache.getEntries({ key: ['key'], exact: true })[0]
      const e0 = queryCache.getEntries({ key: ['key', 0], exact: true })[0]
      const e1 = queryCache.getEntries({ key: ['key', 1], exact: true })[0]

      expect(eRoot).toBeDefined()
      expect(e0).toBeDefined()
      expect(e1).toBeDefined()

      await queryCache.invalidateQueries({ key: ['key'] }, false)
      // refetched and fresh
      expect(qRoot).toHaveBeenCalledTimes(0)
      expect(q0).toHaveBeenCalledTimes(0)
      expect(q1).toHaveBeenCalledTimes(0)

      // all should be stale
      expect(eRoot?.stale).toBe(true)
      expect(e0?.stale).toBe(true)
      expect(e1?.stale).toBe(true)
      //
      // to avoid warnings and because it should work
      w0.unmount()
      w1.unmount()
    })
  })

  it('should not create entries while unmounting', async () => {
    const NestedComp = defineComponent({
      props: {
        queryKey: {
          type: Object as PropType<{ key: string }>,
          required: true,
        },
      },
      render: () => 'child',
      setup(props) {
        const key = computed(() => [props.queryKey.key])
        const useQueryResult = useQuery({
          key,
          query: async () => 'ok',
        })
        return {
          ...useQueryResult,
        }
      },
    })

    const wrapper = mount(
      defineComponent({
        components: { NestedComp },
        template: `
        <div>
          <NestedComp v-if="queryKey.key" :queryKey="queryKey" />
        </div>
`,
        setup() {
          const queryKey = ref<{ key: string | undefined }>({ key: 'key' })
          return {
            queryKey,
          }
        },
      }),
      {
        global: {
          plugins: [createPinia(), PiniaColada],
        },
      },
    )
    const queryCache = useQueryCache()

    await flushPromises()
    expect(wrapper.text()).toBe('child')
    let entries = queryCache.getEntries()
    expect(entries.length).toBe(1)

    // changing the key unmounts the nested component
    // but it should not create a new entry
    wrapper.vm.queryKey.key = undefined
    entries = queryCache.getEntries()
    expect(entries.length).toBe(1)
    await flushPromises()
    expect(wrapper.text()).toBe('')
    entries = queryCache.getEntries()
    expect(entries.length).toBe(1)
  })

  describe('shared state', () => {
    it('reuses the same state for the same key', async () => {
      const pinia = createPinia()
      const query = vi.fn().mockResolvedValue(42)
      mountSimple({ key: ['todos'], query }, { plugins: [pinia] })
      mountSimple({ key: ['todos'], query }, { plugins: [pinia] })
      await flushPromises()

      const queryCache = useQueryCache()
      expect(queryCache.caches.size).toBe(1)

      mountSimple({ key: ['todos', 2] }, { plugins: [pinia] })
      await flushPromises()

      expect(queryCache.caches.size).toBe(2)
    })

    it('order in object keys does not matter', async () => {
      const pinia = createPinia()
      const query = vi.fn().mockResolvedValue(42)
      mountSimple({ key: ['todos', { id: 5, a: true, b: 'hello' }], query }, { plugins: [pinia] })
      mountSimple({ key: ['todos', { a: true, id: 5, b: 'hello' }], query }, { plugins: [pinia] })
      mountSimple({ key: ['todos', { id: 5, a: true, b: 'hello' }], query }, { plugins: [pinia] })
      await flushPromises()

      const cacheClient = useQueryCache()
      expect(cacheClient.caches.size).toBe(1)
    })
  })

  describe('hydration', () => {
    function createPiniawithHydratedCache(
      caches: Record<string, _UseQueryEntryNodeValueSerialized>,
    ) {
      const pinia = createPinia()
      const app = createApp({})
      app.use(pinia)
      // it doesn't matter because the value is skipped
      pinia.state.value[QUERY_STORE_ID] = { caches: 1 }
      hydrateQueryCache(useQueryCache(pinia), caches)

      return pinia
    }

    it('works with no state', async () => {
      const pinia = createPinia()
      const { wrapper } = mountSimple({}, { plugins: [pinia] })

      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
    })

    it('uses initial data if present in store', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [2, null, 0],
      })

      const { wrapper } = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      // without waiting for the data is present
      expect(wrapper.vm.data).toBe(2)
    })

    it('avoids fetching if initial data is fresh', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [2, null, 0],
      })

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
      const pinia = createPiniawithHydratedCache({
        '["key"]': [undefined, new Error('fail'), 0],
      })
      const { wrapper } = mountSimple({ refetchOnMount: false }, { plugins: [pinia] })

      expect(wrapper.vm.status).toBe('error')
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      expect(wrapper.vm.data).toBe(undefined)
    })

    it('sets the initial error even with initialData', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [undefined, new Error('fail'), 0],
      })
      const { wrapper } = mountSimple(
        { refetchOnMount: false, initialData: () => 42 },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.status).toBe('error')
      expect(wrapper.vm.error).toEqual(new Error('fail'))
    })

    it('initialData is ignored if there is already data in the cache', async () => {
      const initialData = vi.fn(() => 42)
      const pinia = createPiniawithHydratedCache({
        '["key"]': [2, null, 0],
      })
      const { wrapper } = mountSimple({ refetchOnMount: false, initialData }, { plugins: [pinia] })

      expect(wrapper.vm.data).toBe(2)
      expect(initialData).toHaveBeenCalledTimes(0)
    })

    it('refreshes the data even with initial values after staleTime is elapsed', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [60, null, 0],
      })
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

      vi.advanceTimersByTime(101)
      wrapper.vm.refresh()
      await flushPromises()
      expect(wrapper.vm.data).toBe(42)
      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe('hmr', () => {
    it('always refetches on hmr', async () => {
      const query = vi.fn(async () => 42)
      const component = defineComponent({
        render: () => null,
        setup() {
          useQuery({ key: ['id'], query })
          return {}
        },
        // to simulate HMR, the HMR id is stable across remounts
        __hmrId: 'some-id',
      })

      const pinia = createPinia()
      const w1 = mount(component, { global: { plugins: [pinia, PiniaColada] } })
      // simulate the wait of things to settle but do not let staleTime pass
      await flushPromises()

      mount(component, { global: { plugins: [pinia, PiniaColada] } })
      w1.unmount()
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(2)
    })
  })

  describe('warns', () => {
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
              plugins: [createPinia(), PiniaColada],
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

    it.todo('does not warn if the query data belongs to a defineQuery', async () => {})

    it.todo('can safelist other global properties not to warn')

    it.todo(
      'warns if the same key is used with different options while mounting different components',
      async () => {
        const pinia = createPinia()
        mountSimple(
          { key: ['id'], query: async () => 24 },
          {
            plugins: [pinia],
          },
        )
        mountSimple(
          { key: ['id'], query: async () => 42 },
          {
            plugins: [pinia],
          },
        )

        await flushPromises()

        expect(
          /The same query key \[id\] was used with different query functions/,
        ).toHaveBeenWarned()
      },
    )

    // https://github.com/posva/pinia-colada/issues/192
    it('does not warn when repeating the query in composables', async () => {
      const pinia = createPinia()
      function useMyQuery(id: () => number) {
        return useQuery({ key: () => ['id', id()], query: async () => 42 })
      }
      const Component = defineComponent({
        props: {
          id: {
            type: Number,
            required: true,
          },
        },
        render: () => null,
        setup(props) {
          useMyQuery(() => props.id)
          return {}
        },
      })

      mount(Component, {
        props: { id: 5 },
        global: {
          plugins: [pinia, PiniaColada],
        },
      }).unmount()

      await flushPromises()

      mount(Component, {
        props: { id: 5 },
        global: {
          plugins: [pinia, PiniaColada],
        },
      })

      await flushPromises()
      // No warnings!
    })
  })

  describe('meta', () => {
    it('accepts a raw meta object', async () => {
      const meta = { priority: 'high', cache: true }
      const { pinia } = mountSimple({ meta })
      const queryCache = useQueryCache(pinia)

      await flushPromises()

      const entry = queryCache.getEntries({ key: ['key'] }).at(0)!
      expect(entry).toBeDefined()
      expect(entry.meta).toEqual(meta)
      expect(entry.options?.meta).toBe(meta)
    })

    it('accepts meta as a function', async () => {
      const { pinia } = mountSimple({
        meta: () => ({ priority: 'high' }),
      })
      const queryCache = useQueryCache(pinia)

      await flushPromises()

      const entry = queryCache.getEntries({ key: ['key'] }).at(0)!
      expect(entry).toBeDefined()
      expect(entry.meta).toEqual({ priority: 'high' })
      expect(entry.options?.meta).toBeTypeOf('function')
    })

    it('accepts meta as a ref', async () => {
      const metaRef = ref({ priority: 'high' })
      const { pinia } = mountSimple({ meta: metaRef })
      const queryCache = useQueryCache(pinia)

      await flushPromises()

      const entry = queryCache.getEntries({ key: ['key'] }).at(0)!
      expect(entry).toBeDefined()
      expect(entry.meta).toEqual({ priority: 'high' })
      expect(entry.options?.meta).toBe(metaRef)
    })

    it('defaults to empty object when meta is not provided', async () => {
      const { pinia } = mountSimple()
      const queryCache = useQueryCache(pinia)

      await flushPromises()

      const entry = queryCache.getEntries({ key: ['key'] }).at(0)!
      expect(entry).toBeDefined()
      expect(entry.meta).toEqual({})
    })
  })
})
