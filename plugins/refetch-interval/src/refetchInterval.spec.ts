/**
 * @vitest-environment happy-dom
 */
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery, PiniaColada } from '@pinia/colada'
import type { PiniaColadaOptions, UseQueryOptions } from '@pinia/colada'
import { PiniaColadaRefetchInterval } from '.'

describe('Refetch Interval plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
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

  it('should refetch data at specified intervals', async () => {
    const query = vi.fn(async () => 'ok')
    const { wrapper } = factory(
      {
        plugins: [
          PiniaColadaRefetchInterval({
            refetchInterval: 1000,
          }),
        ],
      },
      {
        key: ['key'],
        query,
      },
    )

    // Initial fetch
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.data).toBe('ok')

    // Wait for first interval
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)

    // Wait for second interval
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(3)

    wrapper.unmount()
  })

  it('should respect per-query interval settings over global settings', async () => {
    const query = vi.fn(async () => 'ok')
    const { wrapper } = factory(
      {
        plugins: [
          PiniaColadaRefetchInterval({
            refetchInterval: 5000,
          }),
        ],
      },
      {
        key: ['key'],
        query,
        refetchInterval: 1000,
      },
    )

    // Initial fetch
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    // Wait for local interval (1s)
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)

    // Wait for next 4 seconds, checking each interval
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(1000)
      await flushPromises()
    }
    expect(query).toHaveBeenCalledTimes(6)

    wrapper.unmount()
  })

  it('should stop refetching when query is removed', async () => {
    const query = vi.fn(async () => 'ok')
    const { wrapper } = factory(
      {
        plugins: [
          PiniaColadaRefetchInterval({
            refetchInterval: 1000,
          }),
        ],
      },
      {
        key: ['key'],
        query,
      },
    )

    // Initial fetch
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    // Unmount component (triggers cleanup)
    wrapper.unmount()
    vi.clearAllTimers() // Ensure timers are cleared immediately after unmount
    await flushPromises() // Ensure cleanup is complete

    // Wait for what would have been multiple intervals
    vi.advanceTimersByTime(3000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1) // Should not have increased
  })

  it('should not set up interval if refetchInterval is false', async () => {
    const query = vi.fn(async () => 'ok')
    const { wrapper } = factory(
      {
        plugins: [PiniaColadaRefetchInterval()],
      },
      {
        key: ['key'],
        query,
        refetchInterval: false,
      },
    )

    // Initial fetch
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)

    // Wait for some time
    vi.advanceTimersByTime(5000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1) // Should not have increased

    wrapper.unmount()
  })

  it('should handle failed queries gracefully', async () => {
    let shouldFail = false
    const query = vi.fn(async () => {
      if (shouldFail) throw new Error('Query failed')
      return 'ok'
    })

    const { wrapper } = factory(
      {
        plugins: [
          PiniaColadaRefetchInterval({
            refetchInterval: 1000,
          }),
        ],
      },
      {
        key: ['key'],
        query,
      },
    )

    // Initial successful fetch
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.data).toBe('ok')

    // Make next query fail
    shouldFail = true
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(2)
    expect(wrapper.vm.error).toBeTruthy()

    // Should continue trying
    vi.advanceTimersByTime(1000)
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(3)

    wrapper.unmount()
  })

  it('should not refetch if enabled: false', async () => {
    const spy = vi.fn(async () => 42)
    const { wrapper } = factory(
      {
        plugins: [
          PiniaColadaRefetchInterval({
            refetchInterval: 1000,
          }),
        ],
      },
      {
        query: spy,
        key: ['key'],
        enabled: false,
        refetchInterval: 1000,
      },
    )

    // Initial fetch should not happen because enabled is false
    await flushPromises()
    expect(spy).toHaveBeenCalledTimes(0)

    // Wait for what would have been multiple intervals
    vi.advanceTimersByTime(3000)
    await flushPromises()
    expect(spy).toHaveBeenCalledTimes(0)

    wrapper.unmount()
  })

  it('should ensure interval restarts after manual refetch', async () => {
    const spy = vi.fn(async () => 42)
    const { wrapper } = factory(
      {
        plugins: [
          PiniaColadaRefetchInterval({
            refetchInterval: 1000,
          }),
        ],
      },
      {
        query: spy,
        key: ['key'],
        refetchInterval: 1000,
      },
    )

    // Initial fetch
    await flushPromises()
    expect(spy).toHaveBeenCalledTimes(1)

    // Wait for 500ms (half the interval)
    vi.advanceTimersByTime(500)
    await flushPromises()

    // Trigger manual refetch
    wrapper.vm.refetch()
    await flushPromises()
    expect(spy).toHaveBeenCalledTimes(2)

    // Wait for full original interval (another 500ms)
    vi.advanceTimersByTime(500)
    await flushPromises()
    // Should not have refetched because original interval should be cleared
    expect(spy).toHaveBeenCalledTimes(2)

    // Wait for full new interval (1000ms)
    vi.advanceTimersByTime(1000)
    await flushPromises()
    // Should have refetched once from the new interval
    expect(spy).toHaveBeenCalledTimes(3)

    // Wait for another full interval
    vi.advanceTimersByTime(1000)
    await flushPromises()
    // Should have refetched again, proving only one interval is running
    expect(spy).toHaveBeenCalledTimes(4)

    wrapper.unmount()
  })

  describe('focus behavior', () => {
    let visibilityState = 'visible'
    let visibilityChangeCallbacks: Array<() => void> = []

    beforeEach(() => {
      visibilityState = 'visible'

      // Mock document visibility API
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibilityState,
      })
      document.addEventListener = vi.fn((event, callback) => {
        if (event === 'visibilitychange') {
          visibilityChangeCallbacks.push(callback)
        }
      })
      document.removeEventListener = vi.fn((event, callback) => {
        if (event === 'visibilitychange') {
          visibilityChangeCallbacks = visibilityChangeCallbacks.filter((cb) => cb !== callback)
        }
      })
    })

    afterEach(() => {
      visibilityChangeCallbacks = []
      vi.clearAllMocks()
    })

    it('should not refetch when tab is not focused and refetchIntervalInBackground is false', async () => {
      const spy = vi.fn(async () => 42)
      const { wrapper } = factory(
        {
          plugins: [PiniaColadaRefetchInterval()],
        },
        {
          query: spy,
          key: ['key'],
          refetchInterval: 1000,
          refetchIntervalInBackground: false,
        },
      )

      await flushPromises()
      expect(spy).toHaveBeenCalledTimes(1)

      // Simulate tab losing focus
      visibilityState = 'hidden'
      visibilityChangeCallbacks.forEach((callback) => callback())

      // Advance timer
      vi.advanceTimersByTime(1000)
      await flushPromises()

      // Should not have refetched
      expect(spy).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })

    it('should refetch when tab is not focused but refetchIntervalInBackground is true', async () => {
      const spy = vi.fn(async () => 42)
      const { wrapper } = factory(
        {
          plugins: [PiniaColadaRefetchInterval()],
        },
        {
          query: spy,
          key: ['key'],
          refetchInterval: 1000,
          refetchIntervalInBackground: true,
        },
      )

      await flushPromises()
      expect(spy).toHaveBeenCalledTimes(1)

      // Simulate tab losing focus
      visibilityState = 'hidden'
      visibilityChangeCallbacks.forEach((callback) => callback())

      // Advance timer
      vi.advanceTimersByTime(1000)
      await flushPromises()

      // Should have refetched because refetchIntervalInBackground is true
      expect(spy).toHaveBeenCalledTimes(2)

      wrapper.unmount()
    })

    it('should immediately resume refetching when tab regains focus', async () => {
      const spy = vi.fn(async () => 42)
      const { wrapper } = factory(
        {
          plugins: [PiniaColadaRefetchInterval()],
        },
        {
          query: spy,
          key: ['key'],
          refetchInterval: 1000,
          refetchIntervalInBackground: false,
        },
      )

      await flushPromises()
      expect(spy).toHaveBeenCalledTimes(1)

      // Simulate tab losing focus
      visibilityState = 'hidden'
      visibilityChangeCallbacks.forEach((callback) => callback())

      // Advance timer
      vi.advanceTimersByTime(1000)
      await flushPromises()

      // Should not have refetched while hidden
      expect(spy).toHaveBeenCalledTimes(1)

      // Simulate tab regaining focus
      visibilityState = 'visible'
      visibilityChangeCallbacks.forEach((callback) => callback())

      // Should have refetched after regaining focus
      await flushPromises()
      expect(spy).toHaveBeenCalledTimes(2)

      // Advance timer
      vi.advanceTimersByTime(1000)
      await flushPromises()

      // Should continue refetching
      expect(spy).toHaveBeenCalledTimes(3)

      wrapper.unmount()
    })

    it('should not resume refetching when tab regains focus if refetchOnWindowFocus is false', async () => {
      const spy = vi.fn(async () => 42)
      const { wrapper } = factory(
        {
          plugins: [PiniaColadaRefetchInterval()],
        },
        {
          query: spy,
          key: ['key'],
          refetchInterval: 1000,
          refetchIntervalInBackground: false,
          refetchOnWindowFocus: false,
        },
      )

      await flushPromises()
      expect(spy).toHaveBeenCalledTimes(1)

      // Simulate tab losing focus
      visibilityState = 'hidden'
      visibilityChangeCallbacks.forEach((callback) => callback())

      // Advance timer
      vi.advanceTimersByTime(1000)
      await flushPromises()

      // Should not have refetched while hidden
      expect(spy).toHaveBeenCalledTimes(1)

      // Simulate tab regaining focus
      visibilityState = 'visible'
      visibilityChangeCallbacks.forEach((callback) => callback())

      // Should have refetched after regaining focus
      await flushPromises()
      expect(spy).toHaveBeenCalledTimes(1)

      // Advance timer
      vi.advanceTimersByTime(1000)
      await flushPromises()

      // Should not continue refetching
      expect(spy).toHaveBeenCalledTimes(1)

      wrapper.unmount()
    })

    it('should use global refetchIntervalInBackground option when local option is not provided', async () => {
      const spy = vi.fn(async () => 42)
      const { wrapper } = factory(
        {
          plugins: [
            PiniaColadaRefetchInterval({
              refetchInterval: 1000,
              refetchIntervalInBackground: true,
            }),
          ],
        },
        {
          query: spy,
          key: ['key'],
          refetchInterval: 1000,
        },
      )

      await flushPromises()
      expect(spy).toHaveBeenCalledTimes(1)

      // Simulate tab losing focus
      visibilityState = 'hidden'
      visibilityChangeCallbacks.forEach((callback) => callback())

      // Advance timer
      vi.advanceTimersByTime(1000)
      await flushPromises()

      // Should have refetched because global refetchIntervalInBackground is true
      expect(spy).toHaveBeenCalledTimes(2)

      wrapper.unmount()
    })
  })
})
