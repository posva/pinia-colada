/**
 * Pinia Colada plugin that counts how many times a query has been fetched, has resolved, rejected, etc.
 *
 */
import type { QueryCache, UseQueryEntry } from '@pinia/colada'
import { toValue } from 'vue'
import { DEVTOOLS_INFO_KEY } from '@pinia/colada-devtools/shared'
import type { UseQueryEntryHistoryEntry, UseQueryEntryPayload } from '@pinia/colada-devtools/shared'

const now = () => performance.timeOrigin + performance.now()

export function addDevtoolsInfo(queryCache: QueryCache): void {
  if (installationMap.has(queryCache)) {
    return
  }
  installationMap.set(queryCache, true)

  // apply initialization to any existing entries
  for (const entry of queryCache.getEntries()) {
    entry[DEVTOOLS_INFO_KEY] ??= {
      count: {
        total: 0,
        succeed: 0,
        errored: 0,
        cancelled: 0,
      },
      updatedAt: now(),
      inactiveAt: 0,
      simulate: null,
      history: [],
    }
  }

  queryCache.$onAction(({ name, args, after, onError }) => {
    if (name === 'create') {
      after((entry) => {
        entry[DEVTOOLS_INFO_KEY] = {
          count: {
            total: 0,
            succeed: 0,
            errored: 0,
            cancelled: 0,
          },
          updatedAt: now(),
          inactiveAt: 0,
          simulate: null,
          history: [],
        }
      })
    } else if (name === 'fetch') {
      const [entry] = args
      entry[DEVTOOLS_INFO_KEY].count.total++
      entry[DEVTOOLS_INFO_KEY].updatedAt = now()
      const createdAt = now()
      const historyEntry: UseQueryEntryHistoryEntry = {
        id: (entry[DEVTOOLS_INFO_KEY].history.at(0)?.id ?? -1) + 1,
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

      entry[DEVTOOLS_INFO_KEY].history.unshift(historyEntry)
      // limit history to 10 entries
      entry[DEVTOOLS_INFO_KEY].history = entry[DEVTOOLS_INFO_KEY].history.slice(0, 10)

      after(() => {
        if (isEnabled) {
          historyEntry.fetchTime!.end = now()
          entry[DEVTOOLS_INFO_KEY].count.succeed++
          // set by the setEntryState
          // entry[DEVTOOLS_INFO_KEY].updatedAt = now()
          historyEntry.state = entry.state.value
          historyEntry.updatedAt = now()
        }
      })
      onError(() => {
        if (isEnabled) {
          historyEntry.fetchTime!.end = now()
          entry[DEVTOOLS_INFO_KEY].count.errored++
          // set by the setEntryState
          // entry[DEVTOOLS_INFO_KEY].updatedAt = now()
          historyEntry.state = entry.state.value
          historyEntry.updatedAt = now()
        }
      })
    } else if (name === 'cancel') {
      const [entry] = args
      if (entry.pending) {
        entry[DEVTOOLS_INFO_KEY].count.cancelled++
      }
    } else if (name === 'setEntryState') {
      const [entry] = args
      let lastHistoryEntry = entry[DEVTOOLS_INFO_KEY].history[0]
      after(() => {
        entry[DEVTOOLS_INFO_KEY].updatedAt = now()
        lastHistoryEntry ??= entry[DEVTOOLS_INFO_KEY].history[0]
        if (lastHistoryEntry) {
          lastHistoryEntry.state = entry.state.value
          lastHistoryEntry.updatedAt = now()
        }
      })
    } else if (name === 'untrack') {
      const [entry] = args
      after(() => {
        if (!entry.active) {
          entry[DEVTOOLS_INFO_KEY].inactiveAt = now()
        }
      })
    } else if (name === 'setQueryData') {
      // setQueryData can also trigger gc
      const [key] = args
      after(() => {
        const entry = queryCache.getEntries({ key, exact: true })[0]
        if (entry && !entry.active) {
          entry[DEVTOOLS_INFO_KEY].inactiveAt = now()
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

    devtools: entry[DEVTOOLS_INFO_KEY],
  }
}

const installationMap = new WeakMap<object, boolean>()
