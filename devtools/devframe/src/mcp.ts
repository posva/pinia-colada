import { defineRpcFunction } from 'devframe'
import type { DevframeNodeContext } from 'devframe'
import {
  miniJsonParse,
  removeMutationEntry,
  removeQueryEntry,
  replaceMutationEntry,
  replaceQueryEntry,
} from '@pinia/colada-devtools/shared'
import type {
  AppEmits,
  UseMutationEntryPayload,
  UseQueryEntryPayload,
} from '@pinia/colada-devtools/shared'

interface CacheSnapshot {
  queries: UseQueryEntryPayload[]
  mutations: UseMutationEntryPayload[]
  synchronized: boolean
  updatedAt: number | null
}

type CacheEventHandlers = {
  [K in keyof AppEmits]: (snapshot: CacheSnapshot, args: AppEmits[K]) => boolean
}

interface CacheFilters {
  status?: UseQueryEntryPayload['state']['status']
  asyncStatus?: UseQueryEntryPayload['asyncStatus']
  active?: boolean
  stale?: boolean
  keyIncludes?: string
}

interface FilterableCacheEntry {
  state: {
    status: CacheFilters['status']
  }
  asyncStatus: CacheFilters['asyncStatus']
  active: boolean
  key: unknown
}

const filtersInputSchema = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['pending', 'success', 'error'],
      description: 'Only return entries with this data-state status.',
    },
    asyncStatus: {
      type: 'string',
      enum: ['idle', 'loading'],
      description: 'Only return entries with this asynchronous status.',
    },
    active: {
      type: 'boolean',
      description: 'Only return active or inactive entries.',
    },
    stale: {
      type: 'boolean',
      description: 'Only return stale or fresh queries. Ignored for mutations.',
    },
    keyIncludes: {
      type: 'string',
      description: 'Only return entries whose serialized key contains this text.',
    },
  },
  additionalProperties: false,
} as const

function hasQueryIdentity(value: unknown): value is UseQueryEntryPayload {
  return (
    !!value && typeof value === 'object' && 'keyHash' in value && typeof value.keyHash === 'string'
  )
}

function hasMutationIdentity(value: unknown): value is UseMutationEntryPayload {
  return !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'number'
}

const cacheEventHandlers: CacheEventHandlers = {
  'queries:all': (snapshot, [entries]) => {
    if (!Array.isArray(entries)) return false
    snapshot.queries = entries.filter(hasQueryIdentity)
    return true
  },
  'queries:update': (snapshot, [entry]) => {
    if (!hasQueryIdentity(entry)) return false
    replaceQueryEntry(snapshot.queries, entry)
    return true
  },
  'queries:delete': (snapshot, [entry]) => {
    if (!hasQueryIdentity(entry)) return false
    removeQueryEntry(snapshot.queries, entry)
    return true
  },
  'mutations:all': (snapshot, [entries]) => {
    if (!Array.isArray(entries)) return false
    snapshot.mutations = entries.filter(hasMutationIdentity)
    return true
  },
  'mutations:update': (snapshot, [entry]) => {
    if (!hasMutationIdentity(entry)) return false
    replaceMutationEntry(snapshot.mutations, entry)
    return true
  },
  'mutations:delete': (snapshot, [entry]) => {
    if (!hasMutationIdentity(entry)) return false
    removeMutationEntry(snapshot.mutations, entry)
    return true
  },
}

function isCacheEvent(id: string): id is keyof AppEmits {
  return id in cacheEventHandlers
}

function applyCacheEvent<K extends keyof AppEmits>(
  snapshot: CacheSnapshot,
  id: K,
  args: AppEmits[K],
): boolean {
  return cacheEventHandlers[id](snapshot, args)
}

function readFilters(value: unknown): CacheFilters {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  const input = value as Record<string, unknown>
  return {
    status:
      input.status === 'pending' || input.status === 'success' || input.status === 'error'
        ? input.status
        : undefined,
    asyncStatus:
      input.asyncStatus === 'idle' || input.asyncStatus === 'loading'
        ? input.asyncStatus
        : undefined,
    active: typeof input.active === 'boolean' ? input.active : undefined,
    stale: typeof input.stale === 'boolean' ? input.stale : undefined,
    keyIncludes: typeof input.keyIncludes === 'string' ? input.keyIncludes : undefined,
  }
}

function filterEntries<TEntry extends FilterableCacheEntry>(
  entries: readonly TEntry[],
  rawFilters: unknown,
  getStale?: (entry: TEntry) => boolean,
): TEntry[] {
  const filters = readFilters(rawFilters)

  return entries.filter((entry) => {
    if (filters.status != null && entry.state?.status !== filters.status) return false
    if (filters.asyncStatus != null && entry.asyncStatus !== filters.asyncStatus) return false
    if (filters.active != null && entry.active !== filters.active) return false
    if (filters.stale != null && getStale && getStale(entry) !== filters.stale) return false
    if (
      filters.keyIncludes != null &&
      !miniJsonParse(entry.key).toLowerCase().includes(filters.keyIncludes.toLowerCase())
    ) {
      return false
    }
    return true
  })
}

/**
 * Mirror the inspected page's serialization-safe cache payloads into the
 * node-side devframe context, where the agent/MCP adapter can read them.
 */
export async function setupPiniaColadaMcp(ctx: DevframeNodeContext) {
  const my = ctx.scope('pinia-colada')
  const cache = await my.rpc.sharedState<CacheSnapshot>('cache', {
    initialValue: {
      queries: [],
      mutations: [],
      synchronized: false,
      updatedAt: null,
    },
  })

  my.rpc.register(
    defineRpcFunction({
      name: 'cache-event',
      type: 'event',
      setup: () => ({
        handler(id: string, args: unknown[]) {
          cache.mutate((snapshot) => {
            if (!isCacheEvent(id)) return

            // The page-side relay emits this envelope through the shared
            // AppEmits contract. Runtime identity checks in each handler keep
            // malformed entries from corrupting reconciliation by id.
            if (!applyCacheEvent(snapshot, id, args as AppEmits[typeof id])) return

            snapshot.synchronized = true
            snapshot.updatedAt = Date.now()
          })
        },
      }),
    }),
  )

  ctx.agent.registerTool({
    id: 'pinia-colada:list-queries',
    title: 'List Pinia Colada queries',
    description:
      'Return query-cache entries from the inspected application. Filters are optional; use this to inspect query keys, state, activity, freshness, options, and data.',
    safety: 'read',
    tags: ['pinia-colada', 'queries', 'cache'],
    inputSchema: filtersInputSchema,
    handler: (filters) => {
      const snapshot = cache.value()
      const queries = filterEntries(snapshot.queries, filters, (entry) => entry.stale)
      return {
        synchronized: snapshot.synchronized,
        updatedAt: snapshot.updatedAt,
        total: queries.length,
        queries,
      }
    },
  })

  ctx.agent.registerTool({
    id: 'pinia-colada:list-mutations',
    title: 'List Pinia Colada mutations',
    description:
      'Return mutation-cache entries from the inspected application. Filters are optional; use this to inspect mutation keys, variables, state, activity, and options.',
    safety: 'read',
    tags: ['pinia-colada', 'mutations', 'cache'],
    inputSchema: filtersInputSchema,
    handler: (filters) => {
      const snapshot = cache.value()
      const mutations = filterEntries(snapshot.mutations, filters)
      return {
        synchronized: snapshot.synchronized,
        updatedAt: snapshot.updatedAt,
        total: mutations.length,
        mutations,
      }
    },
  })

  ctx.agent.registerResource({
    id: 'pinia-colada:cache',
    uri: 'pinia-colada://cache',
    name: 'Pinia Colada cache',
    description: 'The latest query and mutation cache snapshot received from the inspected app.',
    mimeType: 'application/json',
    read: () => ({ json: cache.value() }),
  })
}
