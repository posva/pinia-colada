import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery } from '../use-query'
import { useQueryCache } from '../query-store'
import type { PiniaColadaOptions } from '../pinia-colada'
import { PiniaColada } from '../pinia-colada'
import { PiniaColadaQueryHooksPlugin } from './query-hooks'
import type { UseQueryOptions } from '../query-options'

describe('Query Hooks plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function factory(options: PiniaColadaOptions, queryOptions?: UseQueryOptions) {
    const pinia = createPinia()
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return {
            ...useQuery(
              queryOptions || {
                query: async () => 42,
                key: ['key'],
              },
            ),
          }
        },
      }),
      {
        global: {
          plugins: [pinia, [PiniaColada, options]],
        },
      },
    )

    return { pinia, wrapper }
  }

  it('calls the hooks on success', async () => {
    const onSuccess = vi.fn()
    const onSettled = vi.fn()
    const onError = vi.fn()

    factory({
      plugins: [
        PiniaColadaQueryHooksPlugin({
          onSuccess,
          onSettled,
          onError,
        }),
      ],
    })

    await flushPromises()

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(0)
    expect(onSuccess).toHaveBeenCalledWith(42, expect.objectContaining({}))
    expect(onSuccess.mock.calls[0]?.[1]?.state?.value).toMatchObject({
      data: 42,
      status: 'success',
      error: null,
    })
    expect(onSettled).toHaveBeenCalledWith(42, null, expect.objectContaining({}))
    expect(onSettled.mock.calls[0]?.[2]?.state?.value).toMatchObject({
      data: 42,
      status: 'success',
      error: null,
    })
  })

  it('calls the hooks on error', async () => {
    const onSuccess = vi.fn()
    const onSettled = vi.fn()
    const onError = vi.fn()
    factory(
      {
        plugins: [
          PiniaColadaQueryHooksPlugin({
            onSuccess,
            onSettled,
            onError,
          }),
        ],
      },
      {
        query: async () => {
          throw new Error('oops')
        },
        key: ['key'],
      },
    )

    await flushPromises()

    expect(onSuccess).toHaveBeenCalledTimes(0)
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)

    expect(onError).toHaveBeenCalledWith(new Error('oops'), expect.objectContaining({}))
    expect(onSettled).toHaveBeenCalledWith(
      undefined,
      new Error('oops'),
      expect.objectContaining({}),
    )

    expect(onError.mock.calls[0]?.[1]?.state?.value).toMatchObject({
      data: undefined,
      status: 'error',
      error: new Error('oops'),
    })
    expect(onSettled.mock.calls[0]?.[2]?.state?.value).toMatchObject({
      data: undefined,
      status: 'error',
      error: new Error('oops'),
    })
  })

  describe('cancelled fetches', () => {
    // Simulates a cancellable request: resolves after 50ms unless aborted externally
    function abortableQuery({ signal }: { signal: AbortSignal }) {
      return new Promise<number>((resolve, reject) => {
        const timer = setTimeout(() => resolve(42), 50)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          // use the real abort reason, like fetch() do
          reject(signal.reason)
        })
      })
    }

    function factoryWithHooks(queryOptions?: UseQueryOptions) {
      const onSuccess = vi.fn()
      const onSettled = vi.fn()
      const onError = vi.fn()
      const { pinia, wrapper } = factory(
        {
          plugins: [
            PiniaColadaQueryHooksPlugin({
              onSuccess,
              onSettled,
              onError,
            }),
          ],
        },
        queryOptions || {
          query: abortableQuery,
          key: ['key'],
        },
      )
      return { pinia, wrapper, queryCache: useQueryCache(pinia), onSuccess, onSettled, onError }
    }

    it('does not call onError nor onSettled when an in-flight fetch is invalidated', async () => {
      const { queryCache, onSuccess, onSettled, onError } = factoryWithHooks()

      queryCache.invalidateQueries({ key: ['key'] })
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(onError).toHaveBeenCalledTimes(0)
      expect(onSettled).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledWith(42, expect.objectContaining({}))
    })

    it('does not call onError nor onSettled when an in-flight fetch is cancelled', async () => {
      const { wrapper, queryCache, onSuccess, onSettled, onError } = factoryWithHooks()

      queryCache.cancelQueries({ key: ['key'] })
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(onError).toHaveBeenCalledTimes(0)
      expect(onSuccess).toHaveBeenCalledTimes(0)
      expect(onSettled).toHaveBeenCalledTimes(0)
      expect(wrapper.vm.error).toBeNull()
    })

    it('does not call onError for a fetch superseded by a newer one', async () => {
      const { queryCache, onSuccess, onSettled, onError } = factoryWithHooks()
      const entry = queryCache.get(['key'])!

      queryCache.fetch(entry)
      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(onError).toHaveBeenCalledTimes(0)
      expect(onSuccess).toHaveBeenCalledTimes(1)
      expect(onSettled).toHaveBeenCalledTimes(1)
      expect(onSettled).toHaveBeenCalledWith(42, null, expect.objectContaining({}))
    })
  })
})
