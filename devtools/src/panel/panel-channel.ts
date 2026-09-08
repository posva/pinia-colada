import { connectPanelChannel } from 'devframe/in-page-channel'
import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'
import { PINIA_COLADA_CHANNEL } from '../channel.ts'
import type { PiniaColadaChannelProtocol } from '../channel.ts'

export const panelChannel = connectPanelChannel<PiniaColadaChannelProtocol>({
  name: PINIA_COLADA_CHANNEL,
  serialize: serializeDevtoolsValue,
  deserialize: restoreClonedDeep,
  functions: {},
})

// FIXME: Remove this normalization once devframe applies the channel codec to
// shared-state updates as well as the initial snapshot.
export function normalizeSharedStateValue<T>(value: T): T {
  return restoreClonedDeep(serializeDevtoolsValue(value))
}
