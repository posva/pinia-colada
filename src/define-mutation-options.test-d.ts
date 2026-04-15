import { describe, expectTypeOf, it } from 'vitest'
import { defineMutationOptions } from './define-mutation-options'
import type { DefineMutationOptionsTagged, _MutationKeyTagged } from './define-mutation-options'
import { useMutation } from './use-mutation'
import type { EntryKeyTagged } from './entry-keys'
import type { ErrorDefault } from './types-extension'
import type { _EmptyObject } from './utils'

describe('defineMutationOptions types', () => {
  it('static options infer TData and TVars', () => {
    const opts = defineMutationOptions({
      key: ['items', 'delete'],
      mutation: async (id: number) => ({ id, name: 'test' }),
    })

    expectTypeOf(opts).toEqualTypeOf<
      DefineMutationOptionsTagged<{ id: number; name: string }, number, ErrorDefault, _EmptyObject>
    >()

    const { data, mutate } = useMutation(opts)

    expectTypeOf(data.value).toEqualTypeOf<{ id: number; name: string } | undefined>()
    expectTypeOf(mutate).toBeCallableWith(42)
  })

  it('static options key is tagged', () => {
    const opts = defineMutationOptions({
      key: ['items', 'create'],
      mutation: async (text: string) => ({ id: 1, text }),
    })

    expectTypeOf(opts.key).toEqualTypeOf<
      _MutationKeyTagged<{ id: number; text: string }, string, ErrorDefault>
    >()
  })

  it('dynamic options with required params', () => {
    const opts = defineMutationOptions((baseUrl: string) => ({
      mutation: async (id: number) => ({ url: `${baseUrl}/${id}` }),
    }))

    const resolved = opts('/api')
    expectTypeOf(resolved.key).toEqualTypeOf<
      _MutationKeyTagged<{ url: string }, number, ErrorDefault>
    >()

    const { data, mutate } = useMutation(resolved)

    expectTypeOf(data.value).toEqualTypeOf<{ url: string } | undefined>()
    expectTypeOf(mutate).toBeCallableWith(1)
    // @ts-expect-error: requires a param
    opts()
  })

  it('dynamic options with optional params', () => {
    const opts = defineMutationOptions((prefix?: string) => ({
      key: ['items', prefix ?? 'default'],
      mutation: async (id: number) => `${prefix ?? 'default'}:${id}`,
    }))

    // can call with or without params
    opts()
    opts('custom')

    const { data } = useMutation(opts())
    expectTypeOf(data.value).toEqualTypeOf<string | undefined>()

    expectTypeOf(opts().key).toEqualTypeOf<_MutationKeyTagged<string, number, ErrorDefault>>()
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

  it('supports key option as static array', () => {
    const opts = defineMutationOptions({
      key: ['todos', 'create'],
      mutation: async (text: string) => ({ id: 1, text }),
    })

    expectTypeOf(opts).toHaveProperty('key')
    expectTypeOf(opts.key).toEqualTypeOf<
      _MutationKeyTagged<{ id: number; text: string }, string, ErrorDefault>
    >()
  })

  it('supports function key', () => {
    const opts = defineMutationOptions({
      key: (vars: number) => ['todos', 'delete', vars],
      mutation: async (id: number) => ({ success: true }),
    })

    expectTypeOf(opts.key).toEqualTypeOf<
      _MutationKeyTagged<{ success: boolean }, number, ErrorDefault>
    >()
  })

  it('void vars mutation', () => {
    const opts = defineMutationOptions({
      mutation: async () => 'done',
    })

    const { mutate } = useMutation(opts)
    mutate()
  })

  it('tagged key is assignable to EntryKey (cache compat)', () => {
    const opts = defineMutationOptions({
      key: ['items', 'create'],
      mutation: async (text: string) => ({ id: 1, text }),
    })

    // EntryKeyTagged extends EntryKey, so tagged keys are assignable
    // This ensures compatibility with cache filter APIs
    expectTypeOf(opts.key).toExtend<
      | EntryKeyTagged<{ id: number; text: string }, ErrorDefault>
      | ((vars: string) => EntryKeyTagged<{ id: number; text: string }, ErrorDefault>)
    >()
  })
})
