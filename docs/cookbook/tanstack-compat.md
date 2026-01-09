# TanStack Query Compatibility Plugin

This plugin provides a compatibility layer for developers migrating from TanStack Query (Vue) to Pinia Colada, or for those who prefer the TanStack Query API style.

## Overview

The plugin adds TanStack Query Vue v5 compatible properties to both `useQuery` and `useMutation` composables via TypeScript module augmentation. This means you get full type safety and IntelliSense support.

## Installation

```bash
# or pnpm, or yarn, etc
npm i @pinia/colada-plugin-tanstack-compat
```

## Setup

Register the plugin when installing Pinia Colada:

```ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaTanStackCompat } from '@pinia/colada-plugin-tanstack-compat'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(PiniaColada, {
  plugins: [PiniaColadaTanStackCompat()],
})
```

## Features

### useQuery Extensions

The plugin adds 12 properties to every query:

| Property              | Type                                | Description                                        | TanStack Equivalent   |
| --------------------- | ----------------------------------- | -------------------------------------------------- | --------------------- |
| `isSuccess`           | `ComputedRef<boolean>`              | `true` when status is `'success'`                  | `isSuccess`           |
| `isError`             | `ComputedRef<boolean>`              | `true` when status is `'error'`                    | `isError`             |
| `isFetching`          | `ComputedRef<boolean>`              | `true` when query is fetching (initial or refetch) | `isFetching`          |
| `isRefetching`        | `ComputedRef<boolean>`              | `true` when refetching (not initial load)          | `isRefetching`        |
| `isLoadingError`      | `ComputedRef<boolean>`              | `true` when initial fetch failed (never had data)  | `isLoadingError`      |
| `isRefetchError`      | `ComputedRef<boolean>`              | `true` when refetch failed (had data before)       | `isRefetchError`      |
| `isStale`             | `ComputedRef<boolean>`              | `true` when data is considered stale               | `isStale`             |
| `isFetched`           | `ShallowRef<boolean>`               | `true` after first fetch completes                 | `isFetched`           |
| `isFetchedAfterMount` | `ShallowRef<boolean>`               | `true` after first fetch after component mount     | `isFetchedAfterMount` |
| `dataUpdatedAt`       | `ShallowRef<number>`                | Timestamp (ms) of last successful data fetch       | `dataUpdatedAt`       |
| `errorUpdatedAt`      | `ShallowRef<number>`                | Timestamp (ms) of last error                       | `errorUpdatedAt`      |
| `fetchStatus`         | `ComputedRef<'fetching' \| 'idle'>` | TanStack-style fetch status                        | `fetchStatus`         |

### useMutation Extensions

The plugin adds 7 properties to every mutation entry:

| Property         | Type                   | Description                                | TanStack Equivalent |
| ---------------- | ---------------------- | ------------------------------------------ | ------------------- |
| `isIdle`         | `ComputedRef<boolean>` | `true` when mutation has never been called | `isIdle`            |
| `isPending`      | `ComputedRef<boolean>` | `true` when mutation is in progress        | `isPending`         |
| `isSuccess`      | `ComputedRef<boolean>` | `true` when status is `'success'`          | `isSuccess`         |
| `isError`        | `ComputedRef<boolean>` | `true` when status is `'error'`            | `isError`           |
| `submittedAt`    | `ShallowRef<number>`   | Timestamp (ms) when mutation was submitted | `submittedAt`       |
| `dataUpdatedAt`  | `ShallowRef<number>`   | Timestamp (ms) of last successful mutation | N/A                 |
| `errorUpdatedAt` | `ShallowRef<number>`   | Timestamp (ms) of last error               | N/A                 |

## Usage Examples

### Query Status Handling

```vue
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { data, isSuccess, isError, isFetching, isStale, error } = useQuery({
  key: ['user', userId],
  query: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000, // 5 minutes
})
</script>

<template>
  <div class="user-profile">
    <!-- Loading state -->
    <LoadingSpinner v-if="isFetching && !data" />

    <!-- Error state -->
    <ErrorMessage v-else-if="isError" :error="error" />

    <!-- Success state -->
    <template v-else-if="isSuccess">
      <StaleIndicator v-if="isStale" />
      <UserCard :user="data" />
    </template>
  </div>
</template>
```

### Distinguishing Error Types

```vue
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { data, isLoadingError, isRefetchError, error, refetch } = useQuery({
  key: ['posts'],
  query: fetchPosts,
})
</script>

<template>
  <!-- Initial load failed - show full error page -->
  <ErrorPage v-if="isLoadingError" :error="error" @retry="refetch" />

  <!-- Refetch failed - show data with error banner -->
  <template v-else>
    <ErrorBanner v-if="isRefetchError" :error="error" @dismiss="/* ... */" />
    <PostList :posts="data" />
  </template>
</template>
```

### Tracking Fetch Activity

```vue
<script setup lang="ts">
import { useQuery } from '@pinia/colada'

const { data, isFetching, isRefetching, isFetched, isFetchedAfterMount, dataUpdatedAt } = useQuery({
  key: ['dashboard'],
  query: fetchDashboardData,
})

const lastUpdated = computed(() =>
  dataUpdatedAt.value ? new Date(dataUpdatedAt.value).toLocaleTimeString() : 'Never',
)
</script>

<template>
  <div>
    <RefreshIndicator v-if="isRefetching" />
    <p>Last updated: {{ lastUpdated }}</p>
    <Dashboard v-if="isFetched" :data="data" />
  </div>
</template>
```

### Mutation Status Tracking

```vue
<script setup lang="ts">
import { useMutation, useMutationCache } from '@pinia/colada'

const { mutate, status, data, error } = useMutation({
  key: ['createPost'],
  mutation: (newPost: Post) => api.createPost(newPost),
})

// Access extended properties via mutation cache
const mutationCache = useMutationCache()
const entry = computed(() => mutationCache.getEntries({ key: ['createPost'] })[0])

const isPending = computed(() => entry.value?.ext.isPending.value ?? false)
const isIdle = computed(() => entry.value?.ext.isIdle.value ?? true)
</script>

<template>
  <form @submit.prevent="mutate(formData)">
    <button :disabled="isPending">
      {{ isPending ? 'Creating...' : 'Create Post' }}
    </button>
  </form>
</template>
```

## Caveats and Limitations

### 1. Mutation Extensions Access

**Issue**: Unlike `useQuery`, mutation extensions are NOT directly available on the `useMutation()` return value.

**Reason**: Pinia Colada's `useMutation` doesn't spread `entry.ext` properties into its return object (unlike `useQuery` which does).

**Workaround**: Access mutation extensions via the mutation cache:

```ts
import { useMutation, useMutationCache } from '@pinia/colada'

const { mutate } = useMutation({
  key: ['myMutation'],
  mutation: async (data) => {
    /* ... */
  },
})

const mutationCache = useMutationCache()

// After calling mutate(), access extensions via cache
const entry = mutationCache.getEntries({ key: ['myMutation'] })[0]
const isPending = entry?.ext.isPending.value
```

### 2. `fetchStatus: 'paused'` Not Supported

**Issue**: TanStack Query's `fetchStatus` can be `'fetching' | 'paused' | 'idle'`. This plugin only supports `'fetching' | 'idle'`.

**Reason**: Pinia Colada doesn't have a network mode concept that would pause queries when offline.

**Workaround**: None currently. If you need offline support, consider handling it at the application level.

### 3. `isStale` Time-Based Updates

**Issue**: The `isStale` computed doesn't automatically update when time passes. It only re-evaluates when query state changes.

**Example**:

```ts
// staleTime: 1000 (1 second)
// After fetch: isStale = false
// 2 seconds later (no state change): isStale still returns false until next state change
// After refetch trigger: isStale correctly re-evaluates
```

**Reason**: Vue's reactivity system doesn't track time. The `isStale` getter depends on `Date.now()` which isn't reactive.

**Workaround**: Trigger a state change to force re-evaluation, or use `entry.stale` directly when you need real-time staleness checking:

```ts
const queryCache = useQueryCache()
const entry = queryCache.get(['myQuery'])
const isCurrentlyStale = entry?.stale // Getter evaluates on access
```

### 4. Properties Not Included

The following TanStack Query properties are NOT implemented:

| Property            | Reason                            | Alternative                      |
| ------------------- | --------------------------------- | -------------------------------- |
| `failureCount`      | Requires retry plugin integration | Use `@pinia/colada-plugin-retry` |
| `failureReason`     | Requires retry plugin integration | Use `@pinia/colada-plugin-retry` |
| `networkMode`       | Not supported in Pinia Colada     | N/A                              |
| `select`            | Different architecture            | Use computed properties          |
| `structuralSharing` | Different architecture            | N/A                              |
| `isPaused`          | No network mode                   | N/A                              |

## API Differences from TanStack Query

### Naming Differences

| TanStack Query      | Pinia Colada          | Notes                                   |
| ------------------- | --------------------- | --------------------------------------- |
| `queryKey`          | `key`                 | Same purpose                            |
| `queryFn`           | `query`               | Same purpose                            |
| `isLoading`         | `isPending` (queries) | Initial load state                      |
| `status: 'loading'` | `status: 'pending'`   | Initial state name                      |
| `fetchStatus`       | `asyncStatus`         | Pinia Colada uses `'loading' \| 'idle'` |

### Conceptual Differences

1. **Status vs AsyncStatus**: Pinia Colada separates data status (`pending | success | error`) from async status (`loading | idle`), similar to TanStack Query v5's status/fetchStatus split.

2. **Mutation State**: TanStack mutations start as `'idle'`, while Pinia Colada mutations start as `'pending'`. The `isIdle` extension maps this correctly.

3. **Cache Keys**: Both use array-based keys, but Pinia Colada's key serialization may differ slightly.

## Migration Checklist

When migrating from TanStack Query:

- Install the plugin and register it
- Replace `queryKey` with `key`
- Replace `queryFn` with `query`
- Replace `isLoading` checks with `isPending` for initial load
- Update `status === 'loading'` to `status === 'pending'`
- For mutations, access `isPending` via mutation cache if needed
- Remove any `networkMode` options (not supported)
- Replace `select` with Vue `computed` properties
- If using retry features, install `@pinia/colada-plugin-retry`

## TypeScript Support

The plugin provides full TypeScript support via module augmentation:

```ts
// Types are automatically available after importing the plugin
import { useQuery } from '@pinia/colada'

const { isSuccess, dataUpdatedAt } = useQuery({
  key: ['example'],
  query: async () => ({ id: 1 }),
})

// isSuccess: ComputedRef<boolean>
// dataUpdatedAt: ShallowRef<number>
```

## Future Roadmap

- Progressive feature disabling (opt-out of specific extensions)
- Integration with retry plugin for `failureCount`/`failureReason`
- Expose mutation extensions directly on `useMutation()` return (requires core change)
