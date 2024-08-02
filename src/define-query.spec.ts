import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { App } from 'vue'
import { createApp, defineComponent, effectScope, ref } from 'vue'
import { defineQuery } from './define-query'
import { useQuery } from './use-query'
import type { UseQueryOptions } from './query-options'
import type { GlobalMountOptions } from '../test/utils'
import { useQueryCache } from './query-store'
import { PiniaColada } from './pinia-colada'

describe('defineQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

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
        template: `<div></div>`,
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

      const { data, status, queryStatus } = returnedValues
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
      expect(queryStatus.value).toBe('running')
      expect(data.value).toEqual('todos')
      await flushPromises()

      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('refetches if refetchOnMount is always', async () => {
      const spy = vi.fn(async () => {
        return 'todos'
      })
      const useTodoList = defineQuery({
        key: ['todos'],
        query: spy,
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
      expect(spy).toHaveBeenCalledTimes(1)
      expect(status.value).toBe('success')
      expect(data.value).toEqual('todos')

      mount(Component, {
        global: {
          plugins: [pinia, PiniaColada],
        },
      })
      expect(spy).toHaveBeenCalledTimes(2)
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
  })

  describe('outside of components', () => {
    let app: App
    beforeEach(() => {
      const pinia = createPinia()
      app = createApp({ render: () => null })
        .use(pinia)
        .use(PiniaColada)
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
      function mountSimple<TResult = string>(
        options: Partial<UseQueryOptions<TResult>> = {},
        mountOptions?: GlobalMountOptions,
      ) {
        const queryFunction = options.query
          ? vi.fn(options.query)
          : vi.fn(async () => {
              return 'todos'
            })
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
              plugins: [
                ...(mountOptions?.plugins || [createPinia()]),
                PiniaColada,
              ],
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
        await vi.advanceTimersByTime(999)
        // still there
        expect(cache.getQueryData(['todos'])).toBe('todos')
        await vi.advanceTimersByTime(1)
        expect(cache.getQueryData(['todos'])).toBeUndefined()
      })

      it('keeps the cache if the query is reused by a new component before the delay', async () => {
        const pinia = createPinia()
        const w1 = mountSimple({ gcTime: 1000 }, { plugins: [pinia] })
        await flushPromises()

        const cache = useQueryCache()
        expect(cache.getQueryData(['todos'])).toBe('todos')

        w1.unmount()
        await vi.advanceTimersByTime(999)
        // still there
        expect(cache.getQueryData(['todos'])).toBe('todos')

        // create new component
        const w2 = mountSimple({}, { plugins: [pinia] })

        await vi.advanceTimersByTime(1)
        // still there
        expect(cache.getQueryData(['todos'])).toBe('todos')
        // check that gcTime doesn't impact it
        await vi.advanceTimersByTime(1000)
        expect(cache.getQueryData(['todos'])).toBe('todos')
        w2.unmount()
        await vi.advanceTimersByTime(999)
        expect(cache.getQueryData(['todos'])).toBe('todos')
        await vi.advanceTimersByTime(1)
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
          .use(PiniaColada)
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
          await vi.advanceTimersByTime(999)
          // still there
          expect(cache.getQueryData(['todos'])).toBe('todos')
          await vi.advanceTimersByTime(1)
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
          await vi.advanceTimersByTime(999)
          // still there
          expect(cache.getQueryData(['todos'])).toBe('todos')

          const scope2 = effectScope()
          scope2.run(useTodoList)

          await vi.advanceTimersByTime(1)
          // still there
          expect(cache.getQueryData(['todos'])).toBe('todos')
          // check that gcTime doesn't impact it
          await vi.advanceTimersByTime(1000)
          expect(cache.getQueryData(['todos'])).toBe('todos')
          scope2.stop()
          await vi.advanceTimersByTime(999)
          expect(cache.getQueryData(['todos'])).toBe('todos')
          await vi.advanceTimersByTime(1)
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
})
