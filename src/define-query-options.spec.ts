import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineQueryOptions } from './define-query-options'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from './pinia-colada'
import { useQuery } from './use-query'
import { useQueryCache } from './query-store'
import { delay } from '../test-utils'

describe('defineQueryOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('can describe static options', () => {
    const query = async () => 42
    const optsStatic = defineQueryOptions({ key: ['a'], query })

    expect(optsStatic).toEqual({
      key: ['a'],
      query,
    })
  })

  it('can describe dynamic options', () => {
    const query = async () => 42
    const optsDynamic = defineQueryOptions((id: number) => ({
      key: ['a', id],
      query,
    }))

    expect(optsDynamic(1)).toEqual({
      key: ['a', 1],
      query,
    })

    expect(optsDynamic(2)).toEqual({
      key: ['a', 2],
      query,
    })
  })

  describe('with useQuery', () => {
    it('can use dynamic options', async () => {
      const query = vi.fn((id: number) => `data:${id}`)

      const opts = defineQueryOptions((id: number) => ({
        key: ['a', id],
        query: async () => query(id),
      }))

      const id = ref(0)
      const wrapper = mount(
        {
          setup() {
            return {
              ...useQuery(opts, id),
            }
          },
          template: `<div>{{ data }}</div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      expect(query).toHaveBeenCalledWith(0)
      expect(query).toHaveBeenCalledTimes(1)
      expect(wrapper.text()).toBe('data:0')
      id.value++
      await flushPromises()
      expect(query).toHaveBeenCalledWith(1)
      expect(query).toHaveBeenCalledTimes(2)
      expect(wrapper.text()).toBe('data:1')
    })

    // https://github.com/posva/pinia-colada/issues/287
    it('can invalidate and refetch multiple queries at once', async () => {
      let tag = 0 // allows to differentiate between calls
      const query = vi.fn((id: number) => `data:${id} (${tag})`)

      const opts = defineQueryOptions((id: number) => ({
        key: ['a', id],
        query: async () => query(id),
      }))

      const id = ref(0)
      const pinia = createPinia()
      const wrapper = mount(
        {
          setup() {
            return {
              ...useQuery(opts, id),
            }
          },
          template: `<div>{{ data }}</div>`,
        },
        {
          global: {
            plugins: [pinia, PiniaColada],
          },
        },
      )

      // put in the cache multiple entries
      await flushPromises()
      id.value++
      await flushPromises()
      query.mockClear()

      const queryCache = useQueryCache(pinia)
      tag++ // change the data

      queryCache.invalidateQueries({ key: ['a'] }, 'all')
      expect(query).toHaveBeenCalledTimes(2)
      expect(query).toHaveBeenCalledWith(0)
      expect(query).toHaveBeenCalledWith(1)

      await flushPromises()

      expect(wrapper.text()).toBe('data:1 (1)')
      // it was refetched correctly
      expect(queryCache.getQueryData(['a', 0])).toBe('data:0 (1)')
    })

    it('can be combined with specific static options', async () => {
      const query = vi.fn(async () => 'ok')
      const definedOpts = defineQueryOptions({ key: ['a'], query })

      const enabled = ref(false)
      const pinia = createPinia()
      mount(
        {
          setup() {
            return {
              ...useQuery(() => ({
                ...definedOpts,
                enabled: enabled.value,
              })),
            }
          },
          template: `<div>{{ data }}</div>`,
        },
        {
          global: {
            plugins: [pinia, PiniaColada],
          },
        },
      )

      await flushPromises()
      expect(query).toHaveBeenCalledTimes(0)
      enabled.value = true
      await flushPromises()
      expect(query).toHaveBeenCalledTimes(1)
    })
  })

  describe('abort signal', () => {
    it('aborts the signal if the query is not active anymore (key changes)', async () => {
      const opts = defineQueryOptions((id: number) => ({
        key: ['key', id],
        async query({ signal }) {
          await delay(100)
          if (signal.aborted) {
            return 'ok:' + id
          }
          return 'ko:' + id
        },
      }))

      const id = ref(1)
      const wrapper = mount(
        {
          setup() {
            return {
              ...useQuery(opts, id),
            }
          },
          template: `<div>{{ data }}</div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      expect(wrapper.vm.data).toBe(undefined)
      id.value = 2
      // we advance before letting the new query trigger
      vi.advanceTimersByTime(100)
      await flushPromises()
      const queryCache = useQueryCache()
      expect(queryCache.getQueryData(['key', 1])).toBe('ok:1')
      expect(queryCache.getQueryData(['key', 2])).toBe(undefined)
    })

    it('aborts the signal if the query is not active anymore (unmount)', async () => {
      const opts = defineQueryOptions({
        key: ['key'],
        async query({ signal }) {
          await delay(100)
          if (signal.aborted) {
            return 'ok'
          }
          return 'ko'
        },
      })

      const wrapper = mount(
        {
          setup() {
            return {
              ...useQuery(opts),
            }
          },
          template: `<div>{{ data }}</div>`,
        },
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await flushPromises()
      expect(wrapper.vm.data).toBe(undefined)
      wrapper.unmount()
      // we advance before letting the new query trigger
      vi.advanceTimersByTime(100)
      await flushPromises()
      const queryCache = useQueryCache()
      expect(queryCache.getQueryData(['key'])).toBe('ok')
    })
  })
})
