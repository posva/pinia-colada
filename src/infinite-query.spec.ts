import type { GlobalMountOptions } from '../test-utils/utils'
import type { UseInfiniteQueryFnContext, UseInfiniteQueryOptions } from './infinite-query'
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
            console.warn('Missing implementation for non-number page params')
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
              if (typeof firstPageParam === 'number' && firstPageParam > 1) {
                return firstPageParam > 0 ? ((firstPageParam - 1) as TPageParam) : null
              }
              console.warn(
                'Missing implementation for getPreviousPageParam with non-number page params',
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

  it.todo('applies the maxPages option to limit the number of pages')

  it.todo('should refetch all pages sequentially when refreshing after being invalidated')
  it.todo('should refetch all pages sequentially when calling refetch()')

  it.todo('should propagate errors')

  it.todo('should not be pending if initial data is provided')
  it.todo('should be loading when fetching next page')

  it.todo('calls getNextPageParam with correct parameters')
  it.todo('sets hasNextPage to false if getNextPageParam returns null')

  it.todo('calls getPreviousPageParam with correct parameters')
  it.todo('prepends data when fetching previous pages')
  it.todo('allows getPreviousPage if getPreviousPageParam is provided')
  it.todo('sets hasPreviousPage to false if getPreviousPageParam returns null')
})
