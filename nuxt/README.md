<h1>
  <img width="64" src="https://github.com/posva/pinia-colada/assets/664177/02011637-f94d-4a35-854a-02f7aed86a3c" alt="Pinia Colada logo">
  Pinia Colada
</h1>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

- [✨ &nbsp;Release Notes](/nuxt/CHANGELOG.md)
- [📚 &nbsp;Documentation](https://pinia-colada.esm.dev/nuxt.html)
<!-- - [🏀 Online playground](https://stackblitz.com/github/your-org/@pinia/colada-nuxt?file=playground%2Fapp.vue) -->

Add the Pinia Colada Module to handle SSR and install Pinia Colada in your Nuxt application.

## Quick Setup

Install the module to your Nuxt application with one command:

```bash
npx nuxi module add @pinia/colada-nuxt
```

That's it! You can now use Pinia Colada in your Nuxt app ✨

## Configuration

Pinia Colada can be configured in two main ways:

1. **File-based configuration** - Create a `colada.options.ts` file in your project root
2. **Programmatic configuration** - Use `setDefaultPiniaColadaOptions()` from modules/plugins

### Option 1: File-based Configuration (colada.options.ts)

Create a `colada.options.ts` file in your project root:

```typescript
// colada.options.ts
import { PiniaColadaQueryHooksPlugin, type PiniaColadaOptions } from '@pinia/colada'

export default {
  plugins: [
    PiniaColadaQueryHooksPlugin({
      onSuccess(data, entry) {
        console.log(`Query ${entry.key.join('/')} succeeded`)
      },
      onError(error, entry) {
        console.error(`Query ${entry.key.join('/')} failed:`, error)
      },
    }),
  ],
} satisfies PiniaColadaOptions
```

### Option 2: Programmatic Configuration (for Library/Module Authors)

If you're building a Nuxt module or library that uses Pinia Colada, you can provide default configurations using the universal API. **Important:** You must register a runtime plugin (with `order: -10`) to call `setDefaultPiniaColadaOptions()` at the correct time.

```typescript
// my-auth-module/module.ts
import { addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'my-auth-module',
  },
  setup() {
    const { resolve } = createResolver(import.meta.url)

    // Register a runtime plugin that runs BEFORE the main Pinia Colada plugin
    addPlugin({
      src: resolve('./runtime/plugin'),
      mode: 'all',
      order: -10, // Important: Run before Pinia Colada plugin (order: 0)
    })
  },
})
```

```typescript
// my-auth-module/runtime/plugin.ts
import { defineNuxtPlugin } from '#app'
import { setDefaultPiniaColadaOptions, PiniaColadaQueryHooksPlugin } from '@pinia/colada'

export default defineNuxtPlugin({
  name: 'my-auth-module-colada',
  setup() {
    // Set default Pinia Colada options
    // These will be merged with user's colada.options.ts
    setDefaultPiniaColadaOptions({
      plugins: [
        PiniaColadaQueryHooksPlugin({
          onError(error) {
            // Global error handling from your module
            if (error.status === 401) {
              // Handle authentication errors
              navigateTo('/login')
            }
          },
        }),
      ],
      queryOptions: {
        staleTime: 5000, // 5 seconds default stale time
      },
    })
  },
})
```

**Key Features:**
- ✅ Clean and explicit (no magic patterns or virtual modules)
- ✅ Works perfectly with SSR (plugins run at runtime)
- ✅ Multiple modules can contribute configurations
- ✅ User's `colada.options.ts` file has highest priority
- ✅ Arrays (like plugins) are concatenated, objects are merged
- ✅ Easy to debug with clear plugin execution order

#### Why Use a Runtime Plugin?

**Important:** You cannot call `setDefaultPiniaColadaOptions()` directly in your module's `setup()` function. Here's why:

- **Module `setup()`** runs at **build time** (during `nuxt dev` or `nuxt build`)
- **Plugins** run at **runtime** (when your app actually starts)
- `setDefaultPiniaColadaOptions()` modifies global state that needs to be available at runtime

By registering a plugin with `order: -10`, you ensure your defaults are set at the right time (runtime) and in the right order (before the main Pinia Colada plugin installs).

#### Plugin Execution Order

```
1. Pinia plugin (dependency)
   ↓
2. Your module's plugin (order: -10)
   → Calls setDefaultPiniaColadaOptions()
   ↓
3. Main Pinia Colada plugin (order: 0)
   → Merges colada.options.ts
   → Installs PiniaColada with all merged configs
   ↓
4. Your app code runs
```

### Merging Behavior

When using `setDefaultPiniaColadaOptions()`, options are merged with this behavior:

- **Arrays (plugins)**: Concatenated in order (all plugins from all sources are included)
- **Objects (queryOptions, mutationOptions)**: Shallow merged
- **Primitives**: User-provided options override defaults

**Example:**

```typescript
// From your auth module
setDefaultPiniaColadaOptions({
  plugins: [AuthPlugin()],
  queryOptions: { staleTime: 5000 },
})

// From another module
setDefaultPiniaColadaOptions({
  plugins: [LoggingPlugin()],
  queryOptions: { refetchOnReconnect: true },
})

// User's colada.options.ts
export default {
  plugins: [CustomPlugin()],
  queryOptions: { staleTime: 10000 }, // Overrides module's staleTime
}

// Final merged result:
// {
//   plugins: [AuthPlugin(), LoggingPlugin(), CustomPlugin()],
//   queryOptions: {
//     staleTime: 10000,           // from user
//     refetchOnReconnect: true,   // from module
//   }
// }
```

### Non-Nuxt Projects

The `setDefaultPiniaColadaOptions()` API works in any project:

```typescript
// In a Vue 3 + Vite project
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada, setDefaultPiniaColadaOptions } from '@pinia/colada'

// Set defaults before installing the plugin
setDefaultPiniaColadaOptions({
  queryOptions: {
    staleTime: 5000,
    refetchOnWindowFocus: false,
  },
})

const app = createApp(App)
app.use(createPinia())
app.use(PiniaColada) // Will use the defaults set above
```

## Contribution

<details>
  <summary>Local development</summary>

```bash
# Install dependencies
pnpm install

# Generate type stubs
pnpm run dev:prepare

# Develop with the playground
pnpm run dev

# Build the playground
pnpm run dev:build

# Run ESLint
pnpm run lint

# Run Vitest
pnpm run test
pnpm run test:watch

# Release new version
pnpm run release
```

</details>

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@pinia/colada-nuxt/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@pinia/colada-nuxt
[npm-downloads-src]: https://img.shields.io/npm/dm/@pinia/colada-nuxt.svg?style=flat&colorA=020420&colorB=00DC82
[npm-downloads-href]: https://npmjs.com/package/@pinia/colada-nuxt
[license-src]: https://img.shields.io/npm/l/@pinia/colada-nuxt.svg?style=flat&colorA=020420&colorB=00DC82
[license-href]: https://npmjs.com/package/@pinia/colada-nuxt
[nuxt-src]: https://img.shields.io/badge/Nuxt-020420?logo=nuxt.js
[nuxt-href]: https://nuxt.com
