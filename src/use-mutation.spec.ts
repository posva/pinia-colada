import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, enableAutoUnmount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, effectScope, createApp } from 'vue'
import type { GlobalMountOptions } from '../test/utils'
import { delay } from '../test/utils'
import type { UseMutationOptions } from './mutation-options'
import { useMutation } from './use-mutation'
import { PiniaColada } from './pinia-colada'
import { mockConsoleError, mockWarn } from '../test/mock-warn'
import { useMutationCache } from './mutation-store'

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(async () => {
    // clear all gc timers to avoid log polluting across tests
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  mockWarn()
  mockConsoleError()

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
    return { wrapper, mutation }
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

    await expect((async () => wrapper.vm.mutate())()).resolves.toBeUndefined()
    await flushPromises()
    expect(wrapper.vm.error).toEqual(new Error('foobar'))
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

  it('can be called again after reset', async () => {
    const { wrapper } = mountSimple()

    wrapper.vm.mutate()
    await flushPromises()
    wrapper.vm.reset()
    wrapper.vm.mutate()
    await flushPromises()
    expect(wrapper.vm.data).toBe(42)
    expect(wrapper.vm.status).toBe('success')
  })

  describe('hooks', () => {
    it('invokes the "onBeforeMutate" hook before mutating', async () => {
      const onBeforeMutate = vi.fn()
      const { wrapper } = mountSimple({
        mutation: async ({ a, b }: { a: number, b: number }) => {
          return a + b
        },
        onBeforeMutate,
      })
      expect(onBeforeMutate).not.toHaveBeenCalled()
      wrapper.vm.mutate({ a: 24, b: 42 })
      expect(onBeforeMutate).toHaveBeenCalledTimes(1)
      expect(onBeforeMutate).toHaveBeenLastCalledWith({ a: 24, b: 42 }, expect.objectContaining({}))
      wrapper.vm.mutateAsync({ a: 0, b: 1 })
      expect(onBeforeMutate).toHaveBeenCalledTimes(2)
      expect(onBeforeMutate).toHaveBeenLastCalledWith({ a: 0, b: 1 }, expect.objectContaining({}))
    })

    it('works with the deprecated local "onMutate"', async () => {
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
      expect(onMutate).toHaveBeenLastCalledWith({ a: 24, b: 42 }, expect.objectContaining({}))
      wrapper.vm.mutateAsync({ a: 0, b: 1 })
      expect(onMutate).toHaveBeenCalledTimes(2)
      expect(onMutate).toHaveBeenLastCalledWith({ a: 0, b: 1 }, expect.objectContaining({}))
      expect('"onMutate" option is deprecated').toHaveBeenWarned()
    })

    it('warns about misusing deprecated "onMutate"', async () => {
      const onMutate = vi.fn()
      const onBeforeMutate = vi.fn()
      const { wrapper } = mountSimple({
        mutation: async ({ a, b }: { a: number, b: number }) => {
          return a + b
        },
        onMutate,
        onBeforeMutate,
      })
      wrapper.vm.mutate({ a: 24, b: 42 })
      expect('"onMutate" option is deprecated').toHaveBeenWarned()
      expect('Use only "onBeforeMutate"').toHaveBeenWarned()
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
      expect(onError).toHaveBeenCalledWith(new Error('24'), 24, expect.objectContaining({}))
    })

    it('invokes the "onError" hook if onBeforeMutate throws', async () => {
      const onError = vi.fn()
      const { wrapper } = mountSimple({
        onBeforeMutate() {
          throw new Error('onBeforeMutate')
        },
        onError,
      })

      wrapper.vm.mutate()
      await flushPromises()
      expect(onError).toHaveBeenCalledWith(
        new Error('onBeforeMutate'),
        undefined,
        expect.objectContaining({}),
      )
    })

    it('passes the returned value from onBeforeMutate to onError', async () => {
      const onError = vi.fn()
      const { wrapper, mutation } = mountSimple({
        onBeforeMutate: () => ({ foo: 'bar' }),
        onError,
      })

      mutation.mockRejectedValueOnce(new Error('onBeforeMutate'))
      wrapper.vm.mutate()
      await flushPromises()
      expect(onError).toHaveBeenCalledWith(
        new Error('onBeforeMutate'),
        undefined,
        expect.objectContaining({ foo: 'bar' }),
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

    it('awaits the "onBeforeMutate" hook before mutation', async () => {
      const onBeforeMutate = vi.fn(async () => delay(10))
      const { wrapper, mutation } = mountSimple({ onBeforeMutate })

      wrapper.vm.mutate()
      expect(onBeforeMutate).toHaveBeenCalled()
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
      expect(onSuccess).toHaveBeenCalledWith(42, undefined, expect.objectContaining({}))
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

    it('sets the error if "onBeforeMutate" throws', async () => {
      const onBeforeMutate = vi.fn().mockRejectedValueOnce(new Error('onBeforeMutate'))
      const { wrapper } = mountSimple({ onBeforeMutate })

      wrapper.vm.mutate()
      await flushPromises()
      expect(onBeforeMutate).toHaveBeenCalled()
      expect(wrapper.vm.error).toEqual(new Error('onBeforeMutate'))
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
          42,
          undefined,
          undefined,
          expect.objectContaining({}),
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

        await expect(wrapper.vm.mutateAsync()).rejects.toThrow()
        await flushPromises()
        expect(onSettled).toHaveBeenCalledWith(
          undefined,
          new Error('foobar'),
          undefined,
          expect.objectContaining({}),
        )
      })
    })

    it('triggers global onBeforeMutate', async () => {
      const onBeforeMutate = vi.fn()
      const { wrapper } = mountSimple(
        {},
        {
          plugins: [createPinia(), [PiniaColada, { mutationOptions: { onBeforeMutate } }]],
        },
      )

      expect(onBeforeMutate).toHaveBeenCalledTimes(0)
      wrapper.vm.mutate()
      // no need since it's synchronous
      // await flushPromises()
      expect(onBeforeMutate).toHaveBeenCalledTimes(1)
      expect(onBeforeMutate).toHaveBeenCalledWith(undefined)
    })

    it('local onBeforeMutate receives global onBeforeMutate result', async () => {
      const onBeforeMutate = vi.fn(() => ({ foo: 'bar' }))
      const { wrapper } = mountSimple(
        { onBeforeMutate },
        {
          plugins: [
            createPinia(),
            [PiniaColada, { mutationOptions: { onBeforeMutate: () => ({ global: true }) } }],
          ],
        },
      )

      wrapper.vm.mutate()
      expect(onBeforeMutate).toHaveBeenCalledWith(undefined, { global: true })
    })

    it('triggers global onSuccess', async () => {
      const onSuccess = vi.fn()
      const { wrapper } = mountSimple(
        {},
        {
          plugins: [createPinia(), [PiniaColada, { mutationOptions: { onSuccess } }]],
        },
      )

      wrapper.vm.mutate()
      await flushPromises()
      expect(onSuccess).toHaveBeenCalledWith(42, undefined, {})
    })

    it('triggers global onError', async () => {
      const onError = vi.fn()
      const { wrapper } = mountSimple(
        {
          mutation: async () => {
            throw new Error('foobar')
          },
        },
        {
          plugins: [createPinia(), [PiniaColada, { mutationOptions: { onError } }]],
        },
      )

      await expect(wrapper.vm.mutateAsync()).rejects.toThrow()
      await flushPromises()
      expect(onError).toHaveBeenCalledWith(new Error('foobar'), undefined, {})
    })

    it('triggers global onSettled', async () => {
      const onSettled = vi.fn()
      const { wrapper } = mountSimple(
        {},
        {
          plugins: [createPinia(), [PiniaColada, { mutationOptions: { onSettled } }]],
        },
      )

      wrapper.vm.mutate()
      await flushPromises()
      expect(onSettled).toHaveBeenCalledWith(42, undefined, undefined, {})
    })
  })

  describe('gcTime', () => {
    it('keeps the cache while the component is mounted', async () => {
      const { wrapper, mutation } = mountSimple({ gcTime: 1000 })
      const cache = useMutationCache()

      await flushPromises()

      // Trigger the mutation
      wrapper.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(1)
      expect(cache.getEntries()).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      expect(cache.getEntries()).toHaveLength(1)
      vi.advanceTimersByTime(1000)
      expect(cache.getEntries()).toHaveLength(1)
    })

    it('deletes the cache once the component is unmounted after the delay', async () => {
      const { wrapper, mutation } = mountSimple({ gcTime: 1000 })
      const cache = useMutationCache()

      await flushPromises()

      // Trigger the mutation
      wrapper.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(1)
      expect(cache.getEntries()).toHaveLength(1)

      wrapper.unmount()
      vi.advanceTimersByTime(999)
      // still there
      expect(cache.getEntries()).toHaveLength(1)
      vi.advanceTimersByTime(1)
      expect(cache.getEntries()).toHaveLength(0)
    })

    it('keeps the cache if the mutation is reused by a new component before the delay', async () => {
      const pinia = createPinia()
      const options = {
        key: ['key'],
        mutation: vi.fn(async () => 42),
        gcTime: 1000,
      } satisfies UseMutationOptions

      // Mount first component and trigger mutation
      const { wrapper: w1, mutation } = mountSimple(options, { plugins: [pinia] })
      const cache = useMutationCache()

      // Trigger the mutation in the first component
      w1.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(1)
      const entriesBeforeUnmount = cache.getEntries({ key: ['key'] })
      expect(entriesBeforeUnmount).toHaveLength(1)

      // Unmount first component
      w1.unmount()

      // Advance time but not enough to trigger GC
      vi.advanceTimersByTime(999)
      expect(cache.getEntries({ key: ['key'] })).toHaveLength(1)

      // Mount second component using the same options/key
      const { wrapper: w2 } = mountSimple(options, { plugins: [pinia] })
      await flushPromises()

      // Trigger mutation in second component
      w2.vm.mutate()
      await flushPromises()

      // New component creates a new cache entry with the same key, which is fine
      // The important thing is that the entries are still tracked and not garbage collected
      expect(cache.getEntries({ key: ['key'] }).length).toBeGreaterThan(0)

      // Advance more time - entries should still be in cache since component is mounted
      vi.advanceTimersByTime(1000)
      expect(cache.getEntries({ key: ['key'] }).length).toBeGreaterThan(0)

      // Unmount second component
      w2.unmount()

      // Advance time but not enough to trigger GC
      vi.advanceTimersByTime(999)
      expect(cache.getEntries({ key: ['key'] }).length).toBeGreaterThan(0)

      // Advance time to trigger GC
      vi.advanceTimersByTime(1)
      expect(cache.getEntries({ key: ['key'] })).toHaveLength(0)
    })

    it('keeps the cache forever if gcTime is false', async () => {
      const { wrapper, mutation } = mountSimple({ gcTime: false })
      const cache = useMutationCache()

      await flushPromises()

      // Trigger the mutation
      wrapper.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(1)
      expect(cache.getEntries()).toHaveLength(1)

      wrapper.unmount()
      vi.advanceTimersByTime(1000000)
      expect(cache.getEntries()).toHaveLength(1)
    })

    it('works with effectScope too', async () => {
      const pinia = createPinia()
      const options = {
        key: ['key'],
        mutation: vi.fn(async () => 42),
        gcTime: 1000,
      } satisfies UseMutationOptions

      const scope = effectScope()

      scope.run(() => {
        const app = createApp({})
        app.use(pinia)
        app.runWithContext(() => {
          const { mutate } = useMutation(options)
          // Trigger the mutation
          mutate()
        })
      })

      const cache = useMutationCache()
      await flushPromises()

      expect(cache.getEntries()).toHaveLength(1)

      scope.stop()

      vi.advanceTimersByTime(999)
      expect(cache.getEntries()).toHaveLength(1)
      vi.advanceTimersByTime(1)
      expect(cache.getEntries()).toHaveLength(0)
    })
  })
})
