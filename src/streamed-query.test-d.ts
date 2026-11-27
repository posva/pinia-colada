import { describe, expectTypeOf, it } from 'vitest'
import {
  defineQuery,
  defineQueryOptions,
  streamedQuery,
  useQuery,
  useQueryCache,
} from '@pinia/colada'
import type { QueryCache } from '@pinia/colada'

async function* numbers(): AsyncGenerator<number> {
  yield 1
  yield 2
}

describe('streamedQuery', () => {
  it('infers an array of chunks by default', () => {
    const { data } = useQuery({
      key: ['n'],
      query: streamedQuery({ stream: () => numbers() }),
    })
    expectTypeOf(data.value).toEqualTypeOf<number[] | undefined>()
  })

  it('infers the type of a custom reducer', () => {
    const { data } = useQuery({
      key: ['n'],
      query: streamedQuery({
        stream: () => numbers(),
        reducer: (sum, n) => sum + n,
        initialValue: 0,
      }),
    })
    expectTypeOf(data.value).toEqualTypeOf<number | undefined>()
  })

  it('requires an initial value with a custom reducer', () => {
    // @ts-expect-error: missing initialValue
    streamedQuery({ stream: () => numbers(), reducer: (sum: number, n: number) => sum + n })
  })

  it('accepts a promise of an iterable', () => {
    expectTypeOf(streamedQuery({ stream: async () => numbers() })).returns.resolves.toEqualTypeOf<
      number[]
    >()
  })

  it('passes the query context', () => {
    streamedQuery({
      stream: ({ signal, queryCache }) => {
        expectTypeOf(signal).toEqualTypeOf<AbortSignal>()
        expectTypeOf(queryCache).toEqualTypeOf<QueryCache>()
        return numbers()
      },
    })
  })

  it('works with defineQueryOptions and defineQuery', () => {
    const opts = defineQueryOptions({
      key: ['n'],
      query: streamedQuery({ stream: () => numbers() }),
    })
    expectTypeOf(useQueryCache().getQueryData(opts.key)).toEqualTypeOf<number[] | undefined>()

    const useNumbers = defineQuery({
      key: ['n'],
      query: streamedQuery({ stream: () => numbers() }),
    })
    expectTypeOf(useNumbers().data.value).toEqualTypeOf<number[] | undefined>()
  })
})
