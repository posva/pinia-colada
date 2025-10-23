# Playground: Universal Options API Demo

This playground demonstrates the new `setDefaultPiniaColadaOptions()` API that allows libraries and modules to provide default Pinia Colada configurations.

## What's Demonstrated

### 1. Demo Module Setting Defaults (`modules/demo-module.ts`)

A Nuxt module calls `setDefaultPiniaColadaOptions()` in its setup function to provide defaults:
- Adds a plugin with `onSuccess` and `onError` hooks
- Sets `staleTime: 3000` (3 seconds)
- Sets `refetchOnWindowFocus: false`

This is exactly how real-world modules would work:

```typescript
// my-auth-module/module.ts
import { setDefaultPiniaColadaOptions } from '@pinia/colada'

export default defineNuxtModule({
  setup() {
    setDefaultPiniaColadaOptions({
      plugins: [AuthPlugin()],
      queryOptions: { staleTime: 5000 }
    })
  }
})
```

### 2. User Configuration (`colada.options.ts`)

The project's configuration file:
- Adds another plugin with `onSettled` hook
- **Overrides** `staleTime: 10000` (user preference wins!)
- Inherits `refetchOnWindowFocus: false` from the plugin

### 3. Final Merged Result

When the app runs, Pinia Colada receives:

```typescript
{
  plugins: [
    // From demo-module:
    QueryHooksPlugin({ onSuccess, onError }),
    // From colada.options.ts:
    QueryHooksPlugin({ onSettled }),
  ],
  queryOptions: {
    staleTime: 3000,               // From module (user didn't override)
    refetchOnWindowFocus: false,   // From module
  }
}
```

## Running the Demo

1. **Start dev server:**
   ```bash
   pnpm run dev
   ```

2. **Watch the console:**
   - Look for `[demo-module]` logs when module sets defaults at startup
   - Look for `[colada.options.ts]` logs when file is loaded
   - When queries run, both `onSuccess/onError` AND `onSettled` will fire!

3. **Make a query** in the app and observe:
   - Both plugins work together (arrays are concatenated)
   - `staleTime` is 3 seconds (from module, user didn't override)
   - No refetch on window focus (inherited from module)

## Key Takeaways

✅ **Libraries/modules can provide defaults** via `setDefaultPiniaColadaOptions()`
✅ **Users can override** any option in `colada.options.ts`
✅ **Arrays (plugins) are concatenated** - all plugins work together
✅ **Objects are merged** - later values override earlier ones
✅ **Works everywhere** - Not just Nuxt! Use in any Vue project

## Real-World Example

In production, a **Nuxt module** would call `setDefaultPiniaColadaOptions()` in its setup:

```typescript
// @mycompany/nuxt-auth-module/module.ts
import { defineNuxtModule } from '@nuxt/kit'
import { setDefaultPiniaColadaOptions, PiniaColadaQueryHooksPlugin } from '@pinia/colada'

export default defineNuxtModule({
  meta: { name: '@mycompany/nuxt-auth' },
  setup() {
    // This runs at build time - set defaults for all projects using this module
    setDefaultPiniaColadaOptions({
      plugins: [
        PiniaColadaQueryHooksPlugin({
          onError(error) {
            if (error.status === 401) {
              navigateTo('/login')
            }
          },
        }),
      ],
      queryOptions: {
        staleTime: 5000,
        retry: 3,
      },
    })
  },
})
```

Then every project using this module gets these defaults automatically! 🎉

> **Note**: The core `@pinia/colada` package must be built before running this demo.
> Run `pnpm run build` in the root directory first.
