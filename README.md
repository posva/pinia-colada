<p align="center">
  <img width="240" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
</p>
<br/>
<p align="center">
  <a href="https://npmjs.com/package/@pinia/colada">
    <img src="https://badgen.net/npm/v/@pinia/colada/latest" alt="npm package">
  </a>
  <a href="https://github.com/posva/pinia-colada/actions/workflows/ci.yml">
    <img src="https://github.com/posva/pinia-colada/workflows/ci/badge.svg" alt="build status">
  </a>
  <a href="https://codecov.io/gh/posva/pinia-colada">
    <img src="https://codecov.io/gh/posva/pinia-colada/branch/main/graph/badge.svg?token=OZc0DBze2R"/>
  </a>
</p>
<br/>

# Pinia Colada

> The missing data fetching library for [Pinia](https://pinia.vuejs.org)

Pinia Colada makes data fetching in Vue applications a breeze. It's built on top of [Pinia](https://pinia.vuejs.org) and takes away all of the complexity and boilerplate that comes with fetching data. It's fully typed and tree-shakeable, and it's built with the same principles as Pinia and Vue: It's approachable, flexible, powerful and can be progressively adopted.

> [!TIP]
> This is a feature-complete version of the exercises from [Mastering Pinia](https://masteringpinia.com/?utm=pinia-colada-readme). If you would like to learn how it started and become an expert in Vue state management, check it out!
>
> <a href="https://masteringpinia.com/?utm=pinia-colada-readme">
> <img src="https://github.com/posva/pinia-colada/assets/664177/2f7081a5-90fe-467a-b021-7e709f71603e" width="200" alt="Mastering Pinia banner">
> </a>

## Features

- ⚡️ **Automatic caching**: Smart client-side caching with request deduplication
- 🗄️ **Async State**: Handle any async state
- 🔌 **Plugins**: Powerful plugin system
- ✨ **Optimistic Updates**: Optimistic updates with ease
- 💡 **Sensible defaults**: Sane defaults with full customization
- 🧩 **Out-of-the box plugins**: A set of composable functions to handle data fetching
- 📚 **Typescript Support**: Fully typed with Typescript
  <!-- - 📡 **Network Status**: Handle network status and offline support -->
  <!-- - 🛠 **Devtools**: Integration with the Vue devtools -->
- 💨 **Small Bundle Size**: A baseline of ~2kb and fully tree-shakeable
- 📦 **Zero Dependencies**: No dependencies other than Pinia
- ⚙️ **SSR**: Out of the box server-side rendering support

> [!NOTE]
> Pinia Colada is always trying to improve and evolve.
> Feedback regarding new and existing options and features is very welcome!
> Contribution to documentation, issues, and pull requests are highly appreciated.

## Installation

```sh
npm install pinia @pinia/colada
```

Install the plugins for the features you need:

```ts
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

app.use(createPinia())
// install after pinia
app.use(PiniaColada, {
  // optional options
})
```

## Usage

The core of Pinia Colada is the `useQuery` and `useMutation` functions. They are used to read data and write it respectively. Here's a simple example:

```vue
<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { patchContact, getContactById } from '~/api/contacts'

const route = useRoute()
const queryCache = useQueryCache()

const { data: contact, isPending } = useQuery({
  // unique key for the query in the cache
  key: () => ['contacts', route.params.id],
  query: () => getContactById(route.params.id),
})

const { mutate: updateContact, isLoading } = useMutation({
  mutation: patchContact,
  async onSettled({ id }) {
    // invalidate the query to refetch the data of the query above
    await queryCache.invalidateQueries({ key: ['contacts', id], exact: true })
  },
})
</script>

<template>
  <section>
    <p v-if="isPending">
      Loading...
    </p>
    <ContactCard
      v-else
      :key="contact.id"
      :contact="contact"
      :is-updating="isLoading"
      @update:contact="updateContact"
    />
  </section>
</template>
```

Learn more about the core concepts and how to use them in the [documentation](https://pinia-colada.esm.dev).

## License

[MIT](http://opensource.org/licenses/MIT)
