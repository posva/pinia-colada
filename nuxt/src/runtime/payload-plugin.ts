import { TreeMapNode, reviveTreeMap, serializeTreeMap } from '@pinia/colada'

/**
 * Handles Firestore Timestamps, GeoPoint, and other types that needs special handling for serialization.
 */
export default definePayloadPlugin(() => {
  definePayloadReducer('PiniaColada_TreeMapNode', (data: unknown) => {
    if (data instanceof TreeMapNode) {
      const serialized = serializeTreeMap(data)
      // console.error('🥣', serialized)
      return serialized
    }
    else if (
      data
      && typeof data === 'object'
      && 'children' in data
      && 'value' in data
    ) {
      console.log('🥲 not TreeMapNode', data)
      // console.log([...data])
      // console.log([...data])
      // return serialize(data)
    }
  })
  // TODO: pinia colada shouldn't revive itself
  definePayloadReviver(
    'PiniaColada_TreeMapNode',
    (data: ReturnType<typeof serializeTreeMap>) => {
      return markRaw(reviveTreeMap(data))
    },
  )
})
