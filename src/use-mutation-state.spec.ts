import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { PiniaColada } from './pinia-colada'
import { useMutationState } from './use-mutation-state'
import { useMutationCache } from './mutation-store'
import { useMutation } from './use-mutation'

describe('useMutationState', () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  afterEach(async () => {
    await vi.runAllTimersAsync()
    vi.restoreAllMocks()
  })

  it('returns empty array when no mutations exist', () => {
    const pinia = createPinia()
    const wrapper = mount(
      defineComponent({
        setup() {
          const { data } = useMutationState()
          return { data }
        },
        template: `<div>{{ data.length }}</div>`,
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    expect(wrapper.vm.data).toEqual([])
  })

  it('returns all mutation entries by default', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    
    const wrapper = mount(
      defineComponent({
        setup() {
          // Create some mutations to populate the cache
          const mutation1 = useMutation({
            mutation: async (data: string) => `result-${data}`,
          })
          const mutation2 = useMutation({
            mutation: async (data: number) => data * 2,
          })
          
          const { data: mutations } = useMutationState()
          
          return { mutations, mutation1, mutation2 }
        },
        template: `<div>{{ mutations.length }}</div>`,
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    // Initially no mutations have been called
    expect(wrapper.vm.mutations).toEqual([])
    
    // Call the mutations to add them to cache
    wrapper.vm.mutation1.mutate('test')
    wrapper.vm.mutation2.mutate(42)
    
    await nextTick()
    
    // Now we should have 2 mutation entries in the cache
    expect(wrapper.vm.mutations.length).toBe(2)
    expect(wrapper.vm.mutations.every(entry => entry.id)).toBe(true)
  })

  it('filters mutations by status', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    
    const wrapper = mount(
      defineComponent({
        setup() {
          const successMutation = useMutation({
            mutation: async (data: string) => `success-${data}`,
          })
          const errorMutation = useMutation({
            mutation: async () => {
              throw new Error('test error')
            },
          })
          
          const { data: successfulMutations } = useMutationState({ status: 'success' })
          const { data: errorMutations } = useMutationState({ status: 'error' })
          
          return { successfulMutations, errorMutations, successMutation, errorMutation }
        },
        template: `<div>{{ successfulMutations.length }}-{{ errorMutations.length }}</div>`,
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    // Call mutations
    wrapper.vm.successMutation.mutate('test')
    wrapper.vm.errorMutation.mutate()
    
    await vi.runAllTimersAsync()
    await nextTick()
    
    // Check filtered results
    expect(wrapper.vm.successfulMutations.length).toBe(1)
    expect(wrapper.vm.successfulMutations[0]?.state.value.status).toBe('success')
    
    expect(wrapper.vm.errorMutations.length).toBe(1)
    expect(wrapper.vm.errorMutations[0]?.state.value.status).toBe('error')
  })

  it('works with select function', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    
    const wrapper = mount(
      defineComponent({
        setup() {
          const mutation1 = useMutation({
            mutation: async (data: string) => `result-${data}`,
          })
          const mutation2 = useMutation({
            mutation: async (data: string) => `other-${data}`,
          })
          
          const { data: selectedData } = useMutationState({
            filters: { status: 'success' },
            select: (entry) => entry.state.value.data,
          })
          
          return { selectedData, mutation1, mutation2 }
        },
        template: `<div>{{ selectedData }}</div>`,
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    // Call mutations
    wrapper.vm.mutation1.mutate('test1')
    wrapper.vm.mutation2.mutate('test2')
    
    await vi.runAllTimersAsync()
    await nextTick()
    
    // Check selected data
    expect(wrapper.vm.selectedData).toEqual(['result-test1', 'other-test2'])
  })

  it('works with reactive filters', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    
    const statusFilter = ref<'success' | 'error' | undefined>('success')
    
    const wrapper = mount(
      defineComponent({
        setup() {
          const mutation = useMutation({
            mutation: async (shouldError: boolean) => {
              if (shouldError) throw new Error('test error')
              return 'success'
            },
          })
          
          const { data: filteredMutations } = useMutationState(
            () => ({ status: statusFilter.value })
          )
          
          return { filteredMutations, mutation, statusFilter }
        },
        template: `<div>{{ filteredMutations.length }}</div>`,
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    // Call mutations with different outcomes
    wrapper.vm.mutation.mutate(false) // success
    wrapper.vm.mutation.mutate(true)  // error
    
    await vi.runAllTimersAsync()
    await nextTick()
    
    // Initially filtering for success
    expect(wrapper.vm.filteredMutations.length).toBe(1)
    expect(wrapper.vm.filteredMutations[0]?.state.value.status).toBe('success')
    
    // Change filter to error
    statusFilter.value = 'error'
    await nextTick()
    
    expect(wrapper.vm.filteredMutations.length).toBe(1)
    expect(wrapper.vm.filteredMutations[0]?.state.value.status).toBe('error')
    
    // Remove filter
    statusFilter.value = undefined
    await nextTick()
    
    expect(wrapper.vm.filteredMutations.length).toBe(2)
  })

  it('works with key-based filtering', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    
    const wrapper = mount(
      defineComponent({
        setup() {
          const userMutation = useMutation({
            key: (userId: number) => ['user', userId, 'update'],
            mutation: async (userId: number) => `user-${userId}-updated`,
          })
          const postMutation = useMutation({
            key: (postId: number) => ['post', postId, 'update'],
            mutation: async (postId: number) => `post-${postId}-updated`,
          })
          
          const { data: userMutations } = useMutationState({ key: ['user'] })
          const { data: postMutations } = useMutationState({ key: ['post'] })
          
          return { userMutations, postMutations, userMutation, postMutation }
        },
        template: `<div>{{ userMutations.length }}-{{ postMutations.length }}</div>`,
      }),
      {
        global: {
          plugins: [pinia, PiniaColada],
        },
      },
    )

    // Call mutations
    wrapper.vm.userMutation.mutate(1)
    wrapper.vm.userMutation.mutate(2)
    wrapper.vm.postMutation.mutate(10)
    
    await vi.runAllTimersAsync()
    await nextTick()
    
    // Check key-based filtering
    expect(wrapper.vm.userMutations.length).toBe(2)
    expect(wrapper.vm.postMutations.length).toBe(1)
  })
})