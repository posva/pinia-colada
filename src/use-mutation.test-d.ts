import { expectTypeOf, it } from 'vitest'
import { useMutation } from './use-mutation'

it('types the parameters for the key', () => {
  useMutation({
    mutation: (_one: string, _two: number) => Promise.resolve({ name: 'foo' }),
    keys(result, one, two) {
      expectTypeOf(one).toBeString()
      expectTypeOf(two).toBeNumber()
      expectTypeOf(result).toEqualTypeOf<{ name: string }>()
      return [['foo']]
    },
  })
})

it('can return an array of keys', () => {
  useMutation({
    mutation: () => Promise.resolve(42),
    keys() {
      return [['one']]
    },
  })
})

it('can infer the arguments from the mutation', () => {
  useMutation({
    mutation: (_one: string, _two: number) => Promise.resolve({ name: 'foo' }),
    onSuccess({ args }) {
      expectTypeOf(args).toEqualTypeOf<[string, number]>()
    },
    onError({ args }) {
      expectTypeOf(args).toEqualTypeOf<[string, number]>()
    },
    onSettled({ args }) {
      expectTypeOf(args).toEqualTypeOf<[string, number]>()
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
    mutation: () => Promise.resolve(42),
    onMutate() {
      return { foo: 'bar' }
    },
    onSuccess({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ foo: string }>()
    },
    onError({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ foo: string }>()
    },
    onSettled({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ foo: string }>()
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
    onSuccess({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ foo: string }>()
    },
    onError({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ foo: string }>()
    },
    onSettled({ context }) {
      expectTypeOf(context).toEqualTypeOf<{ foo: string }>()
    },
  })
})

it('can infer a context of void', () => {
  useMutation({
    mutation: () => Promise.resolve(42),
    onMutate() {
      // no return
    },

    onSuccess({ context }) {
      expectTypeOf(context).toEqualTypeOf<void>()
    },
    onError({ context }) {
      expectTypeOf(context).toEqualTypeOf<void>()
    },
    onSettled({ context }) {
      expectTypeOf(context).toEqualTypeOf<void>()
    },
  })
})
