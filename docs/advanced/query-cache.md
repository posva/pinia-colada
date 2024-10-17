# Query Cache

The query cache is a central piece of the Pinia colada library. It centralizes the caching logic of queries and is used for [query invalidation](/guide/query-invalidation.md) and [optimistic updates](/guide/optimistic-updates.md). It's implemented as a Pinia store. It can be accessed in components setup and other _injectable contexts_ (e.g. Pinia stores, Router navigation guards) with `useQueryCache()`.

```vue twoslash
<script setup lang="ts">
import { useQueryCache } from '@pinia/colada'

const queryCache = useQueryCache()
</script>
```
