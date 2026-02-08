# @pinia/colada-plugin-mutation-metrics

Adds a couple of handy metrics to mutations:

- `mutatedAt`: timestamp of the last successful mutation
- `errorCount`: number of times the mutation ended in an error

## Installation

```sh
pnpm add @pinia/colada-plugin-mutation-metrics
```

## Usage

```ts
import { PiniaColada } from '@pinia/colada'
import { PiniaColadaMutationMetrics } from '@pinia/colada-plugin-mutation-metrics'

app.use(PiniaColada, {
  plugins: [PiniaColadaMutationMetrics()],
})
```

Then:

```ts
const { mutate, mutatedAt, errorCount } = useMutation({
  mutation: async () => 42,
})
```
