<script lang="ts" setup>
import { onMounted, ref, useTemplateRef } from 'vue'
import ClientOnly from './ClientOnly.vue'
import PiniaColadaDevtools from './PiniaColadaDevtools.vue'
import { useEventListener, useLocalStorage } from '@vueuse/core'
import logoURL from './logo.svg?inline'
// to inject them manually and keep the lib as a js
import buttonStyles from './button-style.css?inline'
import { useMutationCache, useQueryCache } from '@pinia/colada'
import { addDevtoolsInfo } from './pc-devtools-info-plugin'

const isCEDefined = ref(false)
const areDevtoolsOpen = useLocalStorage('pinia-colada-devtools-open', false)

// keep this in sync with the `width`/`height` in button-style.css
const BUTTON_SIZE = 58
const BUTTON_MARGIN = 16

function clampButtonX(x: number) {
  const max = Math.max(BUTTON_MARGIN, window.innerWidth - BUTTON_SIZE - BUTTON_MARGIN)
  return Math.min(Math.max(BUTTON_MARGIN, x), max)
}

const buttonRef = useTemplateRef<HTMLButtonElement>('devtools-button')
const buttonX = useLocalStorage('pinia-colada-devtools-button-x', () =>
  // horizontal offset from the left edge, in px. Defaults to the right side.
  typeof window === 'undefined' ? 0 : window.innerWidth - BUTTON_SIZE - BUTTON_MARGIN,
)
const isDragging = ref(false)
// becomes `true` once the pointer moves past a small threshold so a drag does
// not trigger the click that opens the devtools
let didDrag = false
// drag state shared with the window listeners below
let startPointer = 0
let startX = 0
let currentX = 0
// how much the inner icon leans into the movement, and how fast it relaxes back
const TILT_FACTOR = 0.5
const MAX_TILT = 20
let lastPointer = 0
let tiltRelaxTimer: ReturnType<typeof setTimeout> | undefined

function setTilt(deg: number) {
  buttonRef.value?.style.setProperty('--pc-tilt', `${deg}deg`)
}

function onPointerDown(event: PointerEvent) {
  // only the primary (left) button starts a drag
  if (!buttonRef.value || event.button !== 0) return
  startPointer = lastPointer = event.clientX
  startX = currentX = buttonX.value
  didDrag = false
  isDragging.value = true
}

// follow the mouse while dragging
useEventListener('pointermove', (event: PointerEvent) => {
  if (!isDragging.value) return
  const delta = event.clientX - startPointer
  if (Math.abs(delta) > 4) didDrag = true
  currentX = clampButtonX(startX + delta)
  // write straight to the DOM during the drag: no Vue re-render, transform-only
  buttonRef.value?.style.setProperty('--pc-x', `${currentX}px`)

  // lean the icon into the movement, scaled by the pointer speed (px since last move)
  const speed = event.clientX - lastPointer
  lastPointer = event.clientX
  setTilt(Math.max(-MAX_TILT, Math.min(MAX_TILT, speed * TILT_FACTOR)))
  // relax back to neutral once the pointer goes still; CSS eases the return
  clearTimeout(tiltRelaxTimer)
  tiltRelaxTimer = setTimeout(() => setTilt(0), 80)
})

// stop as soon as the pointer is released, cancelled, or the page blurs
useEventListener(['pointerup', 'pointercancel', 'blur'], () => {
  if (!isDragging.value) return
  isDragging.value = false
  clearTimeout(tiltRelaxTimer)
  setTilt(0)
  // persist the resting position; the binding picks it back up from here
  buttonX.value = currentX
})

// keep the button on screen when the viewport shrinks
useEventListener('resize', () => {
  buttonX.value = clampButtonX(buttonX.value)
})

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
  // ignore the click that ends a drag
  if (didDrag) {
    didDrag = false
    return
  }
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
      ref="devtools-button"
      aria-label="Open Pinia Colada Devtools"
      title="Open Pinia Colada Devtools (drag to move)"
      :style="{ '--pc-x': `${buttonX}px` }"
      :data-dragging="isDragging"
      @pointerdown="onPointerDown"
      @click="openDevtools()"
    >
      <img :src="logoURL" alt="Pinia Colada Devtools Logo" />
    </button>
    <PiniaColadaDevtools v-if="isCEDefined && areDevtoolsOpen" @close="areDevtoolsOpen = false" />
  </ClientOnly>
</template>
