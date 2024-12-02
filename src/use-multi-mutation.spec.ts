import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { useMultiMutation } from './use-multi-mutation'
import { PiniaColada } from './pinia-colada'

describe('useMultiMutation', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountMulti<TResult = number, TParams = void>(options = {}) {
    const mutation = vi.fn(async (params: TParams) => {
      return { result: params }
    })

    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useMultiMutation<TResult, TParams>({
              ...options,
              mutation,
            }),
          }
        },
      }),
      {
        global: {
          plugins: [createPinia(), PiniaColada],
        },
      },
    )

    return Object.assign([wrapper, mutation] as const, { wrapper, mutation })
  }

  it('invokes the mutation for multiple keys', async () => {
    const { wrapper } = mountMulti()

    wrapper.vm.mutate('key1', { a: 1 })
    wrapper.vm.mutate('key2', { b: 2 })
    await flushPromises()

    expect(wrapper.vm.data.get('key1')).toEqual({ result: { a: 1 } })
    expect(wrapper.vm.data.get('key2')).toEqual({ result: { b: 2 } })
  })

  it('mutateAsync resolves independently for multiple keys', async () => {
    const { wrapper } = mountMulti()

    const result1 = wrapper.vm.mutateAsync('key1', { a: 1 })
    const result2 = wrapper.vm.mutateAsync('key2', { b: 2 })

    await flushPromises()
    await expect(result1).resolves.toEqual({ result: { a: 1 } })
    await expect(result2).resolves.toEqual({ result: { b: 2 } })
  })

  it('invokes the "onMutate" hook for each key', async () => {
    const onMutate = vi.fn()
    const { wrapper } = mountMulti({ onMutate })

    wrapper.vm.mutate('key1', { a: 1 })
    expect(onMutate).toHaveBeenCalledWith(
      { a: 1 },
      expect.objectContaining({
        key: 'key1',
      }),
    )
  })

  it('handles errors independently for each key', async () => {
    const { wrapper, mutation } = mountMulti()
    mutation.mockRejectedValueOnce(new Error('Key1 Failed'))
    wrapper.vm.mutate('key1', { a: 1 })
    wrapper.vm.mutate('key2', { b: 2 })

    await flushPromises()
    expect(wrapper.vm.error.get('key1')).toEqual(new Error('Key1 Failed'))
    expect(wrapper.vm.data.get('key2')).toEqual({ result: { b: 2 } })
  })

  it('resets data independently for each key', async () => {
    const { wrapper } = mountMulti()

    wrapper.vm.mutate('key1', { a: 1 })
    wrapper.vm.mutate('key2', { b: 2 })
    await flushPromises()

    expect(wrapper.vm.data.get('key1')).toEqual({ result: { a: 1 } })
    wrapper.vm.reset('key1')
    expect(wrapper.vm.data.get('key1')).toBeUndefined()
    expect(wrapper.vm.data.get('key2')).toEqual({ result: { b: 2 } })
  })
})
