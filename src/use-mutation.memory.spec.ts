import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createApp, defineComponent, h, ref } from 'vue'
import { triggerGC } from '@posva/test-utils'
import { PiniaColada } from './pinia-colada'
import { useMutationCache } from './mutation-store'
import { useMutation } from './use-mutation'

const GC_TIME = 1000

/**
 * Mounts a child component that calls useMutation via raw Vue app,
 * triggers the mutation, grabs a WeakRef to the result, unmounts child,
 * advances timers past gcTime. All local references go out of scope when this returns.
 */
async function mountMutationAndCollect(
  pinia: ReturnType<typeof createPinia>,
): Promise<WeakRef<object>> {
  const showChild = ref(true)
  let mutateAsync: (() => Promise<unknown>) | null = null

  const Child = defineComponent({
    render: () => null,
    setup() {
      const m = useMutation({
        mutation: async () => ({ result: 42 }),
        gcTime: GC_TIME,
      })
      mutateAsync = m.mutateAsync
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

  await mutateAsync!()
  await flushPromises()

  // grab WeakRef to the mutation cache entry state
  const cache = useMutationCache(pinia)
  const entries = cache.getEntries()
  const weakRef = new WeakRef(entries[0]!.state.value)

  mutateAsync = null
  showChild.value = false
  await flushPromises()
  vi.advanceTimersByTime(GC_TIME)

  app.unmount()
  return weakRef
}

describe('useMutation memory leaks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // TODO: figure out if real leak or not like with useQuery
  it.todo('mutation entry state is GC-able after child unmount', async () => {
    const pinia = createPinia()
    const ref = await mountMutationAndCollect(pinia)

    vi.useRealTimers()
    await triggerGC()
    expect(ref.deref()).toBeUndefined()
  })

  it('mutation closure is released after entry removal', async () => {
    const pinia = createPinia()
    let largeObject: { data: number[] } | null = { data: Array(10_000).fill(1) }
    const weakRef = new WeakRef(largeObject)

    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          const { mutateAsync } = useMutation({
            mutation: async () => largeObject!.data.length,
            gcTime: GC_TIME,
          })
          return { mutateAsync }
        },
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    await wrapper.vm.mutateAsync()
    await flushPromises()

    largeObject = null
    wrapper.unmount()
    vi.advanceTimersByTime(GC_TIME)

    vi.useRealTimers()
    await triggerGC()

    expect(weakRef.deref()).toBeUndefined()
  })
})
