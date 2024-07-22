import { describe, expectTypeOf, it } from 'vitest'
import { defineQuery } from './define-query'
import { useQuery } from './use-query'

describe('defineQuery types', () => {
  it('can define a query with an options object', () => {
    const useMyMutation = defineQuery({
      key: ['todos'],
      query: async () => [{ id: 1 }],
    })

    const { data, refresh } = useMyMutation()

    expectTypeOf(data.value).toEqualTypeOf<{ id: number }[] | undefined>()
    expectTypeOf(refresh()).toEqualTypeOf<Promise<{ id: number }[]>>()
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
    expectTypeOf(refresh()).toEqualTypeOf<Promise<{ id: number }[]>>()
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
