import type { GlobalMountOptions } from '../test-utils/utils'
import type { UseInfiniteQueryFnContext, UseInfiniteQueryOptions } from './infinite-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, isRef, nextTick } from 'vue'
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

  function mountSimple<TData = number, TError = Error, TPageParam = unknown>(
    options: Partial<UseInfiniteQueryOptions<TData, TError, TPageParam>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const query = options.query
      ? isSpy(options.query)
        ? options.query
        : vi.fn(options.query)
      : vi.fn(
          async ({ pageParam }: UseInfiniteQueryFnContext<NoInfer<TPageParam>>): Promise<TData> => {
            if (typeof pageParam === 'number') {
              return [pageParam * 3 + 1, pageParam * 3 + 2, pageParam * 3 + 3] as unknown as TData
            }
            console.warn('Missing implementation for non-number page params.')
            return [1, 2, 3] as unknown as TData
          },
        )
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
          const useInfiniteQueryResult = useInfiniteQuery<TData, TError, TPageParam>({
            key: ['key'],
            initialPageParam: 0 as TPageParam,
            getNextPageParam(lastPage, allPages, lastPageParam, allPageParams) {
              if (typeof lastPageParam === 'number') {
                return lastPageParam >= 3 ? null : ((lastPageParam + 1) as TPageParam)
              }
              console.warn(
                'Missing implementation for getNextPageParam with non-number page params',
              )
              return null
            },
            getPreviousPageParam(lastPage, allPages, firstPageParam, allPageParams) {
              if (typeof firstPageParam === 'number' && firstPageParam > -1) {
                return firstPageParam > 0 ? ((firstPageParam - 1) as TPageParam) : null
              }
              console.warn(
                `Missing implementation for getPreviousPageParam with non-number page params. Got ${typeof firstPageParam} ${String(firstPageParam)}`,
              )
            },
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
    return { wrapper, query, pinia, queryCache }
  }

  it('appends data when fetching next pages', async () => {
    const { wrapper } = mountSimple()

    await flushPromises()

    expect(wrapper.vm.data).toEqual({
      pages: [[1, 2, 3]],
      pageParams: [0],
    })

    await wrapper.vm.loadNextPage()

    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      pageParams: [0, 1],
    })
  })

  it('applies the maxPages option to limit the number of pages', async () => {
    const { wrapper } = mountSimple({
      maxPages: 2,
    })

    await flushPromises()

    // Load 3 more pages (total 4 pages)
    await wrapper.vm.loadNextPage()
    await wrapper.vm.loadNextPage()
    await wrapper.vm.loadNextPage()

    // With maxPages: 2, should only have 2 pages
    expect(wrapper.vm.data?.pages).toEqual([
      [7, 8, 9],
      [10, 11, 12],
    ])
    expect(wrapper.vm.data?.pageParams).toEqual([2, 3])
  })

  it('should refetch all pages sequentially when refreshing after being invalidated', async () => {
    const { wrapper, query, queryCache } = mountSimple()

    await flushPromises()
    await wrapper.vm.loadNextPage()
    await wrapper.vm.loadNextPage()

    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [0, 1, 2],
    })

    // Reset the mock to track calls
    query.mockClear()

    // Invalidate the query
    const entry = queryCache.get(['key'])!
    expect(entry).toBeDefined()
    queryCache.invalidate(entry)

    await flushPromises()

    // Should have refetched all 3 pages sequentially
    expect(query).toHaveBeenCalledTimes(3)
    expect(query).toHaveBeenNthCalledWith(1, expect.objectContaining({ pageParam: 0 }))
    expect(query).toHaveBeenNthCalledWith(2, expect.objectContaining({ pageParam: 1 }))
    expect(query).toHaveBeenNthCalledWith(3, expect.objectContaining({ pageParam: 2 }))
  })

  it('should refetch all pages sequentially when calling refetch()', async () => {
    const { wrapper, query } = mountSimple()

    await flushPromises()
    await wrapper.vm.loadNextPage()
    await wrapper.vm.loadNextPage()

    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [0, 1, 2],
    })

    // Reset the mock to track calls
    query.mockClear()

    // Manually call refetch
    await wrapper.vm.refetch()

    // Should have refetched all 3 pages sequentially
    expect(query).toHaveBeenCalledTimes(3)
    expect(query).toHaveBeenNthCalledWith(1, expect.objectContaining({ pageParam: 0 }))
    expect(query).toHaveBeenNthCalledWith(2, expect.objectContaining({ pageParam: 1 }))
    expect(query).toHaveBeenNthCalledWith(3, expect.objectContaining({ pageParam: 2 }))
  })

  it('should propagate errors', async () => {
    const { wrapper } = mountSimple({
      query: async () => {
        throw new Error('Test error')
      },
    })
    await flushPromises()

    expect(wrapper.vm.error).toBeInstanceOf(Error)
    expect(wrapper.vm.error?.message).toBe('Test error')
    expect(wrapper.vm.status).toBe('error')
  })

  it('should not be pending if initial data is provided', async () => {
    const { wrapper } = mountSimple({
      initialData: () => ({
        pages: [[10, 20, 30]],
        pageParams: [5],
      }),
    })

    // Should not be pending with initial data
    expect(wrapper.vm.status).not.toBe('pending')
    expect(wrapper.vm.data).toEqual({
      pages: [[10, 20, 30]],
      pageParams: [5],
    })
  })

  it('should be loading when fetching next page', async () => {
    const { wrapper } = mountSimple()

    await flushPromises()

    // Should not be loading initially
    expect(wrapper.vm.isLoading).toBe(false)

    // Start loading next page
    const promise = wrapper.vm.loadNextPage()

    // Should be loading while fetching
    expect(wrapper.vm.isLoading).toBe(true)

    await promise

    // Should not be loading after fetch completes
    expect(wrapper.vm.isLoading).toBe(false)
  })

  it('calls getNextPageParam with correct parameters', async () => {
    const getNextPageParam = vi.fn((lastPage, allPages, lastPageParam, allPageParams) => {
      return lastPageParam >= 2 ? null : lastPageParam + 1
    })

    const { wrapper } = mountSimple({
      getNextPageParam,
    })

    await flushPromises()

    // we don't check for how many times this function is called because it
    // might be computed multiple times before and after fetching, just to
    // ensure that we're fetching the correct page.
    // expect(getNextPageParam).toHaveBeenCalledTimes(1)
    expect(getNextPageParam).toHaveBeenCalledWith(
      [1, 2, 3], // lastPage
      [[1, 2, 3]], // allPages
      0, // lastPageParam
      [0], // allPageParams
    )

    getNextPageParam.mockClear()
    await wrapper.vm.loadNextPage()

    // same as above
    // expect(getNextPageParam).toHaveBeenCalledTimes(1)
    expect(getNextPageParam).toHaveBeenCalledWith(
      [4, 5, 6], // lastPage
      [
        [1, 2, 3],
        [4, 5, 6],
      ], // allPages
      1, // lastPageParam
      [0, 1], // allPageParams
    )
    await flushPromises()
  })

  it.todo('only takes into account the latest call to loadNextPage', async () => {})

  it.todo('loadNextPage throws by default if the query does')
  it.todo('loadNextPage catches errors if throwOnError is set to false')

  it('sets hasNextPage to false if getNextPageParam returns null', async () => {
    const { wrapper } = mountSimple({
      getNextPageParam: (lastPage, allPages, lastPageParam) => {
        // Only allow one page
        return null
      },
    })

    await flushPromises()

    expect(wrapper.vm.hasNextPage).toBe(false)
  })

  it('stops fetching next pages if hasNextPage is false', async () => {
    const { wrapper } = mountSimple({
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages, lastPageParam) => {
        return lastPageParam >= 2 ? null : lastPageParam + 1
      },
    })
    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[1, 2, 3]], pageParams: [0] })
    await wrapper.vm.loadNextPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      pageParams: [0, 1],
    })
    await wrapper.vm.loadNextPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [0, 1, 2],
    })
    // should do nothing
    await wrapper.vm.loadNextPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [0, 1, 2],
    })
  })

  it('updates hasNextPage when loading pages', async () => {
    const { wrapper } = mountSimple({
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages, lastPageParam) => {
        return lastPageParam >= 2 ? null : lastPageParam + 1
      },
    })
    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[1, 2, 3]], pageParams: [0] })
    expect(wrapper.vm.hasNextPage).toBe(true)
    await wrapper.vm.loadNextPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      pageParams: [0, 1],
    })
    await wrapper.vm.loadNextPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [0, 1, 2],
    })
    expect(wrapper.vm.hasNextPage).toBe(false)
  })

  it.todo(
    'does not call the query if getNextPageParam returns null on initial fetch',
    async () => {},
  )

  it.todo('does not calll the query if getNextPageParam returns null', async () => {})

  it.todo('calls getPreviousPageParam with correct parameters', async () => {})

  it('prepends data when fetching previous pages', async () => {
    const { wrapper } = mountSimple({
      initialPageParam: 2,
    })

    await flushPromises()

    expect(wrapper.vm.data).toEqual({
      pages: [[7, 8, 9]],
      pageParams: [2],
    })

    await wrapper.vm.loadPreviousPage()

    expect(wrapper.vm.data).toEqual({
      pages: [
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [1, 2],
    })
  })

  it('allows loadPreviousPage if getPreviousPageParam is provided', async () => {
    const { wrapper } = mountSimple({
      initialPageParam: 1,
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        return firstPageParam > 0 ? firstPageParam - 1 : null
      },
    })

    await flushPromises()
    expect(wrapper.vm.data).toEqual({
      pages: [[4, 5, 6]],
      pageParams: [1],
    })

    expect(wrapper.vm.hasPreviousPage).toBe(true)
    await wrapper.vm.loadPreviousPage()

    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      pageParams: [0, 1],
    })
  })

  it('sets hasPreviousPage to false if getPreviousPageParam returns null', async () => {
    const { wrapper } = mountSimple({
      initialPageParam: 0,
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        // No previous pages available
        return null
      },
    })

    await flushPromises()

    // Should have no previous page available
    expect(wrapper.vm.hasPreviousPage).toBe(false)
  })

  it.todo('stops fetching previous pages if hasPreviousPage is false', async () => {})
  it.todo('updates hasPreviousPage when loading pages', async () => {})

  it.todo('only takes into account the latest call to loadPreviousPage', async () => {})
  it.todo('loadPreviousPage throws by default if the query does')
  it.todo('loadPreviousPage catches errors if throwOnError is set to false')
})
