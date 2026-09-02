import type { ValueDisplayToken } from './json'
import { colorizePattern } from './regex-colorizer'

const CLASS = {
  gray: 'text-(--devtools-syntax-gray)',
  green: 'text-(--devtools-syntax-green)',
  orange: 'text-(--devtools-syntax-orange)',
  purple: 'text-(--devtools-syntax-purple)',
  red: 'text-(--devtools-syntax-red)',
  sapphire: 'text-(--devtools-syntax-sapphire)',
  paleBlue: 'text-(--devtools-syntax-pale-blue)',
  objectBlue: 'text-(--devtools-syntax-object-blue)',
} as const

interface MarkupTag {
  name: string
  classes: string[]
}

/** Converts regex-colorizer markup into display tokens without creating HTML elements. */
export function adaptRegexColorizerOutput(output: string): ValueDisplayToken[] {
  const tokens: ValueDisplayToken[] = []
  const tags: MarkupTag[] = []

  for (const part of output.match(/<[^>]+>|[^<]+/g) ?? []) {
    const closingTag = /^<\/(\w+)>$/.exec(part)
    if (closingTag) {
      const index = tags.findLastIndex((tag) => tag.name === closingTag[1])
      if (index >= 0) tags.splice(index, 1)
      continue
    }

    const openingTag = /^<(\w+)(?:\s[^>]*)?>$/.exec(part)
    if (openingTag) {
      const className = /\bclass="([^"]*)"/.exec(part)?.[1] || ''
      tags.push({ name: openingTag[1]!, classes: className.split(/\s+/).filter(Boolean) })
      continue
    }

    pushToken(tokens, decodeEntities(part), classForTags(tags))
  }

  return tokens
}

/** Colorizes a RegExp using the devtools token renderer. */
export function colorizeRegExp(value: RegExp): ValueDisplayToken[] {
  return [
    { text: '/', class: CLASS.gray },
    ...adaptRegexColorizerOutput(colorizePattern(value.source, { flags: value.flags })),
    { text: '/', class: CLASS.gray },
    ...(value.flags ? [{ text: value.flags, class: CLASS.orange }] : []),
  ]
}

function classForTags(tags: MarkupTag[]): string {
  const activeClasses = new Set(tags.flatMap((tag) => tag.classes))
  if (activeClasses.has('err')) return `${CLASS.red} font-bold`
  if (activeClasses.has('bref')) return `${CLASS.purple} underline decoration-dotted`
  if (activeClasses.has('g1')) return CLASS.green
  if (activeClasses.has('g2')) return CLASS.purple
  if (activeClasses.has('g3')) return CLASS.orange
  if (activeClasses.has('g4')) return CLASS.sapphire
  if (activeClasses.has('g5')) return CLASS.paleBlue

  const innermost = tags.at(-1)?.name
  const inCharacterClass = tags.some((tag) => tag.name === 'i')
  if (innermost === 'u') return `${CLASS.sapphire} underline decoration-dotted`
  if (innermost === 'span') return inCharacterClass ? CLASS.green : CLASS.gray
  if (innermost === 'b') return inCharacterClass ? CLASS.sapphire : CLASS.objectBlue
  if (inCharacterClass) return `${CLASS.green} italic`
  return CLASS.paleBlue
}

function decodeEntities(value: string): string {
  return value.replace(/&lt;/g, '<').replace(/&amp;/g, '&')
}

function pushToken(tokens: ValueDisplayToken[], text: string, className: string) {
  const previous = tokens.at(-1)
  if (previous?.class === className) previous.text += text
  else tokens.push({ text, class: className })
}
