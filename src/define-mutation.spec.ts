import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { App } from 'vue'
import { createApp, defineComponent, effectScope, inject, provide, ref } from 'vue'
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
