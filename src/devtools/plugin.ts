import { setupDevtoolsPlugin } from '@vue/devtools-api'
import { watch } from 'vue'
import type { App } from 'vue'
import type { Pinia } from 'pinia'
import { useQueryCache } from '../query-store'
import type { AsyncStatus, DataStateStatus } from '../data-state'

const QUERY_INSPECTOR_ID = 'pinia-colada-queries'
const ID_SEPARATOR = '\0'

function debounce(fn: () => void, delay: number) {
  let timeout: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(fn, delay)
  }
}

export function addDevtools(app: App, pinia: Pinia) {
  const queryCache = useQueryCache(pinia)

  setupDevtoolsPlugin(
    {
      id: 'dev.esm.pinia-colada',
      app,
      label: 'Pinia Colada',
      packageName: 'pinia-colada',
      homepage: 'https://pinia-colada.esm.dev/',
      logo: 'https://pinia-colada.esm.dev/logo.svg',
      componentStateTypes: [],
    },
    (api) => {
      const updateQueryInspectorTree = debounce(() => {
        api.sendInspectorTree(QUERY_INSPECTOR_ID)
        api.sendInspectorState(QUERY_INSPECTOR_ID)
      }, 100)

      api.addInspector({
        id: QUERY_INSPECTOR_ID,
        label: 'Pinia Queries',
        icon: 'storage',
        noSelectionText: 'Select a query entry to inspect it',
        treeFilterPlaceholder: 'Filter query entries',
        stateFilterPlaceholder: 'Find within the query entry',
        actions: [
          {
            icon: 'refresh',
            action: updateQueryInspectorTree,
            tooltip: 'Sync',
          },
        ],
      })

      let stopWatcher = () => {}

      api.on.getInspectorState((payload) => {
        if (payload.app !== app) return
        if (payload.inspectorId === QUERY_INSPECTOR_ID) {
          const entry = queryCache.getEntries({
            key: payload.nodeId.split(ID_SEPARATOR),
            exact: true,
          })[0]
          if (!entry) {
            payload.state = {
              Error: [
                {
                  key: 'error',
                  value: new Error(`Query entry ${payload.nodeId} not found`),
                  editable: false,
                },
              ],
            }
            return
          }

          stopWatcher()
          stopWatcher = watch(
            () => [entry.state.value, entry.asyncStatus.value],
            () => {
              api.sendInspectorState(QUERY_INSPECTOR_ID)
            },
          )

          const state = entry.state.value

          payload.state = {
            state: [
              { key: 'data', value: state.data, editable: true },
              { key: 'error', value: state.error, editable: true },
              { key: 'status', value: state.status, editable: true },
              { key: 'asyncStatus', value: entry.asyncStatus.value, editable: true },
            ],
            entry: [
              { key: 'key', value: entry.key, editable: false },
              { key: 'options', value: entry.options, editable: true },
            ],
          }
        }
      })

      api.on.editInspectorState((payload) => {
        if (payload.app !== app) return
        if (payload.inspectorId === QUERY_INSPECTOR_ID) {
          const entry = queryCache.getEntries({
            key: payload.nodeId.split(ID_SEPARATOR),
            exact: true,
          })[0]
          if (!entry) return
          const path = payload.path.slice()
          payload.set(entry, path, payload.state.value)
          api.sendInspectorState(QUERY_INSPECTOR_ID)
        }
      })

      const QUERY_FILTER_RE = /\b(active|inactive|stale|fresh|exact|loading|idle)\b/gi

      api.on.getInspectorTree((payload) => {
        if (payload.app !== app || payload.inspectorId !== QUERY_INSPECTOR_ID) return

        const filters = payload.filter.match(QUERY_FILTER_RE)
        // strip the filters from the query
        const filter = (
          filters ? payload.filter.replace(QUERY_FILTER_RE, '') : payload.filter
        ).trim()

        const active = filters?.includes('active')
          ? true
          : filters?.includes('inactive')
            ? false
            : undefined
        const stale = filters?.includes('stale')
          ? true
          : filters?.includes('fresh')
            ? false
            : undefined
        const asyncStatus = filters?.includes('loading')
          ? 'loading'
          : filters?.includes('idle')
            ? 'idle'
            : undefined

        payload.rootNodes = queryCache
          .getEntries({
            active,
            stale,
            // TODO: if there is an exact match, we should put it at the top
            exact: false, // we also filter many
            predicate(entry) {
              // filter out by asyncStatus
              if (asyncStatus && entry.asyncStatus.value !== asyncStatus) return false
              if (filter) {
                // TODO: fuzzy match between entry.key.join('/') and the filter
                return entry.key.some((key) => String(key).includes(filter))
              }
              return true
            },
          })
          .map((entry) => {
            const id = entry.key.join(ID_SEPARATOR)
            const label = entry.key.join('/')
            const asyncStatus = entry.asyncStatus.value
            const state = entry.state.value

            const tags: InspectorNodeTag[] = [
              ASYNC_STATUS_TAG[asyncStatus],
              STATUS_TAG[state.status],
              // useful for testing colors
              // ASYNC_STATUS_TAG.idle,
              // ASYNC_STATUS_TAG.fetching,
              // STATUS_TAG.pending,
              // STATUS_TAG.success,
              // STATUS_TAG.error,
            ]
            if (!entry.active) {
              tags.push({
                label: 'inactive',
                textColor: 0,
                backgroundColor: 0xaa_aa_aa,
                tooltip: 'The query is not being used anywhere',
              })
            }
            return {
              id,
              label,
              name: label,
              tags,
            }
          })
      })

      queryCache.$onAction(({ name, after, onError }) => {
        if (
          name === 'invalidate' || // includes cancel
          name === 'fetch' || // includes refresh
          name === 'setEntryState' || // includes set data
          name === 'remove' ||
          name === 'untrack' ||
          name === 'track' ||
          name === 'ensure' // includes create
        ) {
          updateQueryInspectorTree()
          after(updateQueryInspectorTree)
          onError(updateQueryInspectorTree)
        }
      })

      // update the devtools too
      api.notifyComponentUpdate()
      api.sendInspectorTree(QUERY_INSPECTOR_ID)
      api.sendInspectorState(QUERY_INSPECTOR_ID)
    },
  )

  // TODO: custom tab?

  // addCustomTab({
  //   name: 'pinia-colada',
  //   title: 'Pinia Colada',
  //   icon: 'https://pinia-colada.esm.dev/logo.svg',
  //   view: {
  //     type: 'iframe',
  //     src: '//localhost:',
  //     persistent: true,
  //     // type: 'vnode',
  //     // sfc: DevtoolsPanel,
  //     // type: 'vnode',
  //     // vnode: h(DevtoolsPane),
  //     // vnode: h('p', ['hello world']),
  //     // vnode: createVNode(DevtoolsPane),
  //   },
  //   category: 'modules',
  // })

  // window.addEventListener('message', (event) => {
  //   const data = event.data
  //   if (data != null && typeof data === 'object' && data.id === 'pinia-colada-devtools') {
  //     console.log('message', event)
  //   }
  // })
}

interface InspectorNodeTag {
  label: string
  textColor: number
  backgroundColor: number
  tooltip?: string
}

/**
 * Tags for the different states of a query
 */
const STATUS_TAG: Record<DataStateStatus, InspectorNodeTag> = {
  pending: {
    label: 'pending',
    textColor: 0,
    backgroundColor: 0xff_9d_23,
    tooltip: `The query hasn't resolved yet`,
  },
  success: {
    label: 'success',
    textColor: 0,
    backgroundColor: 0x16_c4_7f,
    tooltip: 'The query resolved successfully',
  },
  error: {
    label: 'error',
    textColor: 0,
    backgroundColor: 0xf9_38_27,
    tooltip: 'The query rejected with an error',
  },
}

/**
 * Tags for the different states of a query
 */
const ASYNC_STATUS_TAG: Record<AsyncStatus, InspectorNodeTag> = {
  idle: {
    label: 'idle',
    textColor: 0,
    backgroundColor: 0xaa_aa_aa,
    tooltip: 'The query is not fetching',
  },
  loading: {
    label: 'fetching',
    textColor: 0xff_ff_ff,
    backgroundColor: 0x57_8f_ca,
    tooltip: 'The query is currently fetching',
  },
}
