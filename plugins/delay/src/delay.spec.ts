import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery, PiniaColada } from '@pinia/colada'
import type { PiniaColadaOptions, UseQueryOptions } from '@pinia/colada'
import { PiniaColadaDelay } from './delay'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Delay Loading plugin', () => {
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

  it('delays the asyncStatus of 200ms', async () => {
    const query = vi.fn(async () => {
      await delay(500)
      return 'ok'
    })

    const { wrapper } = factory(
      {
        plugins: [PiniaColadaDelay({})],
      },
      {
        key: ['key'],
        query,
      },
    )

    expect(wrapper.vm.asyncStatus).toBe('idle')

    vi.advanceTimersByTime(100)
    expect(wrapper.vm.asyncStatus).toBe('idle')

    vi.advanceTimersByTime(100)
    expect(wrapper.vm.asyncStatus).toBe('loading')

    vi.advanceTimersToNextTimer()
    await flushPromises()
    expect(wrapper.vm.asyncStatus).toBe('idle')
  })

  it('can be ignored with false', async () => {
    const query = vi.fn(async () => {
      await delay(500)
      return 'ok'
    })

    const { wrapper } = factory(
      {
        plugins: [PiniaColadaDelay()],
      },
      {
        key: ['key'],
        query,
        delay: false,
      },
    )

    expect(wrapper.vm.asyncStatus).toBe('loading')

    vi.advanceTimersByTime(100)
    expect(wrapper.vm.asyncStatus).toBe('loading')

    vi.advanceTimersToNextTimer()
    await flushPromises()
    expect(wrapper.vm.asyncStatus).toBe('idle')
  })
})
