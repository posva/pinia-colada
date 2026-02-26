import type { GlobalMountOptions } from '@posva/test-utils'
import type {
  UseInfiniteQueryData,
  UseInfiniteQueryFnContext,
  UseInfiniteQueryOptions,
} from './infinite-query'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, isRef, nextTick, ref } from 'vue'
import { isSpy, mockConsoleError, mockWarn } from '@posva/test-utils'
import { useInfiniteQuery } from './infinite-query'
import { PiniaColada } from './pinia-colada'
import {
  hydrateQueryCache,
  QUERY_STORE_ID,
  serializeQueryCache,
  useQueryCache,
} from './query-store'
import type { UseQueryEntryNodeValueSerializd } from './query-store'

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

  function mountSimple<
    TData = Array<number | string>,
    TError = Error,
    TPageParam = number,
    TDataInitial extends UseInfiniteQueryData<TData, TPageParam> | undefined =
      | UseInfiniteQueryData<TData, TPageParam>
      | undefined,
  >(
    options: Partial<UseInfiniteQueryOptions<TData, TError, TPageParam, TDataInitial>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const query = options.query
      ? isSpy(options.query)
        ? options.query
        : vi.fn(options.query)
      : vi.fn(
          async ({
            pageParam,
          }: UseInfiniteQueryFnContext<
            UseInfiniteQueryData<TData, TPageParam>,
            TError,
            TDataInitial,
            TPageParam
          >): Promise<TData> => {
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
            // @ts-expect-error: it's fine
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

  it('applies maxPages when loading previous pages', async () => {
    const { wrapper } = mountSimple({
      maxPages: 2,
      initialPageParam: 3,
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        return firstPageParam > 0 ? firstPageParam - 1 : null
      },
    })

    await flushPromises()

    // Initial page
    expect(wrapper.vm.data).toEqual({
      pages: [[10, 11, 12]],
      pageParams: [3],
    })

    // Load 3 previous pages
    await wrapper.vm.loadPreviousPage()
    await wrapper.vm.loadPreviousPage()
    await wrapper.vm.loadPreviousPage()

    // With maxPages: 2, should only have 2 pages (oldest from the end)
    expect(wrapper.vm.data?.pages).toEqual([
      [1, 2, 3],
      [4, 5, 6],
    ])
    expect(wrapper.vm.data?.pageParams).toEqual([0, 1])
  })

  it('applies maxPages: 1 edge case', async () => {
    const { wrapper } = mountSimple({
      maxPages: 1,
    })

    await flushPromises()

    expect(wrapper.vm.data).toEqual({
      pages: [[1, 2, 3]],
      pageParams: [0],
    })

    await wrapper.vm.loadNextPage()

    // Should only keep the latest page
    expect(wrapper.vm.data?.pages).toEqual([[4, 5, 6]])
    expect(wrapper.vm.data?.pageParams).toEqual([1])

    await wrapper.vm.loadNextPage()

    expect(wrapper.vm.data?.pages).toEqual([[7, 8, 9]])
    expect(wrapper.vm.data?.pageParams).toEqual([2])
  })

  it('hasNextPage and hasPreviousPage work correctly after maxPages trimming', async () => {
    const { wrapper } = mountSimple({
      maxPages: 2,
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
    expect(wrapper.vm.hasNextPage).toBe(true)
    expect(wrapper.vm.hasPreviousPage).toBe(true)

    // Load next page
    await wrapper.vm.loadNextPage()

    expect(wrapper.vm.data?.pages).toEqual([
      [4, 5, 6],
      [7, 8, 9],
    ])
    expect(wrapper.vm.hasNextPage).toBe(true)
    expect(wrapper.vm.hasPreviousPage).toBe(true)

    // Load another next page - should trim first page (param 1)
    await wrapper.vm.loadNextPage()

    expect(wrapper.vm.data?.pages).toEqual([
      [7, 8, 9],
      [10, 11, 12],
    ])
    expect(wrapper.vm.data?.pageParams).toEqual([2, 3])

    // Even though page param 1 was trimmed, hasPreviousPage should still be true
    // because we can still go back from page 2
    expect(wrapper.vm.hasPreviousPage).toBe(true)
    expect(wrapper.vm.hasNextPage).toBe(false) // page 3 is the last page
  })

  it('applies maxPages when mixing loadNextPage and loadPreviousPage', async () => {
    const { wrapper } = mountSimple({
      maxPages: 3,
      initialPageParam: 2,
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        return firstPageParam > 0 ? firstPageParam - 1 : null
      },
    })

    await flushPromises()

    expect(wrapper.vm.data).toEqual({
      pages: [[7, 8, 9]],
      pageParams: [2],
    })

    // Load previous page
    await wrapper.vm.loadPreviousPage()
    expect(wrapper.vm.data?.pages).toEqual([
      [4, 5, 6],
      [7, 8, 9],
    ])

    // Load next page
    await wrapper.vm.loadNextPage()
    expect(wrapper.vm.data?.pages).toEqual([
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
    ])
    expect(wrapper.vm.data?.pageParams).toEqual([1, 2, 3])

    // Load another previous page - should trim from end
    await wrapper.vm.loadPreviousPage()
    expect(wrapper.vm.data?.pages).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ])
    expect(wrapper.vm.data?.pageParams).toEqual([0, 1, 2])

    // Load another next page - should trim from beginning
    await wrapper.vm.loadNextPage()
    expect(wrapper.vm.data?.pages).toEqual([
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
    ])
    expect(wrapper.vm.data?.pageParams).toEqual([1, 2, 3])
  })

  it('applies maxPages to initial data when loading new pages', async () => {
    const { wrapper } = mountSimple({
      maxPages: 2,
      initialData: () => ({
        pages: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        pageParams: [0, 1],
      }),
      getNextPageParam: (lastPage, allPages, lastPageParam) => {
        // Allow loading more pages
        return lastPageParam >= 3 ? null : lastPageParam + 1
      },
    })

    await flushPromises()

    // Initial data has 2 pages
    expect(wrapper.vm.data?.pages).toHaveLength(2)

    // Load next page - should trim the first page
    await wrapper.vm.loadNextPage()

    // Should have trimmed old pages and kept only 2
    expect(wrapper.vm.data?.pages).toHaveLength(2)
    expect(wrapper.vm.data?.pages).toEqual([
      [4, 5, 6],
      [7, 8, 9],
    ])
    expect(wrapper.vm.data?.pageParams).toEqual([1, 2])
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

    queryCache.invalidateQueries({ key: ['key'] })

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

  it('should refetch using existing page params, not initial page param', async () => {
    const { wrapper, query } = mountSimple({
      maxPages: 2,
    })

    await flushPromises()
    await wrapper.vm.loadNextPage()
    await wrapper.vm.loadNextPage()
    await wrapper.vm.loadNextPage()

    expect(wrapper.vm.data).toEqual({
      pages: [
        [7, 8, 9],
        [10, 11, 12],
      ],
      pageParams: [2, 3],
    })

    query.mockClear()

    await wrapper.vm.refetch()

    expect(query).toHaveBeenCalledTimes(2)
    expect(query).toHaveBeenNthCalledWith(1, expect.objectContaining({ pageParam: 2 }))
    expect(query).toHaveBeenNthCalledWith(2, expect.objectContaining({ pageParam: 3 }))
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

  it('only takes into account the latest call to loadNextPage', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([1, 2, 3])
      .mockResolvedValueOnce([4, 5, 6])
      .mockResolvedValueOnce([7, 8, 9])
      .mockResolvedValueOnce([10, 11, 12])

    const { wrapper } = mountSimple({ query })

    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[1, 2, 3]], pageParams: [0] })

    await Promise.all([
      wrapper.vm.loadNextPage(),
      wrapper.vm.loadNextPage(),
      wrapper.vm.loadNextPage(),
    ])

    // Only the last call (pageParam 3) should be in the data
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [10, 11, 12],
      ],
      // the pageParam always gets computed based on the latest one which is always 0
      pageParams: [0, 1],
    })
  })

  it('loadNextPage throws if throwOnError is set to true', async () => {
    const error = new Error('Test error during loadNextPage')
    const { wrapper } = mountSimple({
      query: vi.fn(async ({ pageParam }) => {
        // First page succeeds
        if (pageParam === 0) {
          return [1, 2, 3]
        }
        // Subsequent pages throw
        throw error
      }),
    })

    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[1, 2, 3]], pageParams: [0] })

    await expect(wrapper.vm.loadNextPage({ throwOnError: true })).rejects.toThrow(
      'Test error during loadNextPage',
    )
  })

  it('loadNextPage catches errors by default', async () => {
    const error = new Error('Test error during loadNextPage')
    const { wrapper } = mountSimple({
      query: vi.fn(async ({ pageParam }) => {
        // First page succeeds
        if (pageParam === 0) {
          return [1, 2, 3]
        }
        // Subsequent pages throw
        throw error
      }),
    })

    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[1, 2, 3]], pageParams: [0] })

    await expect(wrapper.vm.loadNextPage()).resolves.not.toThrow()
    expect(wrapper.vm.error).toBe(error)
  })

  it('loadNextPage with cancelRefetch=false should not trigger a new fetch if one is pending', async () => {
    const { wrapper, query } = mountSimple()

    await flushPromises()

    expect(query).toHaveBeenCalledTimes(1)
    query.mockClear()

    // Start loading the next page (pageParam 1)
    const firstCall = wrapper.vm.loadNextPage()

    // Query should be called for the first loadNextPage
    expect(query).toHaveBeenCalledTimes(1)
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ pageParam: 1 }))

    const secondCall = wrapper.vm.loadNextPage({ cancelRefetch: false })
    expect(query).toHaveBeenCalledTimes(1)

    await Promise.all([firstCall, secondCall])

    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
      ],
      pageParams: [0, 1],
    })
  })

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

  it('does not call the query if getNextPageParam returns null on initial fetch', async () => {
    const { wrapper, query } = mountSimple({
      getNextPageParam: () => {
        // Always return null, meaning no next page
        return null
      },
    })

    await flushPromises()

    // Query should only be called once for the initial page
    expect(query).toHaveBeenCalledTimes(1)
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ pageParam: 0 }))

    // Should have no next page available
    expect(wrapper.vm.hasNextPage).toBe(false)

    // Data should only contain the initial page
    expect(wrapper.vm.data).toEqual({
      pages: [[1, 2, 3]],
      pageParams: [0],
    })
  })

  it('does not call the query if getNextPageParam returns null', async () => {
    const { wrapper, query } = mountSimple({
      getNextPageParam: (lastPage, allPages, lastPageParam) => {
        // Only allow one page
        return null
      },
    })

    await flushPromises()

    // Query should be called once for the initial page
    expect(query).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.hasNextPage).toBe(false)

    query.mockClear()

    // Try to load next page when hasNextPage is false
    await wrapper.vm.loadNextPage()

    // Query should not be called again
    expect(query).not.toHaveBeenCalled()

    // Data should remain unchanged
    expect(wrapper.vm.data).toEqual({
      pages: [[1, 2, 3]],
      pageParams: [0],
    })
  })

  it('calls getPreviousPageParam with correct parameters', async () => {
    const getPreviousPageParam = vi.fn((firstPage, allPages, firstPageParam, allPageParams) => {
      return firstPageParam > 0 ? firstPageParam - 1 : null
    })

    const { wrapper } = mountSimple({
      initialPageParam: 2,
      getPreviousPageParam,
    })

    await flushPromises()

    // we don't check for how many times this function is called because it
    // might be computed multiple times before and after fetching, just to
    // ensure that we're fetching the correct page.
    // expect(getPreviousPageParam).toHaveBeenCalledTimes(1)
    expect(getPreviousPageParam).toHaveBeenCalledWith(
      [7, 8, 9], // firstPage
      [[7, 8, 9]], // allPages
      2, // firstPageParam
      [2], // allPageParams
    )

    getPreviousPageParam.mockClear()
    await wrapper.vm.loadPreviousPage()

    // same as above
    // expect(getPreviousPageParam).toHaveBeenCalledTimes(1)
    expect(getPreviousPageParam).toHaveBeenCalledWith(
      [4, 5, 6], // firstPage
      [
        [4, 5, 6],
        [7, 8, 9],
      ], // allPages
      1, // firstPageParam
      [1, 2], // allPageParams
    )
    await flushPromises()
  })

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

  it('stops fetching previous pages if hasPreviousPage is false', async () => {
    const { wrapper } = mountSimple({
      initialPageParam: 2,
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        return firstPageParam > 0 ? firstPageParam - 1 : null
      },
    })
    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[7, 8, 9]], pageParams: [2] })
    await wrapper.vm.loadPreviousPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [1, 2],
    })
    await wrapper.vm.loadPreviousPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [0, 1, 2],
    })
    // should do nothing
    await wrapper.vm.loadPreviousPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [0, 1, 2],
    })
  })
  it('updates hasPreviousPage when loading pages', async () => {
    const { wrapper } = mountSimple({
      initialPageParam: 2,
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        return firstPageParam > 0 ? firstPageParam - 1 : null
      },
    })
    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[7, 8, 9]], pageParams: [2] })
    expect(wrapper.vm.hasPreviousPage).toBe(true)
    await wrapper.vm.loadPreviousPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [1, 2],
    })
    await wrapper.vm.loadPreviousPage()
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [0, 1, 2],
    })
    expect(wrapper.vm.hasPreviousPage).toBe(false)
  })

  it('only takes into account the latest call to loadPreviousPage', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([10, 11, 12])
      .mockResolvedValueOnce([7, 8, 9])
      .mockResolvedValueOnce([4, 5, 6])
      .mockResolvedValueOnce([1, 2, 3])

    const { wrapper } = mountSimple({
      initialPageParam: 3,
      query,
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        return firstPageParam > 0 ? firstPageParam - 1 : null
      },
    })

    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[10, 11, 12]], pageParams: [3] })

    await Promise.all([
      wrapper.vm.loadPreviousPage(),
      wrapper.vm.loadPreviousPage(),
      wrapper.vm.loadPreviousPage(),
    ])

    // Only the last call (pageParam 0) should be in the data
    expect(wrapper.vm.data).toEqual({
      pages: [
        [1, 2, 3],
        [10, 11, 12],
      ],
      pageParams: [2, 3],
    })
  })

  it('loadPreviousPage throws if throwOnError is set to true', async () => {
    const error = new Error('Test error during loadPreviousPage')
    const { wrapper } = mountSimple({
      initialPageParam: 2,
      query: vi.fn(async ({ pageParam }) => {
        // First page succeeds
        if (pageParam === 2) {
          return [7, 8, 9]
        }
        // Subsequent pages throw
        throw error
      }),
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        return firstPageParam > 0 ? firstPageParam - 1 : null
      },
    })

    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[7, 8, 9]], pageParams: [2] })

    await expect(wrapper.vm.loadPreviousPage({ throwOnError: true })).rejects.toThrow(
      'Test error during loadPreviousPage',
    )
  })

  it('loadPreviousPage catches errors by default', async () => {
    const error = new Error('Test error during loadPreviousPage')
    const { wrapper } = mountSimple({
      initialPageParam: 2,
      query: vi.fn(async ({ pageParam }) => {
        // First page succeeds
        if (pageParam === 2) {
          return [7, 8, 9]
        }
        // Subsequent pages throw
        throw error
      }),
      getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
        return firstPageParam > 0 ? firstPageParam - 1 : null
      },
    })

    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[7, 8, 9]], pageParams: [2] })

    await expect(wrapper.vm.loadPreviousPage()).resolves.not.toThrow()
    expect(wrapper.vm.error).toBe(error)
  })

  it('loadPreviousPage with cancelRefetch=false should not trigger a new fetch if one is pending', async () => {
    const { wrapper, query } = mountSimple({
      initialPageParam: 2,
    })

    await flushPromises()
    expect(wrapper.vm.data).toEqual({ pages: [[7, 8, 9]], pageParams: [2] })

    expect(query).toHaveBeenCalledTimes(1)
    query.mockClear()

    const firstCall = wrapper.vm.loadPreviousPage()

    // Query should be called for the first loadPreviousPage
    expect(query).toHaveBeenCalledTimes(1)
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ pageParam: 1 }))

    const secondCall = wrapper.vm.loadPreviousPage({ cancelRefetch: false })
    expect(query).toHaveBeenCalledTimes(1)

    await Promise.all([firstCall, secondCall])

    expect(wrapper.vm.data).toEqual({
      pages: [
        [4, 5, 6],
        [7, 8, 9],
      ],
      pageParams: [1, 2],
    })
  })

  it('creates a new entry when key changes and marks previous entry as inactive', async () => {
    const keyRef = ref(0)
    const { wrapper, queryCache } = mountSimple({
      key: () => ['key', keyRef.value],
    })

    await flushPromises()

    const entry0 = queryCache.get(['key', 0])!
    expect(entry0).toBeDefined()
    expect(entry0.active).toBe(true)

    keyRef.value = 1
    await flushPromises()

    const entry1 = queryCache.get(['key', 1])!
    expect(entry1).toBeDefined()
    expect(entry1.active).toBe(true)

    // old entry should not be active anymore
    const oldEntry = queryCache.get(['key', 0])!
    expect(oldEntry).toBeDefined()
    expect(entry0).toBe(oldEntry)
    expect(oldEntry.active).toBe(false)
  })

  it('computes hasNextPage correctly when using cached data', async () => {
    const query = vi.fn(async ({ pageParam }: { pageParam: number }) => {
      return [pageParam * 3 + 1, pageParam * 3 + 2, pageParam * 3 + 3]
    })

    const showComponent = ref(true)
    let queryResult!: ReturnType<typeof useInfiniteQuery>

    const InfiniteQueryComponent = defineComponent({
      name: 'InfiniteQueryComponent',
      render: () => null,
      setup() {
        queryResult = useInfiniteQuery({
          key: ['key'],
          initialPageParam: 0,
          query,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            return lastPageParam >= 2 ? null : lastPageParam + 1
          },
        })
        return { ...queryResult }
      },
    })

    mount(
      defineComponent({
        components: { InfiniteQueryComponent },
        setup() {
          return { showComponent }
        },
        render() {
          return showComponent.value ? h(InfiniteQueryComponent) : null
        },
      }),
      {
        global: {
          plugins: [createPinia(), PiniaColada],
        },
      },
    )

    await flushPromises()

    expect(queryResult.data.value).toEqual({
      pages: [[1, 2, 3]],
      pageParams: [0],
    })
    expect(queryResult.hasNextPage.value).toBe(true)

    // Load next page
    await queryResult.loadNextPage()
    expect(queryResult.hasNextPage.value).toBe(true)

    // Toggle off to unmount inner component
    showComponent.value = false
    await nextTick()
    query.mockClear()

    // Toggle back on to remount - should use cached data
    showComponent.value = true
    await nextTick()
    await flushPromises()

    // Should have cached data
    expect(query).not.toHaveBeenCalled()
    // hasNextPage should be correctly computed from cached data
    expect(queryResult.hasNextPage.value).toBe(true)
  })

  // https://github.com/posva/pinia-colada/issues/486
  describe('hydration', () => {
    function createPiniawithHydratedCache(caches: Record<string, UseQueryEntryNodeValueSerializd>) {
      const pinia = createPinia()
      const app = createApp({})
      app.use(pinia)
      // it doesn't matter because the value is skipped
      pinia.state.value[QUERY_STORE_ID] = { caches: 1 }
      hydrateQueryCache(useQueryCache(pinia), caches)

      return pinia
    }

    /**
     * Simulates the server-side rendering followed by client-side hydration, as
     * would happen in Nuxt SSR:
     * 1. Create a server pinia, set query data, serialize the cache
     * 2. Create a client pinia, hydrate from serialized cache
     */
    function simulateSSRHydration(
      data: { pages: unknown[]; pageParams: unknown[] },
      key: string[] = ['key'],
    ) {
      // Server side: create cache and set data
      const serverPinia = createPinia()
      const serverApp = createApp({})
      serverApp.use(serverPinia)
      const serverQC = useQueryCache(serverPinia)
      serverQC.setQueryData(key, data)
      serverQC.getEntries({ key }).forEach((entry) => {
        // mark as infinite query for hydration
        entry.meta.__i = true
      })

      // Serialize (as Nuxt does in app:rendered hook)
      const serialized = serializeQueryCache(serverQC)

      // Client side: hydrate
      return createPiniawithHydratedCache(serialized)
    }

    it('hasNextPage is true after hydration when more pages are available', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [
          // The data stored by the infinite query during SSR
          { pages: [[1, 2, 3]], pageParams: [0] },
          null,
          0,
          { __i: true },
        ],
      })

      const { wrapper } = mountSimple(
        {
          staleTime: 1000,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            return lastPageParam >= 3 ? null : lastPageParam + 1
          },
        },
        { plugins: [pinia] },
      )

      // Data should be immediately available from hydration
      expect(wrapper.vm.data).toEqual({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })

      // hasNextPage should be true since getNextPageParam returns a non-null value
      expect(wrapper.vm.hasNextPage).toBe(true)
    })

    it('hasNextPage is false after hydration when no more pages are available', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [{ pages: [[10, 11, 12]], pageParams: [3] }, null, 0, { __i: true }],
      })

      const { wrapper } = mountSimple(
        {
          staleTime: 1000,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            // pageParam 3 is the last page
            return lastPageParam >= 3 ? null : lastPageParam + 1
          },
        },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.data).toEqual({
        pages: [[10, 11, 12]],
        pageParams: [3],
      })

      // hasNextPage should be false since we're at the last page
      expect(wrapper.vm.hasNextPage).toBe(false)
    })

    it('hasPreviousPage is true after hydration when previous pages are available', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [{ pages: [[4, 5, 6]], pageParams: [1] }, null, 0, { __i: true }],
      })

      const { wrapper } = mountSimple(
        {
          staleTime: 1000,
          initialPageParam: 1,
          getPreviousPageParam: (firstPage, allPages, firstPageParam) => {
            return firstPageParam > 0 ? firstPageParam - 1 : null
          },
        },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.data).toEqual({
        pages: [[4, 5, 6]],
        pageParams: [1],
      })

      // hasPreviousPage should be true since pageParam 1 > 0
      expect(wrapper.vm.hasPreviousPage).toBe(true)
    })

    it('can loadNextPage after hydration', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [{ pages: [[1, 2, 3]], pageParams: [0] }, null, 0, { __i: true }],
      })

      const { wrapper } = mountSimple(
        {
          staleTime: 1000,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            return lastPageParam >= 3 ? null : lastPageParam + 1
          },
        },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.hasNextPage).toBe(true)

      await wrapper.vm.loadNextPage()

      expect(wrapper.vm.data).toEqual({
        pages: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        pageParams: [0, 1],
      })
    })

    it('avoids refetching if hydrated data is fresh', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [{ pages: [[1, 2, 3]], pageParams: [0] }, null, 0, { __i: true }],
      })

      const { wrapper, query } = mountSimple(
        {
          staleTime: 1000,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            return lastPageParam >= 3 ? null : lastPageParam + 1
          },
        },
        { plugins: [pinia] },
      )

      await flushPromises()

      // Should not refetch since data is fresh (staleTime: 1000)
      expect(query).toHaveBeenCalledTimes(0)
      expect(wrapper.vm.data).toEqual({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })
    })

    it('hasNextPage is correctly computed with multiple hydrated pages', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [
          {
            pages: [
              [1, 2, 3],
              [4, 5, 6],
            ],
            pageParams: [0, 1],
          },
          null,
          0,
          { __i: true },
        ],
      })

      const { wrapper } = mountSimple(
        {
          staleTime: 1000,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            return lastPageParam >= 3 ? null : lastPageParam + 1
          },
        },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.data).toEqual({
        pages: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        pageParams: [0, 1],
      })

      // getNextPageParam(lastPage=[4,5,6], ..., lastPageParam=1) returns 2 (not null)
      expect(wrapper.vm.hasNextPage).toBe(true)
    })

    it('hasNextPage is true after full SSR round-trip serialization and hydration', async () => {
      // Simulate the full SSR -> serialize -> hydrate flow (as in Nuxt)
      const pinia = simulateSSRHydration({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })

      const { wrapper } = mountSimple(
        {
          staleTime: 1000,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            return lastPageParam >= 3 ? null : lastPageParam + 1
          },
        },
        { plugins: [pinia] },
      )

      expect(wrapper.vm.data).toEqual({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })

      expect(wrapper.vm.hasNextPage).toBe(true)
    })

    it('hasNextPage remains correct after hydration and stale data refetch', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [{ pages: [[1, 2, 3]], pageParams: [0] }, null, 0, { __i: true }],
      })

      const { wrapper, query } = mountSimple(
        {
          // No staleTime override - uses default (5s), data is fresh
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            return lastPageParam >= 3 ? null : lastPageParam + 1
          },
        },
        { plugins: [pinia] },
      )

      // Before any async work, hasNextPage should already be set from hydrated data
      expect(wrapper.vm.hasNextPage).toBe(true)

      await flushPromises()

      // After everything settles, hasNextPage should still be true
      expect(wrapper.vm.hasNextPage).toBe(true)
      expect(wrapper.vm.data).toEqual({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })
    })

    it('hasNextPage is true after hydration with query disabled on client', async () => {
      const pinia = createPiniawithHydratedCache({
        '["key"]': [{ pages: [[1, 2, 3]], pageParams: [0] }, null, 0, { __i: true }],
      })

      const { wrapper, query } = mountSimple(
        {
          // Simulates `enabled: !import.meta.env.SSR` on the client
          enabled: false,
          getNextPageParam: (lastPage, allPages, lastPageParam) => {
            return lastPageParam >= 3 ? null : lastPageParam + 1
          },
        },
        { plugins: [pinia] },
      )

      // Data should be from hydration
      expect(wrapper.vm.data).toEqual({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })

      // Query should not have been called since enabled is false
      expect(query).not.toHaveBeenCalled()

      // hasNextPage should still be true from the hydrated data
      expect(wrapper.vm.hasNextPage).toBe(true)

      await flushPromises()

      // After everything settles, hasNextPage should remain true
      expect(wrapper.vm.hasNextPage).toBe(true)
    })
  })

  // https://github.com/posva/pinia-colada/issues/458
  it('resets pageParam when key changes', async () => {
    const keyRef = ref(0)
    const query = vi.fn(async ({ pageParam }: { pageParam: number }) => {
      return [pageParam * 3 + 1, pageParam * 3 + 2, pageParam * 3 + 3]
    })

    const { wrapper } = mountSimple({
      key: () => ['key', keyRef.value],
      query,
    })

    await flushPromises()

    // initial load with pageParam 0
    expect(query).toHaveBeenCalledTimes(1)
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ pageParam: 0 }))

    // load next page (pageParam becomes 1)
    await wrapper.vm.loadNextPage()
    await flushPromises()

    expect(query).toHaveBeenCalledTimes(2)
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ pageParam: 1 }))

    keyRef.value = 1
    await flushPromises()

    expect(query).toHaveBeenCalledTimes(3)
    expect(query).toHaveBeenLastCalledWith(expect.objectContaining({ pageParam: 0 }))
  })

  it('does not lose hasNextPage when a stale key resolves after switching back', async () => {
    const keyRef = ref(1)
    let resolveKey0: (value: number[]) => void

    const query = vi.fn(
      async ({
        pageParam,
      }: UseInfiniteQueryFnContext<
        UseInfiniteQueryData<unknown, number>,
        Error,
        undefined,
        number
      >) => {
        // key=0 is slow
        if (keyRef.value === 0) {
          return new Promise<number[]>((resolve) => {
            resolveKey0 = resolve
          })
        }
        // key=1 resolves immediately with data that has more pages
        return [pageParam * 3 + 1, pageParam * 3 + 2, pageParam * 3 + 3]
      },
    )

    const { wrapper } = mountSimple({
      key: () => ['key', keyRef.value],
      query,
      getNextPageParam(_lastPage, _allPages, lastPageParam) {
        // key=1 always has next; key=0 does not
        if (keyRef.value === 1) return lastPageParam + 1
        return null
      },
    })

    // 1. key=1 fetches and resolves — has more pages
    await flushPromises()
    expect(wrapper.vm.hasNextPage).toBe(true)

    // 2. Switch to key=0 — starts slow fetch
    keyRef.value = 0
    await flushPromises()

    // 3. Switch back to key=1 — cached, no re-fetch
    keyRef.value = 1
    await flushPromises()
    expect(wrapper.vm.hasNextPage).toBe(true)

    // 4. key=0's slow fetch resolves (no more pages for key=0)
    resolveKey0!([100])
    await flushPromises()

    // 5. hasNextPage should still be true because active key is 1
    expect(wrapper.vm.hasNextPage).toBe(true)
  })
})
