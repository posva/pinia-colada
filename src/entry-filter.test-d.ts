import { describe, it } from 'vitest'
import type { EntryFilter } from './entry-filter'

describe('Entry filter', () => {
  function filter(filters: EntryFilter<unknown>) {
    return filters
  }
  it('works', () => {
    filter({})
    filter({ exact: false })
    // @ts-expect-error: missing key
    filter({ exact: true })
    filter({ key: [], exact: true })
    filter({ key: [], exact: false })
    filter({ key: [], exact: false as boolean })
    // @ts-expect-error: missing key
    filter({ exact: false as boolean })
  })
})
