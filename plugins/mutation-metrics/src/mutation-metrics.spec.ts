import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useMutation, PiniaColada } from '@pinia/colada'
import type { PiniaColadaOptions } from '@pinia/colada'
import { PiniaColadaMutationMetrics } from './mutation-metrics'

describe('Mutation Metrics plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function factory(options: PiniaColadaOptions, failing = false) {
    const pinia = createPinia()
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useMutation({
              mutation: async () => {
                if (failing) throw new Error('nope')
                return 42
              },
            }),
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

  it('exposes mutatedAt and errorCount', async () => {
    const { wrapper } = factory({ plugins: [PiniaColadaMutationMetrics()] })

    expect(wrapper.vm.mutatedAt).toBe(0)
    expect(wrapper.vm.errorCount).toBe(0)

    vi.setSystemTime(1234)
    wrapper.vm.mutate()
    await flushPromises()

    expect(wrapper.vm.data).toBe(42)
    expect(wrapper.vm.mutatedAt).toBe(1234)
    expect(wrapper.vm.errorCount).toBe(0)
  })

  it('increments errorCount when failing', async () => {
    const { wrapper } = factory({ plugins: [PiniaColadaMutationMetrics()] }, true)

    expect(wrapper.vm.errorCount).toBe(0)
    wrapper.vm.mutate()
    await flushPromises()

    expect(wrapper.vm.error).toEqual(new Error('nope'))
    expect(wrapper.vm.errorCount).toBe(1)
  })
})
