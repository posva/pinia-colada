/**
 * Fetches the list of all documents
 */
export async function getDocumentList() {
  return [] as Doc[]
}

/**
 * Fetches a document by its ID
 */
export async function getDocumentById(id: string, filters: DocsFilters = {}) {
  console.log(id, filters)
  return [] as Doc[]
}

export interface Doc {
  id: string
  author: string
  content: string
}
export interface DocsFilters {
  withComments?: boolean
}
