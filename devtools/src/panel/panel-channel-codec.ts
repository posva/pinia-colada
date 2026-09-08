import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'

export const panelChannelCodec = {
  serialize: serializeDevtoolsValue,
  deserialize: restoreClonedDeep,
}

// FIXME: Remove this normalization once devframe applies the channel codec to
// shared-state updates as well as the initial snapshot.
export function normalizeSharedStateValue<T>(value: T): T {
  return restoreClonedDeep(serializeDevtoolsValue(value))
}
