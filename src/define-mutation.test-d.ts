import { expectTypeOf, it } from 'vitest'
import { defineMutation } from './define-mutation'

it('can define a mutation with an options object', () => {
  const useMutation = defineMutation({
    mutation: async (id: number) => ({ id }),
  })

  const { data, mutate } = useMutation()

  expectTypeOf(mutate(32)).toEqualTypeOf<void>()
  // @ts-expect-error: need args
  mutate()
  // @ts-expect-error: must be number
  mutate('32')

  expectTypeOf(data.value).toEqualTypeOf<{ id: number } | undefined>()
})

it('can define a mutation with a function', () => {
  const useMutation = defineMutation(() => {
    return {
      mutation: async (id: number) => ({ id }),
    }
  })

  const { data, mutate } = useMutation()

  expectTypeOf(mutate(32)).toEqualTypeOf<void>()
  // @ts-expect-error: need args
  mutate()
  // @ts-expect-error: must be number
  mutate('32')

  expectTypeOf(data.value).toEqualTypeOf<{ id: number } | undefined>()
})

it('can type the error', () => {
  const useMutation = defineMutation<{ id: number }, number, TypeError>({
    mutation: async (id: number) => {
      if (id < 0) {
        throw new TypeError('id must be positive')
      }
      return { id }
    },
  })

  const { data, error } = useMutation()

  expectTypeOf(error.value).toEqualTypeOf<TypeError | null>()
  expectTypeOf(data.value).toEqualTypeOf<{ id: number } | undefined>()
})
