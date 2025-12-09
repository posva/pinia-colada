# Query Meta

Attach metadata to any query and access it through _entries_ in plugins and hooks. This allows you to implement cross-cutting concerns like error handling, logging, or analytics.

## Basic Usage

Add meta to a query by passing an object to `meta` option:

```ts twoslash
import { useQuery } from '@pinia/colada'

useQuery({
  key: ['user', 1],
  query: () => fetch('/api/user/1').then((r) => r.json()),
  meta: {
    errorMessage: 'Failed to load user',
  },
})
```

You can put anything you want in meta, but if you are doing SSR, you will need to ensure that [the meta is serializable](#ssr).

You can also use a function (or a ref) to dynamically and **lazily** compute it

```ts
import { useQuery } from '@pinia/colada'

const id = ref(1)
useQuery({
  key: () => ['user', id.value],
  query: () => fetch('/api/user/1').then((r) => r.json()),
  meta: () => ({
    isFirst: id.value === 1,
  }),
})
```

::: tip

Meta is computed **only once**, when the entry is created. The main advantage of using a function or ref is to delay the creation of this meta object until the entry is created.

:::

## TypeScript

Define your meta type globally by extending the `TypesConfig` interface:

```ts
// types-extension.d.ts
import '@pinia/colada'

declare module '@pinia/colada' {
  interface TypesConfig {
    queryMeta: {
      errorMessage?: string
      logLevel?: 'debug' | 'info' | 'warn' | 'error'
    }
  }
}

export {}
```

Now your meta will be fully typed across your application.

## Using Meta in Query Hooks

The most common use case for meta is to access it in global hooks like [plugins](../advanced/plugins.md). You could for example notify the user with toast **on specific errors** with the `PiniaColadaQueryHooksPlugin`:

```ts twoslash
import { PiniaColada, PiniaColadaQueryHooksPlugin } from '@pinia/colada'
// ---cut-start---
import type { App } from 'vue'
declare const app: App
declare const toast: Record<'debug' | 'info' | 'warn' | 'error', (msg: string) => void>
// ---cut-end---

app.use(PiniaColada, {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onError(error, entry) {
        if (entry.meta?.errorMessage) {
          toast.error(entry.meta.errorMessage)
        }
      },
    }),
  ],
})
```

## SSR

Meta is serialized during SSR, so it **must be serializable** (plain objects, arrays, primitives, etc ) or **explicitly skipped** during SSR.

```ts twoslash
import { useQuery } from '@pinia/colada'
// ---cut-start---
import { getAllContacts, type Contact } from '@/api/contacts'
declare const myCallback: (error: unknown) => void
// ---cut-end---

// ✅ SSR-safe
useQuery({
  key: ['contacts'],
  query: getAllContacts,
  meta: { priority: 'high' },
})

// ❌ Not SSR-safe
useQuery({
  key: ['contacts'],
  query: getAllContacts,
  meta: {
    onError: () => console.log('error'), // Functions don't serialize
  },
})

// ✅ Skip non-serializable data during SSR
useQuery({
  key: ['contacts'],
  query: getAllContacts,
  meta: {
    onError: import.meta.env.SSR ? undefined : myCallback,
  },
})
```

## Access Patterns

Meta is stored in two places:

- `entry.meta` - The resolved value (computed once when entry is created)
- `entry.options.meta` - The original function/ref/raw value

```ts twoslash
import { useQueryCache, useQuery } from '@pinia/colada'

useQuery({
  key: ['time'],
  query: () => fetch('/api/time').then((r) => r.json()),
  meta: () => ({ timestamp: Date.now() }),
})

// ---cut-start---
const queryCache = useQueryCache()
// ---cut-end---

// In your plugin
queryCache.$onAction(({ name, after, args }) => {
  if (name === 'extend') {
    const [entry] = args
    console.log(entry.meta) // { timestamp: 1234567890 }
    console.log(entry.options?.meta) // [Function: metaFn]
  }
})
```
