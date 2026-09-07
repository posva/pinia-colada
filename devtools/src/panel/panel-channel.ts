import { connectPanelChannel } from 'devframe/in-page-channel'
import { restoreClonedDeep, serializeDevtoolsValue } from '@pinia/colada-devtools/shared'
import { PINIA_COLADA_CHANNEL } from '../channel.ts'
import type { PiniaColadaChannelProtocol } from '../channel.ts'

export const panelChannel = connectPanelChannel<PiniaColadaChannelProtocol>({
  name: PINIA_COLADA_CHANNEL,
  serialize: serializeDevtoolsValue,
  deserialize: restoreClonedDeep,
  functions: {
    // TODO: remove these handlers as cache updates are handled by the shared state.
    'queries:all': {
      type: 'event',
      handler: () => {},
    },
    'queries:update': {
      type: 'event',
      handler: () => {},
    },
    'queries:delete': {
      type: 'event',
      handler: () => {},
    },
    'mutations:all': {
      type: 'event',
      handler: () => {},
    },
    'mutations:update': {
      type: 'event',
      handler: () => {},
    },
    'mutations:delete': {
      type: 'event',
      handler: () => {},
    },
  },
})
