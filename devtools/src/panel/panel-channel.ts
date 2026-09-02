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
