import { describe, expect, it } from 'vitest'
import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'
import { stringifyForCopy } from './clipboard'

/** Simulates a value sent from the app to the panel. */
function inPanel<T>(value: T): T {
  return restoreClonedDeep(serializeDevtoolsValue(value))
}

describe('stringifyForCopy', () => {
  it('copies plain data as formatted JSON', () => {
    const data = { id: 1, tags: ['a'], nested: { ok: true, none: null } }
    expect(JSON.parse(stringifyForCopy(inPanel(data)))).toEqual(data)
  })

  it('copies non JSON values without devtools metadata', () => {
    class User {
      constructor(public name: string) {}
    }
    const circular: Record<string, unknown> = { id: 1 }
    circular.self = circular

    const copied = stringifyForCopy(
      inPanel({
        big: 10n,
        date: new Date('2026-01-01T00:00:00.000Z'),
        map: new Map([['a', 1]]),
        objectKeyMap: new Map([[{ id: 1 }, 'x']]),
        set: new Set([1, 2]),
        regexp: /a+/gi,
        url: new URL('https://example.com/?q=1'),
        user: new User('Eduardo'),
        error: new TypeError('nope'),
        circular,
      }),
    )

    expect(copied).not.toContain('__custom')
    expect(JSON.parse(copied)).toEqual({
      big: '10',
      date: '2026-01-01T00:00:00.000Z',
      map: { a: 1 },
      objectKeyMap: [[{ id: 1 }, 'x']],
      set: [1, 2],
      regexp: '/a+/gi',
      url: 'https://example.com/?q=1',
      user: { name: 'Eduardo' },
      error: { name: 'TypeError', message: 'nope' },
      circular: { id: 1, self: '[Circular]' },
    })
  })

  it('copies primitive values', () => {
    expect(stringifyForCopy('text')).toBe('"text"')
    expect(stringifyForCopy(undefined)).toBe('undefined')
  })
})
