import { useMutation } from '@pinia/colada'
import { describe, expectTypeOf, it } from 'vitest'

describe('invalidateKeys', () => {
  it('types the parameters for the keys', () => {
    const { mutate, mutateAsync } = useMutation({
      mutation: (_one: string) => Promise.resolve({ name: 'foo' }),
      invalidateKeys(result, one) {
        expectTypeOf(one).toBeString()
        expectTypeOf(result).toEqualTypeOf<{ name: string }>()
        return [['foo']]
      },
    })

    mutate('one')
    mutateAsync('one')
    // @ts-expect-error: missing arg
    mutate()
    // @ts-expect-error: missing arg
    mutateAsync()
  })

  it('allows no arguments to mutation', () => {
    const { mutate, mutateAsync } = useMutation({
      mutation: () => Promise.resolve({ name: 'foo' }),
      invalidateKeys(result) {
        expectTypeOf(result).toEqualTypeOf<{ name: string }>()
        return [['foo']]
      },
    })

    mutate()
    mutateAsync()
    // @ts-expect-error: no extra arg
    mutate(25)
    // @ts-expect-error: no extra arg
    mutateAsync(25)
  })

  it('can return an array of keys', () => {
    useMutation({
      mutation: () => Promise.resolve(42),
      invalidateKeys() {
        return [['one']]
      },
    })
  })
})
