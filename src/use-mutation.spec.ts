import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import type { GlobalMountOptions } from 'node_modules/@vue/test-utils/dist/types'
import { delay, runTimers } from '../test/utils'
import type { UseMutationOptions } from './use-mutation'
import { useMutation } from './use-mutation'
import { QueryPlugin } from './query-plugin'

describe('useMutation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountSimple<TResult = number, TParams extends any[] = []>(
    options: Partial<UseMutationOptions<TResult, TParams>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const mutation = options.mutation
      ? vi.fn(options.mutation)
      : vi.fn(async () => {
        await delay(0)
        return 42
      })
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useMutation<TResult, TParams>({
              ...options,
              // @ts-expect-error: generic unmatched but types work
              mutation,
            }),
          }
        },
      }),
      {
        global: {
          plugins: [createPinia(), QueryPlugin],
          ...mountOptions,
        },
      },
    )
    return Object.assign([wrapper, mutation] as const, { wrapper, mutation })
  }
  it('invokes the mutation', async () => {
    const { wrapper } = mountSimple()

    wrapper.vm.mutate()
    await runTimers()

    expect(wrapper.vm.data).toBe(42)
  })

  it('invokes the `onMutate` hook', async () => {
    const onMutate = vi.fn(() => 0)
    const { wrapper } = mountSimple({
      mutation: async (arg1: number, arg2: number) => {
        await delay(0)
        return arg1 + arg2
      },
      onMutate,
    })
    expect(onMutate).not.toHaveBeenCalled()
    wrapper.vm.mutate(24, 42)
    expect(onMutate).toHaveBeenCalledWith(24, 42)
  })

  it('invokes the `onError` hook', async () => {
    const onError = vi.fn(() => 0)
    const { wrapper } = mountSimple({
      mutation: async (arg1: number, arg2: number) => {
        await delay(0)
        throw new Error(String(arg1 + arg2))
      },
      onError,
    })

    expect(wrapper.vm.mutate(24, 42)).rejects.toThrow()
    expect(onError).not.toHaveBeenCalled()
    await runTimers()
    expect(onError).toHaveBeenCalledWith(24, 42)
  })

  it('invokes the `onSuccess` hook', async () => {
    let foo
    const { wrapper } = mountSimple({
      onSuccess(val) {
        foo = val
      },
    })

    wrapper.vm.mutate()
    expect(foo).toBeUndefined()
    await runTimers()
    expect(foo).toBe(42)
  })

  describe('invokes the `onSettled` hook', () => {
    it('on success', async () => {
      let foo
      const { wrapper } = mountSimple({
        onSettled() {
          foo = 24
        },
      })

      wrapper.vm.mutate()
      expect(foo).toBeUndefined()
      await runTimers()
      expect(foo).toBe(24)
    })

    it('on error', async () => {
      let foo
      const { wrapper } = mountSimple({
        mutation: async () => {
          await delay(0)
          throw new Error('foobar')
        },
        onSettled() {
          foo = 24
        },
      })

      expect(wrapper.vm.mutate()).rejects.toThrow()
      expect(foo).toBeUndefined()
      await runTimers()
      expect(foo).toBe(24)
    })
  })
})
