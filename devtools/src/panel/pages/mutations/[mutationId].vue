<script setup lang="ts">
import type { UseMutationEntryPayload } from '@pinia/colada-devtools/shared'
import { computed, watch } from 'vue'
import { useDuplexChannel, useMutationEntries } from '../../composables/duplex-channel'
import { useRoute } from 'vue-router'
import type { DataStateStatus } from '@pinia/colada'

import IWrench from '~icons/lucide/wrench'
import IInfoCircle from '~icons/lucide/info'
import IFileText from '~icons/lucide/file-text'
import ICircleX from '~icons/lucide/circle-x'
import IBraces from '~icons/lucide/braces'
import IVariable from '~icons/lucide/variable'
import { useTimeAgo, useLocalStorage } from '@vueuse/core'
import type { FormatTimeAgoOptions } from '@vueuse/core'

const route = useRoute()
const mutations = useMutationEntries()

const selectedMutation = computed<UseMutationEntryPayload | null>(() => {
  return mutations.value.find((entry) => entry.id === route.params.mutationId) ?? null
})

const isAnonymous = computed(() => {
  if (!selectedMutation.value) return false
  const mutation = selectedMutation.value

  // No key means anonymous
  if (!mutation.key) return true

  // If the key only contains the ID (e.g., ["$0"]), it's effectively anonymous
  return mutation.key.length === 1 && mutation.key[0] === mutation.id
})

const TIME_AGO_OPTIONS: FormatTimeAgoOptions = {
  showSecond: true,
  rounding: 'floor',
  max: 1000 * 60 * 5, // 5 minutes
}

const lastUpdate = useTimeAgo(() => selectedMutation.value?.devtools.updatedAt ?? 0, {
  ...TIME_AGO_OPTIONS,
  updateInterval: 3000,
})

const channel = useDuplexChannel()

const isDataOpen = useLocalStorage<boolean>('pc:mutation:details:data:open', false, {})
const isVarsOpen = useLocalStorage<boolean>('pc:mutation:details:vars:open', true, {})
let wasDataOpen = isDataOpen.value
let lastStatus: DataStateStatus | null = null
const isErrorOpen = useLocalStorage<boolean>('pc:mutation:details:error:open', false, {})

watch(
  () => selectedMutation.value?.state,
  (state) => {
    if (!state || lastStatus === state.status) return
    lastStatus = state.status
    if (state.status === 'error') {
      isErrorOpen.value = true
      wasDataOpen = isDataOpen.value
      isDataOpen.value = false
    } else if (state.status === 'success') {
      isDataOpen.value = wasDataOpen
      isErrorOpen.value = false
    }
  },
)
</script>

<template>
  <div class="flex flex-col divide-y dark:divide-(--ui-border) divide-(--ui-border-accented)">
    <template v-if="selectedMutation">
      <UCollapse title="Details" :icon="IInfoCircle">
        <div class="py-1 text-sm">
          <p class="grid grid-cols-[auto_1fr] gap-1">
            <span>id:</span>
            <span>
              <code class="rounded bg-neutral-500/20 p-0.5">{{ selectedMutation.id }}</code>
            </span>
          </p>

          <p v-if="selectedMutation.key" class="grid grid-cols-[auto_1fr] gap-1">
            <span>key:</span>
            <span class="flex items-center gap-1.5">
              <code class="rounded p-0.5 bg-neutral-500/20">
                {{ selectedMutation.key }}
              </code>
              <span
                v-if="isAnonymous"
                class="text-xs text-(--ui-text-muted) italic cursor-help"
                title="This mutation was created without a custom key"
              >
                (anonymous)
              </span>
            </span>
          </p>

          <p class="grid grid-cols-[auto_1fr] gap-x-2" title="When was the mutation last updated">
            <span>Last update:</span>
            <span class="font-bold">{{ lastUpdate }}</span>
          </p>
        </div>
      </UCollapse>

      <UCollapse title="Actions" :icon="IWrench">
        <div class="py-2 gap-2 flex flex-wrap items-center justify-items-start">
          <UButton
            v-if="selectedMutation.devtools.simulate !== 'loading'"
            class="theme-purple"
            size="sm"
            title="Simulate a loading state"
            @click="channel.emit('mutations:simulate:loading', selectedMutation.key)"
          >
            <i-lucide-loader />
            Simulate loading
          </UButton>
          <UButton
            v-else
            class="theme-purple"
            size="sm"
            title="Stop simulating loading state"
            @click="channel.emit('mutations:simulate:loading:stop', selectedMutation.key)"
          >
            <i-lucide-loader class="animate-spin" />
            Stop loading
          </UButton>

          <UButton
            v-if="selectedMutation.devtools.simulate !== 'error'"
            class="theme-error"
            size="sm"
            title="Simulate an Error state"
            @click="channel.emit('mutations:simulate:error', selectedMutation.key)"
          >
            <i-lucide-x-octagon /> Simulate error
          </UButton>
          <UButton
            v-else
            class="theme-error"
            size="sm"
            title="Restore the previous state"
            @click="channel.emit('mutations:simulate:error:stop', selectedMutation.key)"
          >
            <i-lucide-rotate-ccw /> Remove error
          </UButton>

          <UButton
            v-if="selectedMutation.key"
            class="theme-warning"
            size="sm"
            title="Remove this mutation from the cache"
            @click="channel.emit('mutations:remove', selectedMutation.key)"
          >
            <i-lucide-trash /> Remove
          </UButton>
        </div>
      </UCollapse>

      <UCollapse
        v-model:open="isVarsOpen"
        title="Variables"
        :icon="IVariable"
        class="font-mono"
        no-padding
      >
        <JsonViewer :data="selectedMutation.vars" />
      </UCollapse>

      <UCollapse
        v-model:open="isDataOpen"
        title="Data"
        :icon="IFileText"
        class="font-mono"
        no-padding
      >
        <JsonViewer :data="selectedMutation.state.data" />
      </UCollapse>

      <UCollapse
        v-model:open="isErrorOpen"
        :title="`Error${selectedMutation.state.status === 'error' ? ' (!)' : ''}`"
        :icon="ICircleX"
      >
        <div class="py-1">
          <pre
            v-if="selectedMutation.state.error"
            class="rounded p-1 overflow-auto max-h-[1200px]"
            >{{ selectedMutation.state.error }}</pre
          >
          <p v-else class="text-neutral-500/50">No error</p>
        </div>
      </UCollapse>

      <UCollapse title="Options" :open="false" :icon="IBraces">
        <div class="py-1">
          <pre
            v-if="selectedMutation.options"
            class="rounded bg-neutral-500/20 p-1 overflow-auto max-h-[1200px]"
            >{{ selectedMutation.options }}</pre
          >
          <p v-else>No options configured for this mutation.</p>
        </div>
      </UCollapse>
    </template>

    <template v-else>
      <div class="py-6 mx-auto">
        <p class="flex flex-col text-center items-center gap-2 text-lg px-2">
          Select a Mutation to inspect
          <i-lucide-mouse-pointer-click />
        </p>
      </div>
    </template>
  </div>
</template>
