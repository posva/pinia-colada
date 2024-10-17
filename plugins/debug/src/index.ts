import { defineStore } from 'pinia'
import { ref, shallowReactive } from 'vue'
import type { PiniaColadaPlugin, UseQueryEntry } from '@pinia/colada'

const tick = () => new Promise((r) => setTimeout(r, 0))

export const useDebugData = defineStore('pinia-colada-debug', () => {
  const totalRefetches = ref(0)
  const refetchingEntries = shallowReactive(new Set<UseQueryEntry>())
  const totalErrors = ref(0)
  const totalSuccess = ref(0)

  function addRefetchingEntry(entry: UseQueryEntry) {
    refetchingEntries.add(entry)
    totalRefetches.value++
  }

  function removeRefetchingEntry(entry: UseQueryEntry) {
    refetchingEntries.delete(entry)
  }

  return {
    refetchingEntries,
    totalErrors,
    totalSuccess,
    totalRefetches,
    addRefetchingEntry,
    removeRefetchingEntry,
  }
})

export function PiniaColadaDebugPlugin(): PiniaColadaPlugin {
  return ({ queryCache, pinia }) => {
    const debugData = useDebugData(pinia)

    queryCache.$onAction(async ({ name, onError, after, args }) => {
      if (name === 'fetch' || name === 'refresh') {
        const [entry] = args
        await tick()
        if (
          entry.asyncStatus.value === 'loading'
          || entry.state.value.status === 'pending'
        ) {
          debugData.addRefetchingEntry(entry)
          showMessage('🔄', 'refetch', `[${entry.key.join(', ')}]`, entry)

          after(() => {
            debugData.removeRefetchingEntry(entry)
            if (entry.state.value.status === 'error') {
              debugData.totalErrors++
              showMessage(
                'error',
                'refetch failed',
                `[${entry.key.join(', ')}]`,
                entry.state.value.error,
              )
            } else {
              debugData.totalSuccess++
              showMessage(
                '✅',
                'refetch',
                `[${entry.key.join(', ')}]`,
                entry.state.value.data,
              )
            }
          })

          onError((error) => {
            showMessage(
              'error',
              'Unexpected Error',
              `[${entry.key.join(', ')}]`,
              error,
            )
          })
        }
      } else if (name === 'setQueryData') {
        const [key, data] = args
        showMessage('log', 'setQueryData', `[${key.join(', ')}]`, data)
      } else if (name === 'invalidate') {
        const [entry] = args
        showMessage('🗑️', 'invalidateEntry', `[${entry.key.join(', ')}]`)
      }
    })
  }
}

export type LogeMessageType =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'trace'
  | 'log'

const LOG_MESSAGES_COLOR: Partial<Record<string, string>> = {
  info: 'background: #bfdbfe; color: #1e1e1e',
  log: 'background: #f9fafb; color: #1e1e1e',
  warn: 'background: #f97316; color: #0b0b0b',
  error: 'background: #ff5e56; color: #2e2e2e',
  debug: 'background: #212a2b; color: #fefefe',
  trace: 'background: #000; color: #fff',
}

const LABELS_FOR_TYPE: Partial<Record<string, string>> = {
  info: 'ℹ️',
  log: '📝',
  // warn: '⚠️', // NOTE: doesn't show well in Chromium browsers
  warn: '🚧',
  error: '⛔️',
  debug: '🐞',
  trace: '🔍',
}

const MD_BOLD_RE = /\*\*(.*?)\*\*/g
// Underscores appear to often to deal with them with just a regexp
// const MD_ITALIC_RE = /_(.*?)_/g
const MD_CODE_RE = /`(.*?)`/g

/**
 * Applies italic and bold style to markdown text.
 * @param text - The text to apply styles to
 */
function applyTextStyles(text: string) {
  const styles: Array<{ pos: number, style: [string, string] }> = []

  const newText = text
    .replace(MD_BOLD_RE, (_m, text, pos) => {
      styles.push({
        pos,
        style: ['font-weight: bold;', 'font-weight: normal;'],
      })
      return `%c${text}%c`
    })
    // .replace(MD_ITALIC_RE, (_m, text, pos) => {
    //   styles.push({
    //     pos,
    //     style: ['font-style: italic;', 'font-style: normal;'],
    //   })
    //   return `%c${text}%c`
    // })
    .replace(MD_CODE_RE, (_m, text, pos) => {
      styles.push({
        pos,
        style: ['font-family: monospace;', 'font-family: inherit;'],
      })
      return `%c\`${text}\`%c`
    })
  return [
    newText,
    ...styles.sort((a, b) => a.pos - b.pos).flatMap((s) => s.style),
  ]
}

/**
 * Creates a union type that still allows autocompletion for strings.
 *@internal
 */
type _LiteralStringUnion<LiteralType, BaseType extends string = string> =
  | LiteralType
  | (BaseType & Record<never, never>)

export function showMessage(
  type: _LiteralStringUnion<LogeMessageType>,
  title: string,
  subtitle: string,
  ...messages: any[]
) {
  // only keep errors and warns in tests
  if (
    process.env.NODE_ENV !== 'development'
    && type !== 'error'
    && type !== 'warn'
  ) {
    return
  }

  const isGroup = messages.length > 0
  const label = LABELS_FOR_TYPE[type] ?? type
  const labelStyle = LOG_MESSAGES_COLOR[type] ?? LOG_MESSAGES_COLOR.info!

  const collapsed = true

  const method = isGroup ? (collapsed ? 'groupCollapsed' : 'group') : 'log'
  // const logMethod = type === LogMessageType.error ? 'error' : type === LogMessageType.warn ? 'warn' : 'log'

  const color = '#e2e8f0'
  const bgColor = '#171717'

  console[method](
    `%c ${label} %c ${title} %c ${subtitle}`,
    `${labelStyle}; padding: 1px; border-radius: 0.3em 0 0 0.3em; font-size: 1em;`,
    `background:${bgColor}; color: ${color}; padding: 1px; border-radius: 0 0.3em 0.3em 0; font-size: 1em;`,
    // reset styles
    'background: transparent; color: inherit; font-weight: normal; font-size: 1em;',
  )

  let activeStyle = ''

  messages.forEach((m) => {
    let tempStyle = ''
    let mdStyles: string[] = []
    if (m instanceof Error) {
      console.error(m)
    } else if (m !== undefined) {
      if (typeof m !== 'string') {
        console.log(m)
        return
      }

      if (m.startsWith('```')) {
        activeStyle = `font-family: monospace;`
        tempStyle += `color: gray; padding: 1px; border-radius: ${m === '```' ? '0 0 3px 3px' : '3px 3px 0 0'};`
      } else if (typeof m === 'string' && !m.includes('http')) {
        ;[m, ...mdStyles] = applyTextStyles(m)
      }

      if (activeStyle || tempStyle) {
        console.log(`%c${m}`, activeStyle + tempStyle, ...mdStyles)
      } else {
        console.log(m, ...mdStyles)
      }
      if (m === '```') {
        activeStyle = ''
      } else if (m.startsWith('```')) {
        activeStyle
          += 'background-color: black; color: palegreen; padding: 0.5em; width: 100%;'
      }
    }
  })

  if (isGroup) console.groupEnd()
}
