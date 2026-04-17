import { describe, expectTypeOf, it } from 'vitest'
import { useInfiniteQuery } from './infinite-query'
import type { UseInfiniteQueryData } from './infinite-query'
import { setInfiniteQueryData, useQueryCache, defineInfiniteQueryOptions } from '@pinia/colada'
import type { EntryKeyTagged } from '@pinia/colada'
import type { ErrorDefault } from './types-extension'

describe('typed infinite query keys', () => {
  const queryCache = useQueryCache()

  describe('defineInfiniteQueryOptions', () => {
    it('static', () => {
      const optsStatic = defineInfiniteQueryOptions({
        key: ['items'],
        query: async ({ pageParam }) => ({ id: pageParam, items: [1, 2, 3] }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.id + 1,
      })

      expectTypeOf(optsStatic.key).toEqualTypeOf<
        EntryKeyTagged<
          UseInfiniteQueryData<{ id: number; items: number[] }, number>,
          ErrorDefault,
          undefined
        >
      >()

      expectTypeOf(queryCache.getQueryData(optsStatic.key)).toEqualTypeOf<
        UseInfiniteQueryData<{ id: number; items: number[] }, number> | undefined
      >()
    })

    it('dynamic', () => {
      const optsDynamic = defineInfiniteQueryOptions((category: string) => ({
        key: ['items', category] as const,
        query: async ({ pageParam }) => ({ id: pageParam, items: [1, 2, 3] }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.id + 1,
      }))

      expectTypeOf(queryCache.getQueryData(optsDynamic('books').key)).toEqualTypeOf<
        UseInfiniteQueryData<{ id: number; items: number[] }, number> | undefined
      >()
    })

    it('useInfiniteQuery accepts getter from defineInfiniteQueryOptions', () => {
      const optsDynamic = defineInfiniteQueryOptions((category: string) => ({
        key: ['items', category] as const,
        query: async ({ pageParam }) => [pageParam],
        initialPageParam: 0,
        getNextPageParam: (_lastPage, _allPages, lastPageParam) => lastPageParam + 1,
      }))

      const { data } = useInfiniteQuery(() => optsDynamic('books'))

      expectTypeOf(data.value).toEqualTypeOf<UseInfiniteQueryData<number[], number> | undefined>()
    })

    it('useInfiniteQuery accepts static defineInfiniteQueryOptions', () => {
      const optsStatic = defineInfiniteQueryOptions({
        key: ['static-items'],
        query: async ({ pageParam }) => ({ page: pageParam }),
        initialPageParam: 1,
        getNextPageParam: (lastPage) => lastPage.page + 1,
      })

      const { data } = useInfiniteQuery(optsStatic)

      expectTypeOf(data.value).toEqualTypeOf<
        UseInfiniteQueryData<{ page: number }, number> | undefined
      >()
    })

    it('allows meta as object', () => {
      defineInfiniteQueryOptions({
        key: ['a'],
        query: async ({ pageParam }: { pageParam: number }) => pageParam,
        initialPageParam: 0,
        getNextPageParam: () => null,
        meta: { hello: 'world' },
      })
    })
  })

  describe('setInfiniteQueryData', () => {
    const optsStatic = defineInfiniteQueryOptions({
      key: ['items'],
      query: async ({ pageParam }) => ({ id: pageParam, items: [1, 2, 3] }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.id + 1,
    })

    const optsDynamic = defineInfiniteQueryOptions((category: string) => ({
      key: ['items', category] as const,
      query: async ({ pageParam }) => ({ id: pageParam, items: [1, 2, 3] }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.id + 1,
    }))

    it('accepts correct data with static options', () => {
      setInfiniteQueryData(queryCache, optsStatic.key, {
        pages: [{ id: 0, items: [1, 2, 3] }],
        pageParams: [0],
      })
    })

    it('rejects wrong data with static options', () => {
      setInfiniteQueryData(queryCache, optsStatic.key, {
        // @ts-expect-error: wrong page type
        pages: ['wrong'],
        pageParams: [0],
      })
    })

    it('accepts correct data with dynamic options', () => {
      setInfiniteQueryData(queryCache, optsDynamic('books').key, {
        pages: [{ id: 1, items: [4, 5, 6] }],
        pageParams: [1],
      })
    })

    it('rejects wrong data with dynamic options', () => {
      setInfiniteQueryData(queryCache, optsDynamic('books').key, {
        // @ts-expect-error: wrong page type
        pages: [42],
        pageParams: [0],
      })
    })

    it('types updater function correctly', () => {
      setInfiniteQueryData(queryCache, optsStatic.key, (oldData) => {
        expectTypeOf(oldData).toEqualTypeOf<
          UseInfiniteQueryData<{ id: number; items: number[] }, number> | undefined
        >()
        return {
          pages: [{ id: 0, items: [1] }],
          pageParams: [0],
        }
      })
    })
  })
})
