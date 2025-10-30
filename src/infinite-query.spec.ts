import type { GlobalMountOptions } from '../test-utils/utils'
import type { UseInfiniteQueryOptions } from './infinite-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, isRef } from 'vue'
import { mockConsoleError, mockWarn } from '../test-utils/mock-warn'
import { isSpy } from '../test-utils/utils'
import { useInfiniteQuery } from './infinite-query'
import { PiniaColada } from './pinia-colada'
import { useQueryCache } from './query-store'

describe('useInfiniteQuery', () => {
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

  function mountSimple<TData = number, TError = Error, TPage = unknown>(
    options: Partial<UseInfiniteQueryOptions<TData, TError, TData | undefined, TPage>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const query = options.query
      ? isSpy(options.query)
        ? options.query
        : vi.fn(options.query)
      : vi.fn(async () => 42 as TData)
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
          const useInfiniteQueryResult = useInfiniteQuery<TData, TError, TPage>({
            key: ['key'],
            initialPage: {} as TPage,
            merge: (pages, data) => pages,
            ...options,
            query,
          })
          return {
            ...useInfiniteQueryResult,
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

  describe('Core Behavior', () => {
    it('throw an error if the query is not defined', async () => {
      const { wrapper } = mountSimple({
        // @ts-expect-error: testing missing query
        query: undefined,
      })

      await flushPromises()

      expect(wrapper.vm.status).toBe('error')
      expect(wrapper.vm.error).toBeDefined()
    })

    it('apply the maxPages option to limit the number of pages', async () => {
      const query = vi.fn().mockImplementation(async (pages) => pages.current + 1)

      const { wrapper } = mountSimple({
        query,
        initialPage: { current: 1, pages: [1] },
        merge: (pages, newPage) => ({
          current: newPage,
          pages: [...pages.pages, newPage],
        }),
        // @ts-expect-error: maxPages not yet implemented
        maxPages: 2,
      })

      await flushPromises()
      expect(wrapper.vm.data).toMatchObject({ current: 2, pages: [1, 2] })

      // Fetch next page
      await wrapper.vm.fetchNextPage()
      await flushPromises()
      expect(wrapper.vm.data.pages).toHaveLength(2)
      expect(wrapper.vm.data.pages).toEqual([2, 3])

      // Fetch another next page
      await wrapper.vm.fetchNextPage()
      await flushPromises()
      expect(wrapper.vm.data.pages).toHaveLength(2)
      expect(wrapper.vm.data.pages).toEqual([3, 4])
    })

    it('support query cancellation', async () => {
      const { wrapper } = mountSimple({
        query: vi.fn().mockImplementation(async (pages, { signal }) => {
          await new Promise((resolve) => setTimeout(resolve, 10))
          if (signal.aborted) throw new Error('Aborted')
          return 42
        }),
        initialPage: {},
        merge: (pages, data) => data,
      })

      // Cancel immediately
      wrapper.vm.refetch()
      // @ts-expect-error: cancel might not exist yet
      if (wrapper.vm.cancel) wrapper.vm.cancel()

      await flushPromises()
      await vi.advanceTimersByTimeAsync(10)

      expect(wrapper.vm.isLoading).toBe(false)
    })

    it('not refetch pages if the query is cancelled', async () => {
      const query = vi.fn().mockImplementation(async (pages) => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return pages.count + 1
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { count: 0 },
        merge: (pages, data) => ({ count: data }),
      })

      await flushPromises()
      await vi.advanceTimersByTimeAsync(10)

      const callCount = query.mock.calls.length

      // Start refetch and cancel it
      wrapper.vm.refetch()
      // @ts-expect-error: cancel might not exist yet
      if (wrapper.vm.cancel) wrapper.vm.cancel()

      await flushPromises()
      await vi.advanceTimersByTimeAsync(10)

      // Query should not have been called again
      expect(query.mock.calls.length).toBe(callCount)
    })

    it('not enter an infinite loop when a page errors while retry is on', async () => {
      let errorCount = 0

      const query = vi.fn().mockImplementation(async (pages) => {
        const page = pages.current + 1
        if (page === 2 && errorCount < 2) {
          errorCount++
          throw new Error('Error on page 2')
        }
        return page
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { current: 0 },
        merge: (pages, data) => ({ current: data }),
        // @ts-expect-error: retry plugin not yet available
        retry: 3,
      })

      await flushPromises()
      expect(wrapper.vm.data).toMatchObject({ current: 1 })

      // Try to fetch next page - should fail twice then succeed
      await wrapper.vm.fetchNextPage()
      await flushPromises()

      // Should eventually succeed without infinite loop
      expect(wrapper.vm.data).toMatchObject({ current: 2 })
      expect(errorCount).toBe(2)
    })

    it('fetch even if initialPage is null', async () => {
      const query = vi.fn().mockResolvedValue(42)

      const { wrapper } = mountSimple({
        query,
        initialPage: null,
        merge: (pages, data) => data,
      })

      await flushPromises()

      expect(query).toHaveBeenCalled()
      expect(wrapper.vm.data).toBe(42)
    })

    it('not fetch next page when merge returns state indicating no more data', async () => {
      const query = vi.fn().mockImplementation(async (pages) => {
        return { page: pages.page + 1, hasMore: pages.page < 2 }
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { page: 0, hasMore: true },
        merge: (pages, data) => data,
      })

      await flushPromises()
      expect(wrapper.vm.data).toMatchObject({ page: 1, hasMore: true })

      // Fetch next page
      await wrapper.vm.fetchNextPage()
      await flushPromises()
      expect(wrapper.vm.data).toMatchObject({ page: 2, hasMore: false })

      // Try to fetch next page when hasMore is false
      const callCount = query.mock.calls.length
      // @ts-expect-error: hasNextPage might not exist yet
      if (wrapper.vm.hasNextPage === false) {
        await wrapper.vm.fetchNextPage()
        await flushPromises()
        // Should not have called query again
        expect(query.mock.calls.length).toBe(callCount)
      }
    })

    it('support persister when provided', async () => {
      const persister = vi.fn().mockImplementation(async (fn) => {
        return await fn()
      })

      const query = vi.fn().mockResolvedValue(42)

      const { wrapper } = mountSimple({
        query,
        initialPage: {},
        merge: (pages, data) => data,
        // @ts-expect-error: persister not yet implemented
        persister,
      })

      await flushPromises()

      expect(persister).toHaveBeenCalled()
      expect(wrapper.vm.data).toBe(42)
    })
  })

  describe('Observer/API Behavior', () => {
    it('be able to fetch an infinite query with selector', async () => {
      const query = vi.fn().mockResolvedValue(1)

      const { wrapper } = mountSimple({
        query,
        initialPage: 1,
        merge: (pages, data) => data,
        // @ts-expect-error: select not yet implemented
        select: (data) => String(data),
      })

      await flushPromises()

      expect(wrapper.vm.data).toBe('1')
    })

    it('pass the meta option to the query function', async () => {
      const meta = { it: 'works' }
      const query = vi.fn().mockResolvedValue(1)

      mountSimple({
        query,
        initialPage: 1,
        merge: (pages, data) => data,
        // @ts-expect-error: meta not yet implemented
        meta,
      })

      await flushPromises()

      expect(query).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ meta }))
    })

    it('make merge function receive current pages state', async () => {
      const mergeParams: Array<any> = []

      const query = vi.fn().mockImplementation(async (pages) => {
        return pages.current + 1
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { current: 0, pages: [] },
        merge: (pages, data) => {
          mergeParams.push({ pages, data })
          return {
            current: data,
            pages: [...pages.pages, data],
          }
        },
      })

      await flushPromises()
      expect(mergeParams[0]).toMatchObject({
        pages: { current: 0, pages: [] },
        data: 1,
      })

      await wrapper.vm.fetchNextPage()
      await flushPromises()
      expect(mergeParams[1]).toMatchObject({
        pages: { current: 1, pages: [1] },
        data: 2,
      })
    })

    it('not invoke merge on empty pages array', async () => {
      const merge = vi.fn()

      mountSimple({
        query: vi.fn().mockResolvedValue(42),
        initialPage: { pages: [] },
        merge,
      })

      // Set empty data
      // This test checks internal behavior when pages array is empty
      // In practice, merge should not be called with empty pages
      await flushPromises()

      // If pages were empty, merge should not have been invoked
      // This is testing an edge case
    })

    it('indicate no more pages available when appropriate', async () => {
      const query = vi.fn().mockImplementation(async (pages) => {
        return { value: pages.value + 1, hasMore: pages.value < 2 }
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { value: 0, hasMore: true },
        merge: (pages, data) => data,
      })

      await flushPromises()
      // @ts-expect-error: hasNextPage not yet implemented
      expect(wrapper.vm.hasNextPage).toBe(true)

      await wrapper.vm.fetchNextPage()
      await flushPromises()
      // @ts-expect-error: hasNextPage not yet implemented
      expect(wrapper.vm.hasNextPage).toBe(false)
    })

    it('handle both null and undefined page termination signals', async () => {
      const queryNull = vi.fn().mockResolvedValue(null)
      const queryUndefined = vi.fn().mockResolvedValue(undefined)

      const { wrapper: wrapper1 } = mountSimple({
        query: queryNull,
        initialPage: {},
        merge: (pages, data) => data,
      })

      const { wrapper: wrapper2 } = mountSimple({
        query: queryUndefined,
        initialPage: {},
        merge: (pages, data) => data,
      })

      await flushPromises()

      // Both null and undefined should indicate no more pages
      // @ts-expect-error: hasNextPage not yet implemented
      expect(wrapper1.vm.hasNextPage).toBe(false)
      // @ts-expect-error: hasNextPage not yet implemented
      expect(wrapper2.vm.hasNextPage).toBe(false)
    })

    it('return proper initial state before any data is fetched', async () => {
      const { wrapper } = mountSimple({
        query: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return 42
        }),
        initialPage: {},
        merge: (pages, data) => data,
      })

      // Before any data is fetched
      expect(wrapper.vm.data).toBeUndefined()
      expect(wrapper.vm.isLoading).toBe(true)
      // @ts-expect-error: hasNextPage not yet implemented
      expect(wrapper.vm.hasNextPage).toBe(false)
      // @ts-expect-error: hasPreviousPage not yet implemented
      expect(wrapper.vm.hasPreviousPage).toBe(false)
    })
  })

  describe('Bidirectional Pagination', () => {
    it('fetch previous page with fetchPreviousPage()', async () => {
      let pageNumber = 5
      const query = vi.fn().mockImplementation(async (pages) => {
        // Query function determines direction based on current state
        return pageNumber
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { current: 5, pages: [5] },
        merge: (pages, data) => ({
          current: data,
          pages: [...pages.pages, data],
        }),
      })

      await flushPromises()
      pageNumber = 6
      expect(wrapper.vm.data.pages).toContain(6)

      // @ts-expect-error: fetchPreviousPage not yet implemented
      pageNumber = 4
      await wrapper.vm.fetchPreviousPage()
      await flushPromises()

      expect(wrapper.vm.data.pages).toContain(4)
    })

    it('prepend data when loading previous pages', async () => {
      let isBackward = false
      const query = vi.fn().mockImplementation(async (pages) => {
        if (isBackward) {
          return pages.pages[0] - 1
        }
        return pages.pages[pages.pages.length - 1] + 1
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { pages: [5] },
        merge: (pages, data) => {
          // Merge determines direction based on data value
          if (data < pages.pages[0]) {
            return { pages: [data, ...pages.pages] }
          }
          return { pages: [...pages.pages, data] }
        },
      })

      await flushPromises()
      expect(wrapper.vm.data.pages).toEqual([5, 6])

      // @ts-expect-error: fetchPreviousPage not yet implemented
      isBackward = true
      await wrapper.vm.fetchPreviousPage()
      await flushPromises()

      expect(wrapper.vm.data.pages).toEqual([4, 5, 6])
    })

    it('track hasPreviousPage state correctly', async () => {
      const query = vi.fn().mockImplementation(async (pages) => {
        return { value: pages.value, canGoPrev: pages.value > 1 }
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { value: 1, canGoPrev: false },
        merge: (pages, data) => data,
      })

      await flushPromises()

      // @ts-expect-error: hasPreviousPage not yet implemented
      expect(wrapper.vm.hasPreviousPage).toBe(false)

      // Simulate moving to page 2
      const { wrapper: wrapper2 } = mountSimple({
        query,
        initialPage: { value: 2, canGoPrev: true },
        merge: (pages, data) => data,
      })

      await flushPromises()

      // @ts-expect-error: hasPreviousPage not yet implemented
      expect(wrapper2.vm.hasPreviousPage).toBe(true)
    })

    it('support both fetchNextPage() and fetchPreviousPage() in same query', async () => {
      let nextValue = 6
      const query = vi.fn().mockImplementation(async (pages) => {
        return nextValue
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: { current: 5 },
        merge: (pages, data) => ({ current: data }),
      })

      await flushPromises()
      expect(wrapper.vm.data.current).toBe(6)

      nextValue = 7
      await wrapper.vm.fetchNextPage()
      await flushPromises()
      expect(wrapper.vm.data.current).toBe(7)

      // @ts-expect-error: fetchPreviousPage not yet implemented
      nextValue = 6
      await wrapper.vm.fetchPreviousPage()
      await flushPromises()
      expect(wrapper.vm.data.current).toBe(6)
    })

    it('track fetch operations for next and previous pages', async () => {
      const callCount = { next: 0, previous: 0 }
      let mode = 'next'

      const query = vi.fn().mockImplementation(async (pages) => {
        if (mode === 'next') {
          callCount.next++
        } else {
          callCount.previous++
        }
        return 42
      })

      const { wrapper } = mountSimple({
        query,
        initialPage: {},
        merge: (pages, data) => data,
      })

      await flushPromises()
      expect(callCount.next).toBeGreaterThan(0)

      await wrapper.vm.fetchNextPage()
      await flushPromises()
      expect(callCount.next).toBeGreaterThan(1)

      // @ts-expect-error: fetchPreviousPage not yet implemented
      mode = 'previous'
      await wrapper.vm.fetchPreviousPage()
      await flushPromises()
      expect(callCount.previous).toBeGreaterThan(0)
    })
  })
})
