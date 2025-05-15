/**
 * Fetches the list of all documents
 */
export async function getDocumentList() {
  return [] as Doc[]
}

/**
 * Fetches a document by its ID
 */
export async function getDocumentById(id: string) {
  return { id } as Doc[]
}

export interface Doc {
  id: string
  author: string
  content: string
}
