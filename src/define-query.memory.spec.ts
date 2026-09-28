import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createApp, defineComponent, effectScope, getCurrentInstance, h, ref } from 'vue'
import { triggerGC } from '@posva/test-utils'
import { defineQuery } from './define-query'
import { PiniaColada } from './pinia-colada'
import { useQuery } from './use-query'
import { useQueryCache } from './query-store'

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

  it.each([0, 1])(
    'releases consumer %i while the other keeps the defined query active',
    async (removed) => {
      const pinia = createPinia()
      const id = ref('a')
      const show = ref(true)
      const components: WeakRef<object>[] = []
      const useItem = defineQuery(() =>
        useQuery({ key: () => ['item', id.value], query: async () => id.value }),
      )
      const Consumer = defineComponent({
        setup() {
          components.push(new WeakRef(getCurrentInstance()!))
          useItem()
          return () => null
        },
      })
      const app = createApp({
        render: () =>
          h(
            'div',
            [0, 1].map((index) =>
              show.value || index !== removed ? h(Consumer, { key: index }) : null,
            ),
          ),
      })
      app.use(pinia).use(PiniaColada).mount(document.createElement('div'))

      try {
        await flushPromises()
        show.value = false
        await flushPromises()
        id.value = 'b'
        await flushPromises()
        // Vue buffers component events for three seconds while waiting for devtools.
        vi.advanceTimersByTime(3000)
        vi.useRealTimers()
        await triggerGC()

        expect(components.map((component) => component.deref() !== undefined)).toEqual(
          [0, 1].map((index) => index !== removed),
        )
        expect(useQueryCache(pinia).getQueryData(['item', 'b'])).toBe('b')
      } finally {
        app.unmount()
      }
    },
  )

  it('releases stopped consumers while another consumer keeps the defined query active', async () => {
    const { pinia, app } = createPiniaWithApp()
    const id = ref('a')
    const useItem = defineQuery(() =>
      useQuery({ key: () => ['item', id.value], query: async () => id.value }),
    )
    const survivor = effectScope()
    app.runWithContext(() => survivor.run(useItem))

    try {
      const stoppedScopes = app.runWithContext(() =>
        Array.from({ length: 20 }, () => {
          const scope = effectScope()
          scope.run(useItem)
          const weakScope = new WeakRef(scope)
          scope.stop()
          return weakScope
        }),
      )

      id.value = 'b'
      await flushPromises()
      vi.useRealTimers()
      await triggerGC()

      expect(stoppedScopes.every((scope) => scope.deref() === undefined)).toBe(true)
      expect(useQueryCache(pinia).getQueryData(['item', 'b'])).toBe('b')
    } finally {
      survivor.stop()
      app.unmount()
    }
  })

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
