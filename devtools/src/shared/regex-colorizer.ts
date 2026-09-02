/*!
 * Regex highlighting adapted from Regex Colorizer by Steven Levithan
 * https://github.com/slevithan/regex-colorizer
 *
 * Copyright (c) 2007-2026 Steven Levithan
 * Copyright (c) 2026 Eduardo San Martin Morote
 * Released under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const CLASS = {
  gray: 'text-(--devtools-syntax-gray)',
  green: 'text-(--devtools-syntax-green)',
  orange: 'text-(--devtools-syntax-orange)',
  purple: 'text-(--devtools-syntax-purple)',
  sapphire: 'text-(--devtools-syntax-sapphire)',
  paleBlue: 'text-(--devtools-syntax-pale-blue)',
  objectBlue: 'text-(--devtools-syntax-object-blue)',
} as const

interface Token {
  text: string
  class: string
}

const GROUP_CLASSES = [
  CLASS.green,
  CLASS.purple,
  CLASS.orange,
  CLASS.sapphire,
  CLASS.paleBlue,
] as const

const META_SEQUENCE =
  /^\\(?:[0-9]+|[bBcdDfnrsStvwWx]|[pP]{[^}]*}|u(?:[\dA-Fa-f]{4}|{[\dA-Fa-f]+})|x[\dA-Fa-f]{2})/
const GROUP_OPENING = /^\(\?(?:<[^=!][^>]*>|<[=!]|[:=!])/
const QUANTIFIER = /^(?:[?*+]|{\d+(?:,\d*)?})\??/

/** Colorizes a valid JavaScript RegExp for the devtools value renderer. */
export function colorizeRegExp(value: RegExp): Token[] {
  const tokens: Token[] = []
  const groups: number[] = []
  const pattern = value.source
  let lastGroupDepth = 0

  pushToken(tokens, '/', CLASS.gray)

  for (let index = 0; index < pattern.length;) {
    const rest = pattern.slice(index)
    const character = pattern[index]!

    if (character === '[') {
      index += colorizeCharacterClass(tokens, rest, value.flags.includes('v'))
      lastGroupDepth = 0
      continue
    }

    if (character === '\\') {
      const backreference = /^\\(?:[1-9]\d*|k<[^>]+>)/.exec(rest)?.[0]
      const escape = backreference || META_SEQUENCE.exec(rest)?.[0] || rest.slice(0, 2)
      pushToken(
        tokens,
        escape,
        backreference
          ? `${CLASS.purple} underline decoration-dotted`
          : META_SEQUENCE.test(escape)
            ? CLASS.objectBlue
            : CLASS.gray,
      )
      index += escape.length
      lastGroupDepth = 0
      continue
    }

    if (character === '(') {
      const opening = GROUP_OPENING.exec(rest)?.[0] || '('
      const depth = ((groups.at(-1) || 0) % GROUP_CLASSES.length) + 1
      groups.push(depth)
      pushToken(tokens, opening, groupClass(depth)!)
      index += opening.length
      lastGroupDepth = 0
      continue
    }

    if (character === ')') {
      lastGroupDepth = groups.pop() || 0
      pushToken(tokens, character, groupClass(lastGroupDepth) || CLASS.objectBlue)
      index++
      continue
    }

    if ('?*+{'.includes(character)) {
      const quantifier = QUANTIFIER.exec(rest)?.[0]
      if (quantifier) {
        pushToken(tokens, quantifier, groupClass(lastGroupDepth) || CLASS.objectBlue)
        index += quantifier.length
        lastGroupDepth = 0
        continue
      }
    }

    if (character === '|') {
      pushToken(tokens, character, groupClass(groups.at(-1) || 0) || CLASS.objectBlue)
      index++
      lastGroupDepth = 0
      continue
    }

    if (character === '^' || character === '$' || character === '.') {
      pushToken(tokens, character, CLASS.objectBlue)
      index++
      lastGroupDepth = 0
      continue
    }

    const literal = /^[^\\[\]()?*+{|^$.]+/.exec(rest)?.[0] || character
    pushToken(tokens, literal, CLASS.paleBlue)
    index += literal.length
    lastGroupDepth = 0
  }

  pushToken(tokens, '/', CLASS.gray)
  if (value.flags) pushToken(tokens, value.flags, CLASS.orange)
  return tokens
}

function colorizeCharacterClass(tokens: Token[], value: string, unicodeSets: boolean): number {
  let index = value[1] === '^' ? 2 : 1
  let nestedClasses = 0

  pushToken(tokens, value.slice(0, index), CLASS.green)

  while (index < value.length) {
    const rest = value.slice(index)
    const character = value[index]!

    if (character === '\\') {
      const escape = META_SEQUENCE.exec(rest)?.[0] || rest.slice(0, 2)
      pushToken(tokens, escape, CLASS.sapphire)
      index += escape.length
    } else if (unicodeSets && character === '[') {
      nestedClasses++
      pushToken(tokens, character, CLASS.green)
      index++
    } else if (character === ']' && nestedClasses) {
      nestedClasses--
      pushToken(tokens, character, CLASS.green)
      index++
    } else if (character === ']') {
      pushToken(tokens, character, CLASS.green)
      return index + 1
    } else if (character === '-') {
      pushToken(tokens, character, `${CLASS.sapphire} underline decoration-dotted`)
      index++
    } else {
      const literal = /^[^\\[\]-]+/.exec(rest)?.[0] || character
      pushToken(tokens, literal, `${CLASS.green} italic`)
      index += literal.length
    }
  }

  return index
}

function groupClass(depth: number): string | undefined {
  return depth ? GROUP_CLASSES[depth - 1] : undefined
}

function pushToken(tokens: Token[], text: string, className: string) {
  const previous = tokens.at(-1)
  if (previous?.class === className) previous.text += text
  else tokens.push({ text, class: className })
}
