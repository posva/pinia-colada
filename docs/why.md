# Why?

Pinia Colada takes away the complexity of async state management in Vue.js applications. No more manual `isLoading`, `isError`, `data`, `error` properties, or writing boilerplate code for data fetching. But that's not all, Pinia Colada transparently brings caching, deduplication, invalidation, and much more. Allowing you to focus on building the best user experience for your users.

In other, it allows you to go from this:

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

- **Vue Promised**: Vue Promised is a simple and lightweight library for handling async operations in Vue.js applications that I built a while ago. It provides a `<Promised>` component and a `usePromise()` composable that can be used to wrap async operations and display loading, error, and success states and that's it. On the other hand, Pinia Colada is a full-fledged async state management solution that provides caching, deduplication, and other advanced features.
- **Pinia**: If you are using Pinia for data fetching, Pinia Colada is the perfect companion to handle async state management. It will help you remove all of your boilerplate code and probably bring new features like caching, deduplication, and invalidation that you won't be able to live without anymore! It also has official integrations like [Data Loaders](https://uvr.esm.is/data-loaders/).
- **swrv**: provides composables to deal with data fetching and focuses more on a _stale-while-revalidate_ strategy.
- **TanStack (Vue) Query**: Pinia Colada is similar to TanStack Query, it even adapted some of its APIs to match the ones from TanStack Query and ease migration! However, Pinia Colada is specifically designed to work with Vue, bringing a much more lighter library and better and official integrations (like Data Loaders). **If you have used TanStack Query before, you will feel right at home with Pinia Colada!**
- **
