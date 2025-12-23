import { assertType, describe, expectTypeOf, it } from 'vitest'
import type { Ref } from 'vue'
import { useQuery } from './use-query'
import type { UseQueryOptions } from './query-options'
import type { DefineQueryOptions } from './define-query'
import type { DefineQueryOptionsTagged } from './define-query-options'
import type { DataStateStatus } from './data-state'

describe('useQuery type inference', () => {
  it('infers the data type', () => {
    expectTypeOf<Ref<number | undefined>>(
      useQuery({
        query: () => Promise.resolve(42),
        key: ['foo'],
      }).data,
    )

    expectTypeOf<Ref<{ name: string } | undefined>>(
      useQuery({
        query: async () => ({ name: 'Edu' }),
        key: ['foo'],
      }).data,
    )
  })

  it('can customize the error type with a type param', () => {
    expectTypeOf<TypeError | null>(
      useQuery<number, TypeError>({
        query: async () => 42,
        key: ['foo'],
      }).error.value,
    )
  })

  it('can specify the error type', () => {
    expectTypeOf<Ref<TypeError | null>>(
      useQuery<number, TypeError>({
        query: async () => 42,
        key: ['foo'],
      }).error,
    )
  })

  it('expects an async query', () => {
    assertType(
      useQuery({
        // @ts-expect-error: should fail
        query: () => 42,
        key: ['foo'],
      }).data,
    )

    // NOTE: apparently, in ts, missing the `async` still makes the function return a Promise
    assertType(
      useQuery({
        query: async () => {
          throw new Error('nope')
        },
        key: ['foo'],
      }).data,
    )
  })

  it('works with a tuple in the key', () => {
    const key = ['todos', 2] as const
    useQuery({
      query: async () => 42,
      key,
    })

    useQuery({
      query: async () => 42,
      key: () => key,
    })
  })

  it('allows titeral in keys', () => {
    useQuery({
      key: [
        'todos',
        2,
        {},
        null,
        true,
        [],
        [2, 53, '', true, null, [{}, 2, [[]]]],
        { array: [], obj: { o: true } },
      ],
      query: async () => 42,
    })
  })

  it('forbids non-idempotent serializable values', () => {
    // NOTE: this had to be removed to allow interfaces in keys
    // https://github.com/posva/pinia-colada/issues/420
    // useQuery({
    //   // @ts-expect-error: should fail because Error is not a valid key
    //   key: [new Error('hey')],
    //   query: async () => 42,
    // })
    // useQuery({
    //   // @ts-expect-error: should fail because Date is not a valid key
    //   key: [new Date()],
    //   query: async () => 42,
    // })
    useQuery({
      // @ts-expect-error: should fail because undefined is not a valid key
      key: [undefined],
      query: async () => 42,
    })
  })

  it('allows an interface as part of the key', () => {
    interface MyKeyObject {
      id: number
    }
    const keyObject: MyKeyObject = { id: 5 }
    useQuery({
      key: [keyObject],
      query: async () => 42,
    })
  })

  it('allows loosely typed keys', () => {
    // oxlint-disable-next-line consistent-function-scoping
    const query = async () => 42
    useQuery({
      key: [] as (number | string)[],
      query,
    })

    useQuery({
      key: [] as (number | string | { a?: boolean })[],
      query,
    })

    useQuery({
      key: [] as (number | 'documents' | { a?: boolean })[],
      query,
    })

    useQuery({
      key: [] as (number | 'documents' | { a: boolean | undefined })[],
      query,
    })
  })

  it('can use a function as a key', () => {
    useQuery({
      query: async () => 42,
      key: ['todos'],
    })

    useQuery({
      query: async () => 42,
      key: ['todos', '2', 2],
    })
  })

  it('can use objects in keys', () => {
    useQuery({
      query: async () => 42,
      key: [{ id: 1 }],
    })

    useQuery({
      query: async () => 42,
      key: ['todos', { id: 1, a: true, b: 'hello' }, 5],
    })
  })

  it('can uses the global error type', () => {
    expectTypeOf<{ custom: Error } | null>(
      useQuery({
        query: async () => 42,
        key: ['foo'],
      }).error.value,
    )
  })

  // NOTE: the old feature didn't make much sense. the error checker should be similar to data loaders
  it.todo('can type the error with "transformError"', () => {
    // expectTypeOf<MyCustomError | UnexpectedError | null>(
    //   useQuery({
    //     query: async () => 42,
    //     key: ['foo'],
    //     transformError: (error) => {
    //       return error instanceof MyCustomError
    //         ? error
    //         : new UnexpectedError(error)
    //     },
    //   }).error.value,
    // )
  })

  it('narrows down the state type based on the status', () => {
    const { state } = useQuery<number, Error>({
      query: async () => 42,
      key: ['foo'],
    })

    if (state.value.status === 'success') {
      expectTypeOf<number>(state.value.data)
      expectTypeOf<null>(state.value.error)
      expectTypeOf<'success'>(state.value.status)
    } else if (state.value.status === 'error') {
      expectTypeOf<number | undefined>(state.value.data)
      expectTypeOf<Error>(state.value.error)
      expectTypeOf<'error'>(state.value.status)
    } else if (state.value.status === 'pending') {
      expectTypeOf<undefined>(state.value.data)
      expectTypeOf<null>(state.value.error)
      expectTypeOf<'pending'>(state.value.status)
    }
  })

  it('types the placeholder data', () => {
    useQuery({
      query: async () => 42,
      key: ['foo'],
      // @ts-expect-error: wrong type
      placeholderData: 'e',
    })

    useQuery({
      query: async () => 42,
      key: ['foo'],
      placeholderData: (n) => {
        expectTypeOf<number | undefined>(n)
        return n ?? 42
      },
    })
  })

  it('infers the initial type from initialData', () => {
    const { state, data } = useQuery({
      key: ['id'],
      query: async () => ({ text: 'ok' }),
      initialData: () => ({ text: 'init', isInit: true }),
      placeholderData: () => ({ text: 'placeholder' }),
    })
    expectTypeOf<{ text: string; isInit?: boolean }>(data.value)
    expectTypeOf<{ text: string; isInit?: boolean }>(state.value.data)
  })

  it('allows placeholderData to match initialData', async () => {
    useQuery({
      key: ['id'],
      query: async () => ({ text: 'ok' }),
      initialData: () => ({ text: 'init', isInit: true }),
      placeholderData: () => ({ text: 'placeholder', isInit: false }),
    })
  })

  it('keeps data as possibly undefined with palceholderData', () => {
    const { state, data } = useQuery({
      key: ['id'],
      query: async () => ({ text: 'ok' }),
      placeholderData: () => ({ text: 'placeholder' }),
    })

    expectTypeOf<{ text: string } | undefined>(data.value)
    expectTypeOf<{ text: string } | undefined>(state.value.data)
  })

  it('infers the initial type from initialData', () => {
    const { state, data } = useQuery({
      key: ['id'],
      query: async () => 42,
      initialData: () => 42,
    })
    expectTypeOf(data.value).toBeNumber()
    expectTypeOf(state.value.data).toBeNumber()
  })

  it('disallows passing a second argument', () => {
    // @ts-expect-error: should fail
    useQuery({ key: ['id'], query: async () => 42 }, () => ({}))
  })

  it('correctly infers TError when passed a UseQueryOptions', () => {
    const options = {} as UseQueryOptions<unknown, MyCustomError>

    const { state, error } = useQuery(options)
    expectTypeOf<MyCustomError | null>(error.value)
    expectTypeOf<MyCustomError | null>(state.value.error)
  })

  it('correctly infers TError when passed a DefineQueryOptions', () => {
    const options = {} as DefineQueryOptions<unknown, MyCustomError>

    const { state, error } = useQuery(options)
    expectTypeOf<MyCustomError | null>(error.value)
    expectTypeOf<MyCustomError | null>(state.value.error)
  })

  it('correctly infers TError when passed a () => DefineQueryOptions', () => {
    const options = {} as DefineQueryOptions<unknown, MyCustomError>

    const { state, error } = useQuery(() => options)
    expectTypeOf<MyCustomError | null>(error.value)
    expectTypeOf<MyCustomError | null>(state.value.error)
  })

  it('correctly infers TError when passed a DefineQueryOptionsTagged', () => {
    const options = {} as DefineQueryOptionsTagged<unknown, MyCustomError>

    const { state, error } = useQuery(options)
    expectTypeOf<MyCustomError | null>(error.value)
    expectTypeOf<MyCustomError | null>(state.value.error)
  })

  it('correctly infers TError when passed a () => DefineQueryOptionsTagged', () => {
    const options = {} as DefineQueryOptionsTagged<unknown, MyCustomError>

    const { state, error } = useQuery(() => options)
    expectTypeOf<MyCustomError | null>(error.value)
    expectTypeOf<MyCustomError | null>(state.value.error)
  })

  it('can infer the type of entry in the context', () => {
    const { data, state } = useQuery({
      key: ['id'],
      async query({ entry }) {
        expectTypeOf<{
          status: DataStateStatus
          // data can't be inferred in return and arguments
          // https://github.com/microsoft/TypeScript/issues/49618
          // https://github.com/microsoft/TypeScript/issues/47599
          data: unknown | null
          error: { custom: Error } | null
        }>(entry.state.value)

        return {
          status: 'ok' as 'ok' | 'error',
          message: 'hello',
        }
      },
    })

    expectTypeOf<
      | {
          status: 'ok' | 'error'
          message: string
        }
      | undefined
    >(data.value)

    expectTypeOf<
      | {
          status: 'ok' | 'error'
          message: string
        }
      | undefined
    >(state.value.data)
  })
})

export class MyCustomError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MyCustomError'
  }
}

export class UnexpectedError extends Error {
  error: unknown
  constructor(error: unknown) {
    super()
    this.error = error
  }
}

declare module './types-extension' {
  interface TypesConfig {
    defaultError: { custom: Error }
  }
}
