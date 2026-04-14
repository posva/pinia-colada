import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createApp, defineComponent } from 'vue'
import { triggerGC } from '@posva/test-utils'
import { defineQuery } from './define-query'
import { PiniaColada } from './pinia-colada'

const GC_TIME = 1000

function createPiniaWithApp({ pinia = createPinia() } = {}) {
  const app = createApp(defineComponent({ render: () => null }))
  app.use(pinia)
  app.use(PiniaColada)
  app.mount(document.createElement('div'))
  return { pinia, app }
}

describe('defineQuery memory leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  it('shared scope is collectible when all consumers unmount', async () => {
    const pinia = createPinia()
    let largeObject: { data: number[] } | null = { data: Array(10_000).fill(1) }
    const ref = new WeakRef(largeObject)

    let useTodos: ReturnType<typeof defineQuery> | null = defineQuery({
      key: ['define-gc-test'],
      query: async () => largeObject!.data.length,
      gcTime: GC_TIME,
    })

    const mountConsumer = () =>
      mount(
        defineComponent({
          render: () => null,
          setup() {
            useTodos!()
            return {}
          },
        }),
        {
          global: {
            plugins: [pinia, PiniaColada],
          },
        },
      )

    const wrapper1 = mountConsumer()
    const wrapper2 = mountConsumer()
    await flushPromises()

    wrapper1.unmount()
    wrapper2.unmount()
    vi.advanceTimersByTime(GC_TIME)

    useTodos = null
    largeObject = null

    vi.useRealTimers()
    await triggerGC()
    expect(ref.deref()).toBeUndefined()
  })

  it('query closure data is released when defineQuery reference is dropped', async () => {
    let largeObject: { items: number[] } | null = { items: Array(10_000).fill(1) }
    const ref = new WeakRef(largeObject)

    let useTodos: ReturnType<typeof defineQuery> | null = defineQuery({
      key: ['define-closure-gc'],
      query: async () => largeObject!.items.length,
      gcTime: GC_TIME,
    })

    const { pinia, app } = createPiniaWithApp()

    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          useTodos!()
          return {}
        },
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    await flushPromises()

    wrapper.unmount()
    vi.advanceTimersByTime(GC_TIME)

    // release both the defineQuery function and the captured object
    useTodos = null
    largeObject = null

    vi.useRealTimers()
    await triggerGC()
    expect(ref.deref()).toBeUndefined()

    app.unmount()
  })
})
