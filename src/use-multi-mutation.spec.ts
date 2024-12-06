import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { useMultiMutation } from './use-multi-mutation' // Make sure to import the function correctly

describe('useMultiMutation', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper function to mount the component with useMultiMutation
  function mountMultiMutation<TResult = number, TVars = void>(options: any = {}) {
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useMultiMutation<TResult, TVars>(options),
          }
        },
      }),
      {
        global: {
          plugins: [createPinia()],
        },
      },
    )
    return { wrapper }
  }

  it('invokes the mutation', async () => {
    const mutation = vi.fn(async () => 42)
    const { wrapper } = mountMultiMutation({ mutation })

    wrapper.vm.mutate('item-1', 123)
    await flushPromises()

    expect(wrapper.vm.data('item-1')).toBe(42)
  })

  it('can be awaited with mutateAsync', async () => {
    const mutation = vi.fn(async () => 42)
    const { wrapper } = mountMultiMutation({ mutation })

    const result = wrapper.vm.mutateAsync('item-1', 123)
    await flushPromises()
    await expect(result).resolves.toBe(42)
  })

  it('handles mutation errors', async () => {
    const mutation = vi.fn(async () => {
      throw new Error('mutation failed')
    })
    const { wrapper } = mountMultiMutation({ mutation })

    wrapper.vm.mutate('item-1', 123)
    await flushPromises()
    expect(wrapper.vm.error('item-1')).toEqual(new Error('mutation failed'))
  })

  it('can reset the state', async () => {
    const mutation = vi.fn(async () => 42)
    const { wrapper } = mountMultiMutation({ mutation })

    wrapper.vm.mutate('item-1', 123)
    await flushPromises()
    expect(wrapper.vm.data('item-1')).toBe(42)

    wrapper.vm.reset()
    expect(wrapper.vm.data('item-1')).toBeUndefined()
    expect(wrapper.vm.error('item-1')).toBeNull()
  })

  it('resets a single invocation key', async () => {
    const mutation = vi.fn(async () => 42)
    const { wrapper } = mountMultiMutation({ mutation })

    wrapper.vm.mutate('item-1', 123)
    await flushPromises()
    expect(wrapper.vm.data('item-1')).toBe(42)

    wrapper.vm.reset('item-1')
    expect(wrapper.vm.data('item-1')).toBeUndefined()
    expect(wrapper.vm.error('item-1')).toBeNull()
  })

  it('removes a single invocation entry using forget', async () => {
    const mutation = vi.fn(async () => 42)
    const { wrapper } = mountMultiMutation({ mutation })

    wrapper.vm.mutate('item-1', 123)
    await flushPromises()
    expect(wrapper.vm.data('item-1')).toBe(42)

    wrapper.vm.forget('item-1')
    expect(wrapper.vm.data('item-1')).toBeUndefined()
  })

  it('handles multiple invocations with different keys', async () => {
    const mutation = vi.fn(async (id: number) => id)
    const { wrapper } = mountMultiMutation({ mutation })

    wrapper.vm.mutate('item-1', 123)
    wrapper.vm.mutate('item-2', 456)
    await flushPromises()

    expect(wrapper.vm.data('item-1')).toBe(123)
    expect(wrapper.vm.data('item-2')).toBe(456)
  })

  it('correctly tracks loading states for multiple invocations', async () => {
    const mutation = vi.fn(async (id: number) => id)
    const { wrapper } = mountMultiMutation({ mutation })

    wrapper.vm.mutate('item-1', 42)
    expect(wrapper.vm.isLoading('item-1')).toBe(true)

    await flushPromises()
    expect(wrapper.vm.isLoading('item-1')).toBe(false)
  })
})
