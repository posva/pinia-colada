## 0.0.0 (2024-08-06)

- feat!: add a `state` property to `useQuery` for type narrowing ([22f3e21](https://github.com/posva/pinia-colada/commit/22f3e21))
- refactor: add plugins ([833c522](https://github.com/posva/pinia-colada/commit/833c522))

### BREAKING CHANGE

- `refetch`, `refresh` and similar methods now resolve
  the `state` property without rejecting. This is usually more convenient.
- The `QueryStatus` type has been split into
  `DataStateStatus` and `OperationStateStatus`.
- This feature splits up the `status` state into two
  different _status_ properties:

* `status` is now just for the data `'pending' | 'success' | 'error'`
* `queryStatus` tells if the query is still running or not with `'idle' |
'running'`
