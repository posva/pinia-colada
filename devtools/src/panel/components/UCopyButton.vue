<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue'
import UButton from './UButton.vue'
import ILucideCopy from '~icons/lucide/copy'
import ILucideCheck from '~icons/lucide/check'
import ILucideX from '~icons/lucide/x'
import { stringifyForCopy } from '../utils/clipboard'

const { value, title = 'Copy as JSON' } = defineProps<{
  value: unknown
  title?: string
}>()

type CopyStatus = 'copied' | 'not-serializable' | 'failed'

const FAILURES = {
  'not-serializable': {
    label: 'Not serializable',
    title: 'This value is not fully JSON serializable',
  },
  failed: { label: 'Copy failed', title: 'The browser did not allow writing to the clipboard' },
} as const

const status = ref<CopyStatus | null>(null)
const failure = computed(() =>
  status.value && status.value !== 'copied' ? FAILURES[status.value] : null,
)

let timer: ReturnType<typeof setTimeout> | undefined
onScopeDispose(() => clearTimeout(timer))

function showStatus(newStatus: CopyStatus) {
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
    showStatus('not-serializable')
    return
  }
  try {
    await navigator.clipboard.writeText(text)
    showStatus('copied')
  } catch {
    showStatus('failed')
  }
}
</script>

<template>
  <UButton
    size="xs"
    variant="outline"
    :title="status === 'copied' ? 'Copied!' : (failure?.title ?? title)"
    @click.stop="copy"
  >
    <ILucideCheck v-if="status === 'copied'" class="size-3 text-(--devtools-syntax-green)" />
    <template v-else-if="failure">
      <ILucideX class="size-3 text-(--devtools-syntax-red)" />
      <span class="text-(--devtools-syntax-red)">{{ failure.label }}</span>
    </template>
    <ILucideCopy v-else class="size-3" />
  </UButton>
</template>
