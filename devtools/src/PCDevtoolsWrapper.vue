<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import ClientOnly from './ClientOnly.vue'
import PiniaColadaDevtools from './PiniaColadaDevtools.vue'
import { useLocalStorage } from '@vueuse/core'
import logoURL from './logo.svg?inline'
// to inject them manually and keep the lib as a js
import buttonStyles from './button-style.css?inline'
import { useMutationCache, useQueryCache } from '@pinia/colada'
import { addDevtoolsInfo } from './pc-devtools-info-plugin'

const isCEDefined = ref(false)
const areDevtoolsOpen = useLocalStorage('pinia-colada-devtools-open', false)
async function ensureCEDefined() {
  if (isCEDefined.value) return
  isCEDefined.value = true
  if (!customElements.get('pinia-colada-devtools-panel')) {
    const { DevtoolsPanel } = await import('@pinia/colada-devtools/panel')
    customElements.define('pinia-colada-devtools-panel', DevtoolsPanel)
  }
}

// add the info here so it is available right away
const queryCache = useQueryCache()
const mutationCache = useMutationCache()
addDevtoolsInfo(queryCache, mutationCache)

async function openDevtools() {
  await ensureCEDefined()
  areDevtoolsOpen.value = true
}

onMounted(() => {
  const styleEl = document.getElementById('__pc-devtools-style') ?? document.createElement('style')
  styleEl.id = '__pc-devtools-style'
  styleEl.textContent = buttonStyles
  document.head.appendChild(styleEl)

  // reopen devtools if they were open before
  if (areDevtoolsOpen.value) {
    openDevtools()
  } else {
    // prefetch the custom element
    // FIXME: it would be nice to do some prefetching in vite
    // https://github.com/vitejs/vite/issues/10600
    const idleCallback =
      typeof requestIdleCallback === 'function' ? requestIdleCallback : requestAnimationFrame // not a replacement but until Safari supports
    idleCallback(() => {
      import('@pinia/colada-devtools/panel')
    })
  }
})
</script>

<template>
  <ClientOnly>
    <button
      v-if="!areDevtoolsOpen"
      id="open-devtools-button"
      aria-label="Open Pinia Colada Devtools"
      title="Open Pinia Colada Devtools"
      @click="openDevtools()"
    >
      <img :src="logoURL" alt="Pinia Colada Devtools Logo" />
    </button>
    <PiniaColadaDevtools v-if="isCEDefined && areDevtoolsOpen" @close="areDevtoolsOpen = false" />
  </ClientOnly>
</template>
