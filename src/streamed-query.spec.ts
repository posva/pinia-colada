import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mockConsoleError, mockWarn, promiseWithResolvers } from '@posva/test-utils'
import { PiniaColada } from './pinia-colada'
import { useQueryCache } from './query-store'
import { useQuery } from './use-query'
import { streamedQuery } from './streamed-query'
import type {
  StreamedQueryOptions_WithReducer,
  StreamedQueryOptions_WithoutReducer,
} from './streamed-query'

type OptionsWithoutStream<TChunk, TData> =
  | Omit<StreamedQueryOptions_WithoutReducer<TChunk>, 'stream'>
  | Omit<StreamedQueryOptions_WithReducer<TChunk, TData>, 'stream'>

/**
 * Async iterable controlled by the test.
 */
function createStream<T>() {
  const steps = [promiseWithResolvers<IteratorResult<T, undefined>>()]
  let returned = false

  async function* iterate() {
    try {
      for (let i = 0; ; i++) {
        // oxlint-disable-next-line no-await-in-loop -- chunks arrive one by one
        const result = await steps[i]!.promise
        if (result.done) return
        yield result.value
      }
    } finally {
      returned = true
    }
  }

  return {
    iterable: iterate(),
    push(value: T) {
      steps.at(-1)!.resolve({ value, done: false })
      steps.push(promiseWithResolvers())
    },
    end() {
      steps.at(-1)!.resolve({ value: undefined, done: true })
    },
    fail(error: unknown) {
      steps.at(-1)!.reject(error)
    },
    get returned() {
      return returned
    },
  }
}

describe('streamedQuery', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(async () => {
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)
  mockWarn()
  mockConsoleError()

  function mountStreamed<TChunk = number, TData = TChunk[]>(
    options: OptionsWithoutStream<TChunk, TData> = {},
  ) {
    const streams: Array<ReturnType<typeof createStream<TChunk>>> = []
    const stream = () => {
      const s = createStream<TChunk>()
      streams.push(s)
      return s.iterable
    }
    let queryCache!: ReturnType<typeof useQueryCache>

    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          queryCache = useQueryCache()
          return useQuery({
            key: ['key'],
            query: streamedQuery({ ...options, stream }),
          })
        },
      }),
      { global: { plugins: [createPinia(), PiniaColada] } },
    )

    return {
      wrapper,
      streams,
      queryCache,
      get current() {
        return streams.at(-1)!
      },
    }
  }

  it('updates the data on each chunk', async () => {
    const { wrapper, current } = mountStreamed()
    await flushPromises()

    expect(wrapper.vm.status).toBe('pending')
    expect(wrapper.vm.asyncStatus).toBe('loading')
    expect(wrapper.vm.data).toBeUndefined()

    current.push(1)
    await flushPromises()
    expect(wrapper.vm.status).toBe('success')
    expect(wrapper.vm.asyncStatus).toBe('loading')
    expect(wrapper.vm.data).toEqual([1])

    current.push(2)
    await flushPromises()
    expect(wrapper.vm.data).toEqual([1, 2])

    current.end()
    await flushPromises()
    expect(wrapper.vm.status).toBe('success')
    expect(wrapper.vm.asyncStatus).toBe('idle')
    expect(wrapper.vm.data).toEqual([1, 2])
  })

  it('resolves with the initial value when the stream is empty', async () => {
    const { wrapper, current } = mountStreamed()
    await flushPromises()

    current.end()
    await flushPromises()
    expect(wrapper.vm.status).toBe('success')
    expect(wrapper.vm.data).toEqual([])
  })

  it('uses a custom reducer and initial value', async () => {
    const { wrapper, current } = mountStreamed<string, string>({
      reducer: (text, chunk) => text + chunk,
      initialValue: '',
    })
    await flushPromises()

    current.push('Hel')
    await flushPromises()
    expect(wrapper.vm.data).toBe('Hel')

    current.push('lo')
    current.end()
    await flushPromises()
    expect(wrapper.vm.data).toBe('Hello')
  })

  it('keeps a null result of the reducer', async () => {
    const { wrapper, current } = mountStreamed<number, number | null>({
      reducer: (_sum, n) => (n < 0 ? null : n),
      initialValue: 0,
    })
    await flushPromises()

    current.push(-1)
    await flushPromises()
    expect(wrapper.vm.data).toBe(null)

    current.end()
    await flushPromises()
    expect(wrapper.vm.status).toBe('success')
    expect(wrapper.vm.data).toBe(null)
  })

  it('keeps the received data when the stream fails', async () => {
    const { wrapper, current } = mountStreamed()
    await flushPromises()

    current.push(1)
    await flushPromises()
    current.fail(new Error('ko'))
    await flushPromises()

    expect(wrapper.vm.status).toBe('error')
    expect(wrapper.vm.error).toEqual(new Error('ko'))
    expect(wrapper.vm.data).toEqual([1])
    expect(wrapper.vm.asyncStatus).toBe('idle')
  })

  describe('refetchMode', () => {
    async function mountAndStream(options: OptionsWithoutStream<number, number[]> = {}) {
      const mounted = mountStreamed<number, number[]>(options)
      await flushPromises()
      mounted.current.push(1)
      mounted.current.push(2)
      mounted.current.end()
      await flushPromises()
      expect(mounted.wrapper.vm.data).toEqual([1, 2])
      return mounted
    }

    it('resets the data by default', async () => {
      const mounted = await mountAndStream()

      mounted.wrapper.vm.refetch()
      await flushPromises()
      expect(mounted.wrapper.vm.status).toBe('pending')
      expect(mounted.wrapper.vm.data).toBeUndefined()

      mounted.current.push(3)
      await flushPromises()
      expect(mounted.wrapper.vm.status).toBe('success')
      expect(mounted.wrapper.vm.data).toEqual([3])
    })

    it('appends to the existing data', async () => {
      const mounted = await mountAndStream({ refetchMode: 'append' })

      mounted.wrapper.vm.refetch()
      await flushPromises()
      expect(mounted.wrapper.vm.data).toEqual([1, 2])

      mounted.current.push(3)
      await flushPromises()
      expect(mounted.wrapper.vm.data).toEqual([1, 2, 3])
    })

    it('keeps the existing data when appending an empty stream', async () => {
      const mounted = await mountAndStream({ refetchMode: 'append' })

      mounted.wrapper.vm.refetch()
      await flushPromises()
      mounted.current.end()
      await flushPromises()
      expect(mounted.wrapper.vm.data).toEqual([1, 2])
    })

    it('replaces the data when the stream ends', async () => {
      const mounted = await mountAndStream({ refetchMode: 'replace' })

      mounted.wrapper.vm.refetch()
      await flushPromises()
      mounted.current.push(3)
      mounted.current.push(4)
      await flushPromises()
      expect(mounted.wrapper.vm.data).toEqual([1, 2])

      mounted.current.end()
      await flushPromises()
      expect(mounted.wrapper.vm.data).toEqual([3, 4])
    })
  })

  it('ignores chunks after the query is cancelled', async () => {
    const { wrapper, current, queryCache } = mountStreamed()
    await flushPromises()

    current.push(1)
    await flushPromises()
    queryCache.cancelQueries({ key: ['key'] })
    current.push(2)
    await flushPromises()

    expect(wrapper.vm.data).toEqual([1])
    expect(wrapper.vm.asyncStatus).toBe('idle')
    // the iterator is closed
    expect(current.returned).toBe(true)
  })

  it('ignores chunks of an outdated stream', async () => {
    const { wrapper, streams } = mountStreamed({ refetchMode: 'append' })
    await flushPromises()

    streams[0]!.push(1)
    await flushPromises()
    wrapper.vm.refetch()
    await flushPromises()

    streams[0]!.push(2)
    streams[1]!.push(3)
    await flushPromises()
    expect(wrapper.vm.data).toEqual([1, 3])

    // the outdated stream never ends but does not keep the query loading
    streams[1]!.end()
    await flushPromises()
    expect(wrapper.vm.asyncStatus).toBe('idle')
  })

  it('keeps data set with setQueryData() during the stream', async () => {
    const { wrapper, current, queryCache } = mountStreamed()
    await flushPromises()

    current.push(1)
    await flushPromises()
    queryCache.setQueryData(['key'], [0, 1])
    current.push(2)
    current.end()
    await flushPromises()

    expect(wrapper.vm.data).toEqual([0, 1, 2])
  })
})
