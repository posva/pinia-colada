import { ref } from 'vue'
import { defineMutation, useMutation } from '@pinia/colada'
import { delay } from './fixtures.ts'

export const useDefinedFixtureMutation = defineMutation({
  key: () => ['fixtures', 'defined-mutation'],
  async mutation(input: { message: string; revision: number }) {
    await delay(500)
    return { ...input, processedAt: new Date() }
  },
  gcTime: 10_000,
})

export const useStatefulFixtureMutation = defineMutation(() => {
  const message = ref('Hello from defineMutation()')
  const callCount = ref(0)
  const mutation = useMutation({
    key: () => ['fixtures', 'stateful-defined-mutation'],
    async mutation() {
      callCount.value++
      await delay(400)
      return { message: message.value, callCount: callCount.value }
    },
  })

  return { message, callCount, ...mutation }
})
