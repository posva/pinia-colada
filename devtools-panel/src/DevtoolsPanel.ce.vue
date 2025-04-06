<script setup lang="ts">
import { Splitpanes, Pane } from 'splitpanes'
import { ref } from 'vue'

const n = ref(0)
</script>

<template>
  <div>
    Hello!
    <button @click="n++">Increment {{ n }}</button>
    <Splitpanes class="default-theme">
      <Pane v-for="i in 3" :key="i">
        <div>{{ i }}</div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<style>
@import 'node_modules/splitpanes/dist/splitpanes.css';
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
</style>
