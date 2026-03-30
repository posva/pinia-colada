import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineMutationOptions } from './define-mutation-options'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from './pinia-colada'
import { useMutation } from './use-mutation'
import { mockWarn } from '@posva/test-utils'

describe('defineMutationOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  mockWarn()

  it('can describe static options', () => {
    const mutation = async (id: number) => ({ id })
    const optsStatic = defineMutationOptions({ mutation })

    expect(optsStatic).toEqual({
      mutation,
    })
  })

  it('can describe dynamic options', () => {
    const optsDynamic = defineMutationOptions((baseUrl: string) => ({
      mutation: async (id: number) => {
        const res = await fetch(`${baseUrl}/items/${id}`, { method: 'DELETE' })
        return res.json()
      },
    }))

    const opts1 = optsDynamic('/api/v1')
    expect(opts1).toHaveProperty('mutation')
    expect(typeof opts1.mutation).toBe('function')

    const opts2 = optsDynamic('/api/v2')
    expect(opts2).toHaveProperty('mutation')
    expect(opts2.mutation).not.toBe(opts1.mutation)
  })

  describe('with useMutation', () => {
    it('can use static options', async () => {
      const mutation = vi.fn(async (id: number) => `deleted:${id}`)

      const opts = defineMutationOptions({ mutation })

      const wrapper = mount(
        defineComponent({
          render: () => null,
          setup() {
            return {
              ...useMutation(opts),
            }
          },
        }),
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await wrapper.vm.mutateAsync(42)
      await flushPromises()
      expect(mutation).toHaveBeenCalledWith(42, expect.anything())
      expect(wrapper.vm.data).toBe('deleted:42')
    })

    it('can use dynamic options', async () => {
      const mutation = vi.fn(async (id: number) => `deleted:${id}`)

      const opts = defineMutationOptions((prefix: string) => ({
        key: [prefix, 'delete'] as const,
        mutation: async (id: number) => mutation(id),
      }))

      const wrapper = mount(
        defineComponent({
          render: () => null,
          setup() {
            return {
              ...useMutation(opts('items')),
            }
          },
        }),
        {
          global: {
            plugins: [createPinia(), PiniaColada],
          },
        },
      )

      await wrapper.vm.mutateAsync(7)
      await flushPromises()
      expect(mutation).toHaveBeenCalledWith(7)
      expect(wrapper.vm.data).toBe('deleted:7')
    })
  })
})
