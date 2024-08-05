import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { useQuery } from '../use-query'
import type { PiniaColadaOptions } from '../pinia-colada'
import { PiniaColada } from '../pinia-colada'
import { PiniaColadaQueryHooksPlugin } from './query-hooks'
import type { UseQueryOptions } from '../query-options'

describe('Query Hooks plugin', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  enableAutoUnmount(afterEach)

  function factory(
    options: PiniaColadaOptions,
    queryOptions?: UseQueryOptions,
  ) {
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

  it('calls the hooks on success', async () => {
    const onSuccess = vi.fn()
    const onSettled = vi.fn()
    const onError = vi.fn()

    factory({
      plugins: [
        PiniaColadaQueryHooksPlugin({
          onSuccess,
          onSettled,
          onError,
        }),
      ],
    })

    await flushPromises()

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledWith(42, expect.objectContaining({}))
    expect(onSuccess.mock.calls[0][1]?.state?.value).toMatchObject({
      data: 42,
      status: 'success',
      error: null,
    })
    expect(onSettled).toHaveBeenCalledWith(
      42,
      null,
      expect.objectContaining({}),
    )
    expect(onSettled.mock.calls[0][2]?.state?.value).toMatchObject({
      data: 42,
      status: 'success',
      error: null,
    })
  })

  it('calls the hooks on error', async () => {
    const onSuccess = vi.fn()
    const onSettled = vi.fn()
    const onError = vi.fn()
    factory(
      {
        plugins: [
          PiniaColadaQueryHooksPlugin({
            onSuccess,
            onSettled,
            onError,
          }),
        ],
      },
      {
        query: async () => {
          throw new Error('oops')
        },
        key: ['key'],
      },
    )

    await flushPromises()

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)

    expect(onError).toHaveBeenCalledWith(
      new Error('oops'),
      expect.objectContaining({}),
    )
    expect(onSettled).toHaveBeenCalledWith(
      undefined,
      new Error('oops'),
      expect.objectContaining({}),
    )

    expect(onError.mock.calls[0][1]?.state?.value).toMatchObject({
      data: undefined,
      status: 'error',
      error: new Error('oops'),
    })
    expect(onSettled.mock.calls[0][2]?.state?.value).toMatchObject({
      data: undefined,
      status: 'error',
      error: new Error('oops'),
    })
  })
})
