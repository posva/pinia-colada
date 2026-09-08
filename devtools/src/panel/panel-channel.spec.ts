import { describe, expect, it } from 'vitest'
import {
  connectPanelChannel,
  createPageScriptChannel,
  type InPageChannelProtocol,
} from 'devframe/in-page-channel'
import {
  formatValue,
  restoreClonedDeep,
  serializeDevtoolsValue,
} from '@pinia/colada-devtools/shared'
import { normalizeSharedStateValue, panelChannelCodec } from './panel-channel-codec.ts'

interface CacheState {
  data: {
    date: Date
    map: Map<string, number>
  }
}

interface TestChannelProtocol extends InPageChannelProtocol {
  sharedStates: {
    cache: CacheState
  }
}

function createCacheState(revision: number): CacheState {
  return {
    data: {
      date: new Date(`2026-09-0${revision}T12:00:00.000Z`),
      map: new Map([['revision', revision]]),
    },
  }
}

function expectCacheState(value: CacheState, expected: CacheState) {
  const normalized = normalizeSharedStateValue(value)

  expect(formatValue(normalized.data.date)).toBe(`Date(${expected.data.date.toISOString()})`)
  expect(normalized.data.map).toEqual(expected.data.map)
}

describe('panel channel shared state', () => {
  it('keeps deserialization at the channel boundary', () => {
    expect(panelChannelCodec).toHaveProperty('deserialize', restoreClonedDeep)
  })

  it('restores special values in both the initial snapshot and later updates', async () => {
    const name = 'pinia-colada:test-shared-state'
    const messageChannel = new MessageChannel()
    const initial = createCacheState(1)
    const updated = createCacheState(2)

    const pageChannel = createPageScriptChannel<TestChannelProtocol>({
      name,
      window: false,
      ...panelChannelCodec,
      functions: {},
    })
    const pageState = await pageChannel.sharedState.get('cache', {
      initialValue: serializeDevtoolsValue(initial),
    })
    pageChannel.addPanelPort(messageChannel.port1)

    const panelChannel = connectPanelChannel<TestChannelProtocol>({
      name,
      window: false,
      transport: messageChannel.port2,
      ...panelChannelCodec,
      functions: {},
    })

    try {
      const panelState = await panelChannel.sharedState.get('cache')
      expectCacheState(panelState.value() as CacheState, initial)

      const receivedUpdate = new Promise<void>((resolve) => {
        panelState.on('updated', () => resolve())
      })
      pageState.mutate(() => serializeDevtoolsValue(updated))
      await receivedUpdate

      expectCacheState(panelState.value() as CacheState, updated)
    } finally {
      panelChannel.close()
      pageChannel.close()
    }
  })
})
