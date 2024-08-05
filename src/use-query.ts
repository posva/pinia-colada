import type { ComputedRef, MaybeRefOrGetter, ShallowRef } from 'vue'
import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  onMounted,
  onScopeDispose,
  onServerPrefetch,
  onUnmounted,
  toValue,
  watch,
} from 'vue'
import { IS_CLIENT, useEventListener } from './utils'
import {
  queryEntry_addDep,
  queryEntry_removeDep,
  useQueryCache,
} from './query-store'
import { useQueryOptions } from './query-options'
import type { EntryKey } from './entry-options'
import type {
  UseQueryOptions,
  UseQueryOptionsWithDefaults,
} from './query-options'
import type { ErrorDefault } from './types-extension'
import { getCurrentDefineQueryEffect } from './define-query'
import type {
  DataState,
  DataStateStatus,
  OperationStateStatus,
} from './data-state'

/**
 * Return type of `useQuery()`.
 */
export interface UseQueryReturn<TResult = unknown, TError = ErrorDefault> {
  /**
   * The state of the query. Contains its data, error, and status.
   */
  state: ComputedRef<DataState<TResult, TError>>

  /**
   * Status of the query. Becomes `'running'` while the query is being fetched.
   */
  queryStatus: ComputedRef<OperationStateStatus>

  /**
   * The last successful data resolved by the query.
   */
  data: ShallowRef<TResult | undefined>

  /**
   * The error rejected by the query.
   */
  error: ShallowRef<TError | null>

  /**
   * The status of the query.
   * @see {@link DataStateStatus}
   */
  status: ShallowRef<DataStateStatus>

  /**
   * Returns whether the request is still pending its first call. Alias for `status.value === 'pending'`
   */
  isPending: ComputedRef<boolean>

  /**
   * Returns whether the request is currently fetching data.
   */
  isFetching: ShallowRef<boolean>

  /**
   * Ensures the current data is fresh. If the data is stale, refetch, if not return as is.
   * @returns a promise that resolves when the refresh is done
   */
  refresh: () => Promise<DataState<TResult, TError>>

  /**
   * Ignores fresh data and triggers a new fetch
   * @returns a promise that resolves when the fetch is done
   */
  refetch: () => Promise<DataState<TResult, TError>>
}

/**
 * Ensures and return a shared query state based on the `key` option.
 *
 * @param _options - The options of the query
 */
export function useQuery<TResult, TError = ErrorDefault>(
  _options: UseQueryOptions<TResult, TError>,
): UseQueryReturn<TResult, TError> {
  const cacheEntries = useQueryCache()
  const USE_QUERY_DEFAULTS = useQueryOptions()
  // const effect = (getActivePinia() as any)._e as EffectScope

  const options = {
    ...USE_QUERY_DEFAULTS,
    ..._options,
  } satisfies UseQueryOptionsWithDefaults<TResult, TError>

  // TODO:
  // allows warning against potentially wrong usage
  // const keyGetter
  //   = process.env.NODE_DEV !== 'production'
  //     ? computedKeyWithWarnings(options.key, store.warnChecksMap!)
  //     : options.key

  const entry = computed(() => cacheEntries.ensure<TResult, TError>(options))

  // adapter that returns the entry state
  const errorCatcher = () => entry.value.state.value
  const refresh = () => cacheEntries.refresh(entry.value).catch(errorCatcher)
  const refetch = () => cacheEntries.fetch(entry.value).catch(errorCatcher)

  const queryReturn = {
    state: computed(() => entry.value.state.value),
    queryStatus: computed(() => entry.value.queryStatus.value),
    data: computed(() => entry.value.state.value.data),
    error: computed(() => entry.value.state.value.error),
    isFetching: computed(() => entry.value.queryStatus.value === 'running'),
    isPending: computed(() => entry.value.state.value.status === 'pending'),
    status: computed(() => entry.value.state.value.status),

    refresh,
    refetch,
  } satisfies UseQueryReturn<TResult, TError>

  const hasCurrentInstance = getCurrentInstance()
  const currentEffect = getCurrentDefineQueryEffect() || getCurrentScope()

  if (hasCurrentInstance) {
    // only happens on server, app awaits this
    onServerPrefetch(async () => {
      if (toValue(options.enabled)) await refresh()
      // TODO: after adding a test, remove these lines and refactor the const queryReturn to just a return statement
    })
  }

  // should we be watching entry
  // NOTE: this avoids fetching initially during SSR but it could be refactored to only use the watcher
  let isActive = false
  if (hasCurrentInstance) {
    onMounted(() => {
      isActive = true
      queryEntry_addDep(entry.value, hasCurrentInstance)
    })
    onUnmounted(() => {
      // remove instance from Set of refs
      queryEntry_removeDep(entry.value, hasCurrentInstance, cacheEntries)
    })
  } else {
    isActive = true
    if (currentEffect) {
      queryEntry_addDep(entry.value, currentEffect)
      onScopeDispose(() => {
        queryEntry_removeDep(entry.value, currentEffect, cacheEntries)
      })
    }
  }

  watch(
    entry,
    (entry, previousEntry) => {
      if (!isActive) return
      if (previousEntry) {
        queryEntry_removeDep(previousEntry, hasCurrentInstance, cacheEntries)
        queryEntry_removeDep(previousEntry, currentEffect, cacheEntries)
      }
      // track the current effect and component
      queryEntry_addDep(entry, hasCurrentInstance)
      queryEntry_addDep(entry, currentEffect)

      if (toValue(options.enabled)) refresh()
    },
    { immediate: true },
  )

  // avoid adding a watcher if enabled cannot change
  if (typeof options.enabled !== 'boolean') {
    watch(options.enabled, (newEnabled) => {
      // no need to check for the previous value since the watcher will only trigger if the value changed
      if (newEnabled) refresh()
    })
  }

  // only happens on client
  // we could also call fetch instead but forcing a refresh is more interesting
  if (hasCurrentInstance) {
    // TODO: optimize so it doesn't refresh if we are hydrating
    onMounted(() => {
      if (
        (options.refetchOnMount
          // always fetch initially if no value is present
          || queryReturn.status.value === 'pending')
        && toValue(options.enabled)
      ) {
        if (options.refetchOnMount === 'always') {
          refetch()
        } else {
          refresh()
        }
      }
    })
  }
  // TODO: we could save the time it was fetched to avoid fetching again. This is useful to not refetch during SSR app but do refetch in SSG apps if the data is stale. Careful with timers and timezones

  if (IS_CLIENT) {
    if (options.refetchOnWindowFocus) {
      useEventListener(document, 'visibilitychange', () => {
        if (
          document.visibilityState === 'visible'
          && toValue(options.enabled)
        ) {
          if (options.refetchOnWindowFocus === 'always') {
            refetch()
          } else {
            refresh()
          }
        }
      })
    }

    if (options.refetchOnReconnect) {
      useEventListener(window, 'online', () => {
        if (toValue(options.enabled)) {
          if (options.refetchOnReconnect === 'always') {
            refetch()
          } else {
            refresh()
          }
        }
      })
    }
  }

  return options.setup?.(queryReturn, options) || queryReturn
}

/**
 * Unwraps a key from `options.key` while checking for properties any problematic dependencies. Should be used in DEV
 * only.
 * @param key - key to compute
 * @returns - the computed key
 */
function _computedKeyWithWarnings(
  key: MaybeRefOrGetter<EntryKey>,
  warnChecksMap: WeakMap<object, boolean>,
): () => EntryKey {
  const componentInstance = getCurrentInstance()
  // probably correct scope, no need to warn
  if (!componentInstance) return () => toValue(key)

  const comp = computed(() => toValue(key))

  // remove the component from the map
  onUnmounted(() => {
    warnChecksMap.delete(comp)
  })

  return () => {
    const val = comp.value

    const invalidDeps = comp.effect.deps.filter((dep) => {
      return !!dep
    })
    if (invalidDeps.length > 0) {
      console.warn(
        `"useQuery()" with a key "${val}" depends on a local reactive property. This might lead to unexpected behavior. See https://pinia-colada.esm.dev/cookbook/unscoped-reactivity.html.\nFound these reactive effects:`,
        ...invalidDeps.map((dep) => dep.keys()),
      )
    }

    return val
  }
}
