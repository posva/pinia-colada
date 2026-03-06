import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery, useMutation, PiniaColada } from '@pinia/colada'
import type { PiniaColadaOptions, UseQueryOptions, UseMutationOptions } from '@pinia/colada'
import { PiniaColadaDelay, PiniaColadaDelayQuery, PiniaColadaDelayMutations } from './delay'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Delay Loading plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function factory(options: PiniaColadaOptions, queryOptions?: UseQueryOptions) {
    const pinia = createPinia()
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return {
            ...useQuery(
              queryOptions || {
                query: async () => 42,
                key: ['key'],
              },
            ),
          }
        },
      }),
      {
        global: {
          plugins: [pinia, [PiniaColada, options]],
        },
      },
    )

    return { pinia, wrapper }
  }

  function mutationFactory(
    options: PiniaColadaOptions,
    mutationOptions?: Partial<UseMutationOptions>,
  ) {
    const pinia = createPinia()
    const mutation = vi.fn(
      mutationOptions?.mutation ??
        (async () => {
          await delay(500)
          return 'ok'
        }),
    )
    const wrapper = mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return {
            ...useMutation({
              ...mutationOptions,
              mutation,
            }),
          }
        },
      }),
      {
        global: {
          plugins: [pinia, [PiniaColada, options]],
        },
      },
    )

    return { pinia, wrapper, mutation }
  }

  it('delays the asyncStatus of 200ms', async () => {
    const query = vi.fn(async () => {
      await delay(500)
      return 'ok'
    })

    const { wrapper } = factory(
      {
        plugins: [PiniaColadaDelay({})],
      },
      {
        key: ['key'],
        query,
      },
    )

    expect(wrapper.vm.asyncStatus).toBe('idle')

    vi.advanceTimersByTime(100)
    expect(wrapper.vm.asyncStatus).toBe('idle')

    vi.advanceTimersByTime(100)
    expect(wrapper.vm.asyncStatus).toBe('loading')

    vi.advanceTimersToNextTimer()
    await flushPromises()
    expect(wrapper.vm.asyncStatus).toBe('idle')
  })

  it('can be ignored with false', async () => {
    const query = vi.fn(async () => {
      await delay(500)
      return 'ok'
    })

    const { wrapper } = factory(
      {
        plugins: [PiniaColadaDelay()],
      },
      {
        key: ['key'],
        query,
        delay: false,
      },
    )

    expect(wrapper.vm.asyncStatus).toBe('loading')

    vi.advanceTimersByTime(100)
    expect(wrapper.vm.asyncStatus).toBe('loading')

    vi.advanceTimersToNextTimer()
    await flushPromises()
    expect(wrapper.vm.asyncStatus).toBe('idle')
  })

  describe('PiniaColadaDelayMutations', () => {
    it('delays mutation asyncStatus by default 200ms', async () => {
      const { wrapper } = mutationFactory({
        plugins: [PiniaColadaDelayMutations({})],
      })

      expect(wrapper.vm.asyncStatus).toBe('idle')

      wrapper.vm.mutate()
      await flushPromises()
      // should still be idle because of the delay
      expect(wrapper.vm.asyncStatus).toBe('idle')

      vi.advanceTimersByTime(100)
      expect(wrapper.vm.asyncStatus).toBe('idle')

      vi.advanceTimersByTime(100)
      expect(wrapper.vm.asyncStatus).toBe('loading')

      vi.advanceTimersToNextTimer()
      await flushPromises()
      expect(wrapper.vm.asyncStatus).toBe('idle')
    })

    it('can be disabled with false', async () => {
      const { wrapper } = mutationFactory(
        {
          plugins: [PiniaColadaDelayMutations()],
        },
        { delay: false },
      )

      wrapper.vm.mutate()
      await flushPromises()
      expect(wrapper.vm.asyncStatus).toBe('loading')

      vi.advanceTimersToNextTimer()
      await flushPromises()
      expect(wrapper.vm.asyncStatus).toBe('idle')
    })
  })

  describe('PiniaColadaDelay (combined)', () => {
    it('installs both query and mutation delay', async () => {
      const queryFn = vi.fn(async () => {
        await delay(500)
        return 'ok'
      })

      const pinia = createPinia()
      const wrapper = mount(
        defineComponent({
          template: '<div></div>',
          setup() {
            const q = useQuery({ key: ['key'], query: queryFn })
            const m = useMutation({
              mutation: async () => {
                await delay(500)
                return 'ok'
              },
            })
            return {
              queryAsyncStatus: q.asyncStatus,
              mutationAsyncStatus: m.asyncStatus,
              mutate: m.mutate,
            }
          },
        }),
        {
          global: {
            plugins: [pinia, [PiniaColada, { plugins: [PiniaColadaDelay({})] }]],
          },
        },
      )

      // query should be delayed
      expect(wrapper.vm.queryAsyncStatus).toBe('idle')
      vi.advanceTimersByTime(200)
      expect(wrapper.vm.queryAsyncStatus).toBe('loading')

      // mutation should also be delayed
      wrapper.vm.mutate()
      await flushPromises()
      expect(wrapper.vm.mutationAsyncStatus).toBe('idle')
      vi.advanceTimersByTime(200)
      expect(wrapper.vm.mutationAsyncStatus).toBe('loading')
    })

    it('allows nested option overrides', async () => {
      const queryFn = vi.fn(async () => {
        await delay(500)
        return 'ok'
      })

      const pinia = createPinia()
      const wrapper = mount(
        defineComponent({
          template: '<div></div>',
          setup() {
            const q = useQuery({ key: ['key'], query: queryFn })
            const m = useMutation({
              mutation: async () => {
                await delay(500)
                return 'ok'
              },
            })
            return {
              queryAsyncStatus: q.asyncStatus,
              mutationAsyncStatus: m.asyncStatus,
              mutate: m.mutate,
            }
          },
        }),
        {
          global: {
            plugins: [
              pinia,
              [
                PiniaColada,
                {
                  plugins: [PiniaColadaDelay({ delay: 100, mutations: { delay: 300 } })],
                },
              ],
            ],
          },
        },
      )

      // query uses top-level delay of 100
      expect(wrapper.vm.queryAsyncStatus).toBe('idle')
      vi.advanceTimersByTime(100)
      expect(wrapper.vm.queryAsyncStatus).toBe('loading')

      // mutation uses overridden delay of 300
      wrapper.vm.mutate()
      await flushPromises()
      expect(wrapper.vm.mutationAsyncStatus).toBe('idle')
      vi.advanceTimersByTime(200)
      expect(wrapper.vm.mutationAsyncStatus).toBe('idle')
      vi.advanceTimersByTime(100)
      expect(wrapper.vm.mutationAsyncStatus).toBe('loading')
    })
  })
})
