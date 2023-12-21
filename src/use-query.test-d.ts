import { assertType, expectTypeOf, it } from 'vitest'
import { useQuery } from './use-query'
import { type Ref } from 'vue'

it('infers the data type', () => {
  expectTypeOf<Ref<number | undefined>>(
    useQuery({
      fetcher: () => Promise.resolve(42),
      key: 'foo',
    }).data
  )

  expectTypeOf<Ref<{ name: string } | undefined>>(
    useQuery({
      fetcher: async () => ({ name: 'Edu' }),
      key: 'foo',
    }).data
  )
})

it('uses Error by default for the error type', () => {
  expectTypeOf<Ref<Error | null>>(
    useQuery({
      fetcher: async () => 42,
      key: 'foo',
    }).error
  )
})

it('can specify the error type', () => {
  expectTypeOf<Ref<TypeError | null>>(
    useQuery<number, TypeError>({
      fetcher: async () => 42,
      key: 'foo',
    }).error
  )
})

it('expects an async fetcher', () => {
  assertType(
    useQuery({
      // @ts-expect-error
      fetcher: () => 42,
      key: 'foo',
    }).data
  )

  // NOTE: apparently, in ts, missing the `async` still makes the function return a Promise
  assertType(
    useQuery({
      fetcher: async () => {
        throw new Error('nope')
      },
      key: 'foo',
    }).data
  )
})
