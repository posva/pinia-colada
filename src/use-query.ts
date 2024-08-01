import type { MaybeRefOrGetter } from 'vue'
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
import { IS_CLIENT, computedRef, noop, useEventListener } from './utils'
import {
  type _UseQueryEntry_State,
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

/**
 * Return type of `useQuery()`.
 */
export interface UseQueryReturn<TResult = unknown, TError = ErrorDefault>
  extends _UseQueryEntry_State<TResult, TError> {
  /**
   * Ensures the current data is fresh. If the data is stale, refetch, if not return as is.
   * @returns a promise that resolves when the refresh is done
   */
  refresh: () => Promise<unknown>
  // FIXME: these two methods should return a result object that has both the error and the data

  /**
   * Ignores fresh data and triggers a new fetch
   * @returns a promise that resolves when the refresh is done
   */
  refetch: () => Promise<unknown>
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

  const entry = computed(() =>
    cacheEntries.ensure<TResult, TError>(options),
  )

  const refresh = () => cacheEntries.refresh(entry.value).then(noop).catch(noop)
  const refetch = () => cacheEntries.fetch(entry.value).then(noop).catch(noop)

  const queryReturn = {
    data: computedRef(() => entry.value.data),
    error: computedRef(() => entry.value.error),
    isFetching: computed(() => entry.value.isFetching.value),
    isPending: computed(() => entry.value.isPending.value),
    status: computedRef(() => entry.value.status),

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
          // always fetch initially if no vaule is present
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

  options.setup?.({
    ...queryReturn,
    options,
  })

  return queryReturn
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
