# Migration Codemods

Pinia Colada ships [ast-grep](https://ast-grep.github.io/) codemods to automate breaking-change migrations. Always **commit your changes before running a codemod** so you can review the diff.

## Running codemods

With `pnpm dlx` (no global install):

```sh
pnpm --package=@ast-grep/cli dlx ast-grep scan -r node_modules/@pinia/colada/codemods/rules/<rule-file>.yaml -i src
```

Or [install ast-grep globally](https://ast-grep.github.io/guide/quick-start.html#installation) and run:

```sh
ast-grep scan -r node_modules/@pinia/colada/codemods/rules/<rule-file>.yaml -i src
```

Replace `src` with the directory that contains your source files and `<rule-file>` with the migration file name listed below.

## 0.13 → 0.14

**File:** `migration-0-13-to-0-14.yaml`

Global query options passed to the `PiniaColada` plugin have been moved under a `queryOptions` key. Calls without any options now require an empty object.

Before:

```ts
app.use(PiniaColada, { // [!code --]
  staleTime: 10_000, // [!code --]
  refetchOnWindowFocus: true, // [!code --]
  plugins: [/* ... */], // [!code --]
}) // [!code --]

app.use(PiniaColada) // [!code --]
```

After:

```ts
app.use(PiniaColada, { // [!code ++]
  queryOptions: { // [!code ++]
    staleTime: 10_000, // [!code ++]
    refetchOnWindowFocus: true, // [!code ++]
  }, // [!code ++]
  plugins: [/* ... */], // [!code ++]
}) // [!code ++]

app.use(PiniaColada, {}) // [!code ++]
```

Run the codemod:

```sh
ast-grep scan -r node_modules/@pinia/colada/codemods/rules/migration-0-13-to-0-14.yaml -i src
```

## 0.21 → 1.0

**File:** `migration-0-21-to-1-0.yaml`

The two-parameter form of `useQuery` and `useQueryState` is deprecated in favor of a single function parameter.

Before:

```ts
useQuery(useContactList, () => ({ search: search.value })) // [!code --]
useQueryState(useContactList, () => ({ search: search.value })) // [!code --]
```

After:

```ts
useQuery(() => useContactList({ search: search.value })) // [!code ++]
useQueryState(() => useContactList({ search: search.value }).key) // [!code ++]
```

Run the codemod:

```sh
ast-grep scan -r node_modules/@pinia/colada/codemods/rules/migration-0-21-to-1-0.yaml -i src
```
