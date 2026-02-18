import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery, PiniaColada } from '@pinia/colada'
import type { UseQueryOptions } from '@pinia/colada'
import { PiniaColadaRetry } from './retry'

describe('Pinia Colada Retry Plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  const RETRY_OPTIONS_DEFAULTS = {
    retry: 1,
    delay: 500,
  } as const

  function factory(queryOptions: UseQueryOptions) {
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return useQuery(queryOptions)
        },
      }),
      {
        global: {
          plugins: [
            createPinia(),
            [
              // split lines
              PiniaColada,
              { plugins: [PiniaColadaRetry(RETRY_OPTIONS_DEFAULTS)] },
            ],
          ],
        },
      },
    )

    return { wrapper }
  }

  it('apply global retry options', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })

    factory({
      key: ['key'],
      query,
    })

    // initial fetch fails
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    // first retry
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    // no second retry because the default retry is 1
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('retry option with a number', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })

    factory({
      key: ['key'],
      query,
      retry: 2,
    })
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    // first retry
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    // second retry
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(3)
    // no further retries
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('retry option with a function', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })

    factory({
      key: ['key'],
      query,
      retry: (attempt, error) => {
        // stop retry when the error message is "ko"
        if ((error as Error).message === 'ko') return false
        return attempt < 2
      },
    })
    await flushPromises()
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('delay option with a number', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })

    factory({
      key: ['key'],
      query,
      retry: { delay: 500 },
    })

    // retry occurs exactly after 500ms
    await flushPromises()
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay - 100)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('delay option with a function', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })
    // 500ms for first retry, 1500ms for subsequent retries

    factory({
      key: ['key'],
      query,
      retry: {
        retry: 2,
        delay: (attempt) => {
          return attempt === 0 ? 500 : 1500
        },
      },
    })
    //  initial fetch fails
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    // first retry after 500ms
    vi.advanceTimersByTime(500)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    // second retry after 1500ms
    vi.advanceTimersByTime(1500)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(3)
    // no further retries
    vi.advanceTimersByTime(1500)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('no retries when retry option is 0', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })
    factory({
      key: ['key'],
      retry: 0,
      query,
    })

    await flushPromises()
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('no retries when query succeeds', async () => {
    const query = vi.fn(async () => 'ok')
    factory({
      key: ['key'],
      retry: 3,
      query,
    })

    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('stop retries after the query becomes inactive', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })

    const { wrapper } = factory({
      key: ['key'],
      query,
    })

    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('reset retry count after the query becomes inactive', async () => {
    const queryOptions = {
      key: ['key'],
      query: vi.fn(async () => {
        throw new Error('ko')
      }),
      retry: 1,
    } satisfies UseQueryOptions

    const { wrapper } = factory(queryOptions)
    // initial fetch and first retry
    await flushPromises()
    expect(queryOptions.query).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(queryOptions.query).toHaveBeenCalledTimes(2)
    // deactivate query
    wrapper.unmount()
    // reactivate query and new initial fetch
    factory(queryOptions)
    await flushPromises()
    expect(queryOptions.query).toHaveBeenCalledTimes(3)
    // ensure retry count starts fresh
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(queryOptions.query).toHaveBeenCalledTimes(4)
  })

  it('reset retry count on manual fetch', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })

    const { wrapper } = factory({
      key: ['key'],
      query,
      retry: 1,
    })
    // initial fetch fails
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    // first retry
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    // manual fetch resets retry count
    wrapper.vm.refetch()
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(3)
    // new retry
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(4)
    // no further retries
    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(4)
  })

  describe('retry state tracking', () => {
    it('isRetrying is true while a retry is pending', async () => {
      const query = vi.fn(async () => {
        throw new Error('ko')
      })

      const { wrapper } = factory({
        key: ['key'],
        query,
        retry: 2,
      })

      // initial fetch fails, first retry scheduled
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
      expect((wrapper.vm as any).isRetrying).toBe(true)

      // first retry fires and fails, second retry scheduled
      vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(2)
      expect((wrapper.vm as any).isRetrying).toBe(true)

      // second retry fires and fails, retries exhausted
      vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(3)
      expect((wrapper.vm as any).isRetrying).toBe(false)
    })

    it('retryCount increments on each retry', async () => {
      const query = vi.fn(async () => {
        throw new Error('ko')
      })

      const { wrapper } = factory({
        key: ['key'],
        query,
        retry: 3,
      })

      // initial fetch fails, first retry scheduled
      await flushPromises()
      expect((wrapper.vm as any).retryCount).toBe(1)

      // retry 1 fails
      vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
      await flushPromises()
      expect((wrapper.vm as any).retryCount).toBe(2)

      // retry 2 fails
      vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
      await flushPromises()
      expect((wrapper.vm as any).retryCount).toBe(3)

      // retries exhausted, count stays at 3
      vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(4)
      expect((wrapper.vm as any).retryCount).toBe(3)
    })

    it('resets retry state on success', async () => {
      let callCount = 0
      const query = vi.fn(async () => {
        if (++callCount === 1) throw new Error('ko')
        return 'ok'
      })

      const { wrapper } = factory({
        key: ['key'],
        query,
        retry: 2,
      })

      // first call fails, retry scheduled
      await flushPromises()
      expect((wrapper.vm as any).isRetrying).toBe(true)
      expect((wrapper.vm as any).retryCount).toBe(1)

      // retry succeeds
      vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
      await flushPromises()
      expect((wrapper.vm as any).isRetrying).toBe(false)
      expect((wrapper.vm as any).retryCount).toBe(0)
    })

    it('resets retry state on manual refetch', async () => {
      const query = vi.fn(async () => {
        throw new Error('ko')
      })

      const { wrapper } = factory({
        key: ['key'],
        query,
        retry: 2,
      })

      // first failure, retry scheduled
      await flushPromises()
      expect((wrapper.vm as any).retryCount).toBe(1)

      // first retry fires and fails
      vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
      await flushPromises()
      expect((wrapper.vm as any).retryCount).toBe(2)

      // manual refetch resets and starts fresh retry cycle
      wrapper.vm.refetch()
      await flushPromises()
      expect((wrapper.vm as any).retryCount).toBe(1)
      expect((wrapper.vm as any).isRetrying).toBe(true)
    })

    it('isRetrying stays false when retry is 0', async () => {
      const query = vi.fn(async () => {
        throw new Error('ko')
      })

      const { wrapper } = factory({
        key: ['key'],
        query,
        retry: 0,
      })

      await flushPromises()
      expect((wrapper.vm as any).isRetrying).toBe(false)
      expect((wrapper.vm as any).retryCount).toBe(0)
    })
  })

  it('no retries if enabled becomes false while waiting', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })
    const enabled = vi.fn(() => true)

    factory({
      key: ['key'],
      query,
      retry: 1,
      enabled,
    })
    // initial fetch fails
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    // disable while waiting
    enabled.mockReturnValue(false)

    vi.advanceTimersByTime(RETRY_OPTIONS_DEFAULTS.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })
})
