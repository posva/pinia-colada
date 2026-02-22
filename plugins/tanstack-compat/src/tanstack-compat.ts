/**
 * TanStack Query Compatibility Plugin for Pinia Colada.
 *
 * Adds TanStack Query Vue v5 compatible properties to `useQuery` and `useMutation`.
 *
 * @module @pinia/colada-plugin-tanstack-compat
 */

import type { ComputedRef, ShallowRef } from 'vue'
import { computed, shallowRef, watch } from 'vue'
import type { PiniaColadaPlugin, UseQueryEntry, UseMutationEntry } from '@pinia/colada'
import { useMutationCache } from '@pinia/colada'

/**
 * TanStack Query compatible fetch status.
 * Note: 'paused' is not currently supported in pinia-colada.
 */
export type FetchStatus = 'fetching' | 'idle'

/**
 * Adds TanStack Query Vue v5 compatible properties to useQuery and useMutation entries.
 *
 * @example
 * ```ts
 * import { PiniaColada } from '@pinia/colada'
 * import { PiniaColadaTanStackCompat } from '@pinia/colada-plugin-tanstack-compat'
 *
 * app.use(PiniaColada, {
 *   plugins: [PiniaColadaTanStackCompat()],
 * })
 * ```
 */
export function PiniaColadaTanStackCompat(): PiniaColadaPlugin {
  return ({ queryCache, pinia, scope }) => {
    const mutationCache = useMutationCache(pinia)

    // Hook into query cache actions
    queryCache.$onAction(({ name, args }) => {
      if (name === 'extend') {
        const [entry] = args as [UseQueryEntry]
        scope.run(() => extendQueryEntry(entry))
      }
    })

    // Hook into mutation cache actions
    // For mutations, we hook into 'create' because 'extend' is only called on first mutate()
    // We need properties available immediately after useMutation() is called
    mutationCache.$onAction(({ name, after }) => {
      if (name === 'create') {
        after((entry) => {
          scope.run(() => extendMutationEntry(entry as UseMutationEntry))
        })
      }
    })
  }
}

/**
 * Extends a query entry with TanStack Query compatible properties.
 */
function extendQueryEntry(entry: UseQueryEntry): void {
  // Track if the entry ever had successful data (for isLoadingError/isRefetchError)
  const hadData = shallowRef(entry.state.value.status === 'success')

  // Track if the entry has fetched at least once
  const isFetched = shallowRef(entry.state.value.status !== 'pending')

  // Track if the entry has fetched after mount (extend is called on mount)
  const isFetchedAfterMount = shallowRef(false)

  // Timestamps
  const dataUpdatedAt = shallowRef(entry.state.value.status === 'success' ? entry.when : 0)
  const errorUpdatedAt = shallowRef(entry.state.value.status === 'error' ? entry.when : 0)

  // Watch for state changes to update tracking values
  watch(
    () => entry.state.value,
    (state) => {
      if (state.status === 'success') {
        hadData.value = true
        isFetched.value = true
        isFetchedAfterMount.value = true
        dataUpdatedAt.value = Date.now()
      } else if (state.status === 'error') {
        isFetched.value = true
        isFetchedAfterMount.value = true
        errorUpdatedAt.value = Date.now()
      }
    },
  )

  // Status booleans
  entry.ext.isSuccess = computed(() => entry.state.value.status === 'success')
  entry.ext.isError = computed(() => entry.state.value.status === 'error')

  // Fetch status
  entry.ext.isFetching = computed(() => entry.asyncStatus.value === 'loading')
  entry.ext.isRefetching = computed(
    () => entry.asyncStatus.value === 'loading' && entry.state.value.status !== 'pending',
  )

  // Error type detection
  entry.ext.isLoadingError = computed(() => entry.state.value.status === 'error' && !hadData.value)
  entry.ext.isRefetchError = computed(() => entry.state.value.status === 'error' && hadData.value)

  // Staleness - access state.value to make reactive (entry.stale getter depends on non-reactive entry.when)
  entry.ext.isStale = computed(() => {
    // eslint-disable-next-line no-unused-expressions
    entry.state.value // Force reactivity on state changes
    return entry.stale
  })

  // Fetch tracking
  entry.ext.isFetched = isFetched
  entry.ext.isFetchedAfterMount = isFetchedAfterMount

  // Timestamps
  entry.ext.dataUpdatedAt = dataUpdatedAt
  entry.ext.errorUpdatedAt = errorUpdatedAt

  // TanStack naming compatibility for fetchStatus
  // Note: 'paused' is not supported yet (would require network mode support)
  entry.ext.fetchStatus = computed<FetchStatus>(() =>
    entry.asyncStatus.value === 'loading' ? 'fetching' : 'idle',
  )
}

/**
 * Extends a mutation entry with TanStack Query compatible properties.
 */
function extendMutationEntry(entry: UseMutationEntry): void {
  // Initialize ext if it's still the frozen START_EXT object
  // This allows properties to be available before mutate() is called
  if (Object.isFrozen(entry.ext)) {
    ;(entry as { ext: object }).ext = {}
  }

  // Timestamps
  const submittedAt = shallowRef(0)
  const dataUpdatedAt = shallowRef(entry.state.value.status === 'success' ? entry.when : 0)
  const errorUpdatedAt = shallowRef(entry.state.value.status === 'error' ? entry.when : 0)

  // Watch asyncStatus to track submittedAt
  watch(
    () => entry.asyncStatus.value,
    (status) => {
      if (status === 'loading') {
        submittedAt.value = Date.now()
      }
    },
  )

  // Watch state for timestamps
  watch(
    () => entry.state.value,
    (state) => {
      if (state.status === 'success') {
        dataUpdatedAt.value = Date.now()
      } else if (state.status === 'error') {
        errorUpdatedAt.value = Date.now()
      }
    },
  )

  // Status booleans
  // isIdle: mutation has never been called (pending + idle)
  entry.ext.isIdle = computed(
    () => entry.state.value.status === 'pending' && entry.asyncStatus.value === 'idle',
  )

  // isPending: mutation is currently in progress
  entry.ext.isPending = computed(() => entry.asyncStatus.value === 'loading')

  entry.ext.isSuccess = computed(() => entry.state.value.status === 'success')
  entry.ext.isError = computed(() => entry.state.value.status === 'error')

  // Timestamps
  entry.ext.submittedAt = submittedAt
  entry.ext.dataUpdatedAt = dataUpdatedAt
  entry.ext.errorUpdatedAt = errorUpdatedAt
}

// TypeScript module augmentation for type safety
declare module '@pinia/colada' {
  interface UseQueryEntryExtensions<
    TData,
    // eslint-disable-next-line unused-imports/no-unused-vars
    TError,
    // eslint-disable-next-line unused-imports/no-unused-vars
    TDataInitial,
  > {
    /**
     * Whether the query status is 'success'.
     * TanStack Query compatible property.
     */
    isSuccess?: ComputedRef<boolean>

    /**
     * Whether the query status is 'error'.
     * TanStack Query compatible property.
     */
    isError?: ComputedRef<boolean>

    /**
     * Whether the query is currently fetching (asyncStatus === 'loading').
     * TanStack Query compatible property.
     */
    isFetching?: ComputedRef<boolean>

    /**
     * Whether the query is refetching (fetching but not initial load).
     * TanStack Query compatible property.
     */
    isRefetching?: ComputedRef<boolean>

    /**
     * Whether the query errored on initial load (never had data).
     * TanStack Query compatible property.
     */
    isLoadingError?: ComputedRef<boolean>

    /**
     * Whether the query errored on refetch (had data before).
     * TanStack Query compatible property.
     */
    isRefetchError?: ComputedRef<boolean>

    /**
     * Whether the query data is stale.
     * TanStack Query compatible property.
     */
    isStale?: ComputedRef<boolean>

    /**
     * Whether the query has fetched at least once.
     * TanStack Query compatible property.
     */
    isFetched?: ShallowRef<boolean>

    /**
     * Whether the query has fetched after component mount.
     * TanStack Query compatible property.
     */
    isFetchedAfterMount?: ShallowRef<boolean>

    /**
     * Timestamp of when data was last successfully fetched.
     * TanStack Query compatible property.
     */
    dataUpdatedAt?: ShallowRef<number>

    /**
     * Timestamp of when an error last occurred.
     * TanStack Query compatible property.
     */
    errorUpdatedAt?: ShallowRef<number>

    /**
     * TanStack Query compatible fetch status.
     * Maps to: 'fetching' when loading, 'idle' otherwise.
     * Note: 'paused' is not currently supported.
     */
    fetchStatus?: ComputedRef<FetchStatus>
  }

  interface UseMutationEntryExtensions<
    // eslint-disable-next-line unused-imports/no-unused-vars
    TData,
    // eslint-disable-next-line unused-imports/no-unused-vars
    TVars,
    // eslint-disable-next-line unused-imports/no-unused-vars
    TError,
    // eslint-disable-next-line unused-imports/no-unused-vars
    TContext,
  > {
    /**
     * Whether the mutation has never been called (status is 'pending' and asyncStatus is 'idle').
     * TanStack Query compatible property.
     */
    isIdle?: ComputedRef<boolean>

    /**
     * Whether the mutation is currently in progress (asyncStatus === 'loading').
     * TanStack Query compatible property.
     */
    isPending?: ComputedRef<boolean>

    /**
     * Whether the mutation status is 'success'.
     * TanStack Query compatible property.
     */
    isSuccess?: ComputedRef<boolean>

    /**
     * Whether the mutation status is 'error'.
     * TanStack Query compatible property.
     */
    isError?: ComputedRef<boolean>

    /**
     * Timestamp of when the mutation was last submitted.
     * TanStack Query compatible property.
     */
    submittedAt?: ShallowRef<number>

    /**
     * Timestamp of when data was last successfully returned.
     * TanStack Query compatible property.
     */
    dataUpdatedAt?: ShallowRef<number>

    /**
     * Timestamp of when an error last occurred.
     * TanStack Query compatible property.
     */
    errorUpdatedAt?: ShallowRef<number>
  }
}
