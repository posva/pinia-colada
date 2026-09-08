import { connectPanelChannel } from 'devframe/in-page-channel'
import { PINIA_COLADA_CHANNEL } from '../channel.ts'
import type { PiniaColadaChannelProtocol } from '../channel.ts'
import { panelChannelCodec } from './panel-channel-codec.ts'

export const panelChannel = connectPanelChannel<PiniaColadaChannelProtocol>({
  name: PINIA_COLADA_CHANNEL,
  ...panelChannelCodec,
  functions: {},
})
