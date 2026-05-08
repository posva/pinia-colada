import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createApp, defineComponent } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { PiniaColada } from '../pinia-colada'
import { useQueryCache } from '../query-store'
import { useMutationCache } from '../mutation-store'
import { useMutation } from '../use-mutation'
import { PiniaColadaSSRNoGc } from './no-gc-ssr'

describe('PiniaColadaSSRNoGc plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function setup({ withPlugin = true }: { withPlugin?: boolean } = {}) {
    const pinia = createPinia()
    const app = createApp({})
    app.use(pinia)
    setActivePinia(pinia)
    app.use(PiniaColada, {
      queryOptions: {},
      plugins: withPlugin ? [PiniaColadaSSRNoGc()] : [],
    })
    return { pinia, app }
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
    it('baseline: without the plugin, custom gcTime schedules a timer', async () => {
      setup({ withPlugin: false })
      const queryCache = useQueryCache()
      const entry = queryCache.ensure({
        key: ['baseline'],
        query: async () => 'data',
        gcTime: 1000,
      })
      await queryCache.refresh(entry)

      expect(entry.options?.gcTime).toBe(1000)
      expect(entry.gcTimeout).toBeDefined()
    })

    it('forces gcTime to false with custom gcTime', async () => {
      setup()
      const queryCache = useQueryCache()
      const entry = queryCache.ensure({
        key: ['custom'],
        query: async () => 'data',
        gcTime: 1000,
      })
      await queryCache.refresh(entry)

      expect(entry.options?.gcTime).toBe(false)
      expect(entry.gcTimeout).toBeUndefined()
    })

    it('forces gcTime to false using the global default', async () => {
      setup()
      const queryCache = useQueryCache()
      const entry = queryCache.ensure({
        key: ['default'],
        query: async () => 'data',
      })
      await queryCache.refresh(entry)

      expect(entry.options?.gcTime).toBe(false)
      expect(entry.gcTimeout).toBeUndefined()
    })

    it('keeps gcTime forced to false across re-ensure calls', async () => {
      setup()
      const queryCache = useQueryCache()
      const opts = {
        key: ['re-ensure'],
        query: async () => 'data',
        gcTime: 1000,
      } as const
      const entry = queryCache.ensure(opts)
      await queryCache.refresh(entry)
      // re-ensure returns the same entry but reassigns options on the existing one
      const entry2 = queryCache.ensure({ ...opts, gcTime: 2000 })
      expect(entry2).toBe(entry)
      expect(entry.options?.gcTime).toBe(false)
    })
  })

  describe('mutations', () => {
    it('forces gcTime to false with custom gcTime', async () => {
      const { wrapper, pinia } = mountMutation({ gcTime: 1000 })
      wrapper.vm.mutate()
      await flushPromises()
      const [entry] = useMutationCache(pinia).getEntries()
      expect(entry).toBeDefined()
      expect(entry!.options.gcTime).toBe(false)
    })

    it('forces gcTime to false using the global default', async () => {
      const { wrapper, pinia } = mountMutation()
      wrapper.vm.mutate()
      await flushPromises()
      const [entry] = useMutationCache(pinia).getEntries()
      expect(entry).toBeDefined()
      expect(entry!.options.gcTime).toBe(false)
    })
  })
})
