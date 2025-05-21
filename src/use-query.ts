import type { ComputedRef, MaybeRefOrGetter, Ref, ShallowRef } from 'vue'
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
import { IS_CLIENT, useEventListener } from './utils'
import type { UseQueryEntry, UseQueryEntryExtensions } from './query-store'
import { currentDefineQueryEntry, isEntryUsingPlaceholderData, useQueryCache } from './query-store'
import { useQueryOptions } from './query-options'
import type { UseQueryOptions, UseQueryOptionsWithDefaults } from './query-options'
import type { ErrorDefault } from './types-extension'
import { getCurrentDefineQueryEffect } from './define-query'
import type { DefineQueryOptions } from './define-query'
import type { AsyncStatus, DataState, DataStateStatus, DataState_Success } from './data-state'

/**
 * Return type of `useQuery()`.
 */
export interface UseQueryReturn<
  TData = unknown,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
> extends UseQueryEntryExtensions<TData, TError, TDataInitial> {
  /**
   * The state of the query. Contains its data, error, and status.
   */
  state: ComputedRef<DataState<TData, TError, TDataInitial>>

  /**
   * Status of the query. Becomes `'loading'` while the query is being fetched, is `'idle'` otherwise.
   */
  asyncStatus: ComputedRef<AsyncStatus>

  /**
   * The last successful data resolved by the query. Alias for `state.value.data`.
   *
   * @see {@link state}
   */
  data: ShallowRef<TData | TDataInitial>

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
  refresh: (throwOnError?: boolean) => Promise<DataState<TData, TError, TDataInitial>>

  /**
   * Ignores fresh data and triggers a new fetch
   * @param throwOnError - whether to throw an error if the fetch fails. Defaults to `false`
   * @returns a promise that resolves when the fetch is done
   */
  refetch: (throwOnError?: boolean) => Promise<DataState<TData, TError, TDataInitial>>
}

/**
 * Ensures and return a shared query state based on the `key` option.
 *
 * @param options - The options of the query
 *
 * @example
 * ```ts
 * const { state } = useQuery({
 *   key: ['documents'],
 *   query: () => getDocuments(),
 * })
 * ```
 */
export function useQuery<
  TData,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
>(
  options:
    | UseQueryOptions<TData, TError, TDataInitial>
    | (() => DefineQueryOptions<TData, TError, TDataInitial>),
): UseQueryReturn<TData, TError, TDataInitial>

/**
 * `useQuery` for dynamic typed query keys. Requires options defined with
 * {@link defineQueryOptions}.
 *
 * @param setupOptions - options defined with {@link defineQueryOptions}
 * @param paramsGetter - a getter or ref that returns the parameters for the `setupOptions`
 *
 * @example
 * ```ts
 * import { defineQueryOptions, useQuery } from '@pinia/colada'
 *
 * const documentDetailsQuery = defineQueryOptions((id: number ) => ({
 *   key: ['documents', id],
 *   query: () => fetchDocument(id),
 * }))
 *
 * useQuery(documentDetailsQuery, 4)
 * useQuery(documentDetailsQuery, () => route.params.id)
 * useQuery(documentDetailsQuery, () => props.id)
 * ```
 */
export function useQuery<Params, TData, TError, TDataInitial extends TData | undefined>(
  setupOptions: (params: Params) => DefineQueryOptions<TData, TError, TDataInitial>,
  paramsGetter: MaybeRefOrGetter<NoInfer<Params>>,
): UseQueryReturn<TData, TError, TDataInitial>

/**
 * Ensures and return a shared query state based on the `key` option.
 *
 * @param _options - The options of the query
 * @param paramsGetter - a getter or ref that returns the parameters for the `_options`
 */
export function useQuery<
  TData,
  TError = ErrorDefault,
  TDataInitial extends TData | undefined = undefined,
>(
  // NOTE: this version has better type inference but still imperfect
  ...[_options, paramsGetter]:
    | [
        | UseQueryOptions<TData, TError, TDataInitial>
        | (() => DefineQueryOptions<TData, TError, TDataInitial>),
      ]
    | [
        (params: unknown) => DefineQueryOptions<TData, TError, TDataInitial>,
        paramsGetter?: MaybeRefOrGetter<unknown>,
      ]
  // _options:
  //   | UseQueryOptions<TData, TError, TDataInitial>
  //   | (() => DefineQueryOptions<TData, TError, TDataInitial>)
  //   | ((params: unknown) => DefineQueryOptions<TData, TError, TDataInitial>),
  // paramsGetter?: MaybeRefOrGetter<unknown>,
): UseQueryReturn<TData, TError, TDataInitial> {
  if (paramsGetter != null) {
    return useQuery(() =>
      // NOTE: we manually type cast here because TS cannot infer correctly in overloads
      (_options as (params: unknown) => DefineQueryOptions<TData, TError, TDataInitial>)(
        toValue(paramsGetter),
      ),
    )
  }
  const queryCache = useQueryCache()
  const optionDefaults = useQueryOptions()
  const hasCurrentInstance = getCurrentInstance()
  const currentEffect = getCurrentDefineQueryEffect() || getCurrentScope()
  const isPaused = currentDefineQueryEntry?.[3]

  const options = computed(
    () =>
      ({
        ...optionDefaults,
        ...toValue(
          // NOTE: we manually type cast here because TS cannot infer correctly in overloads
          _options as
            | UseQueryOptions<TData, TError, TDataInitial>
            | (() => DefineQueryOptions<TData, TError, TDataInitial>),
        ),
      }) satisfies UseQueryOptionsWithDefaults<TData, TError, TDataInitial>,
  )
  const enabled = (): boolean => toValue(options.value.enabled)

  // NOTE: here we used to check if the same key was previously called with a different query
  // but it ended up creating too many false positives and was removed. We could add it back
  // to at least warn against the cases shown in https://pinia-colada.esm.dev/guide/reusable-queries.html

  // This plain variable is not reactive and allows us to use the currentEntry
  // without triggering watchers and creating entries. It is used during
  // unmounting and mounting
  let lastEntry: UseQueryEntry<TData, TError, TDataInitial>
  const entry = computed(() =>
    // NOTE: there should be a `paused` property on the effect later on
    // if the effect is paused, we don't want to compute the entry because its key
    // might be referencing undefined values
    // https://github.com/posva/pinia-colada/issues/227
    // NOTE: _isPaused isn't reactive which meant that reentering a component
    // would never recompute the entry, so _isPaused was replaced
    // this makes the computed depend on nothing initially, but the `watch` on the entry
    // with immediate: true will trigger it again
    // https://github.com/posva/pinia-colada/issues/290
    isPaused?.value // && currentEffect?._isPaused
      ? lastEntry!
      : (lastEntry = queryCache.ensure<TData, TError, TDataInitial>(options.value, lastEntry)),
  )
  // we compute the entry here and reuse this across
  lastEntry = entry.value

  // adapter that returns the entry state
  const errorCatcher = () => entry.value.state.value
  const refresh = (throwOnError?: boolean) =>
    queryCache.refresh(entry.value, options.value).catch(
      // true is not allowed but it works per spec as only callable onRejected are used
      // https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-performpromisethen
      // In other words `Promise.rejects('ok').catch(true)` still rejects
      // anything other than `true` falls back to the `errorCatcher`
      (throwOnError as false | undefined) || errorCatcher,
    )
  const refetch = (throwOnError?: boolean) =>
    queryCache.fetch(entry.value, options.value).catch(
      // same as above
      (throwOnError as false | undefined) || errorCatcher,
    )
  const isPlaceholderData = computed(() => isEntryUsingPlaceholderData(entry.value))
  const state = computed<DataState<TData, TError, TDataInitial>>(() =>
    isPlaceholderData.value
      ? ({
          status: 'success',
          data: entry.value.placeholderData!,
          error: null,
        } satisfies DataState_Success<TData>)
      : entry.value.state.value,
  )

  // TODO: find a way to allow a custom implementation for the returned value
  const extensions = {} as Record<string, any>
  for (const key in lastEntry.ext) {
    extensions[key] = computed<unknown>({
      get: () =>
        toValue<unknown>(entry.value.ext[key as keyof UseQueryEntryExtensions<TData, TError>]),
      set(value) {
        const target = entry.value.ext[key as keyof UseQueryEntryExtensions<TData, TError>]
        if (isRef(target)) {
          ;(target as Ref | ShallowRef).value = value
        } else {
          ;(entry.value.ext[key as keyof UseQueryEntryExtensions<TData, TError>] as unknown) = value
        }
      },
    })
  }

  const queryReturn = {
    ...(extensions as UseQueryEntryExtensions<TData, TError, TDataInitial>),
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
  } satisfies UseQueryReturn<TData, TError, TDataInitial>

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
      queryCache.track(lastEntry, hasCurrentInstance)
    })
    onUnmounted(() => {
      // remove instance from Set of refs
      queryCache.untrack(lastEntry, hasCurrentInstance)
    })
  } else {
    isActive = true
    if (currentEffect) {
      queryCache.track(lastEntry, currentEffect)
      onScopeDispose(() => {
        queryCache.untrack(lastEntry, currentEffect)
      })
    }
  }

  watch(
    entry,
    (entry, previousEntry) => {
      if (!isActive) return
      if (previousEntry) {
        queryCache.untrack(previousEntry, hasCurrentInstance)
        queryCache.untrack(previousEntry, currentEffect)
      }
      // track the current effect and component
      queryCache.track(entry, hasCurrentInstance)
      queryCache.track(entry, currentEffect)

      // TODO: does this trigger after unmount?
      if (toValue(enabled)) refresh()
    },
    {
      immediate: true,
    },
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
      if (enabled()) {
        const refetchControl = toValue(options.value.refetchOnMount)
        if (refetchControl === 'always') {
          refetch()
        } else if (
          refetchControl
          // always refetch if the query is not enabled
          || queryReturn.status.value === 'pending'
        ) {
          refresh()
        }
      }
    })
  }
  // TODO: we could save the time it was fetched to avoid fetching again. This is useful to not refetch during SSR app but do refetch in SSG apps if the data is stale. Careful with timers and timezones

  if (IS_CLIENT) {
    useEventListener(document, 'visibilitychange', () => {
      const refetchControl = toValue(options.value.refetchOnWindowFocus)
      if (document.visibilityState === 'visible' && toValue(enabled)) {
        if (refetchControl === 'always') {
          refetch()
        } else if (refetchControl) {
          refresh()
        }
      }
    })

    useEventListener(window, 'online', () => {
      if (toValue(enabled)) {
        const refetchControl = toValue(options.value.refetchOnReconnect)
        if (refetchControl === 'always') {
          refetch()
        } else if (refetchControl) {
          refresh()
        }
      }
    })
  }

  return queryReturn
}
