<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import UButton from './UButton.vue'
import ILucideCopy from '~icons/lucide/copy'
import ILucideCheck from '~icons/lucide/check'
import { copyToClipboard, stringifyForCopy } from '../utils/clipboard'

const { value, title = 'Copy as JSON' } = defineProps<{
  value: unknown
  title?: string
}>()

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
onScopeDispose(() => clearTimeout(timer))

async function copy() {
  await copyToClipboard(stringifyForCopy(value))
  copied.value = true
  clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <UButton size="xs" variant="outline" :title="copied ? 'Copied!' : title" @click.stop="copy">
    <ILucideCheck v-if="copied" class="size-3 text-(--devtools-syntax-green)" />
    <ILucideCopy v-else class="size-3" />
  </UButton>
</template>
