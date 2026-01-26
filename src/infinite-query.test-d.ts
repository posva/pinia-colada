import { describe, expectTypeOf, it } from 'vite-plus/test'
import { useInfiniteQuery } from './infinite-query'

describe('useInfiniteQuery', () => {
  it('works', () => {
    const query = useInfiniteQuery({
      key: ['hey'],
      async query({ pageParam, signal, entry }) {
        expectTypeOf(signal).toEqualTypeOf<AbortSignal>()
        expectTypeOf(pageParam).toEqualTypeOf<number>()
        expectTypeOf(entry.state.value.data).toEqualTypeOf<
          | undefined
          | {
              pages: unknown[]
              pageParams: number[]
            }
        >()

        return { id: pageParam, next: pageParam + 1 }
      },
      // initialData() {
      //   return {
      //     pages: [{ id: 0, next: 1 }],
      //     pageParams: [0],
      //   }
      // },
      getNextPageParam(lastPage, _allPages, lastPageParam) {
        expectTypeOf<number>(lastPageParam)
        return lastPage.next
      },

      getPreviousPageParam(_firstPage, _allPages, firstParam) {
        expectTypeOf<number>(firstParam)
        return null
      },

      // can be placed after
      initialPageParam: 1,
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
