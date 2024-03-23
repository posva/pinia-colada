// NOTE: to sync with mutations.md
import { ref } from 'vue'
import { defineMutation } from '@pinia/colada'

export const useCreateTodo = defineMutation(() => {
  const todoText = ref('')
  return {
    mutation: () =>
      fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ text: todoText.value }),
      }),

    // expose the todoText ref
    todoText,
  }
})
