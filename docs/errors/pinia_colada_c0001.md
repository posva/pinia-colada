# PINIA_COLADA_C0001: root pinia plugin not detected

- Level: error (thrown, dev only)

## What happened

The `PiniaColada` plugin was installed but no Pinia instance could be found on the application. Pinia Colada relies on Pinia stores, so it cannot work without an active Pinia instance.

## How to fix it

Install Pinia before installing the `PiniaColada` plugin:

```ts
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

const app = createApp(App)
app.use(createPinia()) // must come first
app.use(PiniaColada)
```

## Passing the Pinia instance explicitly

When you already have a Pinia instance at hand, pass it through the plugin options instead of relying on auto-detection:

```ts
const pinia = createPinia()
app.use(PiniaColada, { pinia })
```

`useQueryCache()` and `useMutationCache()` are Pinia stores, so they accept the same explicit instance when called outside of an injection context:

```ts
const queryCache = useQueryCache(pinia)
```

## In a Nuxt plugin

A Nuxt plugin commonly registers callbacks (hooks, watchers, navigation guards) that run later. Composables that rely on injection — including `useQueryCache()` — must be called synchronously in the plugin's main context, exactly like any other composable, and the resolved instance used inside the callback. Calling them lazily from within the callback loses the injection context (and may pick up the wrong Pinia), triggering [PINIA_COLADA_R0001](./pinia_colada_r0001.md).

```ts
// plugins/refresh-on-auth.ts
export default defineNuxtPlugin(() => {
  // ✅ hoist the composable to the plugin's main context
  const queryCache = useQueryCache()
  const auth = useAuthStore()

  watch(
    () => auth.user,
    () => {
      // ✅ use the already-resolved instance inside the callback
      queryCache.invalidateQueries({ key: ['todos'] })
    },
  )
})
```

```ts
export default defineNuxtPlugin(() => {
  const auth = useAuthStore()

  watch(
    () => auth.user,
    () => {
      // ❌ no injection context here → PINIA_COLADA_R0001, and the wrong Pinia may be used
      const queryCache = useQueryCache()
      queryCache.invalidateQueries({ key: ['todos'] })
    },
  )
})
```

## Common causes

- Calling `app.use(PiniaColada)` before `app.use(createPinia())`
- Forgetting to install Pinia altogether
- Using multiple apps and installing Pinia Colada on an app without Pinia
