import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import type { GlobalMountOptions } from '../test/utils'
import { delay } from '../test/utils'
import type { UseMutationOptions } from './use-mutation'
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

  function mountMultiMutation<TResult = number, TParams = void>(
    options: Partial<UseMutationOptions<TResult, TParams>> = {},
    mountOptions?: GlobalMountOptions,
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
              // @ts-expect-error: generic unmatched but types work
              mutation,
              ...options,
            }),
          }
        },
      }),
      {
        global: {
          plugins: [createPinia(), PiniaColada],
          ...mountOptions,
        },
      },
    )
    return Object.assign([wrapper, mutation] as const, { wrapper, mutation })
  }

  describe('Basic behaviour', () => {
    it('invokes mutation multiple times for different keys', async () => {
      const { wrapper } = mountMultiMutation()

      wrapper.vm.mutate('key1', { foo: 'bar1' })
      wrapper.vm.mutate('key2', { foo: 'bar2' })
      await flushPromises()

      expect(wrapper.vm.data('key1')).toBe(42)
      expect(wrapper.vm.data('key2')).toBe(42)
    })

    it('invokes the "onError" hook if no variables are given', async () => {
      const onError = vi.fn()
      const { wrapper } = mountMultiMutation({
        onError,
      })

      wrapper.vm.mutate('key-1')
      await flushPromises()
      expect(onError).toHaveBeenCalledWith(
        new Error('Mutation variables are required for multi-mutation.'),
        undefined,
        expect.objectContaining({}),
      )
    })

    it('handles loading state per key', async () => {
      const { wrapper } = mountMultiMutation({
        mutation: async () => delay(0),
      })

      expect(wrapper.vm.isLoading('key1')).toBe(false)
      wrapper.vm.mutate('key1', { foo: 'bar' })
      expect(wrapper.vm.isLoading('key1')).toBe(true)

      await vi.advanceTimersByTimeAsync(0)

      expect(wrapper.vm.isLoading('key1')).toBe(false)
    })

    it('maintains errors history per key', async () => {
      const { wrapper } = mountMultiMutation({
        mutation: async () => {
          throw new Error('Error for key1')
        },
      })
      wrapper.vm.mutate('key1', { foo: 'bar' })
      await flushPromises()

      expect(wrapper.vm.error('key1')).toEqual(new Error('Error for key1'))
    })

    it('resets all keys', async () => {
      const { wrapper } = mountMultiMutation()

      wrapper.vm.mutate('key1', { foo: 'bar' })
      wrapper.vm.mutate('key2', { baz: 'qux' })
      await flushPromises()

      wrapper.vm.reset()
      expect(wrapper.vm.data('key1')).toBeUndefined()
      expect(wrapper.vm.data('key2')).toBeUndefined()
    })

    it('removes a specific key', async () => {
      const { wrapper } = mountMultiMutation()

      wrapper.vm.mutate('key1', { foo: 'bar' })
      await flushPromises()

      wrapper.vm.remove('key1')
      expect(wrapper.vm.data('key1')).toBeUndefined()
      expect(wrapper.vm.error('key1')).toBeUndefined()
      expect(wrapper.vm.isLoading('key1')).toBe(false)
    })
  })

  describe('Options hooks', () => {
    it('invokes onSuccess hook', async () => {
      const onSuccess = vi.fn()
      const { wrapper } = mountMultiMutation({ onSuccess })

      wrapper.vm.mutate('key1', { foo: 'bar' })
      await flushPromises()

      expect(onSuccess).toHaveBeenCalledWith(42, { foo: 'bar' }, expect.objectContaining({}))
    })

    it('invokes the "onError" hook if mutation throws', async () => {
      const onError = vi.fn()
      const { wrapper } = mountMultiMutation({
        mutation: async (n: number) => {
          throw new Error(String(n))
        },
        onError,
      })

      expect(onError).not.toHaveBeenCalled()
      wrapper.vm.mutate('key-1', 24)
      await flushPromises()
      expect(onError).toHaveBeenCalledWith(
        new Error('24'),
        24,
        expect.objectContaining({}),
      )
    })

    it('invokes onSettled hook', async () => {
      const onSettled = vi.fn()
      const { wrapper } = mountMultiMutation({ onSettled })

      wrapper.vm.mutate('key1', { foo: 'bar' })
      await flushPromises()

      expect(onSettled).toHaveBeenCalledWith(
        42,
        undefined,
        { foo: 'bar' },
        expect.objectContaining({}),
      )
    })
  })

  /* it('handles concurrent mutations for the same key', async () => {
    const { wrapper } = mountMultiMutation()

    const promise1 = wrapper.vm.mutate('key1', { foo: 'bar1' })
    const promise2 = wrapper.vm.mutate('key1', { foo: 'bar2' })

    await promise1
    await promise2

    expect(wrapper.vm.data('key1')).toBe(42)
  }) */
})
