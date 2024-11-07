/**
 * @vitest-environment happy-dom
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery, PiniaColada } from '@pinia/colada'
import type { UseQueryOptions } from '@pinia/colada'
import type { PiniaColadaAutoRefetchOptions } from '.'
import { PiniaColadaAutoRefetch } from '.'

describe('Auto Refetch plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function mountQuery(
    queryOptions?: Partial<UseQueryOptions>,
    pluginOptions?: PiniaColadaAutoRefetchOptions,
  ) {
    const query = vi.fn(async () => 'result')
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return useQuery({
            query,
            key: ['test'],
            ...queryOptions,
          })
        },
      }),
      {
        global: {
          plugins: [
            createPinia(),
            [PiniaColada, {
              plugins: [PiniaColadaAutoRefetch(pluginOptions)],
              ...pluginOptions,
            }],
          ],
        },
      },
    )

    return { wrapper, query }
  }

  it('automatically refetches when stale time is reached', async () => {
    const { query } = mountQuery({
      staleTime: 1000,
    })

    // Wait for initial query
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    // Advance time past stale time in one go
    vi.advanceTimersByTime(1000)
    await flushPromises()

    expect(query).toHaveBeenCalledTimes(2)
  })

  it('respects disabled option globally', async () => {
    const { query } = mountQuery(
      {
        staleTime: 1000,
      },
      {
        enabled: false,
      },
    )

    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('respects disabled option per query', async () => {
    const { query } = mountQuery({
      staleTime: 1000,
      autoRefetch: false,
    })

    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('cleans up timeouts when query is unmounted', async () => {
    const { wrapper, query } = mountQuery({
      staleTime: 1000,
    })

    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('does not refetch when staleTime is not set', async () => {
    const { query } = mountQuery({})

    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })
})
