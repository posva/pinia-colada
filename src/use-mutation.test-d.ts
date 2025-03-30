import { describe, expectTypeOf, it } from 'vitest'
import { useMutation } from './use-mutation'
import type { _EmptyObject } from './utils'

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

  it('can infer the context from sync onBeforeMutate', () => {
    useMutation({
      onBeforeMutate() {
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

  it('must return an object in onBeforeMutate', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      // @ts-expect-error: must return an object
      onBeforeMutate() {
        return 42
      },
    })
  })

  it('can return undefined in onBeforeMutate', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      onBeforeMutate() {
        return undefined
      },
      onSuccess(_d, _v, context) {
        expectTypeOf(context).not.toBeAny()
      },
    })
  })

  it('can return null in onBeforeMutate', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      onBeforeMutate() {
        return null
      },
    })
  })

  it('can infer the context from async onBeforeMutate', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      async onBeforeMutate() {
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
      async onBeforeMutate() {
        return { foo: 'bar', bar: 'baz' }
      },
      onSuccess(_d, _v, context) {
        expectTypeOf(context).not.toBeAny()
        if (context.foo != null) {
          expectTypeOf(context).toMatchTypeOf<{ foo: string, bar: string }>()
        } else {
          expectTypeOf<never>(context.foo)
          expectTypeOf<never | undefined | string>(context.bar)
        }
      },
      onError(_e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        if (context.foo != null) {
          expectTypeOf(context).toMatchTypeOf<{ foo: string, bar: string }>()
        } else {
          expectTypeOf<never | undefined>(context.foo)
          expectTypeOf<never | undefined>(context.bar)
        }
      },
      onSettled(_d, _e, _v, context) {
        expectTypeOf(context).not.toBeAny()
        if (context.foo != null) {
          expectTypeOf(context).toMatchTypeOf<{ foo: string, bar: string }>()
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
      onBeforeMutate() {
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

    it('keeps empty context types when no return type onBeforeMutate', () => {
      useMutation({
        mutation: () => Promise.resolve(42),
        onBeforeMutate() {
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
