import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineInfiniteQueryOptions } from './define-infinite-query-options'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from './pinia-colada'
import { useInfiniteQuery } from './infinite-query'
import { mockWarn } from '@posva/test-utils'

describe('defineInfiniteQueryOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  mockWarn()

  it('can describe static options', () => {
    const query = async ({ pageParam }: { pageParam: number }) => [pageParam]
    const getNextPageParam = (lastPage: number[]) =>
      lastPage.length > 0 ? lastPage[lastPage.length - 1]! + 1 : undefined

    const optsStatic = defineInfiniteQueryOptions({
      key: ['items'],
      query,
      initialPageParam: 0,
      getNextPageParam,
    })

    expect(optsStatic).toEqual({
      key: ['items'],
      query,
      initialPageParam: 0,
      getNextPageParam,
    })
  })

  it('can describe dynamic options', () => {
    const query = async ({ pageParam }: { pageParam: number }) => [pageParam]
    const getNextPageParam = (lastPage: number[]) =>
      lastPage.length > 0 ? lastPage[lastPage.length - 1]! + 1 : undefined

    const optsDynamic = defineInfiniteQueryOptions((category: string) => ({
      key: ['items', category],
      query,
      initialPageParam: 0,
      getNextPageParam,
    }))

    expect(optsDynamic('books')).toEqual({
      key: ['items', 'books'],
      query,
      initialPageParam: 0,
      getNextPageParam,
    })

    expect(optsDynamic('movies')).toEqual({
      key: ['items', 'movies'],
      query,
      initialPageParam: 0,
      getNextPageParam,
    })
  })

  describe('with useInfiniteQuery', () => {
    it('can use dynamic options as getter', async () => {
      const query = vi.fn(async ({ pageParam }: { pageParam: number }) => [
        pageParam * 3 + 1,
        pageParam * 3 + 2,
        pageParam * 3 + 3,
      ])

      const opts = defineInfiniteQueryOptions((category: string) => ({
        key: ['items', category],
        query,
        initialPageParam: 0,
        getNextPageParam: (_lastPage: number[], _allPages: number[][], lastPageParam: number) =>
          lastPageParam + 1,
      }))

      const category = ref('books')
      const wrapper = mount(
        {
          setup() {
            return {
              ...useInfiniteQuery(() => opts(category.value)),
            }
          },
          template: `<div>{{ data }}</div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toEqual({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })

      // change category triggers new query
      category.value = 'movies'
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(2)
    })

    it('can use static options directly', async () => {
      const query = vi.fn(async ({ pageParam }: { pageParam: number }) => [
        pageParam * 3 + 1,
        pageParam * 3 + 2,
        pageParam * 3 + 3,
      ])

      const opts = defineInfiniteQueryOptions({
        key: ['static-items'],
        query,
        initialPageParam: 0,
        getNextPageParam: (_lastPage: number[], _allPages: number[][], lastPageParam: number) =>
          lastPageParam + 1,
      })

      const wrapper = mount(
        {
          setup() {
            return {
              ...useInfiniteQuery(opts),
            }
          },
          template: `<div>{{ data }}</div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toEqual({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })
    })

    it('loadNextPage works with getter options', async () => {
      const query = vi.fn(async ({ pageParam }: { pageParam: number }) => [
        pageParam * 3 + 1,
        pageParam * 3 + 2,
        pageParam * 3 + 3,
      ])

      const opts = defineInfiniteQueryOptions({
        key: ['paginated-items'],
        query,
        initialPageParam: 0,
        getNextPageParam: (_lastPage: number[], _allPages: number[][], lastPageParam: number) =>
          lastPageParam + 1,
      })

      let infiniteResult!: ReturnType<typeof useInfiniteQuery>
      mount(
        {
          setup() {
            infiniteResult = useInfiniteQuery(() => opts)
            return {
              ...infiniteResult,
            }
          },
          template: `<div>{{ data }}</div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      expect(infiniteResult.data.value).toEqual({
        pages: [[1, 2, 3]],
        pageParams: [0],
      })

      await infiniteResult.loadNextPage()
      await flushPromises()
      expect(infiniteResult.data.value).toEqual({
        pages: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        pageParams: [0, 1],
      })
    })
  })
})
