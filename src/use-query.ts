import type { ComputedRef, Ref, ShallowRef } from 'vue'
import {
  computed,
  getCurrentInstance,
  getCurrentScope,
  isRef,
  onMounted,
  onScopeDispose,
  onServerPrefetch,
  onUnmounted,
  toValue,
  watch,
} from 'vue'
import { IS_CLIENT, toValueWithArgs, useEventListener } from './utils'
import type { UseQueryEntry, UseQueryEntryExtensions } from './query-store'
import { useQueryCache } from './query-store'
import { useQueryOptions } from './query-options'
import type {
  UseQueryOptions,
  UseQueryOptionsWithDefaults,
} from './query-options'
import type { ErrorDefault } from './types-extension'
import { getCurrentDefineQueryEffect } from './define-query'
import type {
  AsyncStatus,
  DataState,
  DataStateStatus,
  DataState_Success,
} from './data-state'

// TODO: Rename TResult to TData for consistency

/**
 * Return type of `useQuery()`.
 */
export interface UseQueryReturn<TResult = unknown, TError = ErrorDefault, TDataInitial extends TResult | undefined = undefined>
  extends UseQueryEntryExtensions<TResult, TError, TDataInitial> {
  /**
   * The state of the query. Contains its data, error, and status.
   */
  state: ComputedRef<DataState<TResult, TError, TDataInitial>>

  /**
   * Status of the query. Becomes `'loading'` while the query is being fetched, is `'idle'` otherwise.
   */
  asyncStatus: ComputedRef<AsyncStatus>

  /**
   * The last successful data resolved by the query. Alias for `state.value.data`.
   *
   * @see {@link state}
   */
  data: ShallowRef<TResult | TDataInitial>

  /**
   * The error rejected by the query. Alias for `state.value.error`.
   *
   * @see {@link state}
   */
  error: ShallowRef<TError | null>

  /**
   * The status of the query. Alias for `state.value.status`.
   *
   * @see {@link state}
   * @see {@link DataStateStatus}
   */
  status: ShallowRef<DataStateStatus>

  /**
   * Returns whether the request is still pending its first call. Alias for `status.value === 'pending'`
   */
  isPending: ComputedRef<boolean>

  /**
   * Returns whether the `data` is the `placeholderData`.
   */
  isPlaceholderData: ComputedRef<boolean>

  /**
   * Returns whether the request is currently fetching data. Alias for `asyncStatus.value === 'loading'`
   */
  isLoading: ShallowRef<boolean>

  /**
   * Ensures the current data is fresh. If the data is stale, refetch, if not return as is.
   * @param throwOnError - whether to throw an error if the refresh fails. Defaults to `false`
   * @returns a promise that resolves when the refresh is done
   */
  refresh: (throwOnError?: boolean) => Promise<DataState<TResult, TError, TDataInitial>>

  /**
   * Ignores fresh data and triggers a new fetch
   * @param throwOnError - whether to throw an error if the fetch fails. Defaults to `false`
   * @returns a promise that resolves when the fetch is done
   */
  refetch: (throwOnError?: boolean) => Promise<DataState<TResult, TError, TDataInitial>>
}

/**
 * Ensures and return a shared query state based on the `key` option.
 *
 * @param _options - The options of the query
 */
export function useQuery<TResult, TError = ErrorDefault, TDataInitial extends TResult | undefined = undefined>(
  _options: UseQueryOptions<TResult, TError, TDataInitial>,
): UseQueryReturn<TResult, TError, TDataInitial> {
  const queryCache = useQueryCache()
  const optionDefaults = useQueryOptions()
  // const effect = (getActivePinia() as any)._e as EffectScope

  const options = {
    ...optionDefaults,
    ..._options,
  } satisfies UseQueryOptionsWithDefaults<TResult, TError, TDataInitial>
  const { refetchOnMount, refetchOnReconnect, refetchOnWindowFocus, enabled } = options

  // warn against using the same key for different functions
  // this only applies outside of HMR since during HMR, the `useQuery()` will be called
  // when remounting the component and it's essential to update the options.
  // in other scenarios, it's a mistake
  if (process.env.NODE_ENV !== 'production') {
    const currentInstance = getCurrentInstance()
    if (currentInstance) {
      const entry: UseQueryEntry | undefined = queryCache.getEntries({
        exact: true,
        key: toValue(options.key),
      })[0]
      const currentQueryFn = entry?.options?.query

      onMounted(() => {
        // if this entry existed before and we are not doing HMR, the user is probably using the same key in different
        // places with the same query
        if (
          // the query function is different
          currentQueryFn != null
          && entry.options != null
          && currentQueryFn !== options.query
          // skip definedQuery and let them check on their own
          && !entry?.__hmr?.skip
          // we are not in HMR, so this update comes from a different component
          && (!('__hmrId' in currentInstance.type)
            || currentInstance.type.__hmrId !== entry.__hmr?.id
            // it comes from the same component but duplicated, maybe data loaders + useQuery
            || entry.deps.has(currentInstance))
        ) {
          console.warn(
            `The same query key [${entry.key.join(', ')}] was used with different query functions. This might lead to unexpected behavior.\nSee https://pinia-colada.esm.dev/guide/queries.html#Reusable-Queries for more information.`,
          )
        }
      })
    }
  }

  const entry = computed(() => queryCache.ensure<TResult, TError, TDataInitial>(options))

  // adapter that returns the entry state
  const errorCatcher = () => entry.value.state.value
  const refresh = (throwOnError?: boolean) =>
    queryCache.refresh(entry.value).catch(
      // true is not allowed but it works per spec as only callable onRejected are used
      // https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromisethen
      // In other words `Promise.rejects('ok').catch(true)` still rejects
      // anything other than `true` falls back to the `errorCatcher`
      (throwOnError as false | undefined) || errorCatcher,
    )
  const refetch = (throwOnError?: boolean) =>
    queryCache.fetch(entry.value).catch(
      // same as above
      (throwOnError as false | undefined) || errorCatcher,
    )
  const isPlaceholderData = computed(
    () => entry.value.placeholderData != null && entry.value.state.value.status === 'pending',
  )
  const state = computed<DataState<TResult, TError, TDataInitial>>(() =>
    isPlaceholderData.value
      ? ({
          status: 'success',
          data: entry.value.placeholderData!,
          error: null,
        } satisfies DataState_Success<TResult>)
      : entry.value.state.value,
  )

  // TODO: find a way to allow a custom implementation for the returned value
  const extensions = {} as Record<string, any>
  for (const key in entry.value.ext) {
    extensions[key] = computed({
      get: () =>
      toValue(entry.value.ext[key as keyof UseQueryEntryExtensions<TResult, TError>]),
      set(value) {
        const target = entry.value.ext[key as keyof UseQueryEntryExtensions<TResult, TError>]
        if (isRef(target)) {
          (target as Ref).value = value
        } else {
          (entry.value.ext[key as keyof UseQueryEntryExtensions<TResult, TError>] as unknown) = value
        }
      },
    })
  }

  const queryReturn = {
    ...(extensions as UseQueryEntryExtensions<TResult, TError, TDataInitial>),
    state,

    status: computed(() => state.value.status),
    data: computed(() => state.value.data),
    error: computed(() => entry.value.state.value.error),
    asyncStatus: computed(() => entry.value.asyncStatus.value),

    isPlaceholderData,
    isPending: computed(() => state.value.status === 'pending'),
    isLoading: computed(() => entry.value.asyncStatus.value === 'loading'),

    refresh,
    refetch,
  } satisfies UseQueryReturn<TResult, TError, TDataInitial>

  const hasCurrentInstance = getCurrentInstance()
  const currentEffect = getCurrentDefineQueryEffect() || getCurrentScope()

  if (hasCurrentInstance) {
    // only happens on server, app awaits this
    onServerPrefetch(async () => {
      if (toValue(enabled)) await refresh(true)
    })
  }

  // should we be watching entry
  // NOTE: this avoids fetching initially during SSR but it could be refactored to only use the watcher
  let isActive = false
  if (hasCurrentInstance) {
    onMounted(() => {
      isActive = true
      queryCache.track(entry.value, hasCurrentInstance)
    })
    onUnmounted(() => {
      // remove instance from Set of refs
      queryCache.untrack(entry.value, hasCurrentInstance, queryCache)
    })
  } else {
    isActive = true
    if (currentEffect) {
      queryCache.track(entry.value, currentEffect)
      onScopeDispose(() => {
        queryCache.untrack(entry.value, currentEffect, queryCache)
      })
    }
  }

  watch(
    entry,
    (entry, previousEntry) => {
      // the placeholderData is only used if the entry is initially loading
      if (options.placeholderData && entry.state.value.status === 'pending') {
        entry.placeholderData = toValueWithArgs(
          options.placeholderData,
          previousEntry?.state.value.data,
        )
      }
      if (!isActive) return
      if (previousEntry) {
        queryCache.untrack(previousEntry, hasCurrentInstance, queryCache)
        queryCache.untrack(previousEntry, currentEffect, queryCache)
      }
      // track the current effect and component
      queryCache.track(entry, hasCurrentInstance)
      queryCache.track(entry, currentEffect)

      if (toValue(enabled)) refresh()
    },
    { immediate: true },
  )

  // avoid adding a watcher if enabled cannot change
  if (typeof enabled !== 'boolean') {
    watch(enabled, (newEnabled) => {
      // no need to check for the previous value since the watcher will only trigger if the value changed
      if (newEnabled) refresh()
    })
  }

  // only happens on client
  // we could also call fetch instead but forcing a refresh is more interesting
  if (hasCurrentInstance) {
    onMounted(() => {
      if (
        (refetchOnMount
          // always fetch initially if no value is present
          || queryReturn.status.value === 'pending')
        && toValue(enabled)
      ) {
        if (refetchOnMount === 'always') {
          refetch()
        } else {
          refresh()
        }
      }
    })
  }
  // TODO: we could save the time it was fetched to avoid fetching again. This is useful to not refetch during SSR app but do refetch in SSG apps if the data is stale. Careful with timers and timezones

  if (IS_CLIENT) {
    if (refetchOnWindowFocus) {
      useEventListener(document, 'visibilitychange', () => {
        if (
          document.visibilityState === 'visible'
          && toValue(enabled)
        ) {
          if (toValue(refetchOnWindowFocus) === 'always') {
            refetch()
          } else {
            refresh()
          }
        }
      })
    }

    if (refetchOnReconnect) {
      useEventListener(window, 'online', () => {
        if (toValue(enabled)) {
          if (toValue(refetchOnReconnect) === 'always') {
            refetch()
          } else {
            refresh()
          }
        }
      })
    }
  }

  return queryReturn
}
