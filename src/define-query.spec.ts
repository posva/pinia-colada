import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { App } from 'vue'
import { createApp, defineComponent, effectScope, inject, provide, ref } from 'vue'
import { defineQuery } from './define-query'
import { useQuery } from './use-query'
import type { UseQueryOptions } from './query-options'
import { isSpy } from '../test/utils'
import type { GlobalMountOptions } from '../test/utils'
import { useQueryCache } from './query-store'
import { PiniaColada } from './pinia-colada'
import { mockWarn } from '../test/mock-warn'

describe('defineQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)
  mockWarn()

  it('reuses the query in multiple places', async () => {
    const useTodoList = defineQuery({
      key: ['todos'],
      query: async () => [{ id: 1 }],
    })

    let returnedValues!: ReturnType<typeof useTodoList>
    mount(
      {
        setup() {
          returnedValues = useTodoList()
          return { ...returnedValues }
        },
        render: () => null,
      },
      {
        global: {
          plugins: [createPinia(), PiniaColada],
        },
      },
    )

    const { data } = useTodoList()
    expect(data).toBe(useTodoList().data)
    expect(data).toBe(returnedValues.data)
  })

  it('reuses the query in multiple places with a setup function', async () => {
    const useTodoList = defineQuery(() => {
      const todoFilter = ref<'all' | 'finished' | 'unfinished'>('all')
      const { data, ...rest } = useQuery({
        key: ['todos', { filter: todoFilter.value }],
        query: async () => [{ id: 1 }],
      })
      return { ...rest, todoList: data, todoFilter }
    })

    let returnedValues!: ReturnType<typeof useTodoList>
    mount(
      {
        setup() {
          returnedValues = useTodoList()
          return { ...returnedValues }
        },
        template: `<div></div>`,
      },
      {
        global: {
          plugins: [createPinia(), PiniaColada],
        },
      },
    )

    const { todoList, todoFilter } = useTodoList()
    expect(todoList).toBe(useTodoList().todoList)
    expect(todoList).toBe(returnedValues.todoList)
    expect(todoFilter).toBe(useTodoList().todoFilter)
    expect(todoFilter).toBe(returnedValues.todoFilter)
  })

  it('injects from app not from parent component', () => {
    const useData = defineQuery(() => {
      const value = inject('injected', 'ko')
      expect(value).toBe('ok')
      return { value }
    })
    const Injector = defineComponent({
      template: '<p>child</p>',
      setup() {
        return { ...useData() }
      },
    })
    mount(
      {
        template: '<Injector />',
        components: { Injector },
        setup() {
          provide('injected', 'ko-component')
          return {}
        },
      },
      {
        global: {
          plugins: [createPinia(), PiniaColada],
          provide: {
            injected: 'ok',
          },
        },
      },
    )

    expect(useData().value).toBe('ok')
  })

  // tests that are specific to the nested scope created for each defineQuery
  // that allows them to mimic useQuery behavior in components
  describe('nested scope', () => {
    it('avoids reading the key if not active (unmounted component)', async () => {
      const routeId = ref(1)
      const key = vi.fn(() => ['key', routeId.value])
      const useProfile = defineQuery(() => {
        return useQuery({
          key,
          query: async () => ({ name: 'Eduardo' }),
        })
      })

      const wrapper = mount(
        {
          setup() {
            return { ...useProfile() }
          },
          template: `<div></div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      // we only care about after the unmount
      key.mockClear()
      wrapper.unmount()
      routeId.value = 2
      await flushPromises()
      expect(key).toHaveBeenCalledTimes(0)
    })

    it('avoids reading the key if not active (v-if toggle)', async () => {
      const routeId = ref(1)
      const key = vi.fn(() => ['key', routeId.value])
      const useProfile = defineQuery(() => {
        return useQuery({
          key,
          query: async () => ({ name: 'Eduardo' }),
        })
      })

      const ViewComponent = defineComponent({
        setup() {
          return { ...useProfile() }
        },
        template: `<div></div>`,
      })

      mount(
        {
          components: { ViewComponent },
          setup() {
            return { routeId }
          },
          template: `<div>{{ routeId }}<ViewComponent v-if="routeId === 1" /></div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      key.mockClear()
      routeId.value = 2
      await flushPromises()
      expect(key).toHaveBeenCalledTimes(0)
    })

    it('reactivates if a new component mounts', async () => {
      const routeId = ref(1)
      const key = vi.fn(() => {
        return ['key', routeId.value]
      })
      const query = vi.fn(async () => ({ name: 'Eduardo', id: routeId.value }))
      const useProfile = defineQuery(() => {
        return useQuery({ key, query, staleTime: 1_000 })
      })

      const ViewComponent = defineComponent({
        setup() {
          return { ...useProfile() }
        },
        template: `<div></div>`,
      })

      mount(
        {
          components: { ViewComponent },
          setup() {
            return { routeId }
          },
          template: `<div>{{ routeId }}<ViewComponent v-if="routeId === 1" /></div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      query.mockClear()
      key.mockClear()
      routeId.value = 2
      await flushPromises()
      // they shouldn't be computed while the component is not used
      expect(query).toHaveBeenCalledTimes(0)
      expect(key).toHaveBeenCalledTimes(0)

      // query is still stale
      routeId.value = 1
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(0)

      // a tick
      routeId.value = 2
      await flushPromises()

      // ensure the query is stale so it refetches
      vi.advanceTimersByTime(1_001)
      routeId.value = 1
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
    })

    // https://github.com/posva/pinia-colada/issues/246
    it('reactivates if the key changes to a cached data used in a nested component', async () => {
      const useProfile = defineQuery(() => {
        const id = ref(1)
        const query = useQuery({
          key: () => ['key', id.value],
          query: async () => id.value,
        })

        return { id, ...query }
      })

      const NestedComponent = defineComponent({
        setup() {
          const { data } = useProfile()
          return { data }
        },
        template: '<div>{{data}}</div>',
      })

      const wrapper = mount(
        {
          setup() {
            return { ...useProfile() }
          },
          components: { NestedComponent },
          template: `<div>{{ data }}=<NestedComponent v-if="id === 1" /></div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )
      const { id } = useProfile()

      await flushPromises()
      expect(wrapper.text()).toBe('1=1')
      id.value = 2
      await flushPromises()
      expect(wrapper.text()).toBe('2=')
      id.value = 1
      await flushPromises()
      expect(wrapper.text()).toBe('1=1')
      id.value = 2
      await flushPromises()
      expect(wrapper.text()).toBe('2=')
    })
  })

  describe('refetchOnMount', () => {
    it('refreshes the query if mounted in a new component', async () => {
      const spy = vi.fn(async () => {
        return 'todos'
      })
      const useTodoList = defineQuery({
        key: ['todos'],
        query: spy,
        refetchOnMount: true,
        staleTime: 100,
      })
      let returnedValues!: ReturnType<typeof useTodoList>

      const pinia = createPinia()
      const Component = defineComponent({
        setup() {
          returnedValues = useTodoList()
          return {}
        },
        template: `<div></div>`,
      })

      mount(Component, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      await flushPromises()

      const { data, status, asyncStatus } = returnedValues
      expect(spy).toHaveBeenCalledTimes(1)
      expect(status.value).toBe('success')
      expect(data.value).toEqual('todos')

      mount(Component, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      // still called only once
      expect(spy).toHaveBeenCalledTimes(1)
      // no ongoing call
      expect(status.value).toBe('success')
      expect(data.value).toEqual('todos')
      await flushPromises()
      expect(status.value).toBe('success')

      vi.advanceTimersByTime(101)
      mount(Component, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      // it should be loading
      expect(asyncStatus.value).toBe('loading')
      expect(data.value).toEqual('todos')
      await flushPromises()

      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('refetches if refetchOnMount is always', async () => {
      const query = vi.fn(async () => {
        return 'todos'
      })
      const useTodoList = defineQuery({
        key: ['todos'],
        query,
        refetchOnMount: 'always',
        staleTime: 100,
      })
      let returnedValues!: ReturnType<typeof useTodoList>

      const pinia = createPinia()
      const Component = defineComponent({
        setup() {
          returnedValues = useTodoList()
          return {}
        },
        template: `<div></div>`,
      })

      mount(Component, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      await flushPromises()

      const { data, status } = returnedValues
      expect(query).toHaveBeenCalledTimes(1)
      expect(status.value).toBe('success')
      expect(data.value).toEqual('todos')

      query.mockClear()
      await flushPromises()
      mount(Component, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      expect(query).toHaveBeenCalledTimes(1)
    })

    it('does not refetch if refetchOnMount is false', async () => {
      const spy = vi.fn(async () => {
        return 'todos'
      })
      const useTodoList = defineQuery({
        key: ['todos'],
        query: spy,
        refetchOnMount: false,
        staleTime: 100,
      })
      let returnedValues!: ReturnType<typeof useTodoList>

      const pinia = createPinia()
      const Component = defineComponent({
        setup() {
          returnedValues = useTodoList()
          return {}
        },
        template: `<div></div>`,
      })

      mount(Component, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      await flushPromises()

      const { data, status } = returnedValues
      expect(spy).toHaveBeenCalledTimes(1)
      expect(status.value).toBe('success')
      expect(data.value).toEqual('todos')

      mount(Component, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      expect(spy).toHaveBeenCalledTimes(1)
    })

    it('does not trigger if mounted multiple times while enabled is false', async () => {
      const spy = vi.fn(async () => 'ko')
      const useDefinedQuery = defineQuery({
        enabled: false,
        key: ['id'],
        query: spy,
      })

      const pinia = createPinia()

      const Comp1 = defineComponent({
        setup() {
          useDefinedQuery()
          return {}
        },
        template: `<div></div>`,
      })
      const Comp2 = defineComponent({
        setup() {
          useDefinedQuery()
          return {}
        },
        template: `<div></div>`,
      })

      mount(Comp1, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      mount(Comp2, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      await flushPromises()

      expect(spy).toHaveBeenCalledTimes(0)
    })
  })

  describe('outside of components', () => {
    let app: App
    beforeEach(() => {
      const pinia = createPinia()
      app = createApp({ render: () => null })
        .use(pinia)
        .use(PiniaColada, {})
      app.mount(document.createElement('div'))
    })
    afterEach(() => {
      app?.unmount()
    })

    it('reuses the query', async () => {
      const useTodoList = defineQuery({
        key: ['todos'],
        query: async () => [{ id: 1 }],
      })

      // to have access to inject
      app.runWithContext(() => {
        const { data } = useTodoList()
        expect(data).toBe(useTodoList().data)
      })
    })

    it('reuses the query with a setup function', async () => {
      const useTodoList = defineQuery(() => {
        const todoFilter = ref<'all' | 'finished' | 'unfinished'>('all')
        const { data, ...rest } = useQuery({
          key: ['todos', { filter: todoFilter.value }],
          query: async () => [{ id: 1 }],
        })
        return { ...rest, todoList: data, todoFilter }
      })

      app.runWithContext(() => {
        const { todoList, todoFilter } = useTodoList()
        expect(todoList).toBe(useTodoList().todoList)
        expect(todoFilter).toBe(useTodoList().todoFilter)
      })
    })

    it('refreshes the query when called', async () => {
      const spy = vi.fn(async () => {
        return 'todos'
      })
      const useTodoList = defineQuery({
        key: ['todos'],
        query: spy,
        staleTime: 100,
        refetchOnMount: true,
      })

      await app.runWithContext(async () => {
        const { data, status } = useTodoList()
        await flushPromises()
        expect(spy).toHaveBeenCalledTimes(1)

        expect(status.value).toBe('success')
        expect(data.value).toEqual('todos')

        // should not trigger a refresh
        useTodoList()
        await flushPromises()
        expect(spy).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(101)

        useTodoList()
        await flushPromises()
        expect(spy).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('gcTime', () => {
    describe('with component', () => {
      function mountSimple<TData = string>(
        options: Partial<UseQueryOptions<TData>> = {},
        mountOptions?: GlobalMountOptions,
      ) {
        const queryFunction = options.query
          ? isSpy(options.query)
            ? options.query
            : vi.fn(options.query)
          : vi.fn(async () => 'todos')
        const useTodoList = defineQuery(() => {
          const query = useQuery({
            key: ['todos'],
            gcTime: 1000,
            ...options,
            // @ts-expect-error: generic unmatched but types work
            query: queryFunction,
          })
          return { ...query }
        })
        let returnedValues: ReturnType<typeof useTodoList>

        const wrapper = mount(
          defineComponent({
            render: () => null,
            setup() {
              returnedValues = useTodoList()
              return { ...returnedValues }
            },
          }),
          {
            global: {
              plugins: [...(mountOptions?.plugins || [createPinia()]), PiniaColada],
            },
          },
        )
        return wrapper
      }

      it('deletes the cache once the component is unmounted after the delay', async () => {
        const wrapper = mountSimple()
        await flushPromises()

        const cache = useQueryCache()
        expect(cache.getQueryData(['todos'])).toBe('todos')

        wrapper.unmount()
        vi.advanceTimersByTime(999)
        // still there
        expect(cache.getQueryData(['todos'])).toBe('todos')
        vi.advanceTimersByTime(1)
        expect(cache.getQueryData(['todos'])).toBeUndefined()
      })

      it('keeps the cache if the query is reused by a new component before the delay', async () => {
        const pinia = createPinia()
        const query = vi.fn(async () => 'todos')
        const options = {
          key: ['todos'],
          query,
          gcTime: 1000,
        } satisfies UseQueryOptions<string>
        const w1 = mountSimple(options, { plugins: [pinia] })
        await flushPromises()

        const cache = useQueryCache()
        expect(cache.getQueryData(['todos'])).toBe('todos')

        w1.unmount()
        vi.advanceTimersByTime(999)
        // still there
        expect(cache.getQueryData(['todos'])).toBe('todos')

        // create new component
        const w2 = mountSimple(options, { plugins: [pinia] })

        vi.advanceTimersByTime(1)
        // still there
        expect(cache.getQueryData(['todos'])).toBe('todos')
        // check that gcTime doesn't impact it
        vi.advanceTimersByTime(1000)
        expect(cache.getQueryData(['todos'])).toBe('todos')
        w2.unmount()
        vi.advanceTimersByTime(999)
        expect(cache.getQueryData(['todos'])).toBe('todos')
        vi.advanceTimersByTime(1)
        expect(cache.getQueryData(['todos'])).toBeUndefined()
      })

      it('deletes the cache of an old key while the component is mounted', async () => {
        const key = ref(1)
        mountSimple({ key: () => [key.value] })
        const cache = useQueryCache()

        await flushPromises()
        expect(cache.getQueryData(['1'])).toBe('todos')

        // trigger a new entry
        key.value = 2

        // let the query finish
        await flushPromises()

        expect(cache.getQueryData(['2'])).toBe('todos')
        // still not deleted
        expect(cache.getQueryData(['1'])).toBe('todos')

        // trigger cleanup
        vi.advanceTimersByTime(1000)
        expect(cache.getQueryData(['1'])).toBeUndefined()
      })

      it('keeps the cache if the query key changes before the delay', async () => {
        const key = ref(1)
        mountSimple({ key: () => [key.value] })
        const cache = useQueryCache()

        await flushPromises()
        expect(cache.getQueryData(['1'])).toBe('todos')

        // trigger a new entry
        key.value = 2

        // let the query finish
        await flushPromises()

        // check the values are still there
        expect(cache.getQueryData(['1'])).toBe('todos')
        expect(cache.getQueryData(['2'])).toBe('todos')

        vi.advanceTimersByTime(999)
        expect(cache.getQueryData(['1'])).toBe('todos')

        // go back to 1
        key.value = 1
        await flushPromises()

        // should not have deleted it
        expect(cache.getQueryData(['1'])).toBe('todos')
        expect(cache.getQueryData(['2'])).toBe('todos')
      })
    })

    describe('with effect scope', () => {
      let app: App
      function todoListDefineQuery(key?: any) {
        return defineQuery(() => {
          const query = useQuery({
            key: key || ['todos'],
            gcTime: 1000,
            query: vi.fn(async () => {
              return 'todos'
            }),
          })
          return { ...query }
        })
      }
      beforeEach(() => {
        const pinia = createPinia()
        app = createApp({ render: () => null })
          .use(pinia)
          .use(PiniaColada, {})
        app.mount(document.createElement('div'))
      })
      afterEach(() => {
        app?.unmount()
      })

      it('deletes the cache once the scope is stoped after the delay', async () => {
        await app.runWithContext(async () => {
          const useTodoList = todoListDefineQuery()
          const scope = effectScope()
          scope.run(useTodoList)
          await flushPromises()

          const cache = useQueryCache()
          expect(cache.getQueryData(['todos'])).toBe('todos')

          scope.stop()
          vi.advanceTimersByTime(999)
          // still there
          expect(cache.getQueryData(['todos'])).toBe('todos')
          vi.advanceTimersByTime(1)
          expect(cache.getQueryData(['todos'])).toBeUndefined()
        })
      })

      it('keeps the cache if the query is reused by a new scope before the delay', async () => {
        await app.runWithContext(async () => {
          const useTodoList = todoListDefineQuery()
          const scope1 = effectScope()
          scope1.run(useTodoList)
          await flushPromises()
          const cache = useQueryCache()
          expect(cache.getQueryData(['todos'])).toBe('todos')

          scope1.stop()
          vi.advanceTimersByTime(999)
          // still there
          expect(cache.getQueryData(['todos'])).toBe('todos')

          const scope2 = effectScope()
          scope2.run(useTodoList)

          vi.advanceTimersByTime(1)
          // still there
          expect(cache.getQueryData(['todos'])).toBe('todos')
          // check that gcTime doesn't impact it
          vi.advanceTimersByTime(1000)
          expect(cache.getQueryData(['todos'])).toBe('todos')
          scope2.stop()
          vi.advanceTimersByTime(999)
          expect(cache.getQueryData(['todos'])).toBe('todos')
          vi.advanceTimersByTime(1)
          expect(cache.getQueryData(['todos'])).toBeUndefined()
        })
      })

      it('deletes the cache of an old key while the scope is active', async () => {
        await app.runWithContext(async () => {
          const key = ref(1)
          const useTodoList = todoListDefineQuery(() => [key.value])
          const scope1 = effectScope()
          scope1.run(useTodoList)
          const cache = useQueryCache()

          await flushPromises()
          expect(cache.getQueryData(['1'])).toBe('todos')

          // trigger a new entry
          key.value = 2

          // let the query finish
          await flushPromises()

          expect(cache.getQueryData(['2'])).toBe('todos')
          // still not deleted
          expect(cache.getQueryData(['1'])).toBe('todos')

          // trigger cleanup
          vi.advanceTimersByTime(1000)
          expect(cache.getQueryData(['1'])).toBeUndefined()
        })
      })

      it('keeps the cache if the query key changes before the delay', async () => {
        await app.runWithContext(async () => {
          const key = ref(1)
          const useTodoList = todoListDefineQuery(() => [key.value])
          const scope1 = effectScope()
          scope1.run(useTodoList)
          const cache = useQueryCache()

          await flushPromises()
          expect(cache.getQueryData(['1'])).toBe('todos')

          // trigger a new entry
          key.value = 2

          // let the query finish
          await flushPromises()

          // check the values are still there
          expect(cache.getQueryData(['1'])).toBe('todos')
          expect(cache.getQueryData(['2'])).toBe('todos')

          vi.advanceTimersByTime(999)
          expect(cache.getQueryData(['1'])).toBe('todos')

          // go back to 1
          key.value = 1
          await flushPromises()

          // should not have deleted it
          expect(cache.getQueryData(['1'])).toBe('todos')
          expect(cache.getQueryData(['2'])).toBe('todos')
        })
      })
    })
  })

  describe('hmr', () => {
    // TODO: it would be nice to have this but not needed: it's better to fetch
    // an extra time during dev than not
    it.todo('does not refetch if the component changes', async () => {
      const query = vi.fn(async () => 42)
      const useMyQuery = defineQuery({ key: ['id'], query, staleTime: 10000 })
      const component = defineComponent({
        render: () => null,
        setup() {
          useMyQuery()
          return {}
        },
        // to simulate HMR, the HMR id is stable across remounts
        __hmrId: 'some-id',
      })

      const pinia = createPinia()
      const w1 = mount(component, { global: { plugins: [pinia, PiniaColada] } })
      // simulate the wait of things to settle but do not let staleTime pass
      await flushPromises()

      mount(component, { global: { plugins: [pinia, PiniaColada] } })
      w1.unmount()
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
    })
  })
})
