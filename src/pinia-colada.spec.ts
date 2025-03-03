import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery } from './use-query'
import type { PiniaColadaOptions } from './pinia-colada'
import { PiniaColada } from './pinia-colada'
import { useQueryCache } from './query-store'

describe('PiniaColada', () => {
  const MyComponent = defineComponent({
    template: '<div></div>',
    setup() {
      return {
        ...useQuery({
          query: async () => 42,
          key: ['key'],
        }),
      }
    },
  })

  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function factory(options: PiniaColadaOptions = {}) {
    const pinia = createPinia()
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [pinia, [PiniaColada, options]],
      },
    })

    return { pinia, wrapper }
  }

  it('executes plugins', async () => {
    const plugin = vi.fn()
    const { pinia } = factory({ plugins: [plugin] })
    expect(plugin).toHaveBeenCalledTimes(1)
    expect(plugin).toHaveBeenCalledWith({
      queryCache: useQueryCache(pinia),
      scope: useQueryCache(pinia)._s,
      pinia,
    })
  })
})
