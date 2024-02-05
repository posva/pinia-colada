import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  MockInstance,
} from 'vitest'
import { UseQueryOptions, useQuery } from './use-query'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import {
  computed,
  defineComponent,
  nextTick,
  ref,
  shallowReactive,
  shallowRef,
} from 'vue'
import { GlobalMountOptions } from 'node_modules/@vue/test-utils/dist/types'
import { delay, isSpy, runTimers } from '../test/utils'
import {
  UseQueryEntry,
  UseQueryStatus,
  createTreeMap,
  serialize,
  useDataFetchingStore,
} from './data-fetching-store'
import { TreeMapNode, entryNodeSize } from './tree-map'

describe('useQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountSimple<TResult = number>(
    options: Partial<UseQueryOptions<TResult>> = {},
    mountOptions?: GlobalMountOptions
  ) {
    const query = options.query
      ? vi.fn(options.query)
      : vi.fn(async () => {
          await delay(0)
          return 42
        })
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useQuery<TResult>({
              key: 'key',
              ...options,
              // @ts-expect-error: generic unmatched but types work
              query: query,
            }),
          }
        },
      }),
      {
        global: {
          plugins: [createPinia()],
          ...mountOptions,
        },
      }
    )
    return Object.assign([wrapper, query] as const, { wrapper, query })
  }

  describe('initial fetch', () => {
    it('fetches data and updates on mount', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.data).toBeUndefined()
      await runTimers()
      expect(wrapper.vm.data).toBe(42)
    })

    it('sets the fetching state', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.isFetching).toBe(true)
      await runTimers()
      expect(wrapper.vm.isFetching).toBe(false)
    })

    it('sets the pending state', async () => {
      const { wrapper } = mountSimple()

      expect(wrapper.vm.isPending).toBe(true)
      await runTimers()
      expect(wrapper.vm.isPending).toBe(false)
    })

    it('sets the error state', async () => {
      const { wrapper } = mountSimple({
        query: async () => {
          throw new Error('foo')
        },
      })

      expect(wrapper.vm.error).toBeNull()
      await runTimers()
      expect(wrapper.vm.error).toEqual(new Error('foo'))
    })

    it('exposes a status state', async () => {
      const { wrapper } = mountSimple()

      await runTimers()
      expect(wrapper.vm.status).toBe('success')
    })

    // NOTE: is this worth adding?
    it.skip('it works with a synchronously thrown Error', async () => {
      const { wrapper } = mountSimple({
        query: () => {
          throw new Error('foo')
        },
      })

      expect(wrapper.vm.error).toBeNull()
      await runTimers()
      expect(wrapper.vm.error).toEqual(new Error('foo'))
    })

    it('uses initial data if present in store', async () => {
      const pinia = createPinia()

      const entryRegistry = shallowReactive(
        new TreeMapNode<UseQueryEntry>(
          ['key'],
          new UseQueryEntry(2, null, Date.now())
        )
      )
      pinia.state.value.PiniaColada = { entryRegistry }
      const { wrapper, query } = mountSimple(
        { staleTime: 1000 },
        { plugins: [pinia] }
      )

      // without waiting for times the data is present
      expect(wrapper.vm.data).toBe(2)
    })

    it('avoids fetching if initial data is fresh', async () => {
      const pinia = createPinia()

      const entryRegistry = shallowReactive(
        new TreeMapNode<UseQueryEntry>(
          ['key'],
          // fresh data
          new UseQueryEntry(2, null, Date.now())
        )
      )
      pinia.state.value.PiniaColada = { entryRegistry }
      const { wrapper, query } = mountSimple(
        // 1s stale time
        { staleTime: 1000 },
        { plugins: [pinia] }
      )

      await runTimers()
      // it should not fetch and use the initial data
      expect(query).toHaveBeenCalledTimes(0)
      expect(wrapper.vm.data).toBe(2)
    })
  })

  describe('staleTime', () => {
    it('when refreshed, does not fetch again if staleTime has not been elapsed', async () => {
      const { wrapper, query } = mountSimple({ staleTime: 1000 })

      await runTimers()
      expect(wrapper.vm.data).toBe(42)
      expect(query).toHaveBeenCalledTimes(1)

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(500)
      wrapper.vm.refresh()
      await runTimers()

      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe(42)
    })

    it('new mount does not fetch if staleTime is not elapsed', async () => {
      const pinia = createPinia()
      const [w1, f1] = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      await runTimers()

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(500)

      const [w2, f2] = mountSimple({ staleTime: 1000 }, { plugins: [pinia] })

      await runTimers()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(0)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('when refreshed, fetches the data if the staleTime has been elapsed', async () => {
      const { wrapper, query } = mountSimple({ staleTime: 1000 })

      await runTimers()
      expect(wrapper.vm.data).toBe(42)
      expect(query).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(1001)
      wrapper.vm.refresh()
      await runTimers()

      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.data).toBe(42)
    })

    it('new mount fetches if staleTime is elapsed', async () => {
      const [w1, f1] = mountSimple({ staleTime: 1000 })

      await runTimers()

      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(1001)

      const [w2, f2] = mountSimple({ staleTime: 1000 })

      await runTimers()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(1)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('new mount reuses a pending request even if the staleTime has been elapsed', async () => {
      const pinia = createPinia()
      const [w1, f1] = mountSimple({ staleTime: 0 }, { plugins: [pinia] })
      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(10)
      const [w2, f2] = mountSimple({ staleTime: 0 }, { plugins: [pinia] })

      await runTimers()

      expect(f1).toHaveBeenCalledTimes(1)
      expect(f2).toHaveBeenCalledTimes(0)
      expect(w1.vm.data).toBe(42)
      expect(w2.vm.data).toBe(42)
    })

    it('refresh reuses a pending request even if the staleTime has been elapsed', async () => {
      const pinia = createPinia()
      const { wrapper, query } = mountSimple(
        { staleTime: 0 },
        { plugins: [pinia] }
      )
      // should not trigger a new fetch because staleTime has not passed
      vi.advanceTimersByTime(10)
      wrapper.vm.refresh()

      await runTimers()

      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.data).toBe(42)
    })

    it('ignores stale time if there is an error', async () => {
      const query = vi.fn().mockRejectedValueOnce(new Error('fail'))
      const { wrapper } = mountSimple({ staleTime: 1000, query: query })

      await runTimers()
      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      expect(wrapper.vm.data).toBe(undefined)
      query.mockResolvedValueOnce(42)

      wrapper.vm.refresh()
      await runTimers()

      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.error).toEqual(null)
      expect(wrapper.vm.data).toBe(42)
    })
  })

  describe('refresh data', () => {
    function mountDynamicKey<TResult = { id: number; when: number }>(
      options: Partial<UseQueryOptions<TResult>> & { initialId?: number } = {},
      mountOptions?: GlobalMountOptions
    ) {
      let query!: MockInstance

      const wrapper = mount(
        defineComponent({
          render: () => null,
          setup() {
            const id = ref(options.initialId ?? 0)
            query = options.query
              ? isSpy(options.query)
                ? options.query
                : vi.fn(options.query)
              : vi.fn(async () => {
                  await delay(0)
                  return { id: id.value, when: Date.now() }
                })

            return {
              id,
              async setId(newId: number) {
                id.value = newId
                // awaits the delay of 0
                await runTimers()
                // renders again
                await nextTick()
              },
              ...useQuery<TResult>({
                key: () => ['data', id.value],
                ...options,
                // @ts-expect-error: generic unmatched but types work
                query: query,
              }),
            }
          },
        }),
        {
          global: {
            plugins: [createPinia()],
            ...mountOptions,
          },
        }
      )
      return Object.assign([wrapper, query] as const, {
        wrapper,
        query,
      })
    }

    it('refreshes the data even with initial values after staleTime is elapsed', async () => {
      const pinia = createPinia()
      pinia.state.value.PiniaColada = {
        entryRegistry: shallowReactive(
          new TreeMapNode(['key'], new UseQueryEntry(60, null, Date.now()))
        ),
      }
      const { wrapper, query } = mountSimple(
        {
          staleTime: 100,
        },
        {
          plugins: [pinia],
        }
      )

      await runTimers()
      expect(wrapper.vm.data).toBe(60)
      expect(query).toHaveBeenCalledTimes(0)

      await vi.advanceTimersByTime(101)
      wrapper.vm.refresh()
      await runTimers()
      expect(wrapper.vm.data).toBe(42)
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('refreshes the data if mounted and the key changes', async () => {
      const { wrapper, query } = mountDynamicKey({
        initialId: 0,
      })

      await runTimers()
      expect(wrapper.vm.data?.id).toBe(0)
      expect(query).toHaveBeenCalledTimes(1)

      await wrapper.vm.setId(1)

      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.vm.data?.id).toBe(1)
    })

    it('avoids a new fetch if the key changes but the data is not stale', async () => {
      const { wrapper, query } = mountDynamicKey({
        initialId: 0,
        staleTime: 1000,
      })

      await runTimers()
      expect(wrapper.vm.data?.id).toBe(0)
      expect(query).toHaveBeenCalledTimes(1)

      await wrapper.vm.setId(1)
      await wrapper.vm.setId(0)

      expect(query).toHaveBeenCalledTimes(2)
    })

    it('does not refresh by default when mounting a new component that uses the same key', async () => {
      const pinia = createPinia()
      const query = vi.fn().mockResolvedValue({ id: 0, when: Date.now() })
      mountDynamicKey({ initialId: 0, query: query }, { plugins: [pinia] })
      await runTimers()
      expect(query).toHaveBeenCalledTimes(1)

      mountDynamicKey({ initialId: 0 }, { plugins: [pinia] })
      await runTimers()
      // not called because data is fresh
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('refreshes when mounting a new component that uses the same key if data is stale', async () => {
      const pinia = createPinia()
      const query = vi.fn().mockResolvedValue({ id: 0, when: Date.now() })
      mountDynamicKey(
        // staleTime doesn't matter here
        { initialId: 0, staleTime: 10, query: query },
        { plugins: [pinia] }
      )
      await runTimers()
      expect(query).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTime(100)

      mountDynamicKey(
        { initialId: 0, staleTime: 10, query: query },
        { plugins: [pinia] }
      )
      await runTimers()
      // called because data is stale
      expect(query).toHaveBeenCalledTimes(2)
    })

    it('keeps the error while refreshing a failed query', async () => {
      const query = vi.fn().mockRejectedValueOnce(new Error('fail'))
      const { wrapper } = mountDynamicKey({ query: query })

      await runTimers()
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      expect(wrapper.vm.data).toBe(undefined)
      query.mockResolvedValueOnce(42)

      wrapper.vm.refresh()
      expect(wrapper.vm.error).toEqual(new Error('fail'))
      await runTimers()
      expect(wrapper.vm.error).toEqual(null)
    })
  })

  describe('shared state', () => {
    it('reuses the same state for the same key', async () => {
      const pinia = createPinia()
      mountSimple({ key: 'todos' }, { plugins: [pinia] })
      mountSimple({ key: ['todos'] }, { plugins: [pinia] })
      await runTimers()

      const cacheClient = useDataFetchingStore()
      expect(entryNodeSize(cacheClient.entryRegistry)).toBe(1)

      mountSimple({ key: ['todos', 2] }, { plugins: [pinia] })
      await runTimers()

      expect(entryNodeSize(cacheClient.entryRegistry)).toBe(2)
    })

    it('populates the entry registry', async () => {
      const pinia = createPinia()
      mountSimple({ key: ['todos', 5] }, { plugins: [pinia] })
      mountSimple({ key: ['todos', 2] }, { plugins: [pinia] })
      await runTimers()

      const cacheClient = useDataFetchingStore()
      expect(entryNodeSize(cacheClient.entryRegistry)).toBe(3)
    })

    it('order in object keys does not matter', async () => {
      const pinia = createPinia()
      mountSimple(
        { key: ['todos', { id: 5, a: true, b: 'hello' }] },
        { plugins: [pinia] }
      )
      mountSimple(
        { key: ['todos', { a: true, id: 5, b: 'hello' }] },
        { plugins: [pinia] }
      )
      mountSimple(
        { key: ['todos', { id: 5, a: true, b: 'hello' }] },
        { plugins: [pinia] }
      )
      await runTimers()

      const cacheClient = useDataFetchingStore()
      expect(entryNodeSize(cacheClient.entryRegistry)).toBe(2)
    })
  })

  describe('ssr', () => {
    it('works with no state', async () => {
      const pinia = createPinia()
      const { wrapper } = mountSimple({}, { plugins: [pinia] })

      await runTimers()
      expect(wrapper.vm.data).toBe(42)
    })

    // NOTE: these tests are a bit different from the ones in `initial state`.
    // They create the serialized state rather than the actual state
    it('uses the initial data if present in the store', async () => {
      const pinia = createPinia()
      const tree = createTreeMap()
      tree.set(['key'], new UseQueryEntry(2, null, Date.now()))
      pinia.state.value.PiniaColada = {
        entriesRaw: serialize(tree),
      }
      const { wrapper } = mountSimple({}, { plugins: [pinia] })

      // without waiting for times the data is present
      expect(wrapper.vm.data).toBe(2)
    })

    it('avoids fetching if initial data is fresh', async () => {
      const pinia = createPinia()
      const tree = createTreeMap()
      tree.set(['key'], new UseQueryEntry(2, null, Date.now()))
      pinia.state.value.PiniaColada = {
        entriesRaw: serialize(tree),
      }
      const { wrapper, query } = mountSimple(
        { staleTime: 1000 },
        { plugins: [pinia] }
      )

      await runTimers()

      // it should not fetch and use the initial data
      expect(query).toHaveBeenCalledTimes(0)
    })
  })
})
