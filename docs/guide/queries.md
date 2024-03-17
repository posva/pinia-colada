# Queries

## Definition:

Queries are composables which fetch, cache and refresh the data. Here is what a query looks like:

```ts
const { data, isFetching, error, refresh } = useQuery({
  key: ['items'],
  query: () => getItems,
  staleTime: 60000,
})
```
As we can see, a query is a composable which:
- accepts an option object
- returns the state and methods of the query

## Query options:

### Required options:
- `key`: the key under which the query will be stored in the cache
- `query`: the function called to fetch the data. It **must** be async.
All the other options are not mandatory.

### Cache:
- `staleTime`: the time in ms after which the data is considered stale and will be refreshed on next read (for example, the next time the window is focused). The default time is set to 5 seconds.
- `gcTime`: the time in ms after which the cache of an inactive query will be garbage collected to free resources (default time of 5 minutes)

### Revalidation events:
The query cache can be revalidated on specific events: on component mount, on window focus or on reconnection. The related options are:
- `refetchOnMount`
- `refetchOnWindowFocus`
- `refetchOnReconnect`

Each option accept three values:
- `true`: refetch if data is stale (refresh()), cf "Query returns" below). This is the default value.
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
