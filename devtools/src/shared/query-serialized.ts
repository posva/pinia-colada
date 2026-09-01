import type { RefetchOnControl, UseQueryEntry, UseQueryOptionsWithDefaults } from '@pinia/colada'
import type { DEVTOOLS_INFO_KEY } from './plugins/devtools-info'

export interface UseQueryEntryPayload {
  keyHash: string

  key: UseQueryEntry['key']
  state: UseQueryEntry['state']['value']
  asyncStatus: UseQueryEntry['asyncStatus']['value']

  active: UseQueryEntry['active']
  stale: UseQueryEntry['stale']
  when: UseQueryEntry['when']
  options: UseQueryEntryPayloadOptions | null
  deps: UseQueryEntryPayloadDep[]
  gcTimeout: number | null

  devtools: UseQueryEntry[typeof DEVTOOLS_INFO_KEY]
  plugins: Record<string, unknown>
}

export interface UseQueryEntryPayloadDepComponent {
  type: 'component'
  uid: number
  name: string | undefined
}

export interface UseQueryEntryPayloadDepEffect {
  type: 'effect'
  active: boolean
  detached: boolean
}

export type UseQueryEntryPayloadDep =
  | UseQueryEntryPayloadDepComponent
  | UseQueryEntryPayloadDepEffect

export interface UseQueryEntryPayloadOptions extends Pick<
  UseQueryOptionsWithDefaults,
  'gcTime' | 'staleTime'
> {
  // manually overriden to extract only plain values
  enabled: boolean
  refetchOnMount: RefetchOnControl
  refetchOnReconnect: RefetchOnControl
  refetchOnWindowFocus: RefetchOnControl
}

function stringifyDisplayValue(
  this: Record<string, unknown>,
  key: string,
  value: unknown,
): unknown {
  const originalValue = this[key]
  if (originalValue instanceof Date) return `Date(${originalValue.toISOString()})`
  return typeof value === 'bigint' ? `${value}n` : value
}

const VALID_IDENTIFIER_RE = /^[A-Z_$][\w$]*$/i

function isValidIdentifier(key: string): boolean {
  return VALID_IDENTIFIER_RE.test(key)
}

function serializeMiniJson(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'

  if (Array.isArray(value)) {
    return `[${value.map(serializeMiniJson).join(',')}]`
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const entries = Object.keys(obj).map((key) => {
      const k = isValidIdentifier(key) ? key : JSON.stringify(key)
      const v = serializeMiniJson(obj[key])
      return `${k}:${v}`
    })
    return `{${entries.join(',')}}`
  }

  return 'undefined'
}

/**
 * Stringifies a value for display while preserving BigInts.
 *
 * @internal
 */
export function miniJsonStringify(value: unknown): string {
  return JSON.stringify(value, stringifyDisplayValue, 2) ?? String(value)
}

/**
 * Serializes a value into the compact object syntax used in query keys.
 *
 * @internal
 */
export function miniJsonParse(value: unknown): string {
  return serializeMiniJson(value)
}
