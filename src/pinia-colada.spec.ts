import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery } from './use-query'
import { PiniaColada } from './pinia-colada'

describe('PiniaColada', () => {
  const MyComponent = defineComponent({
    template: '<div></div>',
    setup() {
      return {
        ...useQuery({
          query: async () => 42,
          key: ['key'],
        }),
      }
    },
  })

  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  it('calls the hooks on success', async () => {
    const onSuccess = vi.fn()
    const onSettled = vi.fn()
    const onError = vi.fn()
    mount(MyComponent, {
      global: {
        plugins: [
          createPinia(),
          [PiniaColada, { onSuccess, onSettled, onError }],
        ],
      },
    })

    await flushPromises()

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith(42)
    expect(onSettled).toHaveBeenCalledWith(42, null)
  })

  it('calls the hooks on error', async () => {
    const onSuccess = vi.fn()
    const onSettled = vi.fn()
    const onError = vi.fn()
    mount(
      defineComponent({
        template: '<div></div>',
        setup() {
          return {
            ...useQuery({
              query: async () => {
                throw new Error('oops')
              },
              key: ['key'],
            }),
          }
        },
      }),
      {
        global: {
          plugins: [
            createPinia(),
            [PiniaColada, { onSuccess, onSettled, onError }],
          ],
        },
      },
    )

    await flushPromises()

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)

    expect(onError).toHaveBeenCalledWith(new Error('oops'))
    expect(onSettled).toHaveBeenCalledWith(undefined, new Error('oops'))
  })
})
