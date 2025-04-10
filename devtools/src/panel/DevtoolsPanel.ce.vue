<script setup lang="ts">
import { Splitpanes, Pane } from '@posva/splitpanes'
import { ref, watch } from 'vue'
import type { UseQueryEntryPayload } from '../shared/query-serialized'
import PiPContainer from './components/PiPContainer.vue'
import UButton from './components/UButton.ce.vue'

const { ports, isPip } = defineProps<{
  ports: [port1: MessagePort, port2: MessagePort]
  isPip: boolean
}>()

const emit = defineEmits<{
  togglePip: []
  closePip: []
}>()

const queries = ref<UseQueryEntryPayload[]>([])

function onMessage(e: MessageEvent) {
  if (e.data && typeof e.data === 'object') {
    if (e.data.id === 'caches:all') {
      queries.value = e.data.caches
      console.log('Received caches:', e.data.caches)
    } else {
      console.log('Received message from App:', e.data)
    }
  }
}

watch(
  () => ports[1],
  (port, _old, onCleanup) => {
    if (!port) return
    // NOTE: only setting onmessage works
    // port.addEventListener('message', onMessage)
    port.onmessage = onMessage
    port.onmessageerror = (err) => {
      console.error('Error in message channel:', err)
    }

    onCleanup(() => {
      port.onmessage = null
      port.onmessageerror = null
    })
  },
  { immediate: true },
)

const n = ref(0)

function sendMessage(msg: string) {
  n.value++
  const port = ports?.[1]
  if (!port) {
    throw new Error('no port')
  }
  port.postMessage({
    port: 1,
    msg,
  })
}
</script>

<template>
  <PiPContainer :is-pip>
    <main id="main" class="w-full h-full">
      Hello!
      <h2>Icons</h2>
      <p>
        <i-mdi-account />
        <i-carbon-add-alt />
        <i-carbon-renew class="text-xl" />
      </p>

      <UButton @click="sendMessage(`n: ${n}`)">
        Increment {{ n }}
      </UButton>
      <button class="font-bold underline" @click="emit('togglePip')">
        {{ isPip ? 'Close Pip' : 'Open PiP' }}
      </button>

      <pre>{{ queries }}</pre>

      <RouterView />

      <aside class="bottom-0 left-0 right-0 flex flex-col">
        <div class="flex">
          <h2>Pinia Colada Devtools</h2>

          <button>Queries</button>
          <button>Mutations</button>

          <div class="flex-grow" />

          <div>
            <div>Loading {{ 5 }}</div>
          </div>
        </div>

        <div>
          <input type="search" autocomplete="off" spellcheck="false" placeholder="Search by key">

          <div>
            <button>Clear cache</button>
          </div>
        </div>

        <Splitpanes :key="n" style="height: 600px">
          <Pane min-size="20" class="flex flex-col">
            <button v-for="entry in queries" class="border-b-1 border-white flex">
              {{ entry.key }}
            </button>
          </Pane>
          <Pane>
            <Splitpanes horizontal>
              <Pane v-for="i in 3" :key="i">
                {{ i + 1 }}
              </Pane>
            </Splitpanes>
          </Pane>
          <Pane>
            <div>5</div>
          </Pane>
        </Splitpanes>
      </aside>
    </main>
  </PiPContainer>
</template>

<style>
@import '@pinia/colada-devtools/panel/index.css';
@import '@posva/splitpanes/dist/splitpanes.css';

.splitpanes__splitter {
  position: relative;
  --grab-size: -4px;
}

.splitpanes__splitter {
  /* background-color: #9ca3af33; */
  background-color: color-mix(in hsl, var(--ui-text) 20%, transparent);
}

/* .splitpanes--horizontal > div { */
/*   overflow-y: hidden; */
/*   overflow-x: scroll; */
/* } */
/* .splitpanes--vertical > div { */
/*   overflow-y: hidden; */
/*   overflow-x: scroll; */
/* } */

.splitpanes--vertical > .splitpanes__splitter::before {
  left: var(--grab-size);
  right: var(--grab-size);
  height: 100%;
}

.splitpanes--horizontal > .splitpanes__splitter::before {
  top: var(--grab-size);
  bottom: var(--grab-size);
  width: 100%;
}

.splitpanes__splitter::before {
  position: absolute;
  inset: 0;
  content: '';
  transition: background-color 0.25s ease-out;
  z-index: 10000;
}

/* .splitpanes--dragging .splitpanes__splitter::before, */
.splitpanes__splitter:hover::before {
  /* background-color: color-mix(in hsl, var(--ui-text) 20%, transparent); */
  background-color: color-mix(in srgb, var(--ui-text) 20%, transparent);
  opacity: 1;
}
</style>
