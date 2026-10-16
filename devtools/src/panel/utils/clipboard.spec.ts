import { describe, expect, it } from 'vitest'
import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'
import { stringifyForCopy } from './clipboard'

/** Simulates a value sent from the app to the panel. */
function inPanel<T>(value: T): T {
  return restoreClonedDeep(serializeDevtoolsValue(value))
}

describe('stringifyForCopy', () => {
  it('copies JSON data as formatted JSON', () => {
    const data = { id: 1, tags: ['a'], nested: { ok: true, none: null } }
    expect(stringifyForCopy(inPanel(data))).toBe(JSON.stringify(data, null, 2))
  })

  it.each([
    ['a bigint', 10n],
    ['a Map', new Map([['a', 1]])],
    ['a Set', new Set([1])],
    ['a URL', new URL('https://example.com')],
    ['an error', new Error('nope')],
  ])('rejects %s', (_, value) => {
    expect(() => stringifyForCopy(inPanel({ nested: [value] }))).toThrow()
  })
})
