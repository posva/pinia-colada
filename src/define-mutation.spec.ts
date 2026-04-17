import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { App } from 'vue'
import { createApp, defineComponent, inject, nextTick, provide, ref, watch } from 'vue'
import { defineMutation } from './define-mutation'
import { useMutation } from './use-mutation'
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

    // calling outside a component/scope still works but warns
    const ret = useCreateTodo()
    expect(ret.mutate).toBe(useCreateTodo().mutate)
    expect(ret.data).toBe(returnedValues.data)
    expect('outside of a component or effect scope').toHaveBeenWarned()
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

    // calling outside a component/scope still works but warns
    const { todo, todoText, createTodo } = useCreateTodo()
    expect(todo).toBe(useCreateTodo().todo)
    expect(todo).toBe(returnedValues.todo)
    expect(todoText).toBe(useCreateTodo().todoText)
    expect(todoText).toBe(returnedValues.todoText)
    expect(createTodo).toBe(returnedValues.createTodo)
    expect('outside of a component or effect scope').toHaveBeenWarned()
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

    // calling outside a component/scope still works but warns
    expect(useData().value).toBe('ok')
    expect('outside of a component or effect scope').toHaveBeenWarned()
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

  it('warns when called outside of a component or effect scope', () => {
    const useMyMutation = defineMutation({
      mutation: async () => 42,
    })

    const pinia = createPinia()
    mount(
      defineComponent({
        setup() {
          return { ...useMyMutation() }
        },
        render: () => null,
      }),
      { global: { plugins: [pinia, PiniaColada] } },
    )

    // calling outside any scope warns about potential leak
    useMyMutation()
    expect('outside of a component or effect scope').toHaveBeenWarned()
  })

  describe('scope lifecycle', () => {
    it('pauses effects when all consumers unmount and resumes on remount', async () => {
      const watchSpy = vi.fn()
      const useMyMutation = defineMutation(() => {
        const counter = ref(0)
        watch(counter, watchSpy)
        return { counter, ...useMutation({ mutation: async () => 42 }) }
      })

      const pinia = createPinia()
      const Comp = defineComponent({
        setup() {
          return { ...useMyMutation() }
        },
        render: () => null,
      })

      // mount → watch should be active
      const w1 = mount(Comp, { global: { plugins: [pinia, PiniaColada] } })
      const { counter } = useMyMutation()
      counter.value++
      await nextTick()
      expect(watchSpy).toHaveBeenCalledTimes(1)

      // unmount all → scope paused → watch should stop
      w1.unmount()
      watchSpy.mockClear()
      counter.value++
      await nextTick()
      expect(watchSpy).toHaveBeenCalledTimes(0)

      // remount → scope resumed → watch should fire again
      mount(Comp, { global: { plugins: [pinia, PiniaColada] } })
      watchSpy.mockClear()
      counter.value++
      await nextTick()
      expect(watchSpy).toHaveBeenCalledTimes(1)

      // the call to useMyMutation() outside a component warns
      expect('outside of a component or effect scope').toHaveBeenWarned()
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
      expect('outside of a component or effect scope').toHaveBeenWarned()
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
      expect('outside of a component or effect scope').toHaveBeenWarned()
    })
  })
})
