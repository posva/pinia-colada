<p align="center">
  <img width="240" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
</p>
<br/>
<p align="center">
  <a href="https://npmjs.com/package/@pinia/colada">
    <img src="https://badgen.net/npm/v/@pinia/colada/latest" alt="npm package">
  </a>
  <a href="https://github.com/posva/pinia-colada/actions/workflows/test.yml">
    <img src="https://github.com/posva/pinia-colada/workflows/test/badge.svg" alt="build status">
  </a>
  <a href="https://codecov.io/gh/posva/pinia-colada">
    <img src="https://codecov.io/gh/posva/pinia-colada/branch/main/graph/badge.svg?token=OZc0DBze2R"/>
  </a>
</p>
<br/>

# Pinia Colada (WIP)

> The missing data fetching library for [Pinia](https://pinia.vuejs.org)

This is a more complete and production-ready (not yet!) version of the exercises from [Mastering Pinia](https://masteringpinia.com/).

<a href="https://masteringpinia.com/?utm=pinia-colada-readme">
  <img src="https://github.com/posva/pinia-colada/assets/664177/2f7081a5-90fe-467a-b021-7e709f71603e" width="320" alt="Mastering Pinia banner">
</a>

> [!WARNING]
> Pinia Colada is still experimental and not ready for production. New versions might introduce breaking changes.
> Feedback regarding new and existing options and features is welcome!

Pinia Colada is an opinionated yet flexible data fetching layer on top of Pinia. It's built as a set of **pinia plugins**, **stores** and **composables** to benefit from Pinia's features and ecosystem. Pinia Colada has:

- ⚡️ **Automatic caching**: Smart client-side caching with request deduplication
- 🗄️ **Async State**: Handle any async state
- 📚 **Typescript Support**: Fully typed with Typescript
  <!-- - 📡 **Network Status**: Handle network status and offline support -->
  <!-- - 🛠 **Devtools**: Integration with the Vue devtools -->
- 💨 **Bundle Size**: Small bundle size (<2kb) and fully tree-shakeable
- 📦 **Zero Dependencies**: No dependencies other than Pinia
- ⚙️ **SSR**: Server-side rendering support

## Installation

```sh
npm install pinia @pinia/colada
```

Install the plugins for the features you need:

```js
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'

app.use(createPinia())
// install after pinia
app.use(PiniaColada, {
  // optional options
})
```

## Usage

```vue
<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { useMutation, useQuery } from '@pinia/colada'
import { updateContact as _updateContact, getContactById } from '~/api/contacts'

const route = useRoute()

const { data: contact, isLoading } = useQuery({
  // recognizes this query as ['contacts', id]
  key: () => ['contacts', route.params.id],
  query: () => getContactById(route.params.id),
})

const { mutate: updateContact } = useMutation({
  // automatically invalidates the cache for ['contacts'] and ['contacts', id]
  keys: ({ id }) => [['contacts'], ['contacts', id]],
  mutation: _updateContact,
})
</script>

<template>
  <section>
    <ContactCard
      :key="contact.id"
      :contact="contact"
      :is-updating="isLoading"
      @update:contact="updateContact"
    />
  </section>
</template>
```

## License

[MIT](http://opensource.org/licenses/MIT)
