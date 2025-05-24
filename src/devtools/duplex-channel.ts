import type { DataState, EntryKey, UseQueryEntryFilter } from '@pinia/colada'
// import type { UseQueryEntryPayload } from '../query-serialized'

import { toRaw } from 'vue'

type UseQueryEntryPayload = unknown

export class DuplexChannel<
  const Emits extends Record<EmitsKeys, any[]>,
  const Listens extends Record<ListensKeys, [...any[]]>,
  // TODO: this seems to be enough. Test it
  // const Emits extends Record<keyof Emits, [...any[]]>,
  // const Listens extends Record<keyof Listens, [...any[]]>,
  // NOTE: we need these two to avoid requiring the interface to have an index signature for string
  EmitsKeys extends keyof Emits = keyof Emits,
  ListensKeys extends keyof Listens = keyof Listens,
> {
  protected listenersByEvent = new Map<keyof Listens, Set<(...args: any[]) => void>>()
  protected eventsController: null | AbortController = null

  constructor(protected port: MessagePort) {
    this.setPort(port)
  }

  setPort(port: MessagePort) {
    // remove the previous event listeners
    this.eventsController?.abort()
    const { signal } = (this.eventsController = new AbortController())
    this.port = port
    port.addEventListener('message', this.onMessage.bind(this), { signal })
    port.addEventListener('messageerror', this.onMessageError.bind(this), { signal })
    // needed when we call `addEventListener` instead of using `onmessage`
    port.start()
  }

  private onMessage(event: MessageEvent) {
    if (!event.data || typeof event.data !== 'object' || typeof event.data.id !== 'string') {
      console.error(`${this.constructor.name}: invalid message`, event.data)
      return
    }
    const listeners = this.listenersByEvent.get(event.data.id)
    if (!listeners) return

    for (const listener of listeners.values()) {
      listener(...(event.data.data as Listens[keyof Listens]))
    }
  }

  private onMessageError(event: MessageEvent) {
    console.error(`${this.constructor.name}: message error`, event)
  }

  stop() {
    this.listenersByEvent.clear()
    this.eventsController?.abort()
  }

  emit<K extends keyof Emits>(event: K, ...args: NoInfer<Emits[K]>): void {
    const clonedData = args.map((arg) => toRawDeep(arg))
    this.port.postMessage({ id: event, data: clonedData })
  }

  on<K extends keyof Listens>(event: K, callback: (...args: Listens[K]) => void): () => void {
    let listeners = this.listenersByEvent.get(event)
    if (!listeners) {
      this.listenersByEvent.set(event, (listeners = new Set()))
    }
    listeners.add(callback)

    return () => {
      this.listenersByEvent.get(event)?.delete(callback)
    }
  }

  off<K extends keyof Listens>(event: K): void {
    this.listenersByEvent.delete(event)
  }
}

export interface AppEmits {
  'queries:all': [entries: UseQueryEntryPayload[]]
  'queries:update': [entry: UseQueryEntryPayload]
  'queries:delete': [entry: UseQueryEntryPayload]
  'mutations:all': [entries: unknown[]]

  // for testing
  'ping': []
  'pong': []
}

export interface DevtoolsEmits {
  'queries:clear': [] | [filters: UseQueryEntryFilter]
  'queries:refetch': [entryKey: EntryKey]
  'queries:invalidate': [entryKey: EntryKey]
  'queries:reset': [entryKey: EntryKey]

  'queries:simulate:error': [entryKey: EntryKey]
  'queries:simulate:error:stop': [entryKey: EntryKey]
  'queries:simulate:loading': [entryKey: EntryKey]
  'queries:simulate:loading:stop': [entryKey: EntryKey]

  'queries:set:state': [entryKey: EntryKey, state: DataState<unknown, unknown, unknown>]

  // for testing
  'ping': []
  'pong': []
}

export function _testTypes() {
  // the app
  const client = new DuplexChannel<AppEmits, DevtoolsEmits>({} as any)
  // the devtools
  const server = new DuplexChannel<DevtoolsEmits, AppEmits>({} as any)

  client.emit('queries:all', [])
  // client.emit('queries:all', [{ id: '', active: false, asyncStatus: 'idle',   }])
  client.on('queries:clear', () => {})
  client.on('queries:clear', (filters = {}) => {
    console.log(filters.key)
    // ...
  })

  server.emit('queries:clear')
  server.emit('queries:clear', { key: [''] })
}

function toRawDeep<T>(val: T): T
function toRawDeep(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map((item) => toRawDeep(item))
  }
  // TODO: custom classes?
  if (val && typeof val === 'object' && !isError(val)) {
    return Object.fromEntries(Object.entries(val).map(([key, value]) => [key, toRawDeep(value)]))
  }
  return toRaw(val)
}

function isError(err: unknown): err is Error {
  return 'isError' in Error && typeof Error.isError === 'function'
    ? Error.isError(err)
    : err instanceof Error
}
