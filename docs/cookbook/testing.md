# Testing

When testing components that use Pinia Colada, focus on **testing your app behavior**, not Pinia Colada internals.
In most cases, mock at the network layer so queries and mutations run through the real Pinia Colada flow.

## Avoid `createTestingPinia`

::: danger
Do **not** use `createTestingPinia()` from `@pinia/testing`. It stubs Pinia actions, which breaks Pinia Colada's internal stores. Always use a plain `createPinia()` in your tests.
:::

## Setup

Install test dependencies:

```bash
npm i -D msw vitest @vue/test-utils
```

Set up MSW for your test runner before following the examples:
- [MSW Getting Started](https://mswjs.io/docs/getting-started)
- [MSW Node integration](https://mswjs.io/docs/integrations/node)

### Test Boilerplate

Mount components with `createPinia()` and `PiniaColada`:

```ts
import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

function mountWithPlugins(component, options = {}) {
  return mount(component, {
    global: {
      plugins: [createPinia(), PiniaColada],
    },
    ...options,
  })
}
```

::: tip
Use `happy-dom` or `jsdom` as your [Vitest environment](https://vitest.dev/config/#environment) since components need a DOM.
:::

## Testing Queries

Example component:

```vue
<!-- ContactList.vue -->
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { data, error, status } = useQuery({
  key: ['contacts'],
  query: async () => {
    const res = await fetch('/api/contacts')
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    return res.json()
  },
})
</script>

<template>
  <div v-if="status === 'pending'">Loading...</div>
  <div v-else-if="status === 'error'">Error: {{ error?.message }}</div>
  <ul v-else-if="data">
    <li v-for="contact in data" :key="contact.id">{{ contact.name }}</li>
  </ul>
</template>
```

Test it by intercepting the request with MSW:

```ts
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import ContactList from './ContactList.vue'

it('renders contacts', async () => {
  server.use(
    http.get('/api/contacts', () =>
      HttpResponse.json([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]),
    ),
  )

  const wrapper = mountWithPlugins(ContactList)
  expect(wrapper.text()).toContain('Loading...')

  await flushPromises()

  expect(wrapper.text()).toContain('Alice')
  expect(wrapper.text()).toContain('Bob')
})
```

### Error States

Return a non-2xx response from MSW to exercise the error branch:

```ts
it('handles errors', async () => {
  server.use(
    http.get('/api/contacts', () =>
      HttpResponse.json({ message: 'Server Error' }, { status: 500 }),
    ),
  )

  const wrapper = mountWithPlugins(ContactList)
  await flushPromises()

  expect(wrapper.text()).toContain('Request failed: 500')
})
```

## Testing Mutations

Example component:

```vue
<!-- CreateContact.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useMutation } from '@pinia/colada'

const name = ref('')
const { mutate, status, asyncStatus } = useMutation({
  mutation: async (newName: string) => {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`)
    }
    return res.json()
  },
})
</script>

<template>
  <form @submit.prevent="mutate(name)">
    <input v-model="name" />
    <button type="submit" :disabled="asyncStatus === 'loading'">Create</button>
  </form>
  <p v-if="asyncStatus === 'loading'">Saving...</p>
  <p v-if="status === 'success'">Contact created!</p>
</template>
```

Test it with a POST handler:

```ts
import { http, HttpResponse } from 'msw'
import { server } from './mocks/server'
import CreateContact from './CreateContact.vue'

it('creates a contact', async () => {
  server.use(
    http.post('/api/contacts', () =>
      HttpResponse.json({ id: 3, name: 'Charlie' }),
    ),
  )

  const wrapper = mountWithPlugins(CreateContact)

  await wrapper.find('input').setValue('Charlie')
  await wrapper.find('form').trigger('submit')
  await flushPromises()

  expect(wrapper.text()).toContain('Contact created!')
})
```

## Tips

- **`flushPromises()`**: Use `flushPromises()` from `@vue/test-utils` after actions that trigger async updates (initial query run, submit handlers, refetches).
- **Inspecting cache state**: Use `useQueryCache()` inside tests to inspect or seed cache state. Since you're using a real `createPinia()`, the cache works exactly as it does in production.
- **Simpler cases without MSW**: For narrow unit tests, pass a mocked query function directly:

  ```ts
  import { vi } from 'vitest'
  import { useQuery } from '@pinia/colada'

  const query = vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }])

  const TestComponent = {
    setup() {
      const { data } = useQuery({
        key: ['contacts'],
        query,
      })
      return { data }
    },
    template: `<pre>{{ data }}</pre>`,
  }

  const wrapper = mountWithPlugins(TestComponent)

  await flushPromises()
  expect(query).toHaveBeenCalledTimes(1)
  expect(wrapper.text()).toContain('Alice')
  ```

  However, MSW is preferred since it tests the full request pipeline.
