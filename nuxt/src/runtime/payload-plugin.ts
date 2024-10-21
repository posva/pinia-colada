import { TreeMapNode, reviveTreeMap, serializeTreeMap } from '@pinia/colada'
import { markRaw } from 'vue'

/**
 * Handles Firestore Timestamps, GeoPoint, and other types that needs special handling for serialization.
 */
export default definePayloadPlugin(() => {
  definePayloadReducer(
    'PiniaColada_TreeMapNode',
    (data: unknown) => data instanceof TreeMapNode && serializeTreeMap(data),
  )

  definePayloadReviver(
    'PiniaColada_TreeMapNode',
    (data: ReturnType<typeof serializeTreeMap>) => markRaw(reviveTreeMap(data)),
  )
})
