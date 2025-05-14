import { describe, expect, it, vi } from 'vitest'
import { defineQueryOptions, useDynamicQuery } from './define-query-options'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from './pinia-colada'

describe('defineQueryOptions', () => {
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

  describe('useDynamicQuery', () => {
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
              ...useDynamicQuery(opts, id),
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
  })
})
