<script setup lang="ts">
const route = useRoute()
const { data } = useQuery({
  key: () => {
    console.log('computing key', route.params.id)
    return ['profiles', route.params.id as string]
  },
  enabled: () => 'id' in route.params,
  query: async () => ({
    id: route.params.id,
    name: 'Name',
  }),
})
</script>

<template>
  <div>
    <pre>{{ data }}</pre>
  </div>
</template>
