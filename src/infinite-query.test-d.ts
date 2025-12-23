import { describe, expectTypeOf, it } from 'vitest'
import { useInfiniteQuery } from './infinite-query'

describe('useInfiniteQuery', () => {
  it('works', () => {
    const query = useInfiniteQuery({
      key: ['hey'],
      async query({ pageParam, signal }) {
        expectTypeOf(signal).toEqualTypeOf<AbortSignal>()
        expectTypeOf(pageParam).toEqualTypeOf<number>()
        return { id: pageParam, next: pageParam + 1 }
      },
      initialPageParam: 1,
      getNextPageParam(lastPage) {
        return lastPage.next
      },
    })

    expectTypeOf(query.data.value).toEqualTypeOf<
      | undefined
      | {
          pages: Array<{ id: number; next: number }>
          pageParams: number[]
        }
    >()
  })
})
