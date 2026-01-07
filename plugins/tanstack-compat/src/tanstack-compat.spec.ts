import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { createPinia } from 'pinia'
import { useQuery, useMutation, PiniaColada, useMutationCache } from '@pinia/colada'
import type {
  PiniaColadaOptions,
  UseQueryOptions,
  UseMutationOptions,
  UseMutationEntry,
} from '@pinia/colada'
import { PiniaColadaTanStackCompat } from './tanstack-compat'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('TanStack Compat plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function queryFactory(options: PiniaColadaOptions, queryOptions?: UseQueryOptions) {
    const pinia = createPinia()
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return {
            ...useQuery(
              queryOptions || {
                query: async () => 42,
                key: ['key'],
              },
            ),
          }
        },
      }),
      {
        global: {
          plugins: [pinia, [PiniaColada, options]],
        },
      },
    )

    return { pinia, wrapper }
  }

  function mutationFactory<TData = string, TVars = void>(
    options: PiniaColadaOptions,
    mutationOptions?: UseMutationOptions<TData, TVars>,
  ) {
    const pinia = createPinia()
    // Store the entry ref so tests can access ext properties
    const entryRef = ref<UseMutationEntry | null>(null)
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          const mutationReturn = useMutation(
            mutationOptions ||
              ({
                mutation: async () => 'ok' as TData,
                key: ['test-mutation'],
              } as UseMutationOptions<TData, TVars>),
          )
          // Get the entry from the mutation cache after first mutation
          const mutationCache = useMutationCache()
          // We need to get the entry - mutations only get added to cache when called
          // For initial state tests, we need to call mutate once first
          return {
            ...mutationReturn,
            getMutationEntry: () => {
              const entries = mutationCache.getEntries({ key: ['test-mutation'] })
              return entries[0] || null
            },
          }
        },
      }),
      {
        global: {
          plugins: [pinia, [PiniaColada, options]],
        },
      },
    )

    return { pinia, wrapper }
  }

  describe('useQuery extensions', () => {
    it('adds isSuccess and isError flags', async () => {
      const query = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query },
      )

      // Initial state
      expect(wrapper.vm.isSuccess).toBe(false)
      expect(wrapper.vm.isError).toBe(false)

      // After successful fetch
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.isSuccess).toBe(true)
      expect(wrapper.vm.isError).toBe(false)
    })

    it('sets isError on query failure', async () => {
      const query = vi.fn(async () => {
        await delay(100)
        throw new Error('fail')
      })

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query },
      )

      expect(wrapper.vm.isError).toBe(false)

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.isError).toBe(true)
      expect(wrapper.vm.isSuccess).toBe(false)
    })

    it('adds isFetching and isRefetching flags', async () => {
      const query = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query },
      )

      // Initial fetch
      expect(wrapper.vm.isFetching).toBe(true)
      expect(wrapper.vm.isRefetching).toBe(false) // Not refetching on first load

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.isFetching).toBe(false)
      expect(wrapper.vm.isRefetching).toBe(false)

      // Trigger refetch
      wrapper.vm.refetch()
      await nextTick()

      expect(wrapper.vm.isFetching).toBe(true)
      expect(wrapper.vm.isRefetching).toBe(true) // Now it's a refetch

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.isFetching).toBe(false)
      expect(wrapper.vm.isRefetching).toBe(false)
    })

    it('adds isLoadingError and isRefetchError flags', async () => {
      let shouldFail = true
      const query = vi.fn(async () => {
        await delay(100)
        if (shouldFail) throw new Error('fail')
        return 'ok'
      })

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query },
      )

      // Initial load fails
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.isLoadingError).toBe(true)
      expect(wrapper.vm.isRefetchError).toBe(false)

      // Refetch succeeds
      shouldFail = false
      wrapper.vm.refetch()
      await nextTick()
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.isLoadingError).toBe(false)
      expect(wrapper.vm.isRefetchError).toBe(false)
      expect(wrapper.vm.isSuccess).toBe(true)

      // Refetch fails (now it's a refetch error since we had data)
      shouldFail = true
      wrapper.vm.refetch()
      await nextTick()
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.isLoadingError).toBe(false)
      expect(wrapper.vm.isRefetchError).toBe(true)
    })

    it('adds isStale flag', async () => {
      const query = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      // Set a base time for fake timers
      vi.setSystemTime(new Date(2024, 0, 1, 0, 0, 0))

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query, staleTime: 1000 },
      )

      // Initially stale (no data)
      expect(wrapper.vm.isStale).toBe(true)

      vi.advanceTimersByTime(100)
      await flushPromises()

      // Fresh after fetch
      expect(wrapper.vm.isStale).toBe(false)

      // Note: isStale only re-evaluates on state changes, not automatically over time.
      // Time-based staleness would require periodic re-evaluation or a timer.
      // For now, we verify it's correct immediately after state changes.
    })

    it('adds isFetched and isFetchedAfterMount flags', async () => {
      const query = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query },
      )

      // Before fetch completes
      expect(wrapper.vm.isFetched).toBe(false)
      expect(wrapper.vm.isFetchedAfterMount).toBe(false)

      vi.advanceTimersByTime(100)
      await flushPromises()

      // After fetch completes
      expect(wrapper.vm.isFetched).toBe(true)
      expect(wrapper.vm.isFetchedAfterMount).toBe(true)
    })

    it('adds dataUpdatedAt and errorUpdatedAt timestamps', async () => {
      const query = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query },
      )

      // Initially 0
      expect(wrapper.vm.dataUpdatedAt).toBe(0)
      expect(wrapper.vm.errorUpdatedAt).toBe(0)

      vi.advanceTimersByTime(100)
      await flushPromises()

      // dataUpdatedAt is set after success
      expect(wrapper.vm.dataUpdatedAt).toBeGreaterThan(0)
      expect(wrapper.vm.errorUpdatedAt).toBe(0)
    })

    it('updates errorUpdatedAt on error', async () => {
      const query = vi.fn(async () => {
        await delay(100)
        throw new Error('fail')
      })

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query },
      )

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.errorUpdatedAt).toBeGreaterThan(0)
    })

    it('adds fetchStatus computed', async () => {
      const query = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = queryFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { key: ['key'], query },
      )

      expect(wrapper.vm.fetchStatus).toBe('fetching')

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.fetchStatus).toBe('idle')
    })
  })

  describe('useMutation extensions', () => {
    // Note: Mutation ext properties are added to the entry, but useMutation()
    // doesn't expose them in its return value (unlike useQuery).
    // These tests verify the properties are correctly set on entry.ext
    // after the mutation is called (which adds it to the cache).

    it('adds isIdle, isPending, isSuccess, isError flags to entry.ext', async () => {
      const mutation = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = mutationFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { mutation, key: ['test-mutation'] },
      )

      // Trigger mutation to add entry to cache
      wrapper.vm.mutate()
      await nextTick()

      const entry = wrapper.vm.getMutationEntry()
      expect(entry).not.toBeNull()

      // During mutation
      expect(entry!.ext.isIdle!.value).toBe(false)
      expect(entry!.ext.isPending!.value).toBe(true)
      expect(entry!.ext.isSuccess!.value).toBe(false)
      expect(entry!.ext.isError!.value).toBe(false)

      vi.advanceTimersByTime(100)
      await flushPromises()

      // After success
      expect(entry!.ext.isIdle!.value).toBe(false)
      expect(entry!.ext.isPending!.value).toBe(false)
      expect(entry!.ext.isSuccess!.value).toBe(true)
      expect(entry!.ext.isError!.value).toBe(false)
    })

    it('sets isError on mutation failure', async () => {
      const mutation = vi.fn(async () => {
        await delay(100)
        throw new Error('fail')
      })

      const { wrapper } = mutationFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { mutation, key: ['test-mutation'] },
      )

      wrapper.vm.mutate()
      await nextTick()

      const entry = wrapper.vm.getMutationEntry()

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(entry!.ext.isError!.value).toBe(true)
      expect(entry!.ext.isSuccess!.value).toBe(false)
      expect(entry!.ext.isPending!.value).toBe(false)
    })

    it('adds submittedAt timestamp', async () => {
      const mutation = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = mutationFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { mutation, key: ['test-mutation'] },
      )

      wrapper.vm.mutate()
      await nextTick()

      const entry = wrapper.vm.getMutationEntry()
      expect(entry!.ext.submittedAt!.value).toBeGreaterThan(0)
    })

    it('adds dataUpdatedAt and errorUpdatedAt timestamps', async () => {
      const mutation = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = mutationFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { mutation, key: ['test-mutation'] },
      )

      wrapper.vm.mutate()
      await nextTick()

      const entry = wrapper.vm.getMutationEntry()
      // Initially 0 before completion
      expect(entry!.ext.errorUpdatedAt!.value).toBe(0)

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(entry!.ext.dataUpdatedAt!.value).toBeGreaterThan(0)
      expect(entry!.ext.errorUpdatedAt!.value).toBe(0)
    })

    it('updates errorUpdatedAt on mutation error', async () => {
      const mutation = vi.fn(async () => {
        await delay(100)
        throw new Error('fail')
      })

      const { wrapper } = mutationFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { mutation, key: ['test-mutation'] },
      )

      wrapper.vm.mutate()
      await nextTick()
      const entry = wrapper.vm.getMutationEntry()

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(entry!.ext.errorUpdatedAt!.value).toBeGreaterThan(0)
    })

    it('handles state changes correctly across mutation lifecycle', async () => {
      const mutation = vi.fn(async () => {
        await delay(100)
        return 'ok'
      })

      const { wrapper } = mutationFactory(
        { plugins: [PiniaColadaTanStackCompat()] },
        { mutation, key: ['test-mutation'] },
      )

      // First mutation
      wrapper.vm.mutate()
      await nextTick()
      const entry1 = wrapper.vm.getMutationEntry()
      expect(entry1).not.toBeNull()

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(entry1!.ext.isSuccess!.value).toBe(true)
      expect(entry1!.ext.isIdle!.value).toBe(false)

      // Note: reset() creates a new entry in useMutation's local scope.
      // The old cached entry retains its state. This is expected behavior
      // as mutations can be called multiple times with different entries.
    })
  })
})
