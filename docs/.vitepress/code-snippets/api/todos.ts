/**
 * Fetches the list of todos from the server
 */
export async function getTodoList() {
  return [] as TodoItem[]
}

/**
 * Creates a new todo
 */
export async function createTodo(todoText: string) {
  return { text: todoText } as TodoItem
}

export interface TodoItem {
  id: string
  text: string
}
