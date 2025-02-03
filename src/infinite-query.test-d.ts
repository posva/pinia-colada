import { describe, expectTypeOf, it } from 'vitest'
import { useInfiniteQuery } from './infinite-query'

describe('useInfiniteQuery', () => {
  it('works', () => {
    const query = useInfiniteQuery({
      key: ['hey'],
      async query({ next }, { signal }) {
        console.log('isAborted', signal.aborted)
        return [{ next }]
      },
      initialPage: () => ({
        // cast needed to avoid infering it as never[]
        pages: [] as Array<{ next: number }>,
        next: 1,
      }),
      merge(res, current) {
        return {
          pages: [...res.pages, ...current],
          next: res.next + 1,
        }
      },
    })

    expectTypeOf(query.data.value).toEqualTypeOf({
      pages: [{ next: 1 }],
      next: 2,
    })
  })
})
