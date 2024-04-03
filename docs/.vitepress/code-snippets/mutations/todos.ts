// NOTE: to sync with mutations.md
import { ref } from 'vue'
import { defineMutation, useMutation } from '@pinia/colada'

export const useCreateTodo = defineMutation(() => {
  const todoText = ref('')
  const mutation = useMutation({
    mutation: () =>
      fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ text: todoText.value }),
      }),

  })

  return {
    ...mutation,
    createTodo: mutation.mutate,
    // expose the todoText ref
    todoText,
  }
})
