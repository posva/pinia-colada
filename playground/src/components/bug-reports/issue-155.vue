<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { computed, onUnmounted } from 'vue'

const { queryKeyPart } = defineProps<{
  queryKeyPart: { foo: string }
}>()

const key = computed(() => {
  const result = ['common', queryKeyPart.foo]

  console.log('evaluated computed property - value:', JSON.stringify(result))
  console.log(
    'queryKeyPart.foo should always be a string, hence I can call .length on it:',
    queryKeyPart.foo?.length,
  )

  return result
})

onUnmounted(() => {
  console.log('sub component unmounted - nothing should happen anymore')
})

const { data } = useQuery({
  key,
  // key: () => {
  //   const result = ['common', queryKeyPart.foo]
  //
  //   console.log('evaluated computed property - value:', JSON.stringify(result))
  //   console.log(
  //     'queryKeyPart.foo should always be a string, hence I can call .length on it:',
  //     queryKeyPart.foo?.length,
  //   )
  //
  //   return result
  // },
  query: async () => Promise.resolve('query result'),
})
</script>

<template>
  <div>
    <h1>SubComponent</h1>
    <br>
    Key: {{ key }}
    <br>
    Data: {{ data }}
  </div>
</template>
