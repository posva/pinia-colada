import { describe, expect, it } from 'vitest'
import { adaptRegexColorizerOutput, colorizeRegExp } from './regex-colorizer-adapter'
import { colorizePattern } from './regex-colorizer'

describe('regex colorizer adapter', () => {
  it('converts colorizer markup to display tokens without DOM elements', () => {
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

  it('adapts markup as plain data', () => {
    const output = colorizePattern(String.raw`(?<tag>\w+)\s+\k<tag>`, { flags: 'u' })
    const tokens = adaptRegexColorizerOutput(output)

    expect(tokens.map((token) => token.text).join('')).toBe(String.raw`(?<tag>\w+)\s+\k<tag>`)
    expect(tokens.some((token) => token.class?.includes('underline'))).toBe(true)
  })
})
