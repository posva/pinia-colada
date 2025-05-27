import { addCustomTab } from '@vue/devtools-api'
import type { App } from 'vue'
import type { Pinia } from 'pinia'
import { useQueryCache } from '../query-store'
import devtoolsPath from '@pinia/colada-devtools/iframe?url'
// import devtoolsPath from '@pinia/colada-devtools/iframe.html?url'
import { DuplexChannel } from './duplex-channel'
import type { AppEmits, DevtoolsEmits } from './duplex-channel'
import { addDevtoolsInfo, createQueryEntryPayload } from './pc-devtools-info-plugin'
import { DEVTOOLS_INFO_KEY } from './devtools-info-pinia-plugin'

export function addDevtools(app: App, pinia: Pinia) {
  const queryCache = useQueryCache(pinia)
  addDevtoolsInfo(queryCache)

  console.log({ devtoolsPath })

  // multiple devtools windows can be open at the same time
  const transmitterList: DuplexChannel<AppEmits, DevtoolsEmits>[] = []

  // we want to start listening as soon as possible to not miss
  // stale events
  queryCache.$onAction(({ name, after, onError, args }) => {
    if (name === 'remove') {
      const [entry] = args
      after(() => {
        for (const transmitter of transmitterList) {
          transmitter.emit('queries:delete', createQueryEntryPayload(entry))
        }
      })
    } else if (
      name === 'track'
      || name === 'untrack'
      || name === 'cancel'
      || name === 'invalidate'
      || name === 'fetch'
      || name === 'setEntryState'
    ) {
      const [entry] = args

      // on fetch we want to see it loading
      if (name === 'fetch') {
        const payload = createQueryEntryPayload(entry)
        // NOTE: pinia colada does not expose an action for this
        payload.asyncStatus = 'loading'
        for (const transmitter of transmitterList) {
          transmitter.emit('queries:update', payload)
        }
      }

      // TODO: throttle
      after(() => {
        entry[DEVTOOLS_INFO_KEY].simulate = null
        for (const transmitter of transmitterList) {
          transmitter.emit('queries:update', createQueryEntryPayload(entry))
        }

        // emit an update when the data becomes stale
        if (
          name === 'fetch'
          && entry.options?.staleTime != null
          && Number.isFinite(entry.options.staleTime)
        ) {
          setTimeout(() => {
            for (const transmitter of transmitterList) {
              transmitter.emit('queries:update', createQueryEntryPayload(entry))
            }
          }, entry.options.staleTime)
        }
      })
      onError(() => {
        for (const transmitter of transmitterList) {
          transmitter.emit('queries:update', createQueryEntryPayload(entry))
        }
      })
    } else if (name === 'create') {
      after((entry) => {
        for (const transmitter of transmitterList) {
          transmitter.emit('queries:update', createQueryEntryPayload(entry))
        }
      })
    } else if (name === 'setQueryData') {
      // we need to track changes to invalidatedAt
      const [key] = args
      after(() => {
        const entry = queryCache.getEntries({ key, exact: true })[0]
        if (entry) {
          for (const transmitter of transmitterList) {
            transmitter.emit('queries:update', createQueryEntryPayload(entry))
          }
        }
      })
    }
  })
  window.__PINIA_COLADA_DEVTOOLS_CONNECT = (contentWindow: Window) => {
    const channel = new MessageChannel()

    const transmitter = new DuplexChannel<AppEmits, DevtoolsEmits>(channel.port1)
    transmitterList.push(transmitter)

    // transfer the port to the devtools window
    contentWindow.postMessage('🍹 init', '*', [channel.port2])

    transmitter.on('queries:refetch', (key) => {
      queryCache.invalidateQueries({ key, exact: true, active: null, stale: null })
    })
    transmitter.on('queries:invalidate', (key) => {
      queryCache.invalidateQueries({ key, exact: true })
    })
    transmitter.on('queries:reset', (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        queryCache.cancel(entry)
        queryCache.setEntryState(entry, {
          status: 'pending',
          data: undefined,
          error: null,
        })
      }
    })

    transmitter.on('queries:set:state', (key, state) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        queryCache.setEntryState(entry, state)
        transmitter.emit('queries:update', createQueryEntryPayload(entry))
      }
    })

    transmitter.on('queries:simulate:loading', (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        entry.asyncStatus.value = 'loading'
        entry[DEVTOOLS_INFO_KEY].simulate = 'loading'
        transmitter.emit('queries:update', createQueryEntryPayload(entry))
      }
    })
    transmitter.on('queries:simulate:loading:stop', (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry && entry[DEVTOOLS_INFO_KEY].simulate === 'loading') {
        entry.asyncStatus.value = 'idle'
        entry[DEVTOOLS_INFO_KEY].simulate = null
        transmitter.emit('queries:update', createQueryEntryPayload(entry))
      }
    })

    transmitter.on('queries:simulate:error', (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        queryCache.cancel(entry)
        queryCache.setEntryState(entry, {
          ...entry.state.value,
          status: 'error',
          error: new Error('Simulated error'),
        })
        // we set after because setting the entry state resets the simulation
        entry[DEVTOOLS_INFO_KEY].simulate = 'error'
        transmitter.emit('queries:update', createQueryEntryPayload(entry))
      }
    })

    transmitter.on('queries:simulate:error:stop', (key) => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry && entry[DEVTOOLS_INFO_KEY].simulate === 'error') {
        queryCache.cancel(entry)
        queryCache.setEntryState(entry, {
          ...entry.state.value,
          status: entry.state.value.data !== undefined ? 'success' : 'pending',
          error: null,
        })
        entry[DEVTOOLS_INFO_KEY].simulate = null
        transmitter.emit('queries:update', createQueryEntryPayload(entry))
      }
    })

    // DEBUG
    transmitter.on('ping', () => {
      console.log('[App] Received ping from devtools')
      transmitter.emit('pong')
    })
    transmitter.on('pong', () => {
      console.log('[App] Received pong from devtools')
    })

    // We are ready
    transmitter.emit('queries:all', queryCache.getEntries({}).map(createQueryEntryPayload))
    transmitter.emit(
      'mutations:all',
      // FIXME: mutations
      queryCache.getEntries({}).map(createQueryEntryPayload),
    )
  }

  addCustomTab({
    name: 'pinia-colada',
    title: 'Pinia Colada',
    icon: 'https://pinia-colada.esm.dev/logo.svg',
    view: {
      type: 'iframe',
      src: devtoolsPath,
      persistent: true,
    },
    category: 'modules',
  })
}

declare global {
  interface Window {
    /**
     * Method called by the devtools window to connect to the main application.
     *
     * @internal
     */
    __PINIA_COLADA_DEVTOOLS_CONNECT: (contentWindow: Window) => void
  }
}
