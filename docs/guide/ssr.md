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
