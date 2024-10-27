# Server Side Rendering

Pinia Colada relies on Pinia for server side rendering. This means that you should follow [Pinia's SSR guide](https://pinia.vuejs.org/ssr/) to setup your server side rendering.

On top of that, Pinia Colada relies on some custom data structures that requires special serialization. This is handled automatically in the [Nuxt module](./nuxt.md) but if you are using a custom SSR setup, you will need to handle this yourself by serializing and reviving the cache tree.

If you use [devalue](https://github.com/Rich-Harris/devalue), you can follow their documentation [for custom types](https://github.com/Rich-Harris/devalue#custom-types). It should look something like this:

```ts
import devalue from 'devalue'
import { markRaw } from 'vue'
import { TreeMapNode, serializeTreeMap, reviveTreeMap } from '@pinia/colada'
const stringified = devalue.stringify(pinia.state.value, {
  PiniaColada_TreeMapNode: (data: unknown) =>
    data instanceof TreeMapNode && serializeTreeMap(data),
})

const revivedData = devalue.parse(stringified, {
  PiniaColada_TreeMapNode: (data: ReturnType<typeof serializeTreeMap>) =>
    // markRaw is recommended for the tree map
    markRaw(reviveTreeMap(data)),
})
```

## Error Handling with SSR

If you want to SSR errors, you will need to also handle their serialization

```ts
import devalue from 'devalue'
import { MyError } from '~/errors'

const stringified = devalue.stringify(error, {
  MyError: (data: unknown) =>
    data instanceof MyError && [data.message, data.customData],
})

const revivedData = devalue.parse(stringified, {
  MyError: (data: [string, unknown]) => new MyError(data[0], data[1]),
})
```
