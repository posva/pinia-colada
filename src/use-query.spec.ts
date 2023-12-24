import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { UseQueryOptions, useQuery } from './use-query'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, nextTick } from 'vue'
import { GlobalMountOptions } from 'node_modules/@vue/test-utils/dist/types'

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
    options: Partial<UseQueryOptions<TResult>> = {},
    mountOptions?: GlobalMountOptions
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
          ...mountOptions,
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

    it('new mount does not fetch if staleTime is not elapsed', async () => {
      const pinia = createPinia()
      const [w1, f1] = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      await runTimers()

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(500)

      const [w2, f2] = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      await runTimers()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(0)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

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

    it('new mount fetches if staleTime is elapsed', async () => {
      const [w1, f1] = mountSimple({ staleTime: 1000 })

      await runTimers()

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(1001)

      const [w2, f2] = mountSimple({ staleTime: 1000 })

      await runTimers()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(1)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('new mount reuses a pending request even if the staleTime has been elapsed', async () => {
      const pinia = createPinia()
      const [w1, f1] = mountSimple({ staleTime: 0 }, { plugins: [pinia] })
      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(10)
      const [w2, f2] = mountSimple({ staleTime: 0 }, { plugins: [pinia] })

      await runTimers()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(0)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('refresh reuses a pending request even if the staleTime has been elapsed', async () => {
      const pinia = createPinia()
      const { wrapper, fetcher } = mountSimple(
        { staleTime: 0 },
        { plugins: [pinia] }
      )
      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(10)
      wrapper.vm.refresh()

      await runTimers()

      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe(42)
    })
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
