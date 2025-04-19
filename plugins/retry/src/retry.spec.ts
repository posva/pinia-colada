/**
 * @vitest-environment happy-dom
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery, PiniaColada } from '@pinia/colada'
import type { UseQueryOptions } from '@pinia/colada'
import { PiniaColadaRetry } from '.'
import type { RetryOptions } from '.'

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
    // stop retry when the error message is "ko"
    const retry: RetryOptions['retry'] = (attempt, error) => {
      if ((error as Error).message === 'ko') return false
      return attempt < 2
    }

    factory({
      key: ['key'],
      query,
      retry,
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
    const delay = 500

    factory({
      key: ['key'],
      query,
      retry: { delay },
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
    const delay: RetryOptions['delay'] = (attempt) => {
      return attempt === 0 ? 500 : 1500
    }

    factory({
      key: ['key'],
      query,
      retry: { retry: 2, delay },
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
    }
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
})
