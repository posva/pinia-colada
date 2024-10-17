# Why?

Pinia Colada takes away the complexity of async state management in Vue.js applications. No more manual `isLoading`, `isError`, `data`, `error` properties, or writing boilerplate code for data fetching. But that's not all, Pinia Colada transparently brings caching, deduplication, invalidation, and much more. Allowing you to focus on building the best user experience for your users.

In other words, it allows you to go from this:

```vue{2-10}
<script setup lang="ts">
import { shallowRef } from 'vue'
import { fetchUsers } from '../api/users'
import { usePromise } from 'vue-promised'

const usersPromise = shallowRef(fetchUsers())
function refresh() {
  usersPromise.value = fetchUsers()
}
const { data, error, isPending } = usePromise(usersPromise)
</script>

<template>
  <template v-if="isPending">
    <p>Loading...</p>
  </template>
  <template v-else-if="error">
    <p>Error: {{ error.message }}</p>
  </template>
  <template v-else>
    <ul>
      <li v-for="user in data">
        {{ user.name }}
      </li>
    </ul>
  </template>
</template>
```

to this:

```vue{2-8}
<script setup lang="ts">
import { fetchUsers } from '../api/users'
import { useQuery } from '@pinia/colada'

const { data, error, isPending, refresh } = useQuery({
  key: 'users',
  query: fetchUsers
})
</script>

<template>
  <template v-if="isPending">
    <p>Loading...</p>
  </template>
  <template v-else-if="error">
    <p>Error: {{ error.message }}</p>
  </template>
  <template v-else>
    <ul>
      <li v-for="user in data">
        {{ user.name }}
      </li>
    </ul>
  </template>
</template>
```

- **Simplicity**: Pinia Colada provides a straightforward API that is easy to learn and use, making async state management a breeze.
- **Flexibility**: It provides a flexible API that can be adapted to different use cases and requirements.
- **Modular Design**: It encourages a modular approach to state management, promoting better code organization and maintainability.
- **TypeScript Support**: It has excellent TypeScript support out of the box, ensuring type safety and better developer experience.
- **Performance**: Pinia Colada is designed with performance in mind, ensuring efficient fetches and reactivity.
- **DevTools Integration**: Pinia Colada integrates seamlessly with Vue DevTools, allowing for easier debugging and state inspection.

By using Pinia Colada, you can enhance your Vue.js application's async state management with a modern, efficient, and developer-friendly solution.

## Comparison to other solutions

- [**Vue Promised**](https://github.com/posva/vue-promised): Vue Promised is a lightweight library for handling async operations in Vue.js applications. It offers a `<Promised>` component and a `usePromise()` composable to manage loading, error, and success states. While Vue Promised is focused and minimalistic, Pinia Colada provides a comprehensive async state management solution with features like caching, deduplication, and more.
- [**Pinia**](https://pinia.vuejs.org): If you're using Pinia for state management, Pinia Colada complements it perfectly for async operations. It eliminates boilerplate code and introduces advanced features such as caching, deduplication, and invalidation. Official integrations like [Data Loaders](https://uvr.esm.is/data-loaders/) further enhance its capabilities.
- [**swrv**](https://github.com/Kong/swrv): swrv emphasizes a [_stale-while-revalidate_ strategy](https://datatracker.ietf.org/doc/html/rfc5861), whereas Pinia Colada focuses on a cache-based approach, offering a different set of benefits.
- [**TanStack (Vue) Query**](https://tanstack.com/query/latest/docs/framework/vue/overview): Pinia Colada shares similarities with TanStack Query and has adapted some of its APIs for easier migration. However, Pinia Colada is tailored specifically for Vue, resulting in a lighter library with better and official integrations like Data Loaders. If you're familiar with TanStack Query, you'll find Pinia Colada intuitive and easy to use.
