<script setup lang="ts">
import { Splitpanes, Pane } from '@posva/splitpanes'
import { ref, watch } from 'vue'
import type { UseQueryEntryPayload } from '../shared/query-serialized'

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
  <div>
    Hello!
    <button @click="sendMessage(`n: ${n}`)">Increment {{ n }}</button>
    <button class="underline font-bold" @click="emit('togglePip')">
      {{ isPip ? 'Close Pip' : 'Open PiP' }}
    </button>

    <pre>{{ queries }}</pre>

    <Splitpanes :key="n" class="bg-main" style="height: 600px">
      <Pane min-size="20">
        <div>1</div>
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
  </div>
</template>

<style>
@import './styles.css';
@import '@posva/splitpanes/dist/splitpanes.css';

.splitpanes__splitter {
  position: relative;
  --grab-size: -4px;
}

.splitpanes__splitter {
  background: #9ca3af33;
}

/* .splitpanes--horizontal > div { */
/*   overflow-y: hidden; */
/*   overflow-x: scroll; */
/* } */
/* .splitpanes--vertical > div { */
/*   overflow-y: hidden; */
/*   overflow-x: scroll; */
/* } */

.splitpanes--vertical > .splitpanes__splitter:before {
  left: var(--grab-size);
  right: var(--grab-size);
  height: 100%;
}

.splitpanes--horizontal > .splitpanes__splitter:before {
  top: var(--grab-size);
  bottom: var(--grab-size);
  width: 100%;
}

.splitpanes__splitter:before {
  position: absolute;
  inset: 0;
  content: '';
  transition: opacity 0.4s ease;
  z-index: 10000;
}

/* .splitpanes--dragging .splitpanes__splitter::before, */
.splitpanes__splitter:hover::before {
  background: #8881;
  opacity: 1;
}
</style>

<style scoped>
button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}

.bg-main {
  background-color: rgb(18 18 18 / 1);
  color: white;
}
</style>
