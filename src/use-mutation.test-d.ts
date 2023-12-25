import { expectTypeOf, it } from 'vitest'
import { useMutation } from './use-mutation'

it('types the parameters for the key', () => {
  useMutation({
    mutator: (one: string, two: number) => Promise.resolve({ name: 'foo' }),
    keys(result, one, two) {
      expectTypeOf(one).toBeString()
      expectTypeOf(two).toBeNumber()
      expectTypeOf(result).toEqualTypeOf<{ name: string }>()
      return 'foo'
    },
  })
})

it('can return an array of keys', () => {
  useMutation({
    mutator: () => Promise.resolve(42),
    keys() {
      return ['one']
    },
  })
})
