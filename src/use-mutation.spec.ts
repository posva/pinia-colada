import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { defineComponent } from 'vue'
import { GlobalMountOptions } from 'node_modules/@vue/test-utils/dist/types'
import { UseMutationOptions, useMutation } from './use-mutation'
import { delay, runTimers } from '../test/utils'

describe('useMutation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountSimple<TResult = number, TParams extends any[] = []>(
    options: Partial<UseMutationOptions<TResult, TParams>> = {},
    mountOptions?: GlobalMountOptions
  ) {
    const mutator = options.mutator
      ? vi.fn(options.mutator)
      : vi.fn(async () => {
          await delay(0)
          return 42
        })
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useMutation<TResult>({
              ...options,
              // @ts-expect-error: generic unmatched but types work
              mutator,
            }),
          }
        },
      }),
      {
        global: {
          plugins: [createPinia()],
          ...mountOptions,
        },
      }
    )
    return Object.assign([wrapper, mutator] as const, { wrapper, mutator })
  }
  it('invokes the mutator', async () => {
    const { wrapper } = mountSimple()

    wrapper.vm.mutate()
    await runTimers()

    expect(wrapper.vm.data).toBe(42)
  })
})
