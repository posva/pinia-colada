import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery } from './use-query'
import { QueryPlugin } from './query-plugin'
import { MutationPlugin } from './mutation-plugin'
import { useMutation } from './use-mutation'

describe('MutationPlugin', () => {
  const MyComponent = defineComponent({
    template: '<div></div>',
    setup() {
      return {
        ...useQuery({
          query: async () => 42,
          key: ['key'],
        }),
        ...useMutation({
            mutation: async (arg: number) => arg,
            keys: [['key']],
        }),
      }
    },
  })

  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  it('calls the hooks on success', async () => {
    const onMutate = vi.fn()
    const onSuccess = vi.fn()
    const onSettled = vi.fn()
    const onError = vi.fn()
    const wrapper = mount(MyComponent, {
      global: {
        plugins: [
          createPinia(),
          [QueryPlugin],
          [MutationPlugin, { onMutate, onSuccess, onSettled, onError }],
        ],
      },
    })

    await flushPromises()

    wrapper.vm.mutate(1)

    await flushPromises()

    expect(onMutate).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith({
      data: 1,
      vars: 1,
    })
    expect(onSettled).toHaveBeenCalledWith({
      data: 1,
      error: undefined,
      vars: 1,
    })
  })

  it('calls the hooks on error', async () => {
    const onSuccess = vi.fn()
    const onSettled = vi.fn()
    const onError = vi.fn()
    const wrapper = mount(
        defineComponent({
          template: '<div></div>',
          setup() {
            return {
              ...useQuery({
                query: async () => 42,
                key: ['key'],
              }),
              ...useMutation({
                mutation: async () => {
                  throw new Error(':(')
                },
                keys: [['key']],
              }),
            }
          },
        }),
        {
          global: {
            plugins: [
              createPinia(),
              [QueryPlugin],
              [MutationPlugin, { onSuccess, onSettled, onError }],
            ],
          },
        },
    )

    await flushPromises()

    wrapper.vm.mutate()

    await flushPromises()

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)

    expect(onError).toHaveBeenCalledWith({
      error: new Error(':('),
      vars: undefined,
    })
    expect(onSettled).toHaveBeenCalledWith({
      data: undefined,
      error: new Error(':('),
      vars: undefined,
    })
  })
})
