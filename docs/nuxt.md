# Nuxt

Pinia Colada has a Nuxt module. Add it to your project with **alongside `@pinia/colada`**:

```bash
npm i @pinia/colada # replace npm with your package manager
npx nuxi module add @pinia/colada-nuxt
```

Or manually by installing it and adding it to your `nuxt.config.ts`:

```bash
npm install @pinia/colada @pinia/colada-nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/colada-nuxt'],
})
```

::: info

Since Pinia Colada depends on Pinia, you also need to install its Nuxt module:

```bash
npx nuxi module add pinia
```

:::

## Configuration

You can configure the Pinia Colada plugin by creating a `colada.options.ts` file at the root of your project.

```ts
// colada.options.ts
import type { PiniaColadaOptions } from '@pinia/colada'

export default {
  // Options here
} satisfies PiniaColadaOptions
```

These option will get passed to the `PiniaColada` Vue plugin. This allows you to add options like [plugins](./guide/installation.md#Plugins)

## SSR

Pinia Colada supports SSR out of the box. You can also combine it with [Data Loaders](https://uvr.esm.is/data-loaders/nuxt.html) instead of `await` + Suspense for an even better data fetching experience.

## Error Handling with SSR

In order to serialize errors in the server, you will need to define [custom payload plugins](https://nuxt.com/blog/v3-4#payload-enhancements).

```ts
// plugins/my-error.ts
import { MyError } from '~/errors'

export default definePayloadPlugin(() => {
  definePayloadReducer(
    'MyError',
    // we serialize the data we need as an array, object, or any other serializable format
    (data) => data instanceof MyError && [data.message, data.customData],
  )
  definePayloadReviver(
    'MyError',
    // we revive the data back to an instance of MyError
    ([message, customData]) => new MyError(message, customData),
  )
})
```
