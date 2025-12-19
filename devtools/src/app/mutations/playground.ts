import { defineMutation, useMutation } from '@pinia/colada'
import { ref } from 'vue'

export const useSimpleDefinedMutation = defineMutation({
  key: () => ['defined-simple-mutation'],
  mutation: async (data: { name: string; timestamp: number }) => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return { success: true, ...data, processedAt: Date.now() }
  },
  gcTime: 5000,
})

export const useDefinedMutationWithState = defineMutation(() => {
  const messageInput = ref('Hello from defined mutation!')
  const callCount = ref(0)

  const { mutate, mutateAsync, asyncStatus, data, error } = useMutation({
    key: () => ['defined-mutation-with-state'],
    mutation: async () => {
      callCount.value++
      await new Promise((resolve) => setTimeout(resolve, 500))
      return {
        message: messageInput.value,
        callNumber: callCount.value,
        timestamp: Date.now(),
      }
    },
  })

  return {
    messageInput,
    callCount,
    mutate,
    mutateAsync,
    asyncStatus,
    data,
    error,
  }
})
