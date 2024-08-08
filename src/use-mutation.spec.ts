import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import type { GlobalMountOptions } from '../test/utils'
import { delay } from '../test/utils'
import type { UseMutationOptions } from './use-mutation'
import { useMutation } from './use-mutation'
import { PiniaColada } from './pinia-colada'
import { useQuery } from './use-query'

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountSimple<TResult = number, TParams = void>(
    options: Partial<UseMutationOptions<TResult, TParams>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const mutation = options.mutation
      ? vi.fn(options.mutation)
      : vi.fn(async () => {
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
          plugins: [createPinia(), PiniaColada],
          ...mountOptions,
        },
      },
    )
    return Object.assign([wrapper, mutation] as const, { wrapper, mutation })
  }

  it('invokes the mutation', async () => {
    const { wrapper } = mountSimple()

    wrapper.vm.mutate()
    await flushPromises()

    expect(wrapper.vm.data).toBe(42)
  })

  it('can be awaited with mutateAsync', async () => {
    const { wrapper } = mountSimple()

    const p = wrapper.vm.mutateAsync()
    await flushPromises()
    await expect(p).resolves.toBe(42)
  })

  it('mutateAsync throws', async () => {
    const { wrapper } = mountSimple({
      mutation: async () => {
        throw new Error('foobar')
      },
    })

    await expect(wrapper.vm.mutateAsync()).rejects.toThrow('foobar')
  })

  it('mutate catches if mutation throws', async () => {
    const { wrapper } = mountSimple({
      mutation: async () => {
        throw new Error('foobar')
      },
    })

    expect((async () => wrapper.vm.mutate())()).resolves.toBeUndefined()
    await flushPromises()
    expect(wrapper.vm.error).toEqual(new Error('foobar'))
  })

  it('invokes the "onMutate" hook before mutating', async () => {
    const onMutate = vi.fn()
    const { wrapper } = mountSimple({
      mutation: async ({ a, b }: { a: number, b: number }) => {
        return a + b
      },
      onMutate,
    })
    expect(onMutate).not.toHaveBeenCalled()
    wrapper.vm.mutate({ a: 24, b: 42 })
    expect(onMutate).toHaveBeenCalledTimes(1)
    expect(onMutate).toHaveBeenLastCalledWith({ a: 24, b: 42 })
    wrapper.vm.mutateAsync({ a: 0, b: 1 })
    expect(onMutate).toHaveBeenCalledTimes(2)
    expect(onMutate).toHaveBeenLastCalledWith({ a: 0, b: 1 })
  })

  it('invokes the "onError" hook if mutation throws', async () => {
    const onError = vi.fn()
    const { wrapper } = mountSimple({
      mutation: async (n: number) => {
        throw new Error(String(n))
      },
      onError,
    })

    expect(onError).not.toHaveBeenCalled()
    wrapper.vm.mutate(24)
    await flushPromises()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: new Error('24'),
        vars: 24,
      }),
    )
  })

  it('invokes the "onError" hook if onMutate throws', async () => {
    const onError = vi.fn()
    const { wrapper } = mountSimple({
      onMutate() {
        throw new Error('onMutate')
      },
      onError,
    })

    wrapper.vm.mutate()
    await flushPromises()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: new Error('onMutate'),
        vars: undefined,
      }),
    )
  })

  it('skips setting the error if "onError" throws', async () => {
    const onError = vi.fn().mockRejectedValueOnce(new Error('onError'))
    const { wrapper } = mountSimple({
      mutation: async () => {
        throw new Error('mutation')
      },
      onError,
    })

    wrapper.vm.mutate()
    await flushPromises()
    expect(onError).toHaveBeenCalled()
    // couldn't be set
    expect(wrapper.vm.error).toEqual(null)
  })

  it('awaits the "onMutate" hook before mutation', async () => {
    const onMutate = vi.fn(async () => delay(10))
    const { wrapper, mutation } = mountSimple({ onMutate })

    wrapper.vm.mutate()
    expect(onMutate).toHaveBeenCalled()
    expect(mutation).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10)
    expect(mutation).not.toHaveBeenCalled()
    await flushPromises()
    expect(mutation).toHaveBeenCalled()
  })

  it('invokes the "onSuccess" hook', async () => {
    const onSuccess = vi.fn()
    const { wrapper } = mountSimple({ onSuccess })

    wrapper.vm.mutate()
    await flushPromises()
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        data: 42,
        vars: undefined,
      }),
    )
  })

  it('skips setting the data if "onSuccess" throws', async () => {
    const onSuccess = vi.fn().mockRejectedValueOnce(new Error('onSuccess'))
    const { wrapper, mutation } = mountSimple({ onSuccess })

    wrapper.vm.mutate()
    await flushPromises()
    expect(onSuccess).toHaveBeenCalled()
    expect(mutation).toHaveBeenCalled()
    // since it threw
    expect(wrapper.vm.data).toBeUndefined()
  })

  it('sets the error if "onSuccess" throws', async () => {
    const onSuccess = vi.fn().mockRejectedValueOnce(new Error('onSuccess'))
    const { wrapper } = mountSimple({ onSuccess })

    wrapper.vm.mutate()
    await flushPromises()
    expect(onSuccess).toHaveBeenCalled()
    expect(wrapper.vm.error).toEqual(new Error('onSuccess'))
  })

  it('sets the error if "onMutate" throws', async () => {
    const onMutate = vi.fn().mockRejectedValueOnce(new Error('onMutate'))
    const { wrapper } = mountSimple({ onMutate })

    wrapper.vm.mutate()
    await flushPromises()
    expect(onMutate).toHaveBeenCalled()
    expect(wrapper.vm.error).toEqual(new Error('onMutate'))
  })

  describe('invokes the "onSettled" hook', () => {
    it('on success', async () => {
      const onSettled = vi.fn()
      const { wrapper } = mountSimple({
        onSettled,
      })

      wrapper.vm.mutate()
      await flushPromises()
      expect(onSettled).toHaveBeenCalledWith(
        expect.objectContaining({
          error: undefined,
          data: 42,
          vars: undefined,
        }),
      )
    })

    it('on error', async () => {
      const onSettled = vi.fn()
      const { wrapper } = mountSimple({
        mutation: async () => {
          throw new Error('foobar')
        },
        onSettled,
      })

      expect(wrapper.vm.mutateAsync()).rejects.toThrow()
      await flushPromises()
      expect(onSettled).toHaveBeenCalledWith(
        expect.objectContaining({
          error: new Error('foobar'),
          data: undefined,
          vars: undefined,
        }),
      )
    })
  })

  it('can reset the mutation', async () => {
    const { wrapper } = mountSimple()

    wrapper.vm.mutate()
    await flushPromises()
    expect(wrapper.vm.data).toBe(42)
    wrapper.vm.reset()
    expect(wrapper.vm.data).toBeUndefined()
    expect(wrapper.vm.error).toBeNull()
    expect(wrapper.vm.status).toBe('pending')
  })

  it('handles the "keys queries" : refetch them if they are active, marked them as stale otherwise', async () => {
    const query = vi.fn(async () => 42)
    const plugins = [createPinia(), PiniaColada]
    const mountQueryWrapper = () => {
      return mount(
        defineComponent({
          render: () => null,
          setup() {
            return {
              ...useQuery({
                query,
                key: ['key'],
              }),
            }
          },
        }),
        {
          global: {
            plugins,
          },
        },
      )
    }
    let queryWrapper = mountQueryWrapper()
    const [mutationWrapper, mutation] = mountSimple({ keys: [['key']] }, { plugins })
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
    expect(queryWrapper.vm.data).toBe(42)
    query.mockImplementation(async () => 43)
    mutationWrapper.vm.mutate()
    await flushPromises()
    expect(mutation).toHaveBeenCalledTimes(1)
    // The query (which is active) has been refetched
    expect(query).toHaveBeenCalledTimes(2)
    expect(queryWrapper.vm.data).toBe(43)
    query.mockImplementation(async () => 44)
    queryWrapper.unmount()
    mutationWrapper.vm.mutate()
    await flushPromises()
    // The query (which is not active anymore) is marked as stale without being refetch
    expect(query).toHaveBeenCalledTimes(2)
    queryWrapper = mountQueryWrapper()
    // Checking that the query had been marked as stale: it is refetch once it is active again
    expect(query).toHaveBeenCalledTimes(3)
    await flushPromises()
    expect(queryWrapper.vm.data).toBe(44)
  })
})
