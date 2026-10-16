import { isObject, isPlainObject } from '@pinia/colada-devtools/shared'

/**
 * Formats a devtools value as JSON for the clipboard.
 *
 * @param value - value displayed in the devtools
 * @throws if the value is not fully JSON serializable
 */
export function stringifyForCopy(value: unknown): string {
  return JSON.stringify(value, rejectNonJSON, 2) ?? String(value)
}

function rejectNonJSON(_key: string, value: unknown): unknown {
  // JSON.stringify silently turns Map, Set, URL, etc. into `{}`
  if (isObject(value) && !Array.isArray(value) && !isPlainObject(value)) {
    throw new TypeError('Value is not JSON serializable')
  }
  return value
}

/**
 * Copies text to the clipboard.
 *
 * @param text - text to copy
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // the panel can run in an iframe without the clipboard-write permission
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
}
