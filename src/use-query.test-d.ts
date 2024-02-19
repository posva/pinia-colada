import { assertType, expectTypeOf, it } from 'vitest'
import { useQuery } from './use-query'
import { type Ref } from 'vue'

it('infers the data type', () => {
  expectTypeOf<Ref<number | undefined>>(
    useQuery({
      query: () => Promise.resolve(42),
      key: ['foo'],
    }).data
  )

  expectTypeOf<Ref<{ name: string } | undefined>>(
    useQuery({
      query: async () => ({ name: 'Edu' }),
      key: ['foo'],
    }).data
  )
})

it('can customize the error type with a type param', () => {
  expectTypeOf<TypeError | null>(
    useQuery<number, TypeError>({
      query: async () => 42,
      key: ['foo'],
    }).error.value
  )
})

it('can specify the error type', () => {
  expectTypeOf<Ref<TypeError | null>>(
    useQuery<number, TypeError>({
      query: async () => 42,
      key: ['foo'],
    }).error
  )
})

it('expects an async query', () => {
  assertType(
    useQuery({
      // @ts-expect-error
      query: () => 42,
      key: ['foo'],
    }).data
  )

  // NOTE: apparently, in ts, missing the `async` still makes the function return a Promise
  assertType(
    useQuery({
      query: async () => {
        throw new Error('nope')
      },
      key: ['foo'],
    }).data
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
    }).error.value
  )
})

declare module './types-extension' {
  interface TypesConfig {
    Error: { custom: Error }
  }
}
