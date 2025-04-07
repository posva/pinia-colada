<script setup lang="ts">
import { Splitpanes, Pane } from '@posva/splitpanes'
import { ref } from 'vue'

const n = ref(0)
</script>

<template>
  <div>
    Hello!
    <button @click="n++">
      Increment {{ n }}
    </button>
    <Splitpanes class="bg-main">
      <Pane v-for="i in 3" :key="i">
        <div style="height: 300px; overflow-y: hidden; overflow-x: scroll">
          <div class="bg-main" style="min-width: 150px; background-color:">
            {{ i }}
          </div>
        </div>
      </Pane>
    </Splitpanes>

    <Splitpanes style="height: 600px" horizontal class="bg-main">
      <Pane v-for="i in 3" :key="i">
        <div>
          <div style="min-height: 50px; overflow-x: hidden; overflow-y: scroll">
            {{ i }}
          </div>
        </div>
      </Pane>
    </Splitpanes>

    <Splitpanes style="height: 400px" class="bg-main">
      <Pane min-size="20">
        1
      </Pane>
      <Pane>
        <Splitpanes horizontal>
          <Pane>2</Pane>
          <Pane>3</Pane>
          <Pane>4</Pane>
        </Splitpanes>
      </Pane>
      <Pane>5</Pane>
    </Splitpanes>
  </div>
</template>

<style>
@import 'splitpanes/dist/splitpanes.css';

.splitpanes__splitter {
  position: relative;
  --grab-size: -4px;
}

.splitpanes__splitter {
  background: #9ca3af33;
}

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
  background-color: rgb(18 18 18 / 0.8);
}
</style>
