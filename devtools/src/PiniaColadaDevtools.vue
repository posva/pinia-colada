<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import {
  createQueryEntryPayload,
  MessagePortEmitter,
  useEventListener,
} from '@pinia/colada-devtools/shared'
import type { AppEmits, DevtoolsEmits } from '@pinia/colada-devtools/shared'

console.log('Injected value', inject('test', 'NO'))

const queryCache = useQueryCache()

watch(
  () => queryCache.getEntries({}),
  (caches) => {
    transmitter.emit('queries:all', caches.map(createQueryEntryPayload))
    console.log('Query cache changed', caches)
  },
)

queryCache.$onAction(({ name, after, onError }) => {
  if (
    name === 'fetch' ||
    name === 'track' ||
    name === 'untrack' ||
    name === 'remove' ||
    name === 'invalidate' ||
    name === 'cancel'
  ) {
    // TODO: throttle
    after(() => {
      transmitter.emit('queries:all', queryCache.getEntries({}).map(createQueryEntryPayload))
      // mc.value?.port1.postMessage({
      //   id: 'caches:fetch',
      //   caches: queryCache.getEntries({}).map(createQueryEntryPayload),
      // })
    })
    onError(() => {
      transmitter.emit('queries:all', queryCache.getEntries({}).map(createQueryEntryPayload))
      // mc.value?.port1.postMessage({
      //   id: 'caches:fetch',
      //   caches: queryCache.getEntries({}).map(createQueryEntryPayload),
      // })
    })
  }
})

const devtoolsEl = useTemplateRef<HTMLElement>('devtools')

const mc = shallowRef<MessageChannel | null>(null)

function onMessage(e: MessageEvent) {
  console.log('Received message from devtools', e.data)
}

let transmitter: MessagePortEmitter<AppEmits, DevtoolsEmits>

onMounted(async () => {
  mc.value = new MessageChannel()

  transmitter = new MessagePortEmitter<AppEmits, DevtoolsEmits>(mc.value.port1)

  transmitter.on('ping', () => {
    console.log('Received ping from devtools')
    transmitter.emit('pong')
  })
  transmitter.on('pong', () => {
    console.log('Received pong from devtools')
  })

  // define the component once
  if (!customElements.get('pinia-colada-devtools-panel')) {
    const { DevtoolsPanel } = await import('@pinia/colada-devtools/panel')
    customElements.define('pinia-colada-devtools-panel', DevtoolsPanel)
  }
})

watch(
  mc,
  (mc) => {
    if (!mc) return
    // the first time, transmitter is still undefined
    transmitter?.setPort(mc.port1)
  },
  { flush: 'sync' },
)

const pipWindow = shallowRef<Window | null>(null)

watch(pipWindow, () => {
  console.info('🗺️ Recreating MessageChannel...')
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

  const devtoolsRootEl = devtools.shadowRoot.getElementById('main')

  if (!devtoolsRootEl) {
    throw new Error('No devtools root element found for Pinia Colada devtools')
  }

  console.info(`Opening PiP window ${devtoolsRootEl.offsetWidth}x${devtoolsRootEl.offsetHeight}`)

  const pip = window.open(
    '',
    'pinia-colada-devtools',
    `popup,width=${devtoolsRootEl.offsetWidth},height=${devtoolsRootEl.offsetHeight}`,
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
      console.log('PiP window closed')
      pipWindow.value = null
    },
    { passive: true },
  )
}

function attachCssPropertyRules(el: HTMLElement | null, doc: Document = document) {
  if (!el || !el.shadowRoot) {
    throw new Error('No devtools elemnt found for Pinia Colada devtools')
  }

  const style = doc.getElementById('__pc-tw-properties') ?? doc.createElement('style')
  style.setAttribute('id', '__pc-tw-properties')

  const cssPropertyRulesText = [...el.shadowRoot.styleSheets]
    .flatMap((s) => [...s.cssRules])
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

function devtoolsOnReady() {
  attachCssPropertyRules(devtoolsEl.value)
  transmitter.emit('queries:all', queryCache.getEntries({}).map(createQueryEntryPayload))
}
</script>

<template>
  <template v-if="mc">
    <button @click="transmitter.emit('ping')">Send message</button>
    <!--
      NOTE:we need to keep the pinia-colada-devtools-panel component as the root without wrappers so it is reused
    -->
    <Teleport :to="pipWindow ? pipWindow.document.body : 'body'">
      <pinia-colada-devtools-panel
        ref="devtools"
        :isPip.prop="!!pipWindow"
        :ports.prop="[mc.port1, mc.port2]"
        @toggle-pip="togglePiPWindow()"
        @ready="devtoolsOnReady()"
      />
    </Teleport>
  </template>
</template>
