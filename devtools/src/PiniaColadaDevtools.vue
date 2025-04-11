<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { createQueryEntryPayload, useEventListener } from '@pinia/colada-devtools/shared'

console.log('Injected value', inject('test', 'NO'))

const queryCache = useQueryCache()

watch(
  () => queryCache.getEntries({}),
  (caches) => {
    console.log('Query cache changed', caches)
    mc.value?.port1.postMessage({
      id: 'caches:all',
      caches: caches.map(createQueryEntryPayload),
    })
  },
)

queryCache.$onAction(({ name, after, onError }) => {
  if (
    name === 'fetch'
    || name === 'track'
    || name === 'untrack'
    || name === 'remove'
    || name === 'invalidate'
    || name === 'cancel'
  ) {
    // TODO: throttle
    after(() => {
      mc.value?.port1.postMessage({
        id: 'caches:fetch',
        caches: queryCache.getEntries({}).map(createQueryEntryPayload),
      })
    })
    onError(() => {
      mc.value?.port1.postMessage({
        id: 'caches:fetch',
        caches: queryCache.getEntries({}).map(createQueryEntryPayload),
      })
    })
  }
})

const devtoolsEl = useTemplateRef<HTMLElement>('devtools')

const mc = shallowRef<MessageChannel | null>(null)

function onMessage(e: MessageEvent) {
  console.log('Received message from devtools', e.data)
}

onMounted(async () => {
  mc.value = new MessageChannel()

  mc.value.port1.onmessage = onMessage
  mc.value.port1.onmessageerror = (err) => {
    console.error('P1: Error in message channel:', err)
  }
  mc.value.port2.onmessageerror = (err) => {
    console.error('P2: Error in message channel:', err)
  }

  // define the component once
  if (!customElements.get('pinia-colada-devtools-panel')) {
    const { DevtoolsPanel } = await import('@pinia/colada-devtools/panel')
    customElements.define('pinia-colada-devtools-panel', DevtoolsPanel)
  }
})

function sendMessageTest() {
  mc.value?.port1.postMessage({
    message: 'Hello from the App',
    when: new Date(),
  })
}

const pipWindow = shallowRef<Window | null>(null)

watch(pipWindow, () => {
  console.info('🗺️ Recreating MessageChannel...')
  const newMc = new MessageChannel()

  newMc.port1.onmessage = onMessage
  newMc.port1.onmessageerror = (err) => {
    console.error('P1: Error in message channel:', err)
  }
  newMc.port2.onmessageerror = (err) => {
    console.error('P2: Error in message channel:', err)
  }

  mc.value = newMc
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
</script>

<template>
  <template v-if="mc">
    <button @click="sendMessageTest()">
      Send message
    </button>
    <!--
      NOTE:we need to keep the pinia-colada-devtools-panel component as the root without wrappers so it is reused
    -->
    <Teleport :to="pipWindow ? pipWindow.document.body : 'body'">
      <pinia-colada-devtools-panel
        ref="devtools"
        :isPip.prop="!!pipWindow"
        :ports.prop="[mc.port1, mc.port2]"
        @toggle-pip="togglePiPWindow()"
        @ready="attachCssPropertyRules(devtoolsEl)"
      />
    </Teleport>
  </template>
</template>
