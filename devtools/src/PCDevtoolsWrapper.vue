<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import ClientOnly from './ClientOnly.vue'
import PiniaColadaDevtools from './PiniaColadaDevtools.vue'
import { useLocalStorage } from '@vueuse/core'

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

async function openDevtools() {
  await ensureCEDefined()
  areDevtoolsOpen.value = true
}

onMounted(() => {
  // FIXME: it would be nice to do some prefetching in vite
  // https://github.com/vitejs/vite/issues/10600
  requestIdleCallback(() => {
    import('@pinia/colada-devtools/panel')
  })

  // reopen devtools if they were open before
  if (areDevtoolsOpen.value) {
    openDevtools()
  }
})
</script>

<template>
  <ClientOnly>
    <button
      v-if="!areDevtoolsOpen"
      class="fixed bottom-2 right-2 bg-primary-500 hover:cursor-pointer z-99999"
      @click="openDevtools()"
    >
      🍹 Devtools
    </button>
    <PiniaColadaDevtools v-if="isCEDefined && areDevtoolsOpen" />
  </ClientOnly>
</template>
