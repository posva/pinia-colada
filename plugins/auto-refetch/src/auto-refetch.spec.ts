/**
 * @vitest-environment happy-dom
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { createPinia } from 'pinia'
import { useQuery, PiniaColada } from '@pinia/colada'
import type { UseQueryOptions } from '@pinia/colada'
import type { PiniaColadaAutoRefetchOptions } from './auto-refetch'
import { PiniaColadaAutoRefetch } from './auto-refetch'
import { isSpy, mockConsoleError, mockWarn } from '@posva/test-utils'

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

  it('can be disabled globally', async () => {
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

  it('can be disabled locally', async () => {
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

  it('respects query enabled option', async () => {
    const enabled = ref(true)
    const { query } = mountQuery({
      enabled,
      staleTime: 1000,
    })

    // Wait for initial query
    await flushPromises()
    // Now query should be called
    expect(query).toHaveBeenCalledTimes(1)

    // Change query enabled to false
    enabled.value = false
    await flushPromises()
    // Advance time - should NOT refetch because query is disabled
    vi.advanceTimersByTime(2000)
    await flushPromises()
    // Should not refetch because query is disabled again
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('starts auto-refetch when query becomes enabled', async () => {
    const enabled = ref(false)
    const { query } = mountQuery({
      enabled,
      staleTime: 1000,
    })

    // Query should not be called initially
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(0)

    // Advance time - should still not fetch while disabled
    vi.advanceTimersByTime(2000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(0)

    // Enable the query
    enabled.value = true
    await flushPromises()
    // Should fetch once when enabled
    expect(query).toHaveBeenCalledTimes(1)

    // Advance time past stale time - should auto-refetch
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
  })

  it('resets the timer when query key changes', async () => {
    const key = ref(['test', 1])
    const { query } = mountQuery({
      key,
      staleTime: 1000,
    })

    // Wait for initial query
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    // Advance time partially (500ms)
    vi.advanceTimersByTime(500)

    // Change the key - this should trigger a new fetch and reset the timer
    key.value = ['test', 2]
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)

    // Advance time to surpass the original timer (700ms more = 1200ms total from first fetch)
    vi.advanceTimersByTime(700)
    await flushPromises()
    // Should not have triggered another request yet because timer was reset
    expect(query).toHaveBeenCalledTimes(2)

    // Advance to complete the new stale time (300ms more = 1000ms from key change)
    vi.advanceTimersByTime(300)
    await flushPromises()
    // Now it should have triggered the auto-refetch
    expect(query).toHaveBeenCalledTimes(3)
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

      vi.advanceTimersByTime(10_000)
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('can access data in autoRefetch even if no staleTime is defined', async () => {
      const autoRefetch = vi.fn(() => {
        return 2000
      })
      const { query } = mountQuery({
        autoRefetch,
        staleTime: 5000,
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
  })
})
