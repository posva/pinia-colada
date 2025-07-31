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
import { isSpy, mockConsoleError, mockWarn } from '../../../test-utils'

describe('Auto Refetch plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  mockWarn()
  mockConsoleError()

  // Must be placed at the end to be the first, it catches any async logged errors
  afterEach(async () => {})

  enableAutoUnmount(afterEach)

  function mountQuery(
    queryOptions?: Partial<UseQueryOptions>,
    pluginOptions?: PiniaColadaAutoRefetchOptions,
  ) {
    const query = isSpy(queryOptions?.query)
      ? queryOptions.query
      : vi.fn(queryOptions?.query ?? (async () => 'result'))
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return useQuery({
            key: ['test'],
            ...queryOptions,
            query,
          })
        },
      }),
      {
        global: {
          plugins: [
            createPinia(),
            [
              PiniaColada,
              {
                plugins: [PiniaColadaAutoRefetch({ autoRefetch: true, ...pluginOptions })],
                ...pluginOptions,
              },
            ],
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

  it('respects enabled option globally', async () => {
    const { query } = mountQuery(
      {
        staleTime: 1000,
      },
      {
        autoRefetch: false,
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

  it('avoids refetching an unactive query', async () => {
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

  it('resets the stale timer when a new request occurs', async () => {
    const { query, wrapper } = mountQuery({
      staleTime: 1000,
    })

    // Wait for initial query
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    // Advance time partially (500ms)
    vi.advanceTimersByTime(500)

    // Manually trigger a new request
    query.mockImplementationOnce(async () => 'new result')
    await wrapper.vm.refetch()
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.data).toBe('new result')

    // Advance time to surpass the original stale time
    vi.advanceTimersByTime(700)
    await flushPromises()
    // Should not have triggered another request yet
    expect(query).toHaveBeenCalledTimes(2)

    // Advance to the new stale time (500ms more to reach full 1000ms from last request)
    vi.advanceTimersByTime(500)
    await flushPromises()
    // Now it should have triggered another request
    expect(query).toHaveBeenCalledTimes(3)
  })

  it('refetches if the request failed', async () => {
    const { query } = mountQuery({
      query: async () => {
        throw new Error('Request failed')
      },
      staleTime: 1000,
    })

    // Wait for initial query
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    // expect('Request failed').toHaveBeenErroredTimes(1)

    // Advance time past stale time
    vi.advanceTimersByTime(1000)
    expect(query).toHaveBeenCalledTimes(2)
    await flushPromises()
    // TODO: why just one error log?
    expect('Request failed').toHaveBeenErroredTimes(1)
  })

  describe('custom interval', () => {
    it('supports number-based autoRefetch intervals', async () => {
      const { query } = mountQuery({
        autoRefetch: 2000,
        staleTime: 100,
      })

      // Wait for initial query
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      // staleTime elapsed
      vi.advanceTimersByTime(1000)
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(2000)
      expect(query).toHaveBeenCalledTimes(2)
    })

    it('reads the state', async () => {
      const autoRefetch = vi.fn(() => {
        return 2000
      })
      const { query } = mountQuery({
        autoRefetch,
        staleTime: 100,
      })

      // Wait for initial query
      await flushPromises()
      // it gets called multiple times, the last one should be with the result
      expect(autoRefetch).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: 'result', error: null, status: 'success' }),
      )

      vi.advanceTimersByTime(1000)
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(2000)
      expect(query).toHaveBeenCalledTimes(2)
    })

    it('supports returning false', async () => {
      const { query } = mountQuery({
        query: async () => 'ok',
        autoRefetch: ({ data }) => {
          // @ts-expect-error: FIXME:
          data satisfies string
          return false
        },
      })

      // Wait for initial query
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(10000)
      expect(query).toHaveBeenCalledTimes(1)
    })
  })
})
