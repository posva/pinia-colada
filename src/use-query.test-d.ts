import { assertType, describe, expectTypeOf, it } from 'vitest'
import type { Ref } from 'vue'
import { useQuery } from './use-query'

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

  it('can type the error with "transformError"', () => {
    expectTypeOf<MyCustomError | UnexpectedError | null>(
      useQuery({
        query: async () => 42,
        key: ['foo'],
        transformError: (error) => {
          return error instanceof MyCustomError
            ? error
            : new UnexpectedError(error)
        },
      }).error.value,
    )
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
})

class MyCustomError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MyCustomError'
  }
}

class UnexpectedError extends Error {
  error: unknown
  constructor(error: unknown) {
    super()
    this.error = error
  }
}

declare module './types-extension' {
  interface TypesConfig {
    Error: { custom: Error }
  }
}
