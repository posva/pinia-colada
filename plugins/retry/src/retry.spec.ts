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

  function factory(
    queryOptions: UseQueryOptions,
    retryOptionsDefault?: RetryOptions,
  ) {
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
              { plugins: [PiniaColadaRetry(retryOptionsDefault)] },
            ],
          ],
        },
      },
    )

    return { wrapper }
  }

  it('apply the default retry options', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })
    const retryOptionsDefault = { retry: 1, delay: 200 }

    factory({
      key: ['key'],
      query,
    }, retryOptionsDefault)

    // initial fetch fails
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    // first retry
    vi.advanceTimersByTime(retryOptionsDefault.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    // no second retry because the default retry is 1
    vi.advanceTimersByTime(retryOptionsDefault.delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('no retries when retry is 0', async () => {
    const query = vi.fn(async () => {
      throw new Error('ko')
    })
    const delay = 1000
    factory({
      key: ['key'],
      retry: 0,
      delay,
      query,
    })

    await flushPromises()
    vi.advanceTimersByTime(delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('no retries when query succeeds', async () => {
    const query = vi.fn(async () => 'ok')
    const delay = 1000
    factory({
      key: ['key'],
      retry: 3,
      delay,
      query,
    })

    await flushPromises()
    vi.advanceTimersByTime(delay)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('custom retry logic with a function', async () => {
    // query that fails with a axios-like 404 error
    const notFoundErrorQuery = vi.fn(async () => {
      const error = new Error('ko') as Error & {
        response: { status: number }
      }
      error.response = { status: 404 }
      throw error
    })
    // do not retry on 404 but retry once for other errors
    const retry: RetryOptions['retry'] = (attempt, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 404) return false
      return attempt < 1
    }
    const delay = 1000

    // query fails with a 404 error
    factory({
      key: ['404'],
      query: notFoundErrorQuery,
      delay,
      retry,
    })
    await flushPromises()
    vi.advanceTimersByTime(delay)
    await flushPromises()
    expect(notFoundErrorQuery).toHaveBeenCalledTimes(1)

    // query fails with a generic error
    const genericErrorQuery = vi.fn(async () => {
      throw new Error('ko')
    })
    factory({
      key: ['generic'],
      query: genericErrorQuery,
      delay,
      retry,
    })

    await flushPromises()
    vi.advanceTimersByTime(delay)
    await flushPromises()
    expect(genericErrorQuery).toHaveBeenCalledTimes(2)
  })
})
