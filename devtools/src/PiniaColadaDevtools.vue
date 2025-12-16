<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { useQueryCache, useMutationCache } from '@pinia/colada'
import { DuplexChannel, DEVTOOLS_INFO_KEY } from '@pinia/colada-devtools/shared'
import type { AppEmits, DevtoolsEmits } from '@pinia/colada-devtools/shared'
import { createQueryEntryPayload, createMutationEntryPayload } from './pc-devtools-info-plugin'
// use dependency free simple useEventListener because this component is used directly in the app
import { useEventListener } from './use-event-listener'

const emit = defineEmits<{
  close: []
}>()

const queryCache = useQueryCache()
const mutationCache = useMutationCache()

queryCache.$onAction(({ name, after, onError, args }) => {
  if (name === 'remove') {
    const [entry] = args
    after(() => {
      transmitter.emit('queries:delete', createQueryEntryPayload(entry))
    })
  } else if (
    name === 'track' ||
    name === 'untrack' ||
    name === 'cancel' ||
    name === 'invalidate' ||
    name === 'fetch' ||
    name === 'setEntryState'
  ) {
    const [entry] = args

    // on fetch we want to see it loading
    if (name === 'fetch') {
      const payload = createQueryEntryPayload(entry)
      // NOTE: pinia colada does not expose an action for this
      payload.asyncStatus = 'loading'
      transmitter.emit('queries:update', payload)
    }

    // TODO: throttle
    after(() => {
      entry[DEVTOOLS_INFO_KEY].simulate = null
      transmitter.emit('queries:update', createQueryEntryPayload(entry))

      // emit an update when the data becomes stale
      if (
        name === 'fetch' &&
        entry.options?.staleTime != null &&
        Number.isFinite(entry.options.staleTime)
      ) {
        setTimeout(() => {
          transmitter.emit('queries:update', createQueryEntryPayload(entry))
        }, entry.options.staleTime)
      }
    })
    onError(() => {
      transmitter.emit('queries:update', createQueryEntryPayload(entry))
    })
  } else if (name === 'create') {
    after((entry) => {
      transmitter.emit('queries:update', createQueryEntryPayload(entry))
    })
  } else if (name === 'setQueryData') {
    // we need to track changes to invalidatedAt
    const [key] = args
    after(() => {
      const entry = queryCache.getEntries({ key, exact: true })[0]
      if (entry) {
        transmitter.emit('queries:update', createQueryEntryPayload(entry))
      }
    })
  }
})

mutationCache.$onAction(({ name, args, after, onError }) => {
  if (name === 'remove') {
    const [entry] = args
    after(() => {
      transmitter.emit('mutations:delete', createMutationEntryPayload(entry))
    })
  } else if (name === 'mutate' || name === 'setEntryState') {
    const [entry] = args

    // on mutate we want to see it loading
    if (name === 'mutate') {
      const payload = createMutationEntryPayload(entry)
      payload.asyncStatus = 'loading'
      transmitter.emit('mutations:update', payload)
    }

    after(() => {
      transmitter.emit('mutations:update', createMutationEntryPayload(entry))
    })
    onError(() => {
      transmitter.emit('mutations:update', createMutationEntryPayload(entry))
    })
  } else if (name === 'ensure') {
    const [entry] = args
    after(() => {
      transmitter.emit('mutations:update', createMutationEntryPayload(entry))
    })
  }
})

const devtoolsEl = useTemplateRef<HTMLElement>('devtools')

const mc = shallowRef(new MessageChannel())
const transmitter = new DuplexChannel<AppEmits, DevtoolsEmits>(mc.value.port1)
watch(
  mc,
  (mc) => {
    transmitter.setPort(mc.port1)
  },
  { flush: 'sync' },
)

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

transmitter.on('mutations:clear', (filters = {}) => {
  const entries = mutationCache.getEntries(filters)
  entries.forEach((entry) => mutationCache.remove(entry))
})

transmitter.on('mutations:remove', (id) => {
  const entry = mutationCache.get(id)
  if (entry) {
    mutationCache.remove(entry)
  }
})

transmitter.on('mutations:simulate:loading', (id) => {
  const entry = mutationCache.get(id)
  if (entry) {
    entry.asyncStatus.value = 'loading'
    entry[DEVTOOLS_INFO_KEY].simulate = 'loading'
    transmitter.emit('mutations:update', createMutationEntryPayload(entry))
  }
})

transmitter.on('mutations:simulate:loading:stop', (id) => {
  const entry = mutationCache.get(id)
  if (entry && entry[DEVTOOLS_INFO_KEY].simulate === 'loading') {
    entry.asyncStatus.value = 'idle'
    entry[DEVTOOLS_INFO_KEY].simulate = null
    transmitter.emit('mutations:update', createMutationEntryPayload(entry))
  }
})

transmitter.on('mutations:simulate:error', (id) => {
  const entry = mutationCache.get(id)
  if (entry) {
    mutationCache.setEntryState(entry, {
      ...entry.state.value,
      status: 'error',
      error: new Error('Simulated error'),
    })
    // we set after because setting the entry state resets the simulation
    entry[DEVTOOLS_INFO_KEY].simulate = 'error'
    transmitter.emit('mutations:update', createMutationEntryPayload(entry))
  }
})

transmitter.on('mutations:simulate:error:stop', (id) => {
  const entry = mutationCache.get(id)
  if (entry && entry[DEVTOOLS_INFO_KEY].simulate === 'error') {
    const state = entry.state.value
    mutationCache.setEntryState(
      entry,
      state.data === undefined
        ? {
            data: undefined,
            status: 'pending',
            error: null,
          }
        : { data: state.data, status: 'success', error: null },
    )
    entry[DEVTOOLS_INFO_KEY].simulate = null
    transmitter.emit('mutations:update', createMutationEntryPayload(entry))
  }
})

transmitter.on('mutations:replay', (id) => {
  const entry = mutationCache.get(id)

  if (!entry) {
    console.warn('[@pinia/colada] Cannot replay: mutation entry not found')
    return
  }

  if (entry.gcTimeout) {
    console.warn(
      "[@pinia/colada] Cannot replay: mutation is in the process of being garbage collected. It isn't used anywhere and replaying it will have no effect.",
    )
    return
  }

  mutationCache.setEntryState(entry, {
    data: undefined,
    status: 'pending',
    error: null,
  })
  mutationCache.mutate(entry).catch(() => {
    // Errors are automatically emitted via mutations:update
  })
})

// PiP window handling
const pipWindow = shallowRef<Window | null>(null)

// when the element is moved into a window, the port is automatically closed
watch(pipWindow, () => {
  // console.info('🗺️ Recreating MessageChannel...')
  mc.value = new MessageChannel()
})

useEventListener(
  window,
  'unload',
  () => {
    pipWindow.value?.close()
  },
  { passive: true },
)
onBeforeUnmount(() => {
  pipWindow.value?.close()
})

function closePiPWindow() {
  pipWindow.value?.close()
  pipWindow.value = null
}

function openPiPWindow() {
  const devtools = devtoolsEl.value
  if (!devtools || !devtools.shadowRoot) {
    throw new Error('No devtools elemnt found for Pinia Colada devtools')
  }

  const devtoolsRootEl = devtools.shadowRoot.getElementById('root')

  if (!devtoolsRootEl) {
    throw new Error('No devtools root element found for Pinia Colada devtools')
  }

  const windowWidth = Math.max(devtoolsRootEl.offsetWidth, 400)
  const windowHeight = Math.max(devtoolsRootEl.offsetHeight, 400)
  // console.info(`Opening PiP window ${windowWidth}x${windowHeight}`)

  const pip = window.open(
    '',
    'pinia-colada-devtools',
    `popup,width=${windowWidth},height=${windowHeight}`,
  )

  if (!pip) {
    throw new Error('Failed to open PiP window for Pinia Colada devtools')
  }

  pipWindow.value = pip

  pip.document.head.innerHTML = ''
  // Remove existing body
  pip.document.body.innerHTML = ''

  pip.document.title = '🍹 Pinia Colada Devtools'
  pip.document.body.style.margin = '0'

  // TODO:
  // pip.addEventListener('pagehide', () => {
  //   setLocalStore('pip_open', 'false')
  //   setPipWindow(null)
  // })
  //
  attachCssPropertyRules(devtools, pip.document)

  pip.addEventListener(
    'unload',
    () => {
      pipWindow.value = null
    },
    { passive: true },
  )
}

function attachCssPropertyRules(el: HTMLElement, doc: Document = document) {
  if (!el || !el.shadowRoot) {
    throw new Error('No devtools element found for Pinia Colada devtools')
  }

  const style = doc.getElementById('__pc-tw-properties') ?? doc.createElement('style')
  style.setAttribute('id', '__pc-tw-properties')

  const cssPropertyRulesText = Array.from(el.shadowRoot.styleSheets)
    .flatMap((s) => Array.from(s.cssRules))
    .filter((rule) => rule instanceof CSSPropertyRule)
    .map((rule) => rule.cssText)
    .join('')
  style.textContent = cssPropertyRulesText
  doc.head.appendChild(style)
}

function togglePiPWindow() {
  if (pipWindow.value) {
    closePiPWindow()
  } else {
    openPiPWindow()
  }
}

let tries = 0
async function devtoolsOnReady() {
  if (!devtoolsEl.value) {
    if (++tries > 100) {
      throw new Error('Failed to find devtools element for Pinia Colada devtools')
    }
    setTimeout(() => {
      devtoolsOnReady()
    }, 100)
    return
  }
  attachCssPropertyRules(devtoolsEl.value)
  transmitter.emit('queries:all', queryCache.getEntries().map(createQueryEntryPayload))
  transmitter.emit('mutations:all', mutationCache.getEntries().map(createMutationEntryPayload))
}
</script>

<template>
  <!--
      NOTE:we need to keep the pinia-colada-devtools-panel component as the root without wrappers so it is reused
    -->
  <Teleport :to="pipWindow ? pipWindow.document.body : 'body'">
    <pinia-colada-devtools-panel
      ref="devtools"
      :isPip.prop="!!pipWindow"
      :port.prop="mc.port2"
      @toggle-pip="togglePiPWindow()"
      @ready="devtoolsOnReady()"
      @close="emit('close')"
    />
  </Teleport>
</template>
