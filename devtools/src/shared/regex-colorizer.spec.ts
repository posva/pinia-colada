import { describe, expect, it } from 'vitest'
import { colorizeRegExp } from './regex-colorizer'

describe('regex colorizer', () => {
  it('colorizes a RegExp as display tokens', () => {
    const regexp = /^(?<word>[a-z]+)-(?:\d{2}|\k<word>)$/giu
    const tokens = colorizeRegExp(regexp)

    expect(tokens.map((token) => token.text).join('')).toBe(regexp.toString())
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: '^', class: 'text-(--devtools-syntax-object-blue)' }),
        expect.objectContaining({ text: '\\d{2}', class: 'text-(--devtools-syntax-object-blue)' }),
        expect.objectContaining({ text: 'giu', class: 'text-(--devtools-syntax-orange)' }),
      ]),
    )
    expect(tokens.some((token) => token.text.includes('[') && token.class?.includes('green'))).toBe(
      true,
    )
  })

  it('keeps special characters as plain data', () => {
    const regexp = /(?<tag><&\w+>)\s+\k<tag>/u
    const tokens = colorizeRegExp(regexp)

    expect(tokens.map((token) => token.text).join('')).toBe(regexp.toString())
    expect(tokens.some((token) => token.class?.includes('underline'))).toBe(true)
  })

  it.each([/(?:)/, /a\/b\\c/, /((a|b)+)(?:c?)/, /[^\]\\-]/, /\p{Script=Greek}+/u])(
    'preserves %s exactly',
    (regexp) => {
      expect(
        colorizeRegExp(regexp)
          .map((token) => token.text)
          .join(''),
      ).toBe(regexp.toString())
    },
  )
})
