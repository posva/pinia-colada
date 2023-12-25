import { expectTypeOf, it } from 'vitest'
import { useMutation } from './use-mutation'

it('types the parameters for the key', () => {
  useMutation({
    mutator: (one: string, two: number) => Promise.resolve(42),
    keys: [
      ({ args, result }) => {
        expectTypeOf(args).toEqualTypeOf<[string, number]>()
        expectTypeOf(result).toBeNumber()
        return 'foo'
      },
    ],
  })
})
