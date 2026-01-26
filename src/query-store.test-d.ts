import { describe, it } from 'vite-plus/test'
import type { UseQueryEntry } from './query-store'

describe('extendQueryEntry type inference', () => {
  it('errors when setting ext directly', () => {
    const entry = {} as UseQueryEntry
    // @ts-expect-error: ext is readonly
    entry.ext = {}
  })
})
