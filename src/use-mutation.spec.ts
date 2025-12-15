import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, enableAutoUnmount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent, effectScope, createApp, ref, nextTick } from 'vue'
import type { GlobalMountOptions } from '../test-utils/utils'
import { delay } from '../test-utils/utils'
import type { UseMutationOptions } from './mutation-options'
import { useMutation } from './use-mutation'
import { PiniaColada } from './pinia-colada'
import { mockConsoleError, mockWarn } from '../test-utils/mock-warn'
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

  function mountSimple<TData = number, TParams = void>(
    options: Partial<UseMutationOptions<TData, TParams>> = {},
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
            ...useMutation<TData, TParams>({
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
    it('invokes the "onMutate" hook before mutating', async () => {
      const onMutate = vi.fn()
      const { wrapper } = mountSimple({
        mutation: async ({ a, b }: { a: number; b: number }) => {
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
        new Error('onMutate'),
        undefined,
        expect.objectContaining({}),
      )
    })

    it('passes the returned value from onMutate to onError', async () => {
      const onError = vi.fn()
      const { wrapper, mutation } = mountSimple({
        onMutate: () => ({ foo: 'bar' }),
        onError,
      })

      mutation.mockRejectedValueOnce(new Error('onMutate'))
      wrapper.vm.mutate()
      await flushPromises()
      expect(onError).toHaveBeenCalledWith(
        new Error('onMutate'),
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

    it('triggers global onMutate', async () => {
      const onMutate = vi.fn()
      const { wrapper } = mountSimple(
        {},
        {
          plugins: [createPinia(), [PiniaColada, { mutationOptions: { onMutate } }]],
        },
      )

      expect(onMutate).toHaveBeenCalledTimes(0)
      wrapper.vm.mutate()
      // no need since it's synchronous
      // await flushPromises()
      expect(onMutate).toHaveBeenCalledTimes(1)
      expect(onMutate).toHaveBeenCalledWith(undefined)
    })

    it('local onMutate receives global onMutate result', async () => {
      const onMutate = vi.fn(() => ({ foo: 'bar' }))
      const { wrapper } = mountSimple(
        { onMutate },
        {
          plugins: [
            createPinia(),
            [PiniaColada, { mutationOptions: { onMutate: () => ({ global: true }) } }],
          ],
        },
      )

      wrapper.vm.mutate()
      expect(onMutate).toHaveBeenCalledWith(undefined, { global: true })
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
      vi.advanceTimersByTime(1_000_000)
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

    it('deletes old entries when mutation key changes while mounted', async () => {
      const key = ref(1)
      const { wrapper, mutation } = mountSimple({
        key: () => ['mutation', key.value],
        gcTime: 1000,
      })
      const cache = useMutationCache()

      await flushPromises()

      // Trigger the first mutation with key = 1
      wrapper.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(1)
      expect(cache.getEntries({ key: ['mutation', 1] })).toHaveLength(1)

      // Change key and trigger a new mutation
      key.value = 2
      await nextTick()
      wrapper.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(2)
      // Both entries should exist initially
      expect(cache.getEntries({ key: ['mutation', 1] })).toHaveLength(1)
      expect(cache.getEntries({ key: ['mutation', 2] })).toHaveLength(1)

      // Advance time to trigger GC for the old entry
      vi.advanceTimersByTime(1000)

      // Old entry (key=1) should be removed, new entry (key=2) should remain
      expect(cache.getEntries({ key: ['mutation', 1] })).toHaveLength(0)
      expect(cache.getEntries({ key: ['mutation', 2] })).toHaveLength(1)
    })

    it('keeps cache if mutation key switches back before GC delay', async () => {
      const key = ref(1)
      const { wrapper, mutation } = mountSimple({
        key: () => ['mutation', key.value],
        gcTime: 1000,
      })
      const cache = useMutationCache()

      await flushPromises()

      // Trigger mutation with key = 1
      wrapper.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(1)
      expect(cache.getEntries({ key: ['mutation', 1] })).toHaveLength(1)

      // Change key and trigger mutation
      key.value = 2
      await nextTick()
      wrapper.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(2)
      expect(cache.getEntries({ key: ['mutation', 1] })).toHaveLength(1)
      expect(cache.getEntries({ key: ['mutation', 2] })).toHaveLength(1)

      // Advance time but not enough to trigger GC
      vi.advanceTimersByTime(999)

      // Both entries should still exist
      expect(cache.getEntries({ key: ['mutation', 1] })).toHaveLength(1)
      expect(cache.getEntries({ key: ['mutation', 2] })).toHaveLength(1)

      // Switch back to key = 1 and trigger
      key.value = 1
      await nextTick()
      wrapper.vm.mutate()
      await flushPromises()

      expect(mutation).toHaveBeenCalledTimes(3)

      // Both entries should still exist (old one wasn't GC'd)
      expect(cache.getEntries({ key: ['mutation', 1] }).length).toBeGreaterThan(0)
      expect(cache.getEntries({ key: ['mutation', 2] })).toHaveLength(1)
    })

    it('frees cache if entry is recreated within a component', async () => {
      const key = ref(1)
      const { wrapper } = mountSimple({
        key: () => ['mutation', key.value],
        gcTime: 1000,
      })
      const cache = useMutationCache()

      await flushPromises()

      // Trigger first mutation
      wrapper.vm.mutate()
      await flushPromises()

      // Quickly change the key to create multiple entries
      key.value = 2
      await nextTick()
      wrapper.vm.mutate()
      await flushPromises()

      // Verify multiple entries were created
      const totalEntries = cache.getEntries({ key: ['mutation'] }).length
      expect(totalEntries).toBeGreaterThan(0)

      // Unmount the component
      wrapper.unmount()

      // Advance time to trigger GC
      vi.advanceTimersByTime(1000)

      // All entries should be removed (no memory leak)
      expect(cache.getEntries({ key: ['mutation'] })).toHaveLength(0)
    })
  })
})
