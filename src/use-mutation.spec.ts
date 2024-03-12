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
    let foo
    const { wrapper } = mountSimple({
      mutation: async (arg: number) => {
        await delay(0)
        return arg + 42
      },
      onMutate: arg => foo = arg,
    })

    expect(foo).toBeUndefined()
    wrapper.vm.mutate(24)
    expect(foo).toBe(24)
  })

  it('invokes the `onError` hook', async () => {
    let foo
    const { wrapper } = mountSimple({
      mutation: async () => {
        await delay(0)
        throw new Error('bar')
      },
      onError(err) {
        foo = err.message
      },
    })

    expect(wrapper.vm.mutate()).rejects.toThrow()
    expect(foo).toBeUndefined()
    await runTimers()
    expect(foo).toBe('bar')
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
          throw new Error('bar')
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
