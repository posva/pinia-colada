/**
 * Formats a devtools value as JSON for the clipboard. Values that JSON cannot
 * represent are converted to their closest readable form.
 *
 * @param value - value displayed in the devtools
 */
export function stringifyForCopy(value: unknown): string {
  return JSON.stringify(value, copyReplacer, 2) ?? String(value)
}

function copyReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof RegExp) return value.toString()
  if (value instanceof Set) return Array.from(value)
  if (value instanceof Map) {
    const entries = Array.from(value.entries())
    const canBeObject =
      entries.every(([key]) => typeof key === 'string' || typeof key === 'number') &&
      // 1 and '1' would collide
      new Set(entries.map(([key]) => String(key))).size === entries.length
    return canBeObject ? Object.fromEntries(entries) : entries
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      ...(value.stack !== undefined && { stack: value.stack }),
      ...(value.cause !== undefined && { cause: value.cause }),
      ...value,
    }
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
