import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { App } from 'vue'
import { createApp, defineComponent, ref } from 'vue'
import { QueryPlugin } from './query-plugin'
import { defineQuery } from './define-query'
import { useQuery } from './use-query'
import { useQueryCache } from './query-store'

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
          plugins: [createPinia(), QueryPlugin],
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
          plugins: [createPinia(), QueryPlugin],
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
          plugins: [pinia, QueryPlugin],
        },
      })
      await flushPromises()

      const { data, status } = returnedValues
      expect(spy).toHaveBeenCalledTimes(1)
      expect(status.value).toBe('success')
      expect(data.value).toEqual('todos')

      mount(Component, {
        global: {
          plugins: [pinia, QueryPlugin],
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
          plugins: [pinia, QueryPlugin],
        },
      })
      // it should be loading
      expect(status.value).toBe('loading')
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
          plugins: [pinia, QueryPlugin],
        },
      })
      await flushPromises()

      const { data, status } = returnedValues
      expect(spy).toHaveBeenCalledTimes(1)
      expect(status.value).toBe('success')
      expect(data.value).toEqual('todos')

      mount(Component, {
        global: {
          plugins: [pinia, QueryPlugin],
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
          plugins: [pinia, QueryPlugin],
        },
      })
      await flushPromises()

      const { data, status } = returnedValues
      expect(spy).toHaveBeenCalledTimes(1)
      expect(status.value).toBe('success')
      expect(data.value).toEqual('todos')

      mount(Component, {
        global: {
          plugins: [pinia, QueryPlugin],
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
        .use(QueryPlugin)
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
    // Todo: outside components ?
    
    it('deletes the cache once the component is unmounted after the delay', async () => {
      const spy = vi.fn(async () => {
        return 'todos'
      })
      // Todo: with options ?
      const useTodoList = defineQuery(() => {
        const query = useQuery({
          key: ['todos'],
          query: spy,
          gcTime: 1000
        })
        return {...query}
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

      const wrapper = mount(Component, {
        global: {
          plugins: [pinia, QueryPlugin],
        },
      })
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
      const spy = vi.fn(async () => {
        return 'todos'
      })
      // Todo: with options ?
      const useTodoList = defineQuery(() => {
        const query = useQuery({
          key: ['todos'],
          query: spy,
          gcTime: 1000
        })
        return {...query}
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

      const wrapper = mount(Component, {
        global: {
          plugins: [pinia, QueryPlugin],
        },
      })
      await flushPromises()

      const cache = useQueryCache()
      expect(cache.getQueryData(['todos'])).toBe('todos')

      wrapper.unmount()
      await vi.advanceTimersByTime(999)
      // still there
      expect(cache.getQueryData(['todos'])).toBe('todos')

      // create new component

      const Component2 = defineComponent({
        setup() {
          returnedValues = useTodoList()
          return {}
        },
        template: `<div></div>`,
      })

      const wrapper2 = mount(Component2, {
        global: {
          plugins: [pinia, QueryPlugin],
        },
      })
      await vi.advanceTimersByTime(1)
      expect(cache.getQueryData(['todos'])).toBe('todos')
    })

    // it('deletes the cache of an old key while the component is mounted', async () => {
    //   const key = ref(1)
    //   mountSimple({ key: () => [key.value], gcTime: 1000 })
    //   const cache = useQueryCache()

    //   await flushPromises()
    //   expect(cache.getQueryData(['1'])).toBe(42)

    //   // trigger a new entry
    //   key.value = 2
    //   await nextTick()

    //   // let the query finish
    //   await flushPromises()

    //   expect(cache.getQueryData(['2'])).toBe(42)
    //   // still not deleted
    //   expect(cache.getQueryData(['1'])).toBe(42)

    //   // trigger cleanup
    //   vi.advanceTimersByTime(1000)
    //   expect(cache.getQueryData(['1'])).toBeUndefined()
    // })

    // it('keeps the cache if the query key changes before the delay', async () => {
    //   const key = ref(1)
    //   mountSimple({ key: () => [key.value], gcTime: 1000 })
    //   const cache = useQueryCache()

    //   await flushPromises()

    //   // trigger a new entry
    //   key.value = 2
    //   await nextTick()

    //   // let the query finish
    //   await flushPromises()

    //   // check the values are still there
    //   expect(cache.getQueryData(['1'])).toBe(42)
    //   expect(cache.getQueryData(['2'])).toBe(42)

    //   vi.advanceTimersByTime(999)
    //   expect(cache.getQueryData(['1'])).toBe(42)

    //   // go back to 1
    //   key.value = 1
    //   await nextTick()
    //   await flushPromises()

    //   // should not have deleted it
    //   expect(cache.getQueryData(['1'])).toBe(42)
    //   expect(cache.getQueryData(['2'])).toBe(42)
    // })

    // it.todo('works with effectScope too')
  })
})
