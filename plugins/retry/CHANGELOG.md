# 0.0.0 (2024-08-05)

- feat!: add a `state` property to `useQuery` for type narrowing ([22f3e21](https://github.com/posva/pinia-colada/commit/22f3e216c03ee4e7e536fa3e4c8f4fad42717daf))
- refactor!: rename cache store actions ([792ec6e](https://github.com/posva/pinia-colada/commit/792ec6ec16bebd01f24d5c0a24f66884d902ebc8))

### BREAKING CHANGES

- This feature splits up the `status` state into two
  different _status_ properties:

* `status` is now just for the data `'pending' | 'success' | 'error'`
* `queryStatus` tells if the query is still running or not with `'idle' |
'running'`

- `refetch`, `refresh` and similar methods now resolve
  the `state` property without rejecting. This is usually more convenient.
- The `QueryStatus` type has been split into
  `DataStateStatus` and `OperationStateStatus`.
- the cache store is going through a refactor to empower
  plugins. **This change shouldn't affect end users unless you are
  directly using the cache store**.
  As a result a lot of the actions have been renamed

* refetch -> fetch
* invalidateEntry -> invalidate
* ensureEntry -> ensure

Their arguments have changed as well.
