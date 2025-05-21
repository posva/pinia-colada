import { isQueryCache, serializeQueryCache } from '@pinia/colada'
import { definePayloadPlugin, definePayloadReducer, definePayloadReviver } from '#app'

/**
 * Handles Firestore Timestamps, GeoPoint, and other types that needs special handling for serialization.
 */
export default definePayloadPlugin(() => {
  definePayloadReducer('PiniaColada_TreeMapNode', (data: unknown) => {
    return isQueryCache(data) && serializeQueryCache(data)
  })

  // we let pinia colada handle the revive
  definePayloadReviver(
    'PiniaColada_TreeMapNode',
    (data: ReturnType<typeof serializeQueryCache>) => data,
  )
})
