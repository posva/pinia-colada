import { describe, expectTypeOf, it } from 'vitest'
import { useMutation } from './use-mutation'

describe('useMutation type inference', () => {
  it('types the parameters for the key', () => {
    useMutation({
      mutation: (_one: string) => Promise.resolve({ name: 'foo' }),
      key(one) {
        expectTypeOf(one).toBeString()
        return ['foo']
      },
    })
  })

  it('can infer the arguments from the mutation', () => {
    useMutation({
      mutation: (_one: string) => Promise.resolve({ name: 'foo' }),
      onSuccess({ vars }) {
        expectTypeOf(vars).toEqualTypeOf<string>()
      },
      onError({ vars }) {
        expectTypeOf(vars).toEqualTypeOf<string>()
      },
      onSettled({ vars }) {
        expectTypeOf(vars).toEqualTypeOf<string>()
      },
    })
  })

  it('can infer the data from the mutation', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      onSuccess({ data }) {
        expectTypeOf(data).toEqualTypeOf<number>()
      },
      onSettled({ data }) {
        expectTypeOf(data).toEqualTypeOf<number | undefined>()
      },
    })
  })

  it('can infer the context from sync onMutate', () => {
    useMutation({
      onMutate() {
        return { foo: 'bar' }
      },
      mutation: async (vars: number, context) => {
        expectTypeOf(vars).toBeNumber()
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toEqualTypeOf<{ foo: string }>()
        return 42
      },
      onSuccess(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo: string }>()
      },
      onError(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo: string }>()
      },
      onSettled(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo: string }>()
      },
    })
  })

  it('must return an object in onMutate', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      // @ts-expect-error: must return an object
      onMutate() {
        return 42
      },
    })
  })

  it('can return undefined in onMutate', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      onMutate() {
        return undefined
      },
      onSuccess(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{
          data: number
        }>()
      },
    })
  })

  it('can return null in onMutate', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      onMutate() {
        return null
      },
    })
  })

  it('can infer the context from async onMutate', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      async onMutate() {
        return { foo: 'bar' }
      },
      onSuccess(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo: string }>()
      },
      onError(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo: string }>()
      },
      onSettled(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo: string }>()
      },
    })
  })

  it('can infer a context of void', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      onMutate() {
        // no return
      },

      onSuccess(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{
          data: number
          vars: undefined | void
        }>()
      },
      onError(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{
          error: unknown
          vars: undefined | void
        }>()
      },
      onSettled(context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{
          data: number | undefined
          error: unknown | null
          vars: undefined | void
        }>()
      },
    })
  })
})
