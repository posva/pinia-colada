import type { RefetchOnControl, UseQueryEntry, UseQueryOptionsWithDefaults } from '@pinia/colada'
import type { DEVTOOLS_INFO_KEY } from './devtools-info-pinia-plugin'

/**
 * Payload of query entries sent to the devtools.
 *
 * @internal
 */
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
}

/**
 * Dependency of a query entry as a component
 *
 * @see {@link UseQueryEntryPayload.deps}
 * @see {@link UseQueryEntryPayloadDepEffect}
 * @see {@link UseQueryEntryPayloadDep}
 *
 * @internal
 */
export interface UseQueryEntryPayloadDepComponent {
  type: 'component'
  uid: number
  name: string | undefined
}

/**
 * Dependency of a query entry as an effect.
 *
 * @see {@link UseQueryEntryPayload.deps}
 * @see {@link UseQueryEntryPayloadDepComponent}
 * @see {@link UseQueryEntryPayloadDep}
 *
 * @internal
 */
export interface UseQueryEntryPayloadDepEffect {
  type: 'effect'
  active: boolean
  detached: boolean
}

/**
 * Dependency of a query entry.
 *
 * @see {@link UseQueryEntryPayload.deps}
 *
 * @internal
 */
export type UseQueryEntryPayloadDep =
  | UseQueryEntryPayloadDepComponent
  | UseQueryEntryPayloadDepEffect

/**
 * Serialized options of a query entry. Does not include functions and other
 * non-serializable values.
 *
 * @internal
 */
export interface UseQueryEntryPayloadOptions
  extends Pick<UseQueryOptionsWithDefaults, 'gcTime' | 'staleTime'> {
  // manually overriden to extract only plain values
  enabled: boolean
  refetchOnMount: RefetchOnControl
  refetchOnReconnect: RefetchOnControl
  refetchOnWindowFocus: RefetchOnControl
}

const isValidIdentifier = (key: string): boolean => /^[A-Z_$][\w$]*$/i.test(key)

export function miniJsonParse(value: unknown): string {
  const serialize = (val: unknown): string => {
    if (val === null) return 'null'
    if (typeof val === 'number') return val.toString()
    if (typeof val === 'string') return JSON.stringify(val)
    if (typeof val === 'boolean') return val ? 'true' : 'false'

    if (Array.isArray(val)) {
      return `[${val.map(serialize).join(',')}]`
    }

    if (typeof val === 'object') {
      const obj = val as Record<string, unknown>
      const entries = Object.keys(obj).map((key) => {
        const k = isValidIdentifier(key) ? key : JSON.stringify(key)
        const v = serialize(obj[key])
        return `${k}:${v}`
      })
      return `{${entries.join(',')}}`
    }

    return 'undefined' // or throw if you prefer to exclude unsupported values
  }

  return serialize(value)
}
