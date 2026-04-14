import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createApp, defineComponent, h, ref } from 'vue'
import { triggerGC } from '@posva/test-utils'
import { PiniaColada } from './pinia-colada'
import { useQueryCache } from './query-store'
import { useQuery } from './use-query'

const GC_TIME = 1000

/**
 * Mounts a child with useQuery via raw Vue app (no test-utils wrapper retention),
 * grabs a WeakRef to the entry state, hides the child, advances timers past gcTime.
 * All local references go out of scope when this returns.
 */
async function mountQueryAndCollect(
  pinia: ReturnType<typeof createPinia>,
  key: string,
): Promise<WeakRef<object>> {
  const showChild = ref(true)

  const Child = defineComponent({
    render: () => null,
    setup() {
      useQuery({ key: [key], query: async () => 42, gcTime: GC_TIME })
      return {}
    },
  })

  const app = createApp(
    defineComponent({
      setup() {
        return () => (showChild.value ? h(Child) : null)
      },
    }),
  )
  app.use(pinia)
  app.use(PiniaColada)
  app.mount(document.createElement('div'))
  await flushPromises()

  const cache = useQueryCache(pinia)
  const entries = cache.getEntries({ key: [key] })
  const weakRef = new WeakRef(entries[0]!.state.value)

  // hide child → triggers unmount → untrack → scheduleGarbageCollection
  showChild.value = false
  await flushPromises()
  vi.advanceTimersByTime(GC_TIME)

  app.unmount()
  return weakRef
}

describe('useQuery memory leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.todo('query entry state is GC-able after child unmount + gcTime', async () => {
    const pinia = createPinia()
    const ref = await mountQueryAndCollect(pinia, 'gc-test')

    vi.useRealTimers()
    await triggerGC()
    expect(ref.deref()).toBeUndefined()
  })

  it('query function closure is released after entry removal', async () => {
    const pinia = createPinia()
    let largeObject: { data: number[] } | null = { data: Array(10_000).fill(1) }
    const ref = new WeakRef(largeObject)

    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          useQuery({
            key: ['closure-test'],
            query: async () => largeObject!.data.length,
            gcTime: GC_TIME,
          })
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
    largeObject = null
    wrapper.unmount()
    vi.advanceTimersByTime(GC_TIME)

    vi.useRealTimers()
    await triggerGC()

    expect(ref.deref()).toBeUndefined()
  })

  it.todo('frees entries after their removal', async () => {
    const pinia = createPinia()

    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          useQuery({
            key: ['closure-test'],
            query: async () => 'ok',
            gcTime: GC_TIME,
          })
          return {}
        },
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )
    const queryCache = useQueryCache(pinia)

    await flushPromises()
    const ref = new WeakRef(queryCache.get(['closure-test'])!)
    wrapper.unmount()
    vi.advanceTimersByTime(GC_TIME)

    vi.useRealTimers()
    await triggerGC()

    expect(ref.deref()).toBeUndefined()
  })

  it('repeated mount/unmount does not leak entries', async () => {
    const pinia = createPinia()
    const weakRefs: WeakRef<object>[] = []

    for (let i = 0; i < 20; i++) {
      weakRefs.push(await mountQueryAndCollect(pinia, 'repeat-test'))
    }

    vi.useRealTimers()
    await triggerGC()
    const alive = weakRefs.filter((r) => r.deref() !== undefined)
    expect(alive.length).toBe(0)
  })

  it('event listener closures do not retain references after unmount', async () => {
    const pinia = createPinia()
    let captured: { value: number } | null = { value: 42 }
    const ref = new WeakRef(captured)

    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          useQuery({
            key: ['event-test'],
            query: async () => captured!.value,
            gcTime: GC_TIME,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          })
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
    captured = null
    wrapper.unmount()
    vi.advanceTimersByTime(GC_TIME)

    vi.useRealTimers()
    await triggerGC()

    expect(ref.deref()).toBeUndefined()
  })
})
