import { describe, expectTypeOf, it } from 'vitest'
import { defineMutationOptions } from './define-mutation-options'
import { useMutation } from './use-mutation'

describe('defineMutationOptions types', () => {
  it('static options infer TData and TVars', () => {
    const opts = defineMutationOptions({
      mutation: async (id: number) => ({ id, name: 'test' }),
    })

    const { data, mutate } = useMutation(opts)

    expectTypeOf(data.value).toEqualTypeOf<{ id: number; name: string } | undefined>()
    expectTypeOf(mutate).toBeCallableWith(42)
  })

  it('dynamic options with required params', () => {
    const opts = defineMutationOptions((baseUrl: string) => ({
      mutation: async (id: number) => ({ url: `${baseUrl}/${id}` }),
    }))

    const { data, mutate } = useMutation(opts('/api'))

    expectTypeOf(data.value).toEqualTypeOf<{ url: string } | undefined>()
    expectTypeOf(mutate).toBeCallableWith(1)
    // @ts-expect-error: requires a param
    opts()
  })

  it('dynamic options with optional params', () => {
    const opts = defineMutationOptions((prefix?: string) => ({
      mutation: async (id: number) => `${prefix ?? 'default'}:${id}`,
    }))

    // can call with or without params
    opts()
    opts('custom')

    const { data } = useMutation(opts())
    expectTypeOf(data.value).toEqualTypeOf<string | undefined>()
  })

  it('infers context from onMutate', () => {
    const opts = defineMutationOptions({
      onMutate(vars: number) {
        return { previousValue: `old:${vars}` }
      },
      mutation: async (vars: number, context) => {
        expectTypeOf(context).toEqualTypeOf<{ previousValue: string }>()
        return vars * 2
      },
      onSuccess(data, vars, context) {
        expectTypeOf(data).toEqualTypeOf<number>()
        expectTypeOf(vars).toEqualTypeOf<number>()
        expectTypeOf(context.previousValue).toEqualTypeOf<string>()
      },
    })

    const { data } = useMutation(opts)
    expectTypeOf(data.value).toEqualTypeOf<number | undefined>()
  })

  it('supports key option', () => {
    const opts = defineMutationOptions({
      key: ['todos', 'create'],
      mutation: async (text: string) => ({ id: 1, text }),
    })

    expectTypeOf(opts.key).toEqualTypeOf<readonly string[] | undefined>()
  })

  it('supports function key', () => {
    defineMutationOptions({
      key: (vars: number) => ['todos', 'delete', vars],
      mutation: async (id: number) => ({ success: true }),
    })
  })

  it('void vars mutation', () => {
    const opts = defineMutationOptions({
      mutation: async () => 'done',
    })

    const { mutate } = useMutation(opts)
    mutate()
  })
})
