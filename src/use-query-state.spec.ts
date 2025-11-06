import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { PiniaColada } from './pinia-colada'
import { useQueryState } from './use-query-state'
import { defineQueryOptions } from './define-query-options'
import { useQueryCache } from './query-store'

describe('useQueryState', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(async () => {
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  it('returns undefined for non-existent queries', () => {
    const pinia = createPinia()
    const wrapper = mount(
      defineComponent({
        setup() {
          const { data, error, status, isPending } = useQueryState(['non-existent'])
          return { data, error, status, isPending }
        },
        template: `<div>{{ data }}</div>`,
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    expect(wrapper.vm.data).toBeUndefined()
    expect(wrapper.vm.error).toBeUndefined()
    expect(wrapper.vm.status).toBeUndefined()
    expect(wrapper.vm.isPending).toBe(true)
  })

  it('accesses existing query state by key', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const wrapper = mount(
      defineComponent({
        setup() {
          return { ...useQueryState(['test-key']) }
        },
        template: `<div>{{ data }}</div>`,
      }),
      {
        global: {
          plugins: [
            pinia,
            PiniaColada,
            () => {
              const queryCache = useQueryCache(pinia)
              queryCache.setQueryData(['test-key'], 42)
            },
          ],
        },
      },
    )

    expect(wrapper.vm.status).toBe('success')
    expect(wrapper.vm.isPending).toBe(false)
    expect(wrapper.vm.data).toBe(42)
    expect(wrapper.vm.error).toBeNull()
  })

  it('works with dynamic keys', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const keyId = ref(1)

    const wrapper = mount(
      defineComponent({
        setup() {
          return {
            ...useQueryState(() => ['item', keyId.value]),
          }
        },
        template: `<div>{{ data?.name }}</div>`,
      }),
      {
        global: {
          plugins: [
            pinia,
            PiniaColada,
            () => {
              const queryCache = useQueryCache(pinia)
              queryCache.setQueryData(['item', 1], { id: 1, name: 'Item 1' })
            },
          ],
        },
      },
    )

    expect(wrapper.vm.data).toEqual({ id: 1, name: 'Item 1' })

    keyId.value = 2
    await nextTick()
    expect(wrapper.vm.data).toBeUndefined() // New key doesn't exist yet
  })

  it('works with dynamic defineQueryOptions', async () => {
    const pinia = createPinia()
    const itemQuery = defineQueryOptions((id: number) => ({
      key: ['item', id],
      query: async () => ({ id, name: `Item ${id}` }),
    }))

    const keyId = ref(1)
    const wrapper = mount(
      defineComponent({
        setup() {
          return { ...useQueryState(itemQuery, keyId) }
        },
        template: `<div>{{ data?.name }}</div>`,
      }),
      {
        global: {
          plugins: [
            pinia,
            PiniaColada,
            () => {
              const queryCache = useQueryCache(pinia)
              queryCache.setQueryData(itemQuery(1).key, { id: 1, name: 'Item 1' })
              queryCache.setQueryData(itemQuery(2).key, { id: 2, name: 'Item 2' })
            },
          ],
        },
      },
    )

    expect(wrapper.vm.data).toEqual({ id: 1, name: 'Item 1' })
    keyId.value = 2
    await nextTick()
    expect(wrapper.vm.data).toEqual({ id: 2, name: 'Item 2' })
    keyId.value = 3
    await nextTick()
    expect(wrapper.vm.data).toBeUndefined() // New key doesn't exist yet
  })
})
