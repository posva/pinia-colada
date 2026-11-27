import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent } from 'vue'
import { createStream } from '@posva/test-utils'
import { PiniaColada } from './pinia-colada'
import { useMutation } from './use-mutation'
import { useMutationCache } from './mutation-store'
import { streamedMutation } from './streamed-mutation'
import type {
  StreamedMutationOptions_WithReducer,
  StreamedMutationOptions_WithoutReducer,
} from './streamed-mutation'

type OptionsWithoutStream<TChunk, TData> =
  | Omit<StreamedMutationOptions_WithoutReducer<TChunk, TChunk>, 'stream'>
  | Omit<StreamedMutationOptions_WithReducer<TChunk, TData, TChunk>, 'stream'>

describe('streamedMutation', () => {
  enableAutoUnmount(afterEach)

  function mountStreamed<TChunk = number, TData = TChunk[]>(
    options: OptionsWithoutStream<TChunk, TData> = {},
  ) {
    const streams: Array<ReturnType<typeof createStream<TChunk>>> = []
    // the vars are the first chunk
    const stream = (vars: TChunk) => {
      const s = createStream<TChunk>()
      streams.push(s)
      s.push(vars)
      return s.iterable
    }

    let mutationCache!: ReturnType<typeof useMutationCache>

    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          mutationCache = useMutationCache()
          return useMutation({ mutation: streamedMutation({ ...options, stream }) })
        },
      }),
      { global: { plugins: [createPinia(), PiniaColada] } },
    )

    return {
      wrapper,
      mutationCache,
      get current() {
        return streams.at(-1)!
      },
    }
  }

  it('updates the data on each chunk', async () => {
    const s = mountStreamed()

    const promise = s.wrapper.vm.mutateAsync(1)
    await flushPromises()
    expect(s.wrapper.vm.status).toBe('success')
    expect(s.wrapper.vm.asyncStatus).toBe('loading')
    expect(s.wrapper.vm.data).toEqual([1])

    s.current.push(2)
    await flushPromises()
    expect(s.wrapper.vm.data).toEqual([1, 2])

    s.current.end()
    await expect(promise).resolves.toEqual([1, 2])
    expect(s.wrapper.vm.asyncStatus).toBe('idle')
  })

  it('starts from the initial value on each call', async () => {
    const s = mountStreamed()

    s.wrapper.vm.mutate(1)
    await flushPromises()
    s.current.end()
    await flushPromises()
    s.wrapper.vm.mutate(2)
    await flushPromises()

    expect(s.wrapper.vm.data).toEqual([2])
  })

  it('uses a custom reducer and initial value', async () => {
    const s = mountStreamed<string, string>({
      reducer: (text, chunk) => text + chunk,
      initialValue: '',
    })

    s.wrapper.vm.mutate('Hel')
    await flushPromises()
    s.current.push('lo')
    s.current.end()
    await flushPromises()

    expect(s.wrapper.vm.data).toBe('Hello')
  })

  it('keeps an undefined initial value with a custom reducer', async () => {
    const s = mountStreamed<number, number | undefined>({
      reducer: (sum, n) => (sum ?? 0) + n,
      initialValue: undefined,
    })

    s.wrapper.vm.mutate(1)
    await flushPromises()
    s.current.push(2)
    s.current.end()
    await flushPromises()

    expect(s.wrapper.vm.data).toBe(3)
  })

  it('keeps the received data when the stream fails', async () => {
    const s = mountStreamed()

    s.wrapper.vm.mutate(1)
    await flushPromises()
    s.current.fail(new Error('ko'))
    await flushPromises()

    expect(s.wrapper.vm.status).toBe('error')
    expect(s.wrapper.vm.error).toEqual(new Error('ko'))
    expect(s.wrapper.vm.data).toEqual([1])
  })

  it('ignores chunks after the mutation is cancelled', async () => {
    const s = mountStreamed()

    s.wrapper.vm.mutate(1)
    await flushPromises()
    s.mutationCache.cancel(s.mutationCache.getEntries()[0]!)
    s.current.push(2)
    await flushPromises()

    expect(s.wrapper.vm.status).toBe('error')
    expect(s.wrapper.vm.data).toEqual([1])
    // the iterator is closed
    expect(s.current.returned).toBe(true)
  })
})
