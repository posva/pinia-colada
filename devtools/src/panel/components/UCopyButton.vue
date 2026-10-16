<script setup lang="ts">
import { onScopeDispose, ref } from 'vue'
import UButton from './UButton.vue'
import ILucideCopy from '~icons/lucide/copy'
import ILucideCheck from '~icons/lucide/check'
import ILucideX from '~icons/lucide/x'
import { copyToClipboard, stringifyForCopy } from '../utils/clipboard'

const { value, title = 'Copy as JSON' } = defineProps<{
  value: unknown
  title?: string
}>()

const status = ref<'copied' | 'failed' | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined
onScopeDispose(() => clearTimeout(timer))

function showStatus(newStatus: 'copied' | 'failed') {
  status.value = newStatus
  clearTimeout(timer)
  timer = setTimeout(() => {
    status.value = null
  }, 2000)
}

async function copy() {
  let text: string
  try {
    text = stringifyForCopy(value)
  } catch {
    showStatus('failed')
    return
  }
  await copyToClipboard(text)
  showStatus('copied')
}
</script>

<template>
  <UButton
    size="xs"
    variant="outline"
    :title="
      status === 'copied'
        ? 'Copied!'
        : status === 'failed'
          ? 'This value is not fully JSON serializable'
          : title
    "
    @click.stop="copy"
  >
    <ILucideCheck v-if="status === 'copied'" class="size-3 text-(--devtools-syntax-green)" />
    <template v-else-if="status === 'failed'">
      <ILucideX class="size-3 text-(--devtools-syntax-red)" />
      <span class="text-(--devtools-syntax-red)">Not serializable</span>
    </template>
    <ILucideCopy v-else class="size-3" />
  </UButton>
</template>
