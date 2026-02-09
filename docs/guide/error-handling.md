# Error Handling

Pinia Colada provides robust error handling capabilities to help you manage and respond to errors in your async operations. Let's explore how to handle errors effectively in your Vue applications.

## Basic Error Handling in Templates

The simplest way to handle errors is directly in your template. Pinia Colada provides an `error` property that you can use to check if an error occurred during a query or mutation.

```vue
<script setup lang="ts">
import { useQuery } from '@pinia/colada'
import { fetchUser } from '../api/user'

const { data, error } = useQuery({
  key: ['user'],
  query: fetchUser,
})
</script>

<template>
  <div v-if="error">
    <p>Oops! Something went wrong:</p>
    <pre>{{ error.message }}</pre>
  </div>
  <div v-else>
    <!-- Your normal content here -->
  </div>
</template>
```

This approach allows you to display error messages or fallback content when an error occurs.

## Global Error Handling with Hooks

Pinia Colada offers global hooks that can intercept errors across your entire application. This is particularly useful for centralized error logging or displaying global error notifications.

To set up global error handling, use the `PiniaColadaQueryHooksPlugin` when initializing Pinia Colada:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'

const app = createApp({})
const pinia = createPinia()

app.use(pinia)
app.use(PiniaColada, {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onError(error) {
        console.error('Global error:', error)
        // You could also trigger a global notification here
      },
      // other hooks
      onSuccess(data) {},
      onSettled() {},
    }),
  ],
})

app.mount('#app')
```

This setup allows you to define global `onError`, `onSuccess`, and `onSettled` hooks that will be called for all queries (not for mutations) in your application.

If you want to customize this behavior (or observe mutations too), see [Plugins](../advanced/plugins.md) for the underlying `$onAction()` mechanism and how to hook into the mutation cache.

## Typing Errors Locally

Since Errors are unexpected cases, they cannot be typed locally. Instead, it's recommended to check the error type in your code and handle it accordingly. This can be done in many ways, such as using TypeScript's `instanceof` operator:

```vue
<template>
  <ErrorBox v-if="error instanceof MyCustomError" :error="error" />
  <pre v-else>{{ error.message }}</pre>
</template>
```

## Typing Errors Globally

By default, Pinia Colada assumes that all errors are of type `Error`. This is a sensible default that can be changed. In JS, you can even throw strings as errors, but it's recommended to use `Error` objects for better error handling and native APIs always throw extended `Error` objects, so this is a safe assumption.

However, if you want to set a global error type for all your queries and mutations, you can extend the `TypesConfig` interface:

```ts
import '@pinia/colada'

interface MyCustomError extends Error {
  code: number
}

declare module '@pinia/colada' {
  interface TypesConfig {
    // This will be used as the default error type for all queries and mutations
    // instead of the built-in `Error` type
    defaultError: MyCustomError
  }
}
```

::: tip

You can even set it to `unknown` if you want to require explicit error handling for all your queries and mutations.

:::

After this configuration, all your queries and mutations will use `MyCustomError` as the default error type, unless explicitly overridden.

This new file `error-handling.md` has been created in the `docs/guide` folder, containing the error handling documentation we discussed. The content maintains the structure and style consistent with the quick-start guide, focusing on the four main concepts: basic error handling in templates, global error handling with hooks, typing errors locally, and typing errors globally.
