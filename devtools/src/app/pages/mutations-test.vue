<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@pinia/colada'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mutation 1: Simple success mutation
const { mutate: simpleMutation, asyncStatus: simpleStatus } = useMutation({
  key: () => ['simple-mutation'],
  mutation: async (data: { name: string; value: number }) => {
    await delay(1000)
    return { success: true, ...data, timestamp: Date.now() }
  },
})

// Mutation 2: Mutation that can fail
const shouldFail = ref(false)
const { mutate: failableMutation, asyncStatus: failableStatus } = useMutation({
  key: () => ['failable-mutation'],
  mutation: async (data: { attempt: number }) => {
    await delay(800)
    if (shouldFail.value) {
      throw new Error(`Mutation failed on attempt ${data.attempt}`)
    }
    return { success: true, ...data }
  },
})

// Mutation 3: Long-running mutation
const { mutate: longMutation, asyncStatus: longStatus } = useMutation({
  key: () => ['long-running-mutation'],
  mutation: async (data: { duration: number }) => {
    await delay(data.duration)
    return { completed: true, duration: data.duration }
  },
})

// Mutation 4: Mutation with complex variables
const { mutate: complexMutation, asyncStatus: complexStatus } = useMutation({
  key: () => ['complex-mutation'],
  mutation: async (data: {
    user: { id: number; name: string; email: string }
    settings: { theme: string; notifications: boolean }
    metadata: Record<string, unknown>
  }) => {
    await delay(600)
    return { updated: true, timestamp: Date.now() }
  },
})

// Mutation 5: Multiple executions without key (to test anonymous mutations)
const { mutate: anonymousMutation } = useMutation({
  mutation: async (message: string) => {
    await delay(500)
    return { message, processed: true }
  },
})

// Counter for demonstration
const executionCount = ref(0)

function runSimpleMutation() {
  executionCount.value++
  simpleMutation({ name: `Test ${executionCount.value}`, value: executionCount.value * 10 })
}

function runFailableMutation() {
  executionCount.value++
  failableMutation({ attempt: executionCount.value })
}

function runLongMutation(duration: number) {
  executionCount.value++
  longMutation({ duration })
}

function runComplexMutation() {
  executionCount.value++
  complexMutation({
    user: {
      id: executionCount.value,
      name: `User ${executionCount.value}`,
      email: `user${executionCount.value}@example.com`,
    },
    settings: {
      theme: executionCount.value % 2 === 0 ? 'dark' : 'light',
      notifications: executionCount.value % 3 === 0,
    },
    metadata: {
      timestamp: Date.now(),
      source: 'devtools-playground',
      executionNumber: executionCount.value,
      nested: {
        deep: {
          value: 'test',
          array: [1, 2, 3],
        },
      },
    },
  })
}

function runAnonymousMutation() {
  executionCount.value++
  anonymousMutation(`Message #${executionCount.value}`)
}

function runMultipleSequential() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => runSimpleMutation(), i * 200)
  }
}

function runMultipleParallel() {
  runSimpleMutation()
  runComplexMutation()
  runLongMutation(2000)
}
</script>

<template>
  <main class="big-layout">
    <h1 class="mb-6">🧪 Mutations Test Page</h1>
    <p class="mb-8" style="max-width: 800px">
      Open the DevTools Mutations tab to see these mutations in action. Each execution will create a
      new entry with a unique ID ($0, $1, $2, etc.).
    </p>

    <div style="display: grid; gap: 1.5rem; max-width: 900px">
      <!-- Simple Mutation -->
      <section style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: white">
        <h2 style="margin: 0 0 0.75rem 0; font-size: 1.25rem; font-weight: 600">
          1. Simple Success Mutation
        </h2>
        <p style="margin: 0 0 1rem 0; font-size: 0.875rem; color: #666">
          A basic mutation that always succeeds after 1 second delay.
        </p>
        <div style="display: flex; gap: 0.5rem; align-items: center">
          <button
            style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer"
            @click="runSimpleMutation"
          >
            Run Simple Mutation
          </button>
          <span style="font-size: 0.875rem; color: #666">Status: {{ simpleStatus }}</span>
        </div>
      </section>

      <!-- Failable Mutation -->
      <section style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: white">
        <h2 style="margin: 0 0 0.75rem 0; font-size: 1.25rem; font-weight: 600">
          2. Failable Mutation
        </h2>
        <p style="margin: 0 0 1rem 0; font-size: 0.875rem; color: #666">
          Toggle the switch to make this mutation fail or succeed.
        </p>
        <div style="margin-bottom: 1rem">
          <label style="display: flex; align-items: center; gap: 0.5rem">
            <input v-model="shouldFail" type="checkbox" style="width: 1rem; height: 1rem" />
            <span style="font-size: 0.875rem">Should Fail</span>
          </label>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center">
          <button
            style="padding: 0.5rem 1rem; background: #a855f7; color: white; border: none; border-radius: 4px; cursor: pointer"
            @click="runFailableMutation"
          >
            Run Failable Mutation
          </button>
          <span style="font-size: 0.875rem; color: #666">Status: {{ failableStatus }}</span>
        </div>
      </section>

      <!-- Long Running Mutation -->
      <section style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: white">
        <h2 style="margin: 0 0 0.75rem 0; font-size: 1.25rem; font-weight: 600">
          3. Long-Running Mutation
        </h2>
        <p style="margin: 0 0 1rem 0; font-size: 0.875rem; color: #666">
          Test mutations with different execution durations.
        </p>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap">
          <button
            style="padding: 0.5rem 1rem; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer"
            @click="runLongMutation(2000)"
          >
            Run (2s)
          </button>
          <button
            style="padding: 0.5rem 1rem; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer"
            @click="runLongMutation(5000)"
          >
            Run (5s)
          </button>
          <button
            style="padding: 0.5rem 1rem; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer"
            @click="runLongMutation(10000)"
          >
            Run (10s)
          </button>
          <span style="font-size: 0.875rem; color: #666">Status: {{ longStatus }}</span>
        </div>
      </section>

      <!-- Complex Variables Mutation -->
      <section style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: white">
        <h2 style="margin: 0 0 0.75rem 0; font-size: 1.25rem; font-weight: 600">
          4. Complex Variables Mutation
        </h2>
        <p style="margin: 0 0 1rem 0; font-size: 0.875rem; color: #666">
          Mutation with nested objects to test variable display in DevTools.
        </p>
        <div style="display: flex; gap: 0.5rem; align-items: center">
          <button
            style="padding: 0.5rem 1rem; background: #f97316; color: white; border: none; border-radius: 4px; cursor: pointer"
            @click="runComplexMutation"
          >
            Run Complex Mutation
          </button>
          <span style="font-size: 0.875rem; color: #666">Status: {{ complexStatus }}</span>
        </div>
      </section>

      <!-- Anonymous Mutation -->
      <section style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: white">
        <h2 style="margin: 0 0 0.75rem 0; font-size: 1.25rem; font-weight: 600">
          5. Anonymous Mutation (No Key)
        </h2>
        <p style="margin: 0 0 1rem 0; font-size: 0.875rem; color: #666">
          Mutation without a key to test how DevTools handles anonymous mutations.
        </p>
        <button
          style="padding: 0.5rem 1rem; background: #ec4899; color: white; border: none; border-radius: 4px; cursor: pointer"
          @click="runAnonymousMutation"
        >
          Run Anonymous Mutation
        </button>
      </section>

      <!-- Batch Operations -->
      <section style="border: 1px solid #ddd; border-radius: 8px; padding: 1.5rem; background: white">
        <h2 style="margin: 0 0 0.75rem 0; font-size: 1.25rem; font-weight: 600">
          6. Batch Operations
        </h2>
        <p style="margin: 0 0 1rem 0; font-size: 0.875rem; color: #666">
          Run multiple mutations to see how DevTools handles them.
        </p>
        <div style="display: flex; gap: 0.5rem">
          <button
            style="padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer"
            @click="runMultipleSequential"
          >
            Run 3 Sequential
          </button>
          <button
            style="padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer"
            @click="runMultipleParallel"
          >
            Run 3 Parallel
          </button>
        </div>
      </section>
    </div>

    <div style="margin-top: 2rem; padding: 1.5rem; background: #f3f4f6; border-radius: 8px; max-width: 900px">
      <h3 style="margin: 0 0 0.5rem 0; font-weight: 600">Total Executions: {{ executionCount }}</h3>
      <p style="margin: 0; font-size: 0.875rem; color: #666">
        Each execution should appear as a separate entry in the DevTools Mutations tab.
      </p>
    </div>
  </main>
</template>
