/*!
 * Regex Colorizer
 * Copyright (c) 2007-2026 Steven Levithan
 * Released under the MIT License.
 *
 * Vendored from https://github.com/slevithan/regex-colorizer
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

const unicodePropX = '[pP] { (?<property> (?: [A-Za-z_]+ = )? [A-Za-z_]+ ) }'
const cuxTokenX = String.raw`c [A-Za-z] | u (?: [\dA-Fa-f]{4} | { [\dA-Fa-f]+ } ) | x [\dA-Fa-f]{2}`
const octalRange = '[0-3][0-7]{0,2}|[4-7][0-7]?'

const regexToken = new RegExp(
  String.raw`
  \[\^?(?:[^\\\]]+|\\.?)*]?
| \\(?:0(?:${octalRange})?|[1-9]\d*|${cuxTokenX}|k(?:<(?<backrefName>\w+)>)?|${unicodePropX}|.?)
| \((?:\?(?:<(?:[=!]|(?<captureName>[A-Za-z_]\w*)>)|[:=!]))?
| (?:[?*+]|\{\d+(?:,\d*)?\})\??
| [^.?*+^$[\]{}()|\\]+
| .
`.replace(/\s+/g, ''),
  'gs',
)
const charClassToken = new RegExp(
  String.raw`
  [^\\-]+
| \\ (?: ${octalRange} | ${cuxTokenX} | ${unicodePropX} | .? )
| -
`.replace(/\s+/g, ''),
  'gs',
)
const charClassParts = /^(?<opening>\[\^?)(?<content>(?:[^\\\]]+|\\.?)*)(?<closing>]?)$/s
const quantifier = /^(?:[?*+]|\{\d+(?:,\d*)?\})\??$/

const type = {
  NONE: 0,
  RANGE_HYPHEN: 1,
  SHORT_CLASS: 2,
  ALTERNATOR: 3,
} as const

type TokenType = (typeof type)[keyof typeof type]

interface FlagsObject {
  hasIndices: boolean
  global: boolean
  ignoreCase: boolean
  multiline: boolean
  dotAll: boolean
  unicode: boolean
  unicodeSets: boolean
  sticky: boolean
}

interface CharClassState {
  rangeable: boolean
  type?: TokenType
  charCode?: number
}

interface LastTokenState {
  quantifiable: boolean
  type?: TokenType
  groupStyleDepth?: number
}

type OpenGroup = { valid: false; opening: string } | { valid: true; opening: string; index: number }

export interface ColorizePatternOptions {
  flags?: string
}

const error = {
  DUPLICATE_CAPTURE_NAME: 'Duplicate capture name',
  EMPTY_TOP_ALTERNATIVE: 'Empty alternative effectively truncates the regex here',
  INCOMPLETE_TOKEN: 'Token is incomplete',
  INDEX_OVERFLOW: 'Character index cannot use value over 10FFFF',
  INTERVAL_OVERFLOW: 'Interval quantifier cannot use value over 65,535',
  INTERVAL_REVERSED: 'Interval quantifier range is reversed',
  INVALID_BACKREF: 'Backreference to missing or invalid group',
  INVALID_ESCAPE: 'Deprecated escaped literal or octal',
  INVALID_RANGE: 'Reversed or invalid range',
  REQUIRES_ESCAPE: 'Must be escaped unless part of a valid token',
  UNBALANCED_LEFT_PAREN: 'Unclosed grouping',
  UNBALANCED_RIGHT_PAREN: 'No matching opening parenthesis',
  UNCLOSED_CLASS: 'Unclosed character class',
  UNQUANTIFIABLE: 'Preceding token is not quantifiable',
}

// HTML generation functions for regex syntax parts
type GroupRenderer = ((value: string, depth: number) => string) & {
  openingTagLength: number
}

const group = ((value: string, depth: number) =>
  `<b class="g${depth}">${value}</b>`) as GroupRenderer
group.openingTagLength = '<b class="gN">'.length

const to = {
  // Depth is 0-5
  alternator: (value: string, depth: number) =>
    `<b${depth ? ` class="g${depth}"` : ''}>${value}</b>`,
  backref: (value: string) => `<b class="bref">${value}</b>`,
  charClass: (value: string) => `<i>${value}</i>`,
  charClassBoundary: (value: string) => `<span>${value}</span>`,
  error: (value: string, message: string) => `<b class="err" title="${message}">${value}</b>`,
  escapedLiteral: (value: string) => `<span>${value}</span>`,
  // Depth is 1-5
  group,
  metasequence: (value: string) => `<b>${value}</b>`,
  // Depth is 0-5
  quantifier: (value: string, depth: number) =>
    `<b${depth ? ` class="g${depth}"` : ''}>${value}</b>`,
  range: (value: string) => `<u>${value}</u>`,
}

/**
 * Converts special characters to HTML entities.
 * @param {string} str String with characters to expand.
 * @returns {string} String with characters expanded.
 */
function expandEntities(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

/**
 * Converts HTML entities to literal characters.
 * @param {string} str String with entities to collapse.
 * @returns {string} String with entities collapsed.
 */
function collapseEntities(str: string): string {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<')
}

/**
 * Returns the character code for the provided regex token. Supports tokens used within character
 * classes only.
 * @param {string} token Regex token.
 * @returns {number} Character code of the provided token, or NaN.
 */
function getTokenCharCode(token: string): number {
  // Escape sequence
  if (token.length > 1 && token.charAt(0) === '\\') {
    const t = token.slice(1)
    // Control character
    if (/^c[A-Za-z]$/.test(t)) {
      return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(t.charAt(1).toUpperCase()) + 1
    }
    // Two or four digit hexadecimal character code
    if (/^(?:x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4})$/.test(t)) {
      return parseInt(t.slice(1), 16)
    }
    // '\u{...}'
    if (/^u{[\dA-Fa-f]+}$/.test(t)) {
      return parseInt(t.slice(2, -1), 16)
    }
    // One to three digit octal character code up to 377 (0xFF)
    if (new RegExp(`^(?:${octalRange})$`).test(t)) {
      return parseInt(t, 8)
    }
    // Shorthand class or incomplete token
    if (t.length === 1 && 'cuxDdSsWw'.includes(t)) {
      return NaN
    }
    // Metacharacter representing a single character index, or escaped literal character
    if (t.length === 1) {
      switch (t) {
        case 'b':
          return 8 // Backspace
        case 'f':
          return 12 // Form feed
        case 'n':
          return 10 // Line feed
        case 'r':
          return 13 // Carriage return
        case 't':
          return 9 // Horizontal tab
        case 'v':
          return 11 // Vertical tab
        default:
          return t.charCodeAt(0) // Escaped literal character
      }
    }
  }
  // Unescaped literal token(s)
  if (token !== '\\') {
    return token.charCodeAt(0)
  }
  return NaN
}

/**
 * Returns HTML for displaying the given character class with syntax highlighting.
 * Character classes have their own syntax rules which are different (sometimes subtly) from
 * surrounding regex syntax. Hence, they're treated as a single token and parsed separately.
 * @param {string} value Character class pattern to be colorized.
 * @param {Object} flagsObj Whether each flag is enabled.
 * @returns {string}
 */
function parseCharClass(value: string, flagsObj: FlagsObject): string {
  let output = ''
  let lastToken: CharClassState = {
    rangeable: false,
    type: type.NONE,
  }
  const { opening, content, closing } = charClassParts.exec(value)!.groups!

  const matches = content.matchAll(charClassToken)
  for (const match of matches) {
    const m = match[0]
    // Escape
    if (m.charAt(0) === '\\') {
      // Inside character classes, browsers differ on how they handle the following:
      // - Any representation of character index zero (\0, \00, \000, \x00, \u0000)
      // - '\c', when not followed by A-Z or a-z
      // - '\x', when not followed by two hex characters
      // - '\u', when not followed by four hex characters
      // However, although representations of character index zero within character classes don't
      // work on their own in old Firefox, they don't throw an error, they work when used with
      // ranges, and it's highly unlikely that the user will actually have such a character in
      // their test data, so such tokens are highlighted normally. The remaining metasequences
      // are flagged as errors
      // '\c', '\u', '\x'
      if (/^\\[cux]$/.test(m)) {
        output += to.error(m, error.INCOMPLETE_TOKEN)
        lastToken = {
          rangeable: lastToken.type !== type.RANGE_HYPHEN,
        }
        // '\p' or '\P' in Unicode mode
      } else if (flagsObj.unicode && /^\\p$/i.test(m)) {
        output += to.error(m, error.INCOMPLETE_TOKEN)
        lastToken = {
          rangeable: lastToken.type !== type.RANGE_HYPHEN,
          type: type.SHORT_CLASS,
        }
        // Shorthand class (matches more than one character index)
      } else if (/^\\[dsw]$/i.test(m)) {
        output += to.metasequence(m)
        // Traditional regex behavior is that a shorthand class should be unrangeable. Hence,
        // [-\dz], [\d-z], and [z-\d] should all be equivalent. However, some old browsers handle
        // this inconsistently. Ex: Firefox 2 throws an invalid range error for [z-\d] and [\d--]
        lastToken = {
          rangeable: lastToken.type !== type.RANGE_HYPHEN,
          type: type.SHORT_CLASS,
        }
        // Unescaped '\' at the end of the regex
      } else if (m === '\\') {
        output += to.error(m, error.INCOMPLETE_TOKEN)
        // Don't need to set lastToken since this is the end of the line
        // '\p{...}' or '\P{...}': Unicode property in Unicode mode, or escaped literal '\p' and following chars
      } else if (match.groups?.property) {
        if (flagsObj.unicode) {
          output += to.metasequence(m)
          lastToken = {
            rangeable: lastToken.type !== type.RANGE_HYPHEN,
            type: type.SHORT_CLASS,
          }
        } else {
          output += to.metasequence(m.slice(0, 2)) + m.slice(2)
          lastToken = {
            rangeable: true,
            charCode: getTokenCharCode('}'),
          }
        }
        // Unicode mode: escaped literal character or octal with leading zero becomes error
      } else if (
        flagsObj.unicode &&
        /^\\(?:[^^$?*+.|(){}[\]\\/\-0bcdDfnpPrsStuvwWx]|0\d)/.test(m)
      ) {
        output += to.error(expandEntities(m), error.INVALID_ESCAPE)
        lastToken = {
          rangeable: lastToken.type !== type.RANGE_HYPHEN,
        }
        // '\u{...}'
      } else if (m.startsWith('\\u{')) {
        if (flagsObj.unicode) {
          const charCode = getTokenCharCode(m)
          output += charCode <= 0x10_ff_ff ? to.metasequence(m) : to.error(m, error.INDEX_OVERFLOW)
          lastToken = {
            rangeable: lastToken.type !== type.RANGE_HYPHEN,
            charCode,
          }
        } else {
          output += to.error('\\u', error.INCOMPLETE_TOKEN) + m.slice(2)
          lastToken = {
            rangeable: true,
            charCode: getTokenCharCode('}'),
          }
        }
        // Metasequence representing a single character index
      } else {
        output += to.metasequence(expandEntities(m))
        lastToken = {
          rangeable: lastToken.type !== type.RANGE_HYPHEN,
          charCode: getTokenCharCode(m),
        }
      }
      // Hyphen (might indicate a range)
    } else if (m === '-') {
      if (lastToken.rangeable) {
        // Copy the regex to not mess with its lastIndex
        const tokenCopy = new RegExp(charClassToken)
        tokenCopy.lastIndex = match.index + match[0].length
        const nextToken = tokenCopy.exec(content)

        if (nextToken) {
          const nextTokenCharCode = getTokenCharCode(nextToken[0])
          // Hypen for a reverse range (ex: z-a) or shorthand class (ex: \d-x or x-\S)
          if (
            (!isNaN(nextTokenCharCode) && lastToken.charCode! > nextTokenCharCode) ||
            lastToken.type === type.SHORT_CLASS ||
            /^\\[dsw]$/i.test(nextToken[0]) ||
            (flagsObj.unicode && nextToken.groups?.property)
          ) {
            output += to.error('-', error.INVALID_RANGE)
            // Hyphen creating a valid range
          } else {
            output += to.range('-')
          }
          lastToken = {
            rangeable: false,
            type: type.RANGE_HYPHEN,
          }
        } else {
          // Hyphen at the end of a properly closed character class (literal character)
          if (closing) {
            // Since this is a literal, it's technically rangeable, but that doesn't matter
            output += '-'
            // Hyphen at the end of an unclosed character class (i.e., the end of the regex)
          } else {
            output += to.range('-')
          }
        }
        // Hyphen at the beginning of a character class or after a non-rangeable token
      } else {
        output += '-'
        lastToken = {
          rangeable: lastToken.type !== type.RANGE_HYPHEN,
        }
      }
      // Literal character sequence
      // Sequences of unescaped, literal tokens are matched in one step
    } else {
      output += expandEntities(m)
      lastToken = {
        rangeable: m.length > 1 || lastToken.type !== type.RANGE_HYPHEN,
        charCode: m.charCodeAt(m.length - 1),
      }
    }
  }

  if (closing) {
    output = to.charClassBoundary(opening) + output + to.charClassBoundary(closing)
  } else {
    output = to.error(opening, error.UNCLOSED_CLASS) + output
  }
  return output
}

/**
 * Returns details about the overall pattern.
 * @param {string} pattern Regex pattern to be searched.
 * @returns {Object}
 */
function getPatternDetails(pattern: string) {
  const captureNames = new Set<string>()
  let totalCaptures = 0
  const matches = pattern.matchAll(regexToken)
  for (const match of matches) {
    const captureName = match.groups?.captureName
    if (captureName) {
      captureNames.add(captureName)
    }
    if (/^\((?=\?<(?![=!])|$)/.test(match[0])) {
      totalCaptures++
    }
  }
  return {
    captureNames,
    totalCaptures,
  }
}

/**
 * Returns an object indicating whether each flag property is enabled. Throws if duplicate,
 * unknown, or unsupported flags are provided.
 * @param {string} flags Regex flags.
 * @returns {Object}
 */
function getFlagsObj(flags: string): FlagsObject {
  const flagNames = {
    d: 'hasIndices',
    g: 'global',
    i: 'ignoreCase',
    m: 'multiline',
    s: 'dotAll',
    u: 'unicode',
    v: 'unicodeSets',
    y: 'sticky',
  } as const satisfies Record<string, keyof FlagsObject>
  const flagsObj = Object.fromEntries(
    Object.values(flagNames).map((value) => [value, false]),
  ) as unknown as FlagsObject
  const flagsSet = new Set<string>()
  for (const char of flags) {
    if (flagsSet.has(char)) {
      throw new Error(`Duplicate flag: ${char}`)
    }
    if (!Object.hasOwn(flagNames, char)) {
      throw new Error(`Unknown flag: ${char}`)
    }
    flagsSet.add(char)
    flagsObj[flagNames[char as keyof typeof flagNames]] = true
  }
  if (flagsObj.unicodeSets) {
    throw new Error('Flag v is not yet supported')
  }
  return flagsObj
}

/**
 * Returns HTML for displaying the given regex with syntax highlighting.
 * @param {string} pattern Regex pattern to be colorized.
 * @param {Object} [options]
 * @param {string} [options.flags] Any combination of valid flags.
 * @returns {string} HTML with highlighting.
 */
export function colorizePattern(
  pattern: string,
  { flags = '' }: ColorizePatternOptions = {},
): string {
  // Validate flags and use for regex syntax changes
  const flagsObj = getFlagsObj(flags)
  const {
    // Having any named captures changes the meaning of '\k'
    captureNames,
    // Used to determine whether escaped numbers should be treated as backrefs
    totalCaptures,
  } = getPatternDetails(pattern)
  const usedCaptureNames = new Set<string>()
  const openGroups: OpenGroup[] = []
  let capturingGroupCount = 0
  let groupStyleDepth = 0
  let lastToken: LastTokenState = {
    quantifiable: false,
    type: type.NONE,
  }
  let output = ''

  const matches = pattern.matchAll(regexToken)
  for (const match of matches) {
    const m = match[0]
    const char0 = m.charAt(0)
    const char1 = m.charAt(1)
    // Character class
    if (char0 === '[') {
      output += to.charClass(parseCharClass(m, flagsObj))
      lastToken = {
        quantifiable: true,
      }
      // Group opening
    } else if (char0 === '(') {
      const captureName = match.groups?.captureName
      groupStyleDepth = groupStyleDepth === 5 ? 1 : groupStyleDepth + 1
      // '(?<name>' with a duplicate name
      if (captureName && usedCaptureNames.has(captureName)) {
        openGroups.push({
          valid: false,
          opening: expandEntities(m),
        })
        output += to.error(expandEntities(m), error.DUPLICATE_CAPTURE_NAME)
        // Valid group
      } else {
        if (m === '(' || captureName) {
          capturingGroupCount++
          if (captureName) {
            usedCaptureNames.add(captureName)
          }
        }
        // Record the group opening's position and value so we can mark it later as invalid if it
        // turns out to be unclosed in the remainder of the regex
        openGroups.push({
          valid: true,
          opening: expandEntities(m),
          index: output.length + to.group.openingTagLength,
        })
        output += to.group(expandEntities(m), groupStyleDepth)
      }
      lastToken = {
        quantifiable: false,
      }
      // Group closing
    } else if (m === ')') {
      // If this is an invalid group closing
      const openGroup = openGroups.at(-1)
      if (!openGroup?.valid) {
        output += to.error(m, error.UNBALANCED_RIGHT_PAREN)
        lastToken = {
          quantifiable: false,
        }
      } else {
        output += to.group(m, groupStyleDepth)
        // Although it's possible to quantify lookarounds, this adds no value, doesn't work as
        // you'd expect in JavaScript, and is an error with flag u or v (and in some other regex
        // flavors such as PCRE), so flag them as unquantifiable
        lastToken = {
          quantifiable: !/^\(\?<?[=!]/.test(collapseEntities(openGroup.opening)),
          groupStyleDepth,
        }
      }
      groupStyleDepth = groupStyleDepth === 1 ? 5 : groupStyleDepth - 1
      // Drop the last opening paren from depth tracking
      openGroups.pop()
      // Escape or backreference
    } else if (char0 === '\\') {
      // Backreference, octal character code without a leading zero, or a literal '\8' or '\9'
      if (/^[1-9]/.test(char1)) {
        // What does '\10' mean (outside a character class)?
        // Non-Unicode mode:
        // - Backref 10, if 10 or more capturing groups anywhere in the pattern
        // - Octal character index 10, if less than 10 capturing groups anywhere in the pattern
        //   (since 10 is in octal range 0-377)
        // Ex: `\1000\1(a)\10\1\1000` matches '\u{40}0a\u{8}a\u{40}0'
        // Ex: `\3\377(a)\3\377` matches '\u{3}\u{FF}a\u{3}\u{FF}'
        // Ex: `\3\377()()(a)\3\377` matches '\u{FF}aa\u{FF}'
        // In fact, octals are not included in ES3+, but browsers support them for backcompat.
        // With flag u or v (Unicode mode):
        // - Escaped digits must be a backref or \0 (character index 0) and can't be immediately
        //   followed by digits
        // - An escaped number is a valid backreference if there are as many capturing groups
        //   anywhere in the pattern
        // Numbered backreference
        if (+m.slice(1) <= totalCaptures) {
          output += to.backref(m)
          lastToken = {
            quantifiable: true,
          }
        } else {
          // Unicode mode: error
          if (flagsObj.unicode) {
            output += to.error(m, error.INVALID_BACKREF)
            lastToken = {
              quantifiable: false,
            }
            // Octal followed by literal, or escaped literal followed by literal
          } else {
            const { escapedNum, escapedLiteral, literal } = new RegExp(
              String.raw`^\\(?<escapedNum>${octalRange}|(?<escapedLiteral>[89]))(?<literal>\d*)`,
            ).exec(m)!.groups!
            if (escapedLiteral) {
              // For \8 and \9 (escaped non-octal digits) when as many capturing groups aren't in
              // the pattern, they match '8' and '9' (when not using flag u or v).
              // Ex: `\8(a)\8` matches '8a8'
              // Ex: `\8()()()()()()()(a)\8` matches 'aa'
              // Ex: `\80()()()()()()()(a)\80` matches '80a80'
              output += `${to.escapedLiteral(`\\${escapedLiteral}`)}${literal}`
            } else {
              output += `${to.metasequence(`\\${escapedNum}`)}${literal}`
            }
            lastToken = {
              quantifiable: true,
            }
          }
        }
        // Named backreference, \k token with error, or a literal '\k' or '\k<name>'
      } else if (char1 === 'k') {
        // What does '\k' or '\k<name>' mean?
        // - If a named capture appears anywhere (before or after), treat as backreference
        // - Otherwise, it's a literal '\k' plus any following chars
        // - In backreference mode, error if name doesn't appear in a capture (before or after)
        // With flag u or v, the rules change to always use backreference mode
        // Backreference mode for \k
        if (captureNames.size) {
          // Valid
          if (captureNames.has(match.groups?.backrefName ?? '')) {
            output += to.backref(expandEntities(m))
            lastToken = {
              quantifiable: true,
            }
            // References a missing or invalid (ex: \k<1>) named group
          } else if (m.endsWith('>')) {
            output += to.error(expandEntities(m), error.INVALID_BACKREF)
            lastToken = {
              quantifiable: false,
            }
            // '\k'
          } else {
            output += to.error(m, error.INCOMPLETE_TOKEN)
            lastToken = {
              quantifiable: false,
            }
          }
          // Unicode mode with no named captures: \k is an error
        } else if (flagsObj.unicode) {
          output += to.error(expandEntities(m), error.INVALID_BACKREF)
          lastToken = {
            quantifiable: false,
          }
          // Literal mode for \k
        } else {
          output += to.escapedLiteral('\\k') + expandEntities(m.slice(2))
          lastToken = {
            quantifiable: true,
          }
        }
        // '\p{...}' or '\P{...}': Unicode property in Unicode mode, or escaped literal '\p' and following chars
      } else if (match.groups?.property) {
        if (flagsObj.unicode) {
          output += to.metasequence(m)
        } else {
          output += to.escapedLiteral(`\\${char1}`) + m.slice(2)
        }
        lastToken = {
          quantifiable: true,
        }
        // Incomplete Unicode property in Unicode mode
        // This condition isn't required here but allows for a more specific error
      } else if (flagsObj.unicode && 'pP'.includes(char1)) {
        output += to.error(m, error.INCOMPLETE_TOKEN)
        lastToken = {
          quantifiable: false,
        }
        // Metasequence (shorthand class, word boundary, control character, octal with a leading zero, etc.)
      } else if (/^[0bBcdDfnrsStuvwWx]/.test(char1)) {
        // Browsers differ on how they handle:
        // - '\c', when not followed by A-Z or a-z
        // - '\x', when not followed by two hex characters
        // - '\u', when not followed by four hex characters
        // Hence, such metasequences are flagged as errors
        if (/^\\[cux]$/.test(m)) {
          output += to.error(m, error.INCOMPLETE_TOKEN)
          lastToken = {
            quantifiable: false,
          }
          // '\u{...}'
        } else if (m.startsWith('\\u{')) {
          if (flagsObj.unicode) {
            const charCode = getTokenCharCode(m)
            output +=
              charCode <= 0x10_ff_ff ? to.metasequence(m) : to.error(m, error.INDEX_OVERFLOW)
            lastToken = {
              quantifiable: true,
            }
            // Non-Unicode mode and '\u{...}' includes only decimal digits, so treat as an escaped
            // literal 'u' followed by a quantifier
          } else if (/^\\u{\d+}$/.test(m)) {
            // If there's a following `?` it will be handled as the next token which technically
            // isn't correct, but everything is still highlighted correctly apart from the gap in
            // tokens that might be visible depending on styling
            output +=
              to.error('\\u', error.INCOMPLETE_TOKEN) + to.error(m.slice(2), error.UNQUANTIFIABLE)
            lastToken = {
              quantifiable: false,
            }
            // Non-Unicode mode and '\u{...}' includes hex digits A-F/a-f
          } else {
            output += to.error('\\u', error.INCOMPLETE_TOKEN) + m.slice(2)
            lastToken = {
              quantifiable: true,
            }
          }
          // Unquantifiable metasequence
        } else if ('bB'.includes(char1)) {
          output += to.metasequence(m)
          lastToken = {
            quantifiable: false,
          }
          // Unicode mode: octal with a leading zero
        } else if (flagsObj.unicode && /^\\0\d/.test(m)) {
          output += to.error(m, error.INVALID_ESCAPE)
          lastToken = {
            quantifiable: false,
          }
          // Quantifiable metasequence
        } else {
          output += to.metasequence(m)
          lastToken = {
            quantifiable: true,
          }
        }
        // Unescaped '\' at the end of the regex
      } else if (m === '\\') {
        output += to.error(m, error.INCOMPLETE_TOKEN)
        // Don't need to set lastToken since this is the end of the line
        // Escaped literal character in Unicode mode
      } else if (flagsObj.unicode && /^[^^$?*+.|(){}[\]\\/]$/.test(char1)) {
        output += to.error(expandEntities(m), error.INVALID_ESCAPE)
        lastToken = {
          quantifiable: false,
        }
        // Escaped special or literal character
      } else {
        output += to.escapedLiteral(expandEntities(m))
        lastToken = {
          quantifiable: true,
        }
      }
      // Quantifier
    } else if (quantifier.test(m)) {
      if (lastToken.quantifiable) {
        const interval = /^\{(\d+)(?:,(\d*))?/.exec(m)
        // Interval quantifier out of range for old Firefox
        if (interval && (+interval[1] > 65_535 || (interval[2] && +interval[2] > 65_535))) {
          output += to.error(m, error.INTERVAL_OVERFLOW)
          // Interval quantifier in reverse numeric order
        } else if (interval && interval[2] && +interval[1] > +interval[2]) {
          output += to.error(m, error.INTERVAL_REVERSED)
        } else {
          // Quantifiers for groups are shown in the style of the (preceeding) group's depth
          output += to.quantifier(m, lastToken.groupStyleDepth ?? 0)
        }
      } else {
        output += to.error(m, error.UNQUANTIFIABLE)
      }
      lastToken = {
        quantifiable: false,
      }
      // Alternation
    } else if (m === '|') {
      // If there is a vertical bar at the very start of the regex, flag it as an error since it
      // effectively truncates the regex at that point. If two top-level vertical bars are next
      // to each other, flag it as an error for the same reason
      if (
        lastToken.type === type.NONE ||
        (lastToken.type === type.ALTERNATOR && !openGroups.length)
      ) {
        output += to.error(m, error.EMPTY_TOP_ALTERNATIVE)
      } else {
        // Alternators within groups are shown in the style of the containing group's depth
        output += to.alternator(m, openGroups.length && groupStyleDepth)
      }
      lastToken = {
        quantifiable: false,
        type: type.ALTERNATOR,
      }
      // ^ or $ anchor
    } else if (m === '^' || m === '$') {
      output += to.metasequence(m)
      lastToken = {
        quantifiable: false,
      }
      // Dot (.)
    } else if (m === '.') {
      output += to.metasequence(m)
      lastToken = {
        quantifiable: true,
      }
      // Unicode mode: Unescaped '{', '}', ']'
    } else if (flagsObj.unicode && '{}]'.includes(m)) {
      output += to.error(m, error.REQUIRES_ESCAPE)
      lastToken = {
        quantifiable: false,
      }
      // Literal character sequence
      // Sequences of unescaped, literal tokens are matched in one step, except the following which
      // are matched on their own:
      // - '{' when not part of a quantifier (non-Unicode mode: allow `{{1}`; Unicode mode: error)
      // - '}' and ']' (Unicode mode: error)
    } else {
      output += expandEntities(m)
      lastToken = {
        quantifiable: true,
      }
    }
  }

  // Mark the opening character sequence for each unclosed grouping as invalid
  let numCharsAdded = 0
  for (const openGroup of openGroups) {
    // Skip groups that are already marked as errors
    if (!openGroup.valid) {
      continue
    }
    const errorIndex = openGroup.index + numCharsAdded
    output =
      output.slice(0, errorIndex) +
      to.error(openGroup.opening, error.UNBALANCED_LEFT_PAREN) +
      output.slice(errorIndex + openGroup.opening.length)
    numCharsAdded += to.error('', error.UNBALANCED_LEFT_PAREN).length
  }

  return output
}
