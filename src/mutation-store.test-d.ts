import { describe, it } from 'vitest'
import type { UseMutationEntry } from './mutation-store'

describe('extendMutationEntry type inference', () => {
  it('errors when setting ext directly', () => {
    const entry = {} as UseMutationEntry
    // @ts-expect-error: ext is readonly
    entry.ext = {}
  })
})
