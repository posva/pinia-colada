/**
 * Pinia Colada plugin that counts how many times a query has been fetched, has resolved, rejected, etc.
 *
 */
import type { QueryCache, UseQueryEntry, MutationCache, UseMutationEntry } from '@pinia/colada'
import { isRef, toValue } from 'vue'
import { DEVTOOLS_INFO_KEY } from '@pinia/colada-devtools/shared'
import type {
  UseQueryEntryHistoryEntry,
  UseQueryEntryPayload,
  UseMutationEntryPayload,
} from '@pinia/colada-devtools/shared'

const now = () => performance.timeOrigin + performance.now()

/**
 * Lazily initializes the devtools info of a query entry. Entries can be
 * created without going through the tracked cache actions (e.g. mutations not
 * yet ensured, entries created before the devtools are installed), so every
 * read must go through here instead of accessing the key directly.
 * https://github.com/posva/pinia-colada/issues/618
 */
export function ensureQueryDevtoolsInfo(entry: UseQueryEntry) {
  return (entry[DEVTOOLS_INFO_KEY] ??= {
    count: {
      total: 0,
      succeed: 0,
      errored: 0,
      cancelled: 0,
    },
    updatedAt: entry.when > 0 ? entry.when : now(),
    inactiveAt: 0,
    simulate: null,
    history: [],
  })
}

/**
 * Same as {@link ensureQueryDevtoolsInfo} but for mutation entries.
 */
export function ensureMutationDevtoolsInfo(entry: UseMutationEntry) {
  return (entry[DEVTOOLS_INFO_KEY] ??= {
    updatedAt: entry.when > 0 ? entry.when : now(),
    inactiveAt: 0,
    simulate: null,
  })
}

const installationMap = new WeakMap<object, boolean>()

export function addDevtoolsInfo(queryCache: QueryCache, mutationCache: MutationCache): void {
  if (installationMap.has(queryCache)) {
    return
  }
  installationMap.set(queryCache, true)

  addDevtoolsQueryInfo(queryCache)
  addDevtoolsInfoForMutations(mutationCache)
}

function addDevtoolsQueryInfo(queryCache: QueryCache): void {
  // apply initialization to any existing entries
  for (const entry of queryCache.getEntries()) {
    const info = ensureQueryDevtoolsInfo(entry)

    // add any entry that was added with SSR or without a fetch
    if (entry.when > 0 && !info.history.length) {
      info.history.push({
        id: 0,
        key: entry.key,
        state: entry.state.value,
        updatedAt: entry.when,
        createdAt: entry.when,
        fetchTime: null,
      })
    }
  }

  queryCache.$onAction(({ name, args, after, onError }) => {
    if (name === 'create') {
      after((entry) => {
        ensureQueryDevtoolsInfo(entry)
      })
    } else if (name === 'fetch') {
      const [entry] = args
      const info = ensureQueryDevtoolsInfo(entry)
      info.count.total++
      info.updatedAt = now()
      const createdAt = now()
      const historyEntry: UseQueryEntryHistoryEntry = {
        id: (info.history.at(0)?.id ?? -1) + 1,
        key: entry.key,
        state: entry.state.value,
        updatedAt: createdAt,
        createdAt,
        fetchTime: null,
      }

      const isEnabled = toValue(entry.options?.enabled) ?? true
      if (isEnabled) {
        historyEntry.fetchTime = {
          start: createdAt,
          end: null,
        }
      }

      info.history.unshift(historyEntry)
      // limit history to 10 entries
      info.history = info.history.slice(0, 10)

      after(() => {
        if (isEnabled) {
          historyEntry.fetchTime!.end = now()
          info.count.succeed++
          // updatedAt is set by the setEntryState
          historyEntry.state = entry.state.value
          historyEntry.updatedAt = now()
        }
      })
      onError(() => {
        if (isEnabled) {
          historyEntry.fetchTime!.end = now()
          info.count.errored++
          // updatedAt is set by the setEntryState
          historyEntry.state = entry.state.value
          historyEntry.updatedAt = now()
        }
      })
    } else if (name === 'cancel') {
      const [entry] = args
      if (entry.pending) {
        ensureQueryDevtoolsInfo(entry).count.cancelled++
      }
    } else if (name === 'setEntryState') {
      const [entry] = args
      const info = ensureQueryDevtoolsInfo(entry)
      let lastHistoryEntry = info.history[0]
      after(() => {
        info.updatedAt = now()
        lastHistoryEntry ??= info.history[0]
        if (lastHistoryEntry) {
          lastHistoryEntry.state = entry.state.value
          lastHistoryEntry.updatedAt = now()
        }
        // set inactiveAt for prefetched queries to start GC timing
        // both prefetch methods (setQueryData and refresh) call setEntryState when they complete
        if (!entry.active) {
          info.inactiveAt = now()
        }
      })
    } else if (name === 'untrack') {
      const [entry] = args
      after(() => {
        if (!entry.active) {
          ensureQueryDevtoolsInfo(entry).inactiveAt = now()
        }
      })
    }
  })
}

export function createQueryEntryPayload(entry: UseQueryEntry): UseQueryEntryPayload {
  return {
    keyHash: entry.keyHash,
    key: entry.key,
    state: entry.state.value,
    asyncStatus: entry.asyncStatus.value,

    active: entry.active,
    stale: entry.stale,
    when: entry.when,
    options: entry.options && {
      staleTime: entry.options.staleTime,
      gcTime: entry.options.gcTime,
      refetchOnMount: toValue(entry.options.refetchOnMount),
      refetchOnReconnect: toValue(entry.options.refetchOnReconnect),
      refetchOnWindowFocus: toValue(entry.options.refetchOnWindowFocus),
      enabled: toValue(entry.options.enabled),
    },
    deps: Array.from(entry.deps).map((dep) =>
      'uid' in dep
        ? {
            type: 'component',
            uid: dep.uid,
            name: dep.type.displayName ?? dep.type.name,
          }
        : {
            type: 'effect',
            active: dep.active,
            detached: dep.detached,
          },
    ),
    gcTimeout: typeof entry.gcTimeout === 'number' ? (entry.gcTimeout as number) : null,

    devtools: ensureQueryDevtoolsInfo(entry),
    plugins: Object.fromEntries(
      Object.entries(entry.ext).filter(([, v]) => v !== null && typeof v === 'object' && !isRef(v)),
    ),
  }
}

export function addDevtoolsInfoForMutations(mutationCache: MutationCache): void {
  // apply initialization to any existing entries
  for (const entry of mutationCache.getEntries()) {
    ensureMutationDevtoolsInfo(entry)
  }

  mutationCache.$onAction(({ name, args, after }) => {
    if (name === 'create') {
      after((entry) => {
        ensureMutationDevtoolsInfo(entry)
      })
    } else if (name === 'ensure') {
      // mutations can create entries before the devtools
      // and then get an id assigned later
      // https://github.com/posva/pinia-colada/issues/469
      const [entry] = args
      ensureMutationDevtoolsInfo(entry)
    } else if (name === 'mutate') {
      const [entry] = args
      ensureMutationDevtoolsInfo(entry).updatedAt = now()
    } else if (name === 'setEntryState') {
      const [entry] = args
      after(() => {
        ensureMutationDevtoolsInfo(entry).updatedAt = now()
      })
    } else if (name === 'untrack') {
      const [entry] = args
      after(() => {
        // differently from queries, mutations are inactive if untracked
        // because they can only be tracked once
        ensureMutationDevtoolsInfo(entry).inactiveAt = now()
      })
    }
  })
}

export function createMutationEntryPayload(entry: UseMutationEntry): UseMutationEntryPayload {
  const devtools = ensureMutationDevtoolsInfo(entry)
  return {
    id: entry.id,
    key: entry.key,
    state: entry.state.value,
    asyncStatus: entry.asyncStatus.value,
    when: entry.when,
    vars: entry.vars,
    options: entry.options && {
      gcTime: entry.options.gcTime,
    },
    gcTimeout: typeof entry.gcTimeout === 'number' ? (entry.gcTimeout as number) : null,
    active: devtools.inactiveAt === 0,
    devtools,
  }
}
