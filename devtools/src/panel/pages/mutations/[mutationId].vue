<script setup lang="ts">
import type { UseMutationEntryPayload } from '@pinia/colada-devtools/shared'
import { computed, ref, watch } from 'vue'
import { useDuplexChannel, useMutationEntries } from '../../composables/duplex-channel'
import { useRoute, useRouter } from 'vue-router'
import type { DataStateStatus } from '@pinia/colada'

import IWrench from '~icons/lucide/wrench'
import IInfoCircle from '~icons/lucide/info'
import IFileText from '~icons/lucide/file-text'
import ICircleX from '~icons/lucide/circle-x'
import IBraces from '~icons/lucide/braces'
import IVariable from '~icons/lucide/variable'
import { useTimeAgo, useLocalStorage, formatTimeAgo } from '@vueuse/core'
import type { FormatTimeAgoOptions } from '@vueuse/core'

const route = useRoute()
const router = useRouter()
const mutations = useMutationEntries()

const selectedMutation = computed<UseMutationEntryPayload | null>(() => {
  const mutationId = route.params.mutationId
  return mutations.value.find((entry) => entry.id === Number(mutationId)) ?? null
})

const TIME_AGO_OPTIONS: FormatTimeAgoOptions = {
  showSecond: true,
  rounding: 'floor',
  max: 1000 * 60 * 60 * 24, // 1 day
}

const lastUpdate = useTimeAgo(() => selectedMutation.value?.devtools.updatedAt ?? 0, {
  ...TIME_AGO_OPTIONS,
  updateInterval: 3000,
})

const channel = useDuplexChannel()

// Track when we're replaying to auto-navigate to new mutation
let justReplayed = false
const mutationCountBeforeReplay = ref(0)

function replayMutation(id: UseMutationEntryPayload['id']) {
  // Track state before replay
  mutationCountBeforeReplay.value = mutations.value.length
  justReplayed = true

  // Emit the replay event
  channel.emit('mutations:replay', id)
}

// FIXME: we should move this logic up and auto detect replays maybe with some linking
// isReplayOf: mutationId
// and we can display this in the interface too
watch(
  () => mutations.value,
  () => {
    if (justReplayed) {
      // Find the latest id
      const newest = mutations.value.toSorted((a, b) => b.id - a.id)[0]

      if (newest) {
        router.push({
          name: '/mutations/[mutationId]',
          params: { mutationId: newest.id },
        })
      }

      justReplayed = false
    }
  },
  {
    deep: true,
  },
)

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
                v-if="!selectedMutation.key"
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

          <p
            v-if="!selectedMutation.active && selectedMutation.options"
            class="grid grid-cols-[auto_1fr] gap-x-2"
            title="When is this mutation entry garbage collected"
          >
            <template
              v-if="
                typeof selectedMutation.options.gcTime === 'number' &&
                Number.isFinite(selectedMutation.options.gcTime)
              "
            >
              <span>Will be <i>gced</i></span>
              <span class="font-bold">{{
                formatTimeAgo(
                  new Date(selectedMutation.devtools.inactiveAt + selectedMutation.options.gcTime),
                  {
                    ...TIME_AGO_OPTIONS,
                    max: undefined,
                  },
                )
              }}</span>
            </template>
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
            @click="channel.emit('mutations:simulate:loading', selectedMutation.id)"
          >
            <i-lucide-loader />
            Simulate loading
          </UButton>
          <UButton
            v-else
            class="theme-purple"
            size="sm"
            title="Stop simulating loading state"
            @click="channel.emit('mutations:simulate:loading:stop', selectedMutation.id)"
          >
            <i-lucide-loader class="animate-spin" />
            Stop loading
          </UButton>

          <UButton
            v-if="selectedMutation.devtools.simulate !== 'error'"
            class="theme-error"
            size="sm"
            title="Simulate an Error state"
            @click="channel.emit('mutations:simulate:error', selectedMutation.id)"
          >
            <i-lucide-x-octagon /> Simulate error
          </UButton>
          <UButton
            v-else
            class="theme-error"
            size="sm"
            title="Restore the previous state"
            @click="channel.emit('mutations:simulate:error:stop', selectedMutation.id)"
          >
            <i-lucide-rotate-ccw /> Remove error
          </UButton>

          <UButton
            v-if="selectedMutation.vars !== undefined && selectedMutation.key"
            class="theme-success"
            size="sm"
            title="Re-trigger this mutation with the same variables"
            @click="replayMutation(selectedMutation.id)"
          >
            <i-lucide-repeat-2 />
            Replay
          </UButton>

          <UButton
            v-if="selectedMutation.key"
            class="theme-warning"
            size="sm"
            title="Remove this mutation from the cache"
            @click="channel.emit('mutations:remove', selectedMutation.id)"
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
