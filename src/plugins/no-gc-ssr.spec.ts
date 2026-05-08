import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia } from 'pinia'
import type { Pinia } from 'pinia'
import { defineComponent } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { PiniaColada } from '../pinia-colada'
import { useQueryCache } from '../query-store'
import { useMutationCache } from '../mutation-store'
import { useQuery } from '../use-query'
import { useMutation } from '../use-mutation'
import { PiniaColadaSSRNoGc } from './no-gc-ssr'
import type { EntryKey } from '../entry-keys'

describe('PiniaColadaSSRNoGc plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function mountQuery<TData = string>(
    options: {
      gcTime?: number | false
      key?: EntryKey
      query?: () => Promise<TData>
    } = {},
    { withPlugin = true, pinia = createPinia() }: { withPlugin?: boolean; pinia?: Pinia } = {},
  ) {
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useQuery<TData>({
              key: options.key ?? ['test'],
              query: options.query ?? (async () => 'data' as TData),
              ...(options.gcTime !== undefined ? { gcTime: options.gcTime } : {}),
            }),
          }
        },
      }),
      {
        global: {
          plugins: [pinia, [PiniaColada, { plugins: withPlugin ? [PiniaColadaSSRNoGc()] : [] }]],
        },
      },
    )
    return { wrapper, pinia }
  }

  function mountMutation<TData = string, TVars = void>(
    options: { gcTime?: number | false; mutation?: () => Promise<TData> } = {},
    { withPlugin = true }: { withPlugin?: boolean } = {},
  ) {
    const pinia = createPinia()
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useMutation<TData, TVars>({
              mutation: options.mutation ?? (async () => 'data' as TData),
              ...(options.gcTime !== undefined ? { gcTime: options.gcTime } : {}),
            }),
          }
        },
      }),
      {
        global: {
          plugins: [pinia, [PiniaColada, { plugins: withPlugin ? [PiniaColadaSSRNoGc()] : [] }]],
        },
      },
    )
    return { wrapper, pinia }
  }

  describe('queries', () => {
    it('baseline: without the plugin, custom gcTime schedules a timer on unmount', async () => {
      const { wrapper, pinia } = mountQuery(
        { key: ['baseline'], gcTime: 1000 },
        { withPlugin: false },
      )
      await flushPromises()
      wrapper.unmount()
      const [entry] = useQueryCache(pinia).getEntries({ key: ['baseline'] })
      expect(entry).toBeDefined()
      expect(entry!.options?.gcTime).toBe(1000)
      expect(entry!.gcTimeout).toBeDefined()
    })

    it('forces gcTime to false with custom gcTime', async () => {
      const { wrapper, pinia } = mountQuery({ key: ['custom'], gcTime: 1000 })
      await flushPromises()
      wrapper.unmount()
      const [entry] = useQueryCache(pinia).getEntries({ key: ['custom'] })
      expect(entry).toBeDefined()
      expect(entry!.options?.gcTime).toBe(false)
      expect(entry!.gcTimeout).toBeUndefined()
    })

    it('forces gcTime to false using the global default', async () => {
      const { wrapper, pinia } = mountQuery({ key: ['default'] })
      await flushPromises()
      wrapper.unmount()
      const [entry] = useQueryCache(pinia).getEntries({ key: ['default'] })
      expect(entry).toBeDefined()
      expect(entry!.options?.gcTime).toBe(false)
      expect(entry!.gcTimeout).toBeUndefined()
    })

    it('keeps gcTime forced to false across remounts that re-ensure the entry', async () => {
      const pinia = createPinia()
      const { wrapper: w1 } = mountQuery({ key: ['re-ensure'], gcTime: 1000 }, { pinia })
      await flushPromises()
      w1.unmount()
      const { wrapper: w2 } = mountQuery({ key: ['re-ensure'], gcTime: 5000 }, { pinia })
      await flushPromises()
      const [entry] = useQueryCache(pinia).getEntries({ key: ['re-ensure'] })
      expect(entry).toBeDefined()
      expect(entry!.options?.gcTime).toBe(false)
      w2.unmount()
      expect(entry!.gcTimeout).toBeUndefined()
    })
  })

  describe('mutations', () => {
    it('forces gcTime to false with custom gcTime', async () => {
      const { wrapper, pinia } = mountMutation({ gcTime: 1000 })
      wrapper.vm.mutate()
      await flushPromises()
      const entries = useMutationCache(pinia).getEntries()
      expect(entries.length).toBeGreaterThan(0)
      expect(entries.every((e) => e.options.gcTime === false)).toBe(true)
    })

    it('forces gcTime to false using the global default', async () => {
      const { wrapper, pinia } = mountMutation()
      wrapper.vm.mutate()
      await flushPromises()
      const entries = useMutationCache(pinia).getEntries()
      expect(entries.length).toBeGreaterThan(0)
      expect(entries.every((e) => e.options.gcTime === false)).toBe(true)
    })
  })
})
