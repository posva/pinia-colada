import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { App } from 'vue'
import { computed, createApp, defineComponent, effectScope, inject, provide, ref } from 'vue'
import { defineMutation } from './define-mutation'
import { useMutation } from './use-mutation'
import { useMutationCache } from './mutation-store'
import { PiniaColada } from './pinia-colada'
import { mockWarn } from '@posva/test-utils'

describe('defineMutation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(async () => {
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)
  mockWarn()

  it('reuses the mutation in multiple places', async () => {
    const useCreateTodo = defineMutation({
      mutation: async (text: string) => ({ id: 1, text }),
    })

    let returnedValues!: ReturnType<typeof useCreateTodo>
    mount(
      {
        setup() {
          returnedValues = useCreateTodo()
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

    const ret = useCreateTodo()
    expect(ret.mutate).toBe(useCreateTodo().mutate)
    expect(ret.data).toBe(returnedValues.data)
  })

  it('reuses the mutation in multiple places with a setup function', async () => {
    const useCreateTodo = defineMutation(() => {
      const todoText = ref('')
      const { data, mutate, ...rest } = useMutation({
        mutation: async () => ({ id: 1, text: todoText.value }),
      })
      return { ...rest, createTodo: mutate, todo: data, todoText }
    })

    let returnedValues!: ReturnType<typeof useCreateTodo>
    mount(
      {
        setup() {
          returnedValues = useCreateTodo()
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

    const { todo, todoText, createTodo } = useCreateTodo()
    expect(todo).toBe(useCreateTodo().todo)
    expect(todo).toBe(returnedValues.todo)
    expect(todoText).toBe(useCreateTodo().todoText)
    expect(todoText).toBe(returnedValues.todoText)
    expect(createTodo).toBe(returnedValues.createTodo)
  })

  it('injects from app not from parent component', () => {
    const useData = defineMutation(() => {
      const value = inject('injected', 'ko')
      expect(value).toBe('ok')
      return { value, ...useMutation({ mutation: async () => 42 }) }
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

  it('still works after one consumer unmounts', async () => {
    const mutation = vi.fn(async (text: string) => ({ id: 1, text }))
    const useCreateTodo = defineMutation({
      key: ['todos', 'create'],
      mutation,
    })

    const pinia = createPinia()

    const Comp1 = defineComponent({
      setup() {
        return { ...useCreateTodo() }
      },
      render: () => null,
    })
    const Comp2 = defineComponent({
      setup() {
        return { ...useCreateTodo() }
      },
      render: () => null,
    })

    const w1 = mount(Comp1, {
      global: { plugins: [pinia, PiniaColada] },
    })
    const w2 = mount(Comp2, {
      global: { plugins: [pinia, PiniaColada] },
    })

    // mutate via component 1
    w1.vm.mutate('hello')
    await flushPromises()
    expect(mutation).toHaveBeenCalledTimes(1)
    expect(w2.vm.data).toEqual({ id: 1, text: 'hello' })

    // unmount component 1
    w1.unmount()

    // component 2 should still be able to mutate
    w2.vm.mutate('world')
    await flushPromises()
    expect(mutation).toHaveBeenCalledTimes(2)
    expect(w2.vm.data).toEqual({ id: 1, text: 'world' })
  })

  describe('scope lifecycle', () => {
    it('pauses computed effects when all consumers unmount', async () => {
      const mutation = vi.fn(async () => 42)
      const useMyMutation = defineMutation(() => {
        const { data, ...rest } = useMutation({ mutation })
        const doubled = computed(() => (data.value ? data.value * 2 : null))
        return { ...rest, data, doubled }
      })

      const pinia = createPinia()
      const wrapper = mount(
        defineComponent({
          setup() {
            return { ...useMyMutation() }
          },
          render: () => null,
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      wrapper.vm.mutate()
      await flushPromises()
      expect(wrapper.vm.doubled).toBe(84)

      wrapper.unmount()

      // after unmount, calling the composable in a new component should resume the scope
      const w2 = mount(
        defineComponent({
          setup() {
            return { ...useMyMutation() }
          },
          render: () => null,
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      // data is preserved from the previous mutation
      expect(w2.vm.doubled).toBe(84)

      w2.vm.mutate()
      await flushPromises()
      expect(w2.vm.doubled).toBe(84)
    })

    it('resumes the scope when a new consumer mounts after all unmounted', async () => {
      const mutation = vi.fn(async () => 42)
      const useMyMutation = defineMutation({
        mutation,
      })

      const pinia = createPinia()
      const Comp = defineComponent({
        setup() {
          return { ...useMyMutation() }
        },
        render: () => null,
      })

      const w1 = mount(Comp, { global: { plugins: [pinia, PiniaColada] } })
      w1.vm.mutate()
      await flushPromises()
      expect(w1.vm.data).toBe(42)

      w1.unmount()

      // mount a new consumer - scope should resume
      const w2 = mount(Comp, { global: { plugins: [pinia, PiniaColada] } })
      // data from previous mutation is still accessible
      expect(w2.vm.data).toBe(42)

      // can still mutate
      mutation.mockResolvedValueOnce(99)
      w2.vm.mutate()
      await flushPromises()
      expect(w2.vm.data).toBe(99)
    })
  })

  describe('gcTime', () => {
    it('keeps the entry in cache while a consumer is mounted', async () => {
      const mutation = vi.fn(async () => 42)
      const useMyMutation = defineMutation({
        key: ['test'],
        mutation,
        gcTime: 1000,
      })

      const pinia = createPinia()
      const wrapper = mount(
        defineComponent({
          setup() {
            return { ...useMyMutation() }
          },
          render: () => null,
        }),
        { global: { plugins: [pinia, PiniaColada] } },
      )

      wrapper.vm.mutate()
      await flushPromises()

      const cache = useMutationCache()
      expect(cache.getEntries({ key: ['test'] })).toHaveLength(1)

      // gcTime passes but component is still mounted → entry stays
      vi.advanceTimersByTime(2000)
      expect(cache.getEntries({ key: ['test'] })).toHaveLength(1)
    })

    it('keeps the entry if a new consumer mounts before gcTime', async () => {
      const mutation = vi.fn(async () => 42)
      const useMyMutation = defineMutation({
        key: ['test'],
        mutation,
        gcTime: 1000,
      })

      const pinia = createPinia()
      const Comp = defineComponent({
        setup() {
          return { ...useMyMutation() }
        },
        render: () => null,
      })

      const w1 = mount(Comp, { global: { plugins: [pinia, PiniaColada] } })

      w1.vm.mutate()
      await flushPromises()

      const cache = useMutationCache()
      expect(cache.getEntries({ key: ['test'] })).toHaveLength(1)

      w1.unmount()
      vi.advanceTimersByTime(500)
      // entry still there
      expect(cache.getEntries({ key: ['test'] })).toHaveLength(1)

      // mount new consumer before gcTime
      const w2 = mount(Comp, { global: { plugins: [pinia, PiniaColada] } })

      // trigger new mutation
      w2.vm.mutate()
      await flushPromises()

      // advance past original gcTime
      vi.advanceTimersByTime(1000)
      // entry should still be there since a consumer is mounted
      expect(cache.getEntries({ key: ['test'] }).length).toBeGreaterThan(0)
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

    it('reuses the mutation', async () => {
      const useCreateTodo = defineMutation({
        mutation: async (text: string) => ({ id: 1, text }),
      })

      app.runWithContext(() => {
        const { mutate } = useCreateTodo()
        expect(mutate).toBe(useCreateTodo().mutate)
      })
    })

    it('reuses the mutation with a setup function', async () => {
      const useCreateTodo = defineMutation(() => {
        const todoText = ref('')
        const { data, mutate, ...rest } = useMutation({
          mutation: async () => ({ id: 1, text: todoText.value }),
        })
        return { ...rest, createTodo: mutate, todo: data, todoText }
      })

      app.runWithContext(() => {
        const { todo, todoText } = useCreateTodo()
        expect(todo).toBe(useCreateTodo().todo)
        expect(todoText).toBe(useCreateTodo().todoText)
      })
    })
  })
})
