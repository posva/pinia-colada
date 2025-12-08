<script setup lang="ts">
import { ref } from 'vue'
import SubComponent from '../../components/bug-reports/issue-155.vue'

const queryKeyPart = ref({ foo: 'bar' as string | undefined })

function clickhandler() {
  console.log('clickhandler invoked')
  queryKeyPart.value.foo = undefined
}
</script>

<template>
  <div>
    <h1>Issue 155</h1>
    <!-- we only render the sub-component if `queryKeyPart.foo` is truthy because the component requires it to be present -->
    <SubComponent v-if="queryKeyPart.foo" :query-key-part="queryKeyPart" />

    <pre><code>{{ JSON.stringify(queryKeyPart, null, 2) }}</code></pre>

    <button @click="clickhandler">Trigger</button>
  </div>
</template>
