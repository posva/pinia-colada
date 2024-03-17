# Queries

## Definition:

Queries are dependencies to an async source of data which declaratively fetch, cache and refresh the data. The API to declare and run a query is the composable `useQuery`:

```ts
const { data, isFetching, error, refresh } = useQuery({
  key: ['items'],
  query: () => getItems,
  staleTime: 60000,
})
```
This composable:
- accepts an option object, which configures the key of the query, how to fetch de data, and options related to the cache and its revalidation
- returns the state of the query, which can be used in the UI, and some methods to declaratively revalidate the cache if needed

## Query options:

### Required options:
- `key`: the key used to identify the query. It **must** be unique per query. // TODO: add precisions on the key array.
- `query`: the function called to fetch the data. It **must** be async.

### Cache:
- `staleTime`: the time in ms after which the data is considered stale and will be refreshed on next read (TODO: examples of read). The default time is set to 5 seconds.
- `gcTime`: the time in ms after which the cache of an inactive query will be garbage collected to free resources. The default time is 5 minutes.

### Revalidation events:
The query cache can be revalidated on specific events: on component mount, on window focus or on reconnection (TODO: mention that there is no polling of the data? Explain better that revalidation rely on these events, and that if needed we can declaratively use `useQuey`'s methods to trigger it?). The related options are:
- `refetchOnMount`
- `refetchOnWindowFocus`
- `refetchOnReconnect`

Each option accept three values:
- `true`: refetch if data is stale (triggers under the hoods the `refresh` method, cf "Query returns" below). This is the default value.
- `false`: never refetch
- `always`: always refetch

## Query returns :

### State of the query:

- `data`: the last successful data resolved by the query (the query cache)
- `error`: the error rejected by the query (if any)
- `isFetching`: whether the request is currently fetching data
- `isPending`: alias for `status.value === 'pending'`
- `status`: the status of the query. Possible values:
    - `pending`: initial state (the first call is still pending)
    - `loading`: the request is being made
    - `error`: the last request failed
    - `success`: the last request succeeded

### Query methods:
`useQuery` exposes two methods to imperatively trigger data revalidation:
- `refresh`: ensures the current data is fresh. If the data is stale, refetch, if not return as is. In any case, returns a promise (immediately resolved, or that resolves when the refresh is done).
- `refetch`: ignores fresh data and triggers a new fetch. Returns a promise (that resolves when the refresh is done).

*Nb: since `useQuery` already takes care of revalidating the data on specific events, make sure to check them before manually using the following methods.*
