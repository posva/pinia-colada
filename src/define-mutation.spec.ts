import type { App } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, effectScope, nextTick, ref } from 'vue'
import { mockWarn } from '../test/mock-warn'
import { type GlobalMountOptions, isSpy } from '../test/utils'
import { defineMutation } from './define-mutation'
import { useMutationCache } from './mutation-store'
import { PiniaColada } from './pinia-colada'
import { useMutation, type UseMutationOptions } from './use-mutation'

describe('defineMutation', () => {
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

  it('reuses the mutation in multiple places with a setup function', async () => {
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

    it('reuses the mutation', async () => {
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

    it('reuses the mutation with a setup function', async () => {
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

  describe('cache', () => {
    describe('with component', () => {
      function mountSimple<TResult = string>(
        options: Partial<UseMutationOptions<TResult>> = {},
        mountOptions?: GlobalMountOptions,
      ) {
        const mutationFunction = options.mutation
          ? isSpy(options.mutation)
            ? options.mutation
            : vi.fn(options.mutation)
          : vi.fn(async () => 'new-todo')
        const useCreateTodo = defineMutation(() => {
          const mutation = useMutation({
            key: ['create-todos'],
            ...options,
            // @ts-expect-error: generic unmatched but types work
            mutation: mutationFunction,
          })
          return { ...mutation }
        })
        let returnedValues: ReturnType<typeof useCreateTodo>

        const wrapper = mount(
          defineComponent({
            render: () => null,
            setup() {
              returnedValues = useCreateTodo()
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

      it('deletes the cache once the component is unmounted', async () => {
        const wrapper = mountSimple()
        const cache = useMutationCache()
        wrapper.vm.mutate()
        await flushPromises()

        expect(cache.caches.get(['create-todos'])?.data.value).toBe('new-todo')

        wrapper.unmount()
        await nextTick()
        expect(cache.caches.get(['create-todos'])?.data.value).toBeUndefined()
      })

      it('keeps the cache if the mutation is reused by a new component before unmount', async () => {
        const pinia = createPinia()

        const useCreateTodo = defineMutation(() => {
          const mutation = useMutation({
            key: ['create-todos'],
            mutation: vi.fn(async () => 'new-todo'),
          })
          return { ...mutation }
        })

        let returnedValues: ReturnType<typeof useCreateTodo>
        const w1 = mount(
          defineComponent({
            render: () => null,
            setup() {
              returnedValues = useCreateTodo()
              return { ...returnedValues }
            },
          }),
          {
            global: {
              plugins: [
                pinia,
                PiniaColada,
              ],
            },
          },
        )
        const cache = useMutationCache()
        w1.vm.mutate()
        await flushPromises()

        expect(cache.getMutationData(['create-todos'])).toBe('new-todo')
        const w2 = mount(
          defineComponent({
            render: () => null,
            setup() {
              returnedValues = useCreateTodo()
              return { ...returnedValues }
            },
          }),
          {
            global: {
              plugins: [
                pinia,
                PiniaColada,
              ],
            },
          },
        )
        w1.unmount()
        // still there
        expect(cache.getMutationData(['create-todos'])).toBe('new-todo')
        w2.unmount()
        // removed
        expect(cache.getMutationData(['create-todos'])).toBeUndefined()
      })
    })

    describe('with effect scope', () => {
      let app: App
      function createTodoDefineMutation() {
        return defineMutation(() => {
          const mutation = useMutation({
            key: ['create-todos'],
            mutation: vi.fn(async () => 'new-todo'),
          })
          return { ...mutation }
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

      it('deletes the cache once the scope is stoped', async () => {
        await app.runWithContext(async () => {
          const useCreateTodo = createTodoDefineMutation()
          const scope = effectScope()
          const mutation = scope.run(useCreateTodo)
          mutation?.mutate()
          await flushPromises()
          const cache = useMutationCache()

          expect(cache.getMutationData(['create-todos'])).toBe('new-todo')
          scope.stop()
          expect(cache.getMutationData(['create-todos'])).toBeUndefined()
        })
      })

      it('keeps the cache if the mutation is reused by a new component before unmount', async () => {
        await app.runWithContext(async () => {
          const useCreateTodo = createTodoDefineMutation()
          const s1 = effectScope()
          const mutation = s1.run(useCreateTodo)
          mutation?.mutate()
          await flushPromises()
          const cache = useMutationCache()

          expect(cache.getMutationData(['create-todos'])).toBe('new-todo')
          const s2 = effectScope()
          s2.run(useCreateTodo)
          s1.stop()
          // still there
          expect(cache.getMutationData(['create-todos'])).toBe('new-todo')
          s2.stop()
          // removed
          expect(cache.getMutationData(['create-todos'])).toBeUndefined()
        })
      })
    })
  })
})
