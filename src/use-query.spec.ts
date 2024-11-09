import type { MockInstance } from 'vitest'
import type { GlobalMountOptions } from '../test/utils'
import type { UseQueryOptions } from './query-options'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, nextTick, ref } from 'vue'
import { mockWarn } from '../test/mock-warn'
import { createSerializedTreeNodeEntry, delay, isSpy, promiseWithResolvers } from '../test/utils'
import { PiniaColada } from './pinia-colada'
import { hydrateQueryCache, QUERY_STORE_ID, useQueryCache } from './query-store'
import type { UseQueryEntryNodeSerialized } from './tree-map'
import { entryNodeSize } from './tree-map'
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

  function mountSimple<TResult = number, TError = Error>(
    options: Partial<UseQueryOptions<TResult>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const query = options.query
      ? isSpy(options.query)
        ? options.query
        : vi.fn(options.query)
      : vi.fn(async () => 42)
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          const useQueryResult = useQuery<TResult, TError>({
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
          plugins: [...(mountOptions?.plugins || [createPinia()]), PiniaColada],
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

    it('it works with a synchronously thrown Error', async () => {
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

    it('keeps the cache forever if gcTime is false', async () => {
      const { wrapper } = mountSimple({ gcTime: false })
      const cache = useQueryCache()

      await flushPromises()
      expect(cache.getQueryData(['key'])).toBe(42)
      wrapper.unmount()
      vi.advanceTimersByTime(1000000)
      expect(cache.getQueryData(['key'])).toBe(42)
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

    it('ignores the placeholderData if it returns a nullish value', async () => {
      const { wrapper } = mountSimple({
        query: async () => 42,
        placeholderData: () => null,
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
      expect(cache.getEntries({
        key: ['id'],
      }).at(0)?.state.value).toEqual({
        status: 'pending',
        data: undefined,
        error: null,
      })
      expect(cache.getQueryData(['id'])).toBe(undefined)
      await flushPromises()
      expect(cache.getEntries({
        key: ['id'],
      }).at(0)?.state.value).toEqual({
        status: 'success',
        data: 42,
        error: null,
      })
      expect(cache.getQueryData(['id'])).toBe(42)
    })
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
              PiniaColada,
            ],
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
      entry.pending?.abortController.abort(new Error('from test'))
      resolve()

      await flushPromises()
      expect(entry.state.value.data).toBe(undefined)
      expect(wrapper.vm.data).toBe(undefined)
    })
  })

  it('can be cancelled through the queryCache without refetching', async () => {
    const { query } = mountSimple({
      key: ['key'],
      query: async () => {
        await delay(100)
        return 'ok'
      },
    })

    const queryCache = useQueryCache()
    const entry = queryCache.getEntries({ key: ['key'] })[0]
    expect(entry).toBeDefined()
    queryCache.cancel(entry)

    vi.advanceTimersByTime(100)
    await flushPromises()

    expect(query).toHaveBeenCalledTimes(1)
  })

  it('stays stale if it is cancelled before the query resolves', async () => {
    mountSimple({
      key: ['key'],
      query: async () => {
        await delay(100)
        return 'ok'
      },
    })

    const queryCache = useQueryCache()
    const entry = queryCache.getEntries({ key: ['key'] })[0]
    expect(entry).toBeDefined()
    queryCache.cancel(entry)

    vi.advanceTimersByTime(100)
    await flushPromises()

    expect(entry.stale).toBe(true)
  })

  it('stays not stale if it is cancelled but has resolved before', async () => {
    mountSimple({
      key: ['key'],
      query: async () => {
        await delay(100)
        return 'ok'
      },
      staleTime: 500,
    })

    vi.advanceTimersByTime(100)
    await flushPromises()

    const queryCache = useQueryCache()
    const entry = queryCache.getEntries({ key: ['key'] })[0]
    expect(entry).toBeDefined()
    expect(entry.stale).toBe(false)
    queryCache.refresh(entry)
    queryCache.cancel(entry)

    await flushPromises()
    expect(entry.stale).toBe(false)
  })

  it('can be invalidated through the queryCache to refetch', async () => {
    const { query } = mountSimple({
      key: ['key'],
      query: async () => {
        await delay(100)
        return 'ok'
      },
    })

    const queryCache = useQueryCache()
    queryCache.invalidateQueries({ key: ['key'] })

    vi.advanceTimersByTime(100)
    await flushPromises()

    expect(query).toHaveBeenCalledTimes(2)
  })

  describe('shared state', () => {
    it('reuses the same state for the same key', async () => {
      const pinia = createPinia()
      const query = vi.fn().mockResolvedValue(42)
      mountSimple({ key: ['todos'], query }, { plugins: [pinia] })
      mountSimple({ key: ['todos'], query }, { plugins: [pinia] })
      await flushPromises()

      const queryCache = useQueryCache()
      expect(entryNodeSize(queryCache.caches)).toBe(1)

      mountSimple({ key: ['todos', 2] }, { plugins: [pinia] })
      await flushPromises()

      expect(entryNodeSize(queryCache.caches)).toBe(2)
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
      const query = vi.fn().mockResolvedValue(42)
      mountSimple(
        { key: ['todos', { id: 5, a: true, b: 'hello' }], query },
        { plugins: [pinia] },
      )
      mountSimple(
        { key: ['todos', { a: true, id: 5, b: 'hello' }], query },
        { plugins: [pinia] },
      )
      mountSimple(
        { key: ['todos', { id: 5, a: true, b: 'hello' }], query },
        { plugins: [pinia] },
      )
      await flushPromises()

      const cacheClient = useQueryCache()
      expect(entryNodeSize(cacheClient.caches)).toBe(2)
    })
  })

  describe('hydration', () => {
    function createHydratedCache(caches: UseQueryEntryNodeSerialized[]) {
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
      const pinia = createHydratedCache([createSerializedTreeNodeEntry('key', 2, null, Date.now())])

      const { wrapper } = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      // without waiting for the data is present
      expect(wrapper.vm.data).toBe(2)
    })

    it('avoids fetching if initial data is fresh', async () => {
      const pinia = createHydratedCache(
        [createSerializedTreeNodeEntry('key', 2, null, Date.now())],
      )

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
      const caches = [
        createSerializedTreeNodeEntry('key', undefined, new Error('fail'), Date.now()),
      ]
      const pinia = createHydratedCache(caches)
      const { wrapper } = mountSimple({ refetchOnMount: false }, { plugins: [pinia] })

      expect(wrapper.vm.status).toBe('error')
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      expect(wrapper.vm.data).toBe(undefined)
    })

    it('sets the initial error even with initialData', async () => {
      const caches = [
        createSerializedTreeNodeEntry('key', undefined, new Error('fail'), Date.now()),
      ]
      const pinia = createHydratedCache(caches)
      const { wrapper } = mountSimple(
        { refetchOnMount: false, initialData: () => 42 },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.status).toBe('error')
      expect(wrapper.vm.error).toEqual(new Error('fail'))
    })

    it.todo('initialData is ignored if there is already data in the cache')

    it('refreshes the data even with initial values after staleTime is elapsed', async () => {
      const pinia = createHydratedCache([createSerializedTreeNodeEntry('key', 60, null, Date.now())])
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

    it('warns if the same key is used with different options while mounting different components', async () => {
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

      expect(/The same query key \[id\] was used with different query functions/).toHaveBeenWarned()
    })

    // this is for data loaders
    it('warns if the same key is used twice with different functions in the same component', async () => {
      const pinia = createPinia()
      mount(
        defineComponent({
          render: () => null,
          __hmrId: 'some-id',
          setup() {
            // wrong usage
            useQuery({ key: ['id'], query: async () => 42 })
            useQuery({ key: ['id'], query: async () => 42 })
            return {}
          },
        }),
        {
          global: {
            plugins: [pinia, PiniaColada],
          },
        },
      )

      await flushPromises()

      expect(/The same query key \[id\] was used with different query functions/).toHaveBeenWarned()
    })

    it('does not warn if the same key is used during HMR', async () => {
      const component = defineComponent({
        render: () => null,
        setup() {
          useQuery({ key: ['id'], query: async () => 42 })
          return {}
        },
        // to simulate HMR
        __hmrId: 'some-id',
      })

      const pinia = createPinia()
      mount(component, { global: { plugins: [pinia, PiniaColada] } })
      mount(component, { global: { plugins: [pinia, PiniaColada] } })
      await flushPromises()
      // No warnings!
    })
  })
})
