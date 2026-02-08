import { describe, expectTypeOf, it } from 'vitest'
import type { ShallowRef } from 'vue'
import { useMutation } from './use-mutation'
import type { _EmptyObject } from './utils'
import type { UseMutationEntry } from '@pinia/colada'

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
      onSuccess(_data, vars) {
        expectTypeOf(vars).toEqualTypeOf<string>()
      },
      onError(_err, vars) {
        expectTypeOf(vars).toEqualTypeOf<string>()
      },
      onSettled(_data, _err, vars) {
        expectTypeOf(vars).toEqualTypeOf<string>()
      },
    })
  })

  it('can infer the data from the mutation', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      onSuccess(data) {
        expectTypeOf(data).toEqualTypeOf<number>()
      },
      onSettled(data) {
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
      onSuccess(_d, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo: string }>()
      },
      onError(_e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context.foo).toMatchTypeOf<string | undefined>()
      },
      onSettled(_d, _e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context.foo).toMatchTypeOf<string | undefined>()
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
      onSuccess(_d, _v, context) {
        expectTypeOf(context).not.toBeAny()
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
      onSuccess(_d, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo: string }>()
      },
      onError(_e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo?: string }>()
      },
      onSettled(_d, _e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<{ foo?: string }>()
      },
    })
  })

  it('allows type narrowing based on context properties', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      async onMutate() {
        return { foo: 'bar', bar: 'baz' }
      },
      onSuccess(_d, _v, context) {
        expectTypeOf(context).not.toBeAny()
        if (context.foo != null) {
          expectTypeOf(context).toMatchTypeOf<{ foo: string; bar: string }>()
        } else {
          expectTypeOf<never>(context.foo)
          expectTypeOf<never | undefined | string>(context.bar)
        }
      },
      onError(_e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        if (context.foo != null) {
          expectTypeOf(context).toMatchTypeOf<{ foo: string; bar: string }>()
        } else {
          expectTypeOf<never | undefined>(context.foo)
          expectTypeOf<never | undefined>(context.bar)
        }
      },
      onSettled(_d, _e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        if (context.foo != null) {
          expectTypeOf(context).toMatchTypeOf<{ foo: string; bar: string }>()
        } else {
          expectTypeOf<never | undefined>(context.foo)
          expectTypeOf<never | undefined>(context.bar)
        }
      },
    })
  })

  it('can infer a context of void', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      onMutate() {
        // no return
      },

      onSuccess(_d, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<_EmptyObject>()
      },
      onError(_e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<_EmptyObject>()
      },
      onSettled(_d, _e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        expectTypeOf(context).toMatchTypeOf<_EmptyObject>()
      },
    })

    it('keeps empty context types when no return type onMutate', () => {
      useMutation({
        mutation: () => Promise.resolve(42),
        onMutate() {
          // no return
          // return { o: true }
        },
        onSuccess(
          _d,
          _v,
          {
            // @ts-expect-error: foo doesn't exist
            foo: _foo,
          },
        ) {},
        onError(
          _d,
          _v,
          {
            // @ts-expect-error: foo doesn't exist
            foo: _foo,
          },
        ) {},
        onSettled(
          _d,
          _e,
          _v,
          {
            // @ts-expect-error: foo doesn't exist
            foo: _foo,
          },
        ) {},
      })
    })
  })
})

describe('extendMutationEntry type inference', () => {
  it('errors when setting ext directly', () => {
    const entry = {} as UseMutationEntry
    // @ts-expect-error: ext is readonly
    entry.ext = { }
  })
})
