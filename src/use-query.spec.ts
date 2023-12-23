import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UseQueryOptions, useQuery } from './use-query'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('useQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const runTimers = async (onlyPending = true) => {
    if (onlyPending) {
      await vi.runOnlyPendingTimersAsync()
    } else {
      // vi.runAllTimers()
      await vi.runAllTimersAsync()
    }
    await nextTick()
  }

  const mountSimple = <TResult = number>(
    options: Partial<UseQueryOptions<TResult>> = {}
  ) => {
    const fetcher = options.fetcher
      ? vi.fn(options.fetcher)
      : vi.fn(async () => {
          await delay(0)
          return 42
        })
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useQuery<TResult>({
              key: 'foo',
              ...options,
              // @ts-expect-error: generic unmatched but types work
              fetcher,
            }),
          }
        },
      }),
      {
        global: {
          plugins: [createPinia()],
        },
      }
    )
    return Object.assign([wrapper, fetcher] as const, { wrapper, fetcher })
  }

  describe('initial fetch', () => {
    it('fetches data and updates on mount', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.data).toBeUndefined()
      await runTimers()
      expect(wrapper.vm.data).toBe(42)
    })

    it('sets the fetching state', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.isFetching).toBe(true)
      await runTimers()
      expect(wrapper.vm.isFetching).toBe(false)
    })

    it('sets the pending state', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.isPending).toBe(true)
      await runTimers()
      expect(wrapper.vm.isPending).toBe(false)
    })

    it('sets the error state', async () => {
      const { wrapper } = mountSimple({
        fetcher: async () => {
          throw new Error('foo')
        },
      })

      expect(wrapper.vm.error).toBeNull()
      await runTimers()
      expect(wrapper.vm.error).toEqual(new Error('foo'))
    })

    it('exposes a status state', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.status).toBe('pending')
      await runTimers()
      expect(wrapper.vm.status).toBe('success')
    })

    // NOTE: is this worth adding?
    it.skip('it works with a synchronously thrown Error', async () => {
      const { wrapper } = mountSimple({
        fetcher: () => {
          throw new Error('foo')
        },
      })

      expect(wrapper.vm.error).toBeNull()
      await runTimers()
      expect(wrapper.vm.error).toEqual(new Error('foo'))
    })
  })

  describe('staleTime', () => {
    it('when refreshed, does not fetch again if staleTime has not elapsed', async () => {
      const { wrapper, fetcher } = mountSimple({ staleTime: 1000 })

      await runTimers()
      expect(wrapper.vm.data).toBe(42)
      expect(fetcher).toHaveBeenCalledTimes(1)

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(500)
      wrapper.vm.refresh()
      await runTimers()

      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe(42)
    })

    it.todo('new mount does not fetch if staleTime is not elapsed')

    it('when refreshed, fetches the data if the staleTime has been elapsed', async () => {
      const { wrapper, fetcher } = mountSimple({ staleTime: 1000 })

      await runTimers()
      expect(wrapper.vm.data).toBe(42)
      expect(fetcher).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)
      wrapper.vm.refresh()
      await runTimers()

      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.data).toBe(42)
    })

    it.todo('reuses a pending request even if the staleTime has been elapsed')
  })

  describe.skip('refresh', () => {
    it('refreshes the data', async () => {
      const { wrapper, fetcher } = mountSimple()

      await runTimers()
      expect(wrapper.vm.data).toBe(42)
      expect(fetcher).toHaveBeenCalledTimes(1)

      mountSimple()

      await runTimers()
      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.data).toBe(42)
    })
  })
})
