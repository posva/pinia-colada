import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineInfiniteQueryOptions } from './define-infinite-query-options'
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
})
