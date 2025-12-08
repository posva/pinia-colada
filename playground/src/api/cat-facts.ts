import { mande } from 'mande'

export interface CatFacts {
  current_page: number
  data: Array<{ fact: string; length: number }>
  first_page_url: string
  from: number
  last_page: number
  last_page_url: string
  links: Array<{
    url: string | null
    label: string
    active: boolean
  }>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number
  total: number
}

export const factsApi = mande('https://catfact.ninja/facts')
