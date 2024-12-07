import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { delay } from '../test/utils'
import { useMultiMutation } from './use-multi-mutation'
import type { UseMutationOptions } from './use-mutation'

describe('useMultiMutation', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountMultiMutation<TResult = number, TParams = void>(
    options: Partial<UseMutationOptions<TResult, TParams>> = {},
  ) {
    const mutation = options.mutation
      ? vi.fn(options.mutation)
      : vi.fn(async () => 42)
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useMultiMutation<TResult, TParams>({
              ...options,
              // @ts-expect-error: generic unmatched but types work
              mutation,
            }),
          }
        },
      }),
      {
        global: { plugins: [createPinia()] },
      },
    )
    return Object.assign([wrapper, mutation] as const, { wrapper, mutation })
  }

  it('invokes mutation for a specific key', async () => {
    const { wrapper, mutation } = mountMultiMutation()

    wrapper.vm.mutate('key1', { param: 1 })
    await flushPromises()

    expect(mutation).toHaveBeenCalledWith('key1', { param: 1 })
  })

  it('retrieves data for a key', async () => {
    const { wrapper } = mountMultiMutation()
    wrapper.vm.mutate('key1')
    await flushPromises()

    expect(wrapper.vm.data('key1')).toBe(42)
  })
  /*
    it('handles loading state per key', async () => {
      const { wrapper } = mountMultiMutation({
        mutation: async () => delay(100),
      })

      wrapper.vm.mutate('key1')
      expect(wrapper.vm.isLoading('key1')).toBe(true)

      vi.advanceTimersByTime(100)
      await flushPromises()

      expect(wrapper.vm.isLoading('key1')).toBe(false)
    })

    it('handles errors per key', async () => {
      const { wrapper } = mountMultiMutation({
        mutation: async () => {
          throw new Error('Error for key1')
        },
      })

      await expect(wrapper.vm.mutate('key1')).rejects.toThrow('Error for key1')
      expect(wrapper.vm.error('key1')).toEqual(new Error('Error for key1'))
    })

    it('resets all keys', async () => {
      const { wrapper } = mountMultiMutation()

      wrapper.vm.mutate('key1')
      wrapper.vm.mutate('key2')
      await flushPromises()

      wrapper.vm.reset()
      expect(wrapper.vm.data('key1')).toBeUndefined()
      expect(wrapper.vm.data('key2')).toBeUndefined()
      expect(wrapper.vm.isLoading('key1')).toBe(false)
      expect(wrapper.vm.error('key1')).toBeNull()
    })

    it('forgets a specific key', async () => {
      const { wrapper } = mountMultiMutation()

      wrapper.vm.mutate('key1')
      await flushPromises()

      wrapper.vm.forget('key1')
      expect(wrapper.vm.data('key1')).toBeUndefined()
      expect(wrapper.vm.error('key1')).toBeNull()
    })

    it('invokes onSuccess per key', async () => {
      const onSuccess = vi.fn()
      const { wrapper } = mountMultiMutation({ onSuccess })

      wrapper.vm.mutate('key1')
      await flushPromises()

      expect(onSuccess).toHaveBeenCalledWith(42, undefined, { key: 'key1' })
    })

    it('invokes onError per key', async () => {
      const onError = vi.fn()
      const { wrapper } = mountMultiMutation({
        mutation: async () => {
          throw new Error('key1 error')
        },
        onError,
      })

      await expect(wrapper.vm.mutate('key1')).rejects.toThrow('key1 error')
      expect(onError).toHaveBeenCalledWith(
        new Error('key1 error'),
        undefined,
        { key: 'key1' },
      )
    })

    it('invokes onSettled per key', async () => {
      const onSettled = vi.fn()
      const { wrapper } = mountMultiMutation({ onSettled })

      wrapper.vm.mutate('key1')
      await flushPromises()

      expect(onSettled).toHaveBeenCalledWith(
        42,
        null,
        undefined,
        { key: 'key1' },
      )
    })

    it('handles concurrent mutations for the same key', async () => {
      const { wrapper } = mountMultiMutation()

      const promise1 = wrapper.vm.mutate('key1')
      const promise2 = wrapper.vm.mutate('key1')

      await promise1
      await promise2

      expect(wrapper.vm.data('key1')).toBe(42)
    })

    it('ensures different keys do not interfere', async () => {
      const { wrapper } = mountMultiMutation()

      wrapper.vm.mutate('key1')
      wrapper.vm.mutate('key2')
      await flushPromises()

      expect(wrapper.vm.data('key1')).toBe(42)
      expect(wrapper.vm.data('key2')).toBe(42)
    })

    it('prevents crashes when onSuccess or onError throw errors', async () => {
      const { wrapper } = mountMultiMutation({
        onSuccess: () => {
          throw new Error('onSuccess failure')
        },
      })

      wrapper.vm.mutate('key1')
      await flushPromises()

      expect(wrapper.vm.data('key1')).toBeUndefined()
      expect(wrapper.vm.error('key1')).toEqual(new Error('onSuccess failure'))
    }) */
})
