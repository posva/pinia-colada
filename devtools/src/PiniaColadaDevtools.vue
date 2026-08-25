<script setup lang="ts">
import { onBeforeUnmount, shallowRef, useTemplateRef, watch } from 'vue'
import { useQueryCache, useMutationCache } from '@pinia/colada'
import { DuplexChannel } from '@pinia/colada-devtools/shared'
import type { AppEmits, DevtoolsEmits } from '@pinia/colada-devtools/shared'
import { setupDevtoolsAppBridge, attachCssPropertyRules } from './app-bridge'
// use dependency free simple useEventListener because this component is used directly in the app
import { useEventListener } from './use-event-listener'

const emit = defineEmits<{
  close: []
}>()

const queryCache = useQueryCache()
const mutationCache = useMutationCache()

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

const bridge = setupDevtoolsAppBridge(queryCache, mutationCache, transmitter)

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
  bridge.sendAll()
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
