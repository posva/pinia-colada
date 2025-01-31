/**
 * @vitest-environment happy-dom
 */
import {

  PiniaColada,
  useMutation,
  useQuery,
} from '@pinia/colada'
import type { UseMutationOptions, UseQueryOptions } from '@pinia/colada'
import type { GlobalMountOptions } from '../../../test/utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { createPinia } from 'pinia'

describe('invalidateKeys', () => {
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

  function mountSimpleQuery(
    options: Partial<UseQueryOptions<number>> = {},
    mountOptions?: GlobalMountOptions,
  ) {
    const query = vi.fn(options.query ?? (async () => 0))
    const wrapper = mount(
      defineComponent({
        render: () => null,
        setup() {
          return {
            ...useQuery({
              ...options,
              query,
              key: options.key ?? ['key'],
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
    return Object.assign([wrapper, query] as const, { wrapper, query })
  }
  it.todo('refetches active queries that match "invalidateKeys"', async () => {
    const plugins = [createPinia(), PiniaColada]
    const { query } = mountSimpleQuery({ key: ['key'] }, { plugins })
    const [mutationWrapper] = mountSimple(
      { invalidateKeys: [['key']] },
      { plugins },
    )
    // wait for the query to be fetched
    await flushPromises()

    query.mockClear()
    mutationWrapper.vm.mutate()
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(1)
  })

  it('does not refetch inactive queries that match "invalidateKeys"', async () => {
    const plugins = [createPinia(), PiniaColada]
    const { query, wrapper: queryWrapper } = mountSimpleQuery(
      { key: ['key'] },
      { plugins },
    )
    const [mutationWrapper] = mountSimple(
      { invalidateKeys: [['key']] },
      { plugins },
    )
    // wait for the query to be fetched
    await flushPromises()
    queryWrapper.unmount()
    query.mockClear()
    await nextTick()
    mutationWrapper.vm.mutate()
    await flushPromises()
    expect(query).toHaveBeenCalledTimes(0)
  })
})
