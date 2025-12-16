<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@pinia/colada'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Mutation 1: Simple success mutation
const { mutateAsync: simpleMutationAsync, asyncStatus: simpleStatus } = useMutation({
  key: () => ['simple-mutation'],
  mutation: async (data: { name: string; value: number }) => {
    await delay(1000)
    return { success: true, ...data, timestamp: Date.now() }
  },
  gcTime: 3000,
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
    return { updated: true, userId: data.user.id, timestamp: Date.now() }
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
  return simpleMutationAsync({
    name: `Test ${executionCount.value}`,
    value: executionCount.value * 10,
  })
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

async function runMultipleSequential() {
  for (let i = 0; i < 3; i++) {
    await delay(20 * i)
    await runSimpleMutation()
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

    <div class="grid gap-6 max-w-3xl">
      <!-- Simple Mutation -->
      <section class="mutation-test">
        <h2>1. Simple Success Mutation</h2>
        <p>A basic mutation that always succeeds after 1 second delay.</p>
        <div>
          <button style="background: #3b82f6" @click="runSimpleMutation">
            Run Simple Mutation
          </button>
          <span>Status: {{ simpleStatus }}</span>
        </div>
      </section>

      <!-- Failable Mutation -->
      <section class="mutation-test">
        <h2>2. Failable Mutation</h2>
        <p>Toggle the switch to make this mutation fail or succeed.</p>
        <div>
          <label>
            <input v-model="shouldFail" type="checkbox" />
            <span>Should Fail</span>
          </label>
        </div>
        <div>
          <button style="background: #a855f7" @click="runFailableMutation">
            Run Failable Mutation
          </button>
          <span>Status: {{ failableStatus }}</span>
        </div>
      </section>

      <!-- Long Running Mutation -->
      <section class="mutation-test">
        <h2>3. Long-Running Mutation</h2>
        <p>Test mutations with different execution durations.</p>
        <div>
          <button style="background: #22c55e" @click="runLongMutation(2000)">Run (2s)</button>
          <button style="background: #22c55e" @click="runLongMutation(5000)">Run (5s)</button>
          <button style="background: #22c55e" @click="runLongMutation(10000)">Run (10s)</button>
          <span>Status: {{ longStatus }}</span>
        </div>
      </section>

      <!-- Complex Variables Mutation -->
      <section class="mutation-test">
        <h2>4. Complex Variables Mutation</h2>
        <p>Mutation with nested objects to test variable display in DevTools.</p>
        <div>
          <button style="background: #f97316" @click="runComplexMutation">
            Run Complex Mutation
          </button>
          <span>Status: {{ complexStatus }}</span>
        </div>
      </section>

      <!-- Anonymous Mutation -->
      <section class="mutation-test">
        <h2>5. Anonymous Mutation (No Key)</h2>
        <p>Mutation without a key to test how DevTools handles anonymous mutations.</p>
        <button style="background: #ec4899" @click="runAnonymousMutation">
          Run Anonymous Mutation
        </button>
      </section>

      <!-- Batch Operations -->
      <section class="mutation-test">
        <h2>6. Batch Operations</h2>
        <p>Run multiple mutations to see how DevTools handles them.</p>
        <div>
          <button style="background: #6366f1" @click="runMultipleSequential">
            Run 3 Sequential
          </button>
          <button style="background: #6366f1" @click="runMultipleParallel">Run 3 Parallel</button>
        </div>
      </section>
    </div>

    <div>
      <h3>Total Executions: {{ executionCount }}</h3>
      <p>Each execution should appear as a separate entry in the DevTools Mutations tab.</p>
    </div>

    <!-- for devtools to be displayed -->
    <hr class="mb-[700px]" />
  </main>
</template>

<style scoped>
.mutation-test {
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.5rem;
  row-gap: 0.6em;

  & > h2 {
    margin-top: 0;
  }
}
</style>
