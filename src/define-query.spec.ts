import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { ref } from 'vue'
import { QueryPlugin } from './query-plugin'
import { defineQuery } from './define-query'
import { useQuery } from './use-query'

describe('defineQuery', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

  enableAutoUnmount(afterEach)

  it('reuses the query in multiple places', async () => {
    const useTodoList = defineQuery({
      key: ['todos'],
      query: async () => [{ id: 1 }],
    })

    let returnedValues!: ReturnType<typeof useTodoList>
    mount(
      {
        setup() {
          returnedValues = useTodoList()
          return { ...returnedValues }
        },
        template: `<div></div>`,
      },
      {
        global: {
          plugins: [createPinia(), QueryPlugin],
        },
      },
    )

    const { data } = useTodoList()
    expect(data).toBe(useTodoList().data)
    expect(data).toBe(returnedValues.data)
  })

  it('reuses the query in multiple places with a setup function', async () => {
    const useTodoList = defineQuery(() => {
      const todoFilter = ref<'all' | 'finished' | 'unfinished'>('all')
      const { data, ...rest } = useQuery({
        key: ['todos', { filter: todoFilter.value }],
        query: async () => [{ id: 1 }],
      })
      return { ...rest, todoList: data, todoFilter }
    })

    let returnedValues!: ReturnType<typeof useTodoList>
    mount(
      {
        setup() {
          returnedValues = useTodoList()
          return { ...returnedValues }
        },
        template: `<div></div>`,
      },
      {
        global: {
          plugins: [createPinia(), QueryPlugin],
        },
      },
    )

    const { todoList, todoFilter } = useTodoList()
    expect(todoList).toBe(useTodoList().todoList)
    expect(todoList).toBe(returnedValues.todoList)
    expect(todoFilter).toBe(useTodoList().todoFilter)
    expect(todoFilter).toBe(returnedValues.todoFilter)
  })
})
