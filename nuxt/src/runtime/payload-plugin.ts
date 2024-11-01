import { TreeMapNode, serializeTreeMap } from '@pinia/colada'
import { definePayloadPlugin, definePayloadReducer, definePayloadReviver } from '#imports'

/**
 * Handles Firestore Timestamps, GeoPoint, and other types that needs special handling for serialization.
 */
export default definePayloadPlugin(() => {
  definePayloadReducer('PiniaColada_TreeMapNode', (data: unknown) => {
    return data instanceof TreeMapNode && serializeTreeMap(data)
  })

  // we let pinia colada handle the revive
  definePayloadReviver('PiniaColada_TreeMapNode', (data: ReturnType<typeof serializeTreeMap>) => data)
})
