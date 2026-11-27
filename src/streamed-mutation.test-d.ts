import { describe, expectTypeOf, it } from 'vitest'
import { streamedMutation, useMutation } from '@pinia/colada'
import type {
  MutationCache,
  StreamedMutationFn,
  StreamedMutationOptions,
  UseMutationEntry,
} from '@pinia/colada'

async function* numbers(): AsyncGenerator<number> {
  yield 1
  yield 2
}

describe('streamedMutation', () => {
  it('infers the vars and an array of chunks by default', () => {
    const { data, mutate } = useMutation({
      mutation: streamedMutation({ stream: (_id: string) => numbers() }),
    })
    expectTypeOf(data.value).toEqualTypeOf<number[] | undefined>()
    expectTypeOf(mutate).parameter(0).toEqualTypeOf<string>()
  })

  it('has no vars if the stream has no parameters', () => {
    const { mutate } = useMutation({
      mutation: streamedMutation({ stream: () => numbers() }),
    })
    mutate()
  })

  it('infers the type of a custom reducer', () => {
    const { data } = useMutation({
      mutation: streamedMutation({
        stream: () => numbers(),
        reducer: (sum, n) => sum + n,
        initialValue: 0,
      }),
    })
    expectTypeOf(data.value).toEqualTypeOf<number | undefined>()
  })

  it('requires an initial value with a custom reducer', () => {
    // @ts-expect-error: missing initialValue
    streamedMutation({ stream: () => numbers(), reducer: (sum: number, n: number) => sum + n })
  })

  it('accepts a value typed with StreamedMutationOptions', () => {
    const options: StreamedMutationOptions<number, number[], string> = {
      stream: () => numbers(),
    }
    expectTypeOf(streamedMutation(options)).toEqualTypeOf<StreamedMutationFn<number[], string>>()
  })

  it('accepts a promise of an iterable', () => {
    expectTypeOf(
      streamedMutation({ stream: async () => numbers() }),
    ).returns.resolves.toEqualTypeOf<number[]>()
  })

  it('passes the mutation context', () => {
    streamedMutation({
      stream: (_vars: void, { entry, mutationCache }) => {
        expectTypeOf(entry).toEqualTypeOf<UseMutationEntry>()
        expectTypeOf(mutationCache).toEqualTypeOf<MutationCache>()
        return numbers()
      },
    })
  })
})
