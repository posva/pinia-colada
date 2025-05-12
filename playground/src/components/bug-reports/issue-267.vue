<script lang="ts" setup>
import { useUsers } from '@/queries/issue-267'

defineProps<{
  id: number
}>()

const { users } = useUsers()
</script>

<template>
  <p>1. {{ id }} {{ !!users }}</p>
</template>
