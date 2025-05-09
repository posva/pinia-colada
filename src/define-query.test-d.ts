import { describe, expectTypeOf, it } from 'vitest'
import { defineQuery } from './define-query'
import type { DefineQueryOptions } from './define-query'
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

  it('can be passed to useQuery', () => {
    useQuery({} as DefineQueryOptions<string, Error>)

    function useMyQuery<TData, TError, TDataInitial extends TData | undefined>() {
      return useQuery({} as DefineQueryOptions<TData, TError, TDataInitial>)
    }

    useMyQuery<string, Error, string>()
  })

  const key = ['a']
  async function query() {
    return 'ok'
  }

  it('keeps the function type in initialData', () => {
    expectTypeOf<Required<DefineQueryOptions<string, Error>>['initialData']>().toEqualTypeOf<
      () => string | undefined
    >()
  })

  it('works with initialData', () => {
    useQuery({
      key,
      query,
      initialData: () => 'ok',
    } satisfies DefineQueryOptions<string, Error, string>)

    useQuery({
      key,
      query,
      initialData: () => (Math.random() ? 'ok' : undefined),
    } satisfies DefineQueryOptions<string, Error>)
  })

  it('keeps the function type in placeholderData', () => {
    useQuery({
      key,
      query,
      placeholderData: () => 'ok',
    } satisfies DefineQueryOptions<string, Error>)

    useQuery({
      key,
      query,
      placeholderData: () => (Math.random() ? 'ok' : undefined),
    } satisfies DefineQueryOptions<string, Error>)

    useQuery({
      key,
      query,
      placeholderData: 'ok',
    } satisfies DefineQueryOptions<string, Error>)
  })
})
