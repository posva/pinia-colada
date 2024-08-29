import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import type { App } from 'vue'
import { createApp, ref } from 'vue'
import { PiniaColada } from './pinia-colada'
import { mockWarn } from '../test/mock-warn'
import { defineMutation } from './define-mutation'
import { useMutation } from './use-mutation'

describe('defineQuery', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)
  mockWarn()

  it('reuses the mutation in multiple places', async () => {
    const useUpdateTodo = defineMutation({
      key: ['create-todo'],
      mutation: async () => [{ id: 1, description: 'A new todo...' }],
    })

    let returnedValues!: ReturnType<typeof useUpdateTodo>
    mount(
      {
        setup() {
          returnedValues = useUpdateTodo()
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

    const { data } = useUpdateTodo()
    expect(data).toBe(useUpdateTodo().data)
    expect(data).toBe(returnedValues.data)
  })

  it('reuses the query in multiple places with a setup function', async () => {
    const useUpdateTodo = defineMutation(() => {
      const newTodo = ref({
        description: 'A new todo...',
      })
      const { ...rest } = useMutation({
        key: ['create-todo'],
        mutation: async () => [{ id: 1, ...newTodo.value }],
      })
      return { ...rest, newTodo }
    })

    let returnedValues!: ReturnType<typeof useUpdateTodo>
    mount(
      {
        setup() {
          returnedValues = useUpdateTodo()
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

    const { data, newTodo } = useUpdateTodo()
    expect(data).toBe(useUpdateTodo().data)
    expect(data).toBe(returnedValues.data)
    expect(newTodo).toBe(useUpdateTodo().newTodo)
    expect(newTodo).toBe(returnedValues.newTodo)
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
      const useUpdateTodo = defineMutation({
        key: ['create-todo'],
        mutation: async () => [{ id: 1, description: 'A new todo...' }],
      })

      // to have access to inject
      app.runWithContext(() => {
        const { data } = useUpdateTodo()
        expect(data).toBe(useUpdateTodo().data)
      })
    })

    it('reuses the query with a setup function', async () => {
      const useUpdateTodo = defineMutation(() => {
        const newTodo = ref({
          description: 'A new todo...',
        })
        const { ...rest } = useMutation({
          key: ['create-todo'],
          mutation: async () => [{ id: 1, ...newTodo.value }],
        })
        return { ...rest, newTodo }
      })

      app.runWithContext(() => {
        const { data, newTodo } = useUpdateTodo()
        expect(data).toBe(useUpdateTodo().data)
        expect(newTodo).toBe(useUpdateTodo().newTodo)
      })
    })
  })
})
