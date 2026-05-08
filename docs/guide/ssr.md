# Server Side Rendering

Pinia Colada relies on Pinia for server side rendering. This means that you should follow [Pinia's SSR guide](https://pinia.vuejs.org/ssr/) to setup your server side rendering.

On top of that, Pinia Colada relies on some custom data structures that requires special serialization. This is handled automatically in the [Nuxt module](../nuxt.md) but if you are using a custom SSR setup, you will need to handle this yourself by serializing and reviving the cache tree.

You can check the [source code of the Nuxt module](https://github.com/posva/pinia-colada/blob/main/nuxt/src/runtime/plugin.ts) for inspiration

## Serialization

If you use [devalue](https://github.com/Rich-Harris/devalue), you can follow their documentation [for custom types](https://github.com/Rich-Harris/devalue#custom-types). It should look something like this:

```ts
import devalue from 'devalue'
import { markRaw } from 'vue'
import { isQueryCache, serializeQueryCache, hydrateQueryCache } from '@pinia/colada'

const stringified = devalue.stringify(useQueryCache(pinia), {
  PiniaColada_TreeMapNode: (data: unknown) => isQueryCache(data) && serializeQueryCache(data),
})

const revivedData = devalue.parse(stringified, {
  PiniaColada_TreeMapNode: (data: ReturnType<typeof serializeQueryCache>) =>
    // We will use a custom hydration function
    data,
})

// we need to install Pinia and PiniaColada before hydrating the cache
app.use(pinia)
app.use(PiniaColada)
hydrateQueryCache(useQueryCache(pinia), revivedData)
```

## Garbage collection on the server

By default, Pinia Colada schedules a `setTimeout` to garbage collect cache entries after `gcTime`. On the server this is undesirable for two reasons:

- The pending timer keeps the Node.js process alive, which can hang `node`-based SSG / build pipelines for the duration of `gcTime` after rendering completes.
- The closure inside the timer retains the entry in memory across requests.

For server-side rendering you should disable GC on the server and clear the cache after each render. Pinia Colada exports the `PiniaColadaSSRNoGc` plugin for the first part:

```ts
import { PiniaColada, PiniaColadaSSRNoGc, useQueryCache } from '@pinia/colada'

app.use(PiniaColada, {
  plugins: import.meta.env.SSR ? [PiniaColadaSSRNoGc()] : [],
})

// after rendering each request:
useQueryCache(pinia).caches.clear()
```

The plugin forces `gcTime: false` on every query and mutation entry, so even per-call `useQuery({ gcTime: 30_000 })` overrides won't schedule a timer on the server.

The [Nuxt module](../nuxt.md) wires both of these for you automatically.

## Lazy queries

By passing the `enabled` option we can control whether the query should be executed or not. This is useful in many scenarios, for example, when you want to avoid fetching data on the server side.

```ts
import { useQuery } from '@pinia/colada'

useQuery({
  key: ['restaurants', { search: true }],
  query: () => findRestaurants(),
  // could also be `!import.meta.env.SSR` in Vite environments
  enabled: typeof document !== 'undefined',
})
```

This will prevent the query from being executed and awaited on the server side.

## Error Handling with SSR

Using devalue allows you to handle errors too. If you want to SSR errors, you will need to also handle their serialization

```ts
import devalue from 'devalue'
import { MyError } from '~/errors'

const stringified = devalue.stringify(error, {
  MyError: (data: unknown) => data instanceof MyError && [data.message, data.customData],
})

const revivedData = devalue.parse(stringified, {
  MyError: (data: [string, unknown]) => new MyError(data[0], data[1]),
})
```
