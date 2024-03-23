import { expectTypeOf, it } from 'vitest'
import { defineMutation } from './define-mutation'

it('can define a mutation with just options', () => {
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
