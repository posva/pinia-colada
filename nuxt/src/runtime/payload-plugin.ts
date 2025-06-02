import { isQueryCache, serializeQueryCache } from '@pinia/colada'
import { definePayloadPlugin, definePayloadReducer, definePayloadReviver } from '#app'

/**
 * Handles serialization and deserialization of the Pinia Colada query cache
 */
export default definePayloadPlugin(() => {
  definePayloadReducer('PiniaColada_QueryCache', (data: unknown) => {
    return isQueryCache(data) && serializeQueryCache(data)
  })

  // we let pinia colada handle the revive
  definePayloadReviver(
    'PiniaColada_QueryCache',
    (data: ReturnType<typeof serializeQueryCache>) => data,
  )
})
