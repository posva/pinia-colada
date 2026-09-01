<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@pinia/colada'
import { createValueFixture, delay } from '../fixtures.ts'
import { useDefinedFixtureMutation, useStatefulFixtureMutation } from '../mutations.ts'

const execution = ref(0)
const shouldFail = ref(false)

const successMutation = useMutation({
  key: () => ['fixtures', 'success-mutation'],
  gcTime: 10_000,
  async mutation(input: { execution: number }) {
    await delay(600)
    return { success: true, ...input, completedAt: new Date() }
  },
})

const failableMutation = useMutation({
  key: (input: { execution: number }) => ['fixtures', 'failable-mutation', input.execution],
  async mutation(input: { execution: number }) {
    await delay(600)
    if (shouldFail.value) throw new Error(`Mutation ${input.execution} failed intentionally`)
    return { success: true, ...input }
  },
})

const slowMutation = useMutation({
  key: (duration: number) => ['fixtures', 'slow-mutation', { duration }],
  async mutation(duration: number) {
    await delay(duration)
    return { duration, completedAt: Date.now() }
  },
})

const complexMutation = useMutation({
  key: () => ['fixtures', 'complex-values-mutation'],
  async mutation(input: ReturnType<typeof createValueFixture>) {
    await delay(400)
    return { receivedRevision: input.revision, result: createValueFixture(input.revision + 1) }
  },
})

const anonymousMutation = useMutation({
  async mutation(message: string) {
    await delay(300)
    return { message, anonymous: true }
  },
})

const definedMutation = useDefinedFixtureMutation()
const statefulMutation = useStatefulFixtureMutation()

function nextExecution() {
  return ++execution.value
}

function runSuccess() {
  successMutation.mutate({ execution: nextExecution() })
}

function runFailable() {
  failableMutation.mutate({ execution: nextExecution() })
}

function runComplex() {
  complexMutation.mutate(createValueFixture(nextExecution()))
}

function runAnonymous() {
  anonymousMutation.mutate(`Anonymous execution ${nextExecution()}`)
}

function runDefined() {
  const revision = nextExecution()
  definedMutation.mutate({ message: `Defined execution ${revision}`, revision })
}

function runParallel() {
  runSuccess()
  runComplex()
  slowMutation.mutate(2_000)
}
</script>

<template>
  <main>
    <h1>Mutation fixtures</h1>
    <p>
      Exercise success, errors, loading, complex variables, anonymous entries, replay, and multiple
      concurrent mutations without a backend.
    </p>

    <div class="fixture-grid">
      <section>
        <h2>Successful mutation</h2>
        <p>Resolves after 600ms and is garbage-collected after 10 seconds.</p>
        <button @click="runSuccess">Run success</button>
        <output>{{ successMutation.asyncStatus.value }}</output>
      </section>

      <section>
        <h2>Failable mutation</h2>
        <label><input v-model="shouldFail" type="checkbox" /> Fail intentionally</label>
        <button class="danger" @click="runFailable">Run failable</button>
        <output>{{ failableMutation.asyncStatus.value }}</output>
      </section>

      <section>
        <h2>Slow mutation</h2>
        <p>Keep an entry loading long enough to test state simulation and removal.</p>
        <div class="actions">
          <button @click="slowMutation.mutate(2_000)">Run 2s</button>
          <button @click="slowMutation.mutate(5_000)">Run 5s</button>
        </div>
        <output>{{ slowMutation.asyncStatus.value }}</output>
      </section>

      <section>
        <h2>Complex variables and result</h2>
        <p>Sends the same non-JSON values as the query fixture.</p>
        <button @click="runComplex">Run complex</button>
        <output>{{ complexMutation.asyncStatus.value }}</output>
      </section>

      <section>
        <h2>Anonymous mutation</h2>
        <p>Creates entries without a mutation key.</p>
        <button @click="runAnonymous">Run anonymous</button>
      </section>

      <section>
        <h2>Defined mutations</h2>
        <div class="actions vertical">
          <button @click="runDefined">Run options-based definition</button>
          <label>
            Stateful message
            <input v-model="statefulMutation.message.value" />
          </label>
          <button @click="statefulMutation.mutate()">Run stateful definition</button>
        </div>
      </section>

      <section>
        <h2>Parallel batch</h2>
        <p>Starts success, complex, and slow mutations together.</p>
        <button @click="runParallel">Run three in parallel</button>
      </section>
    </div>

    <p>Total fixture executions: {{ execution }}</p>
  </main>
</template>
