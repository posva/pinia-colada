import { describe, expectTypeOf, it } from 'vitest'
import { defineQuery } from './define-query'
import { useQuery } from './use-query'
import type { DataState } from './data-state'

describe('defineQuery types', () => {
  it('can define a query with an options object', () => {
    const useMyMutation = defineQuery({
      key: ['todos'],
      query: async () => [{ id: 1 }],
    })

    const { data, refresh } = useMyMutation()

    expectTypeOf(data.value).toEqualTypeOf<{ id: number }[] | undefined>()
    expectTypeOf(refresh()).toEqualTypeOf<Promise<DataState<{ id: number }[], { custom: Error }>>>()
  })

  it('does not allow refs or getters in the key', () => {
    // @ts-expect-error: key must be a direct value
    defineQuery({
      key: () => ['todos'],
      query: async () => [{ id: 1 }],
    })
  })

  it('can define a query with a function', () => {
    const useMyQuery = defineQuery(() => {
      return {
        foo: 'bar',
        ...useQuery({
          key: ['todos'],
          query: async () => [{ id: 1 }],
        }),
      }
    })

    const { data, refresh, foo } = useMyQuery()

    expectTypeOf(data.value).toEqualTypeOf<{ id: number }[] | undefined>()
    expectTypeOf(refresh()).toEqualTypeOf<Promise<DataState<{ id: number }[], { custom: Error }>>>()
    expectTypeOf(foo).toEqualTypeOf<string>()
  })

  it('can type the error', () => {
    class MyError extends Error {
      code = 42
    }
    const useMyQuery = defineQuery<unknown, MyError>({
      key: ['todos'],
      query: async () => {
        throw new MyError('error')
      },
    })

    const { error } = useMyQuery()

    expectTypeOf(error.value).toEqualTypeOf<MyError | null>()
  })
})
