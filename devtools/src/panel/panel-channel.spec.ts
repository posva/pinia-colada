import { describe, expect, it, vi } from 'vitest'
import {
  formatValue,
  restoreClonedDeep,
  serializeDevtoolsValue,
} from '@pinia/colada-devtools/shared'

interface ChannelOptions {
  deserialize?: (value: unknown) => unknown
}

const channel = vi.hoisted(() => ({
  options: undefined as ChannelOptions | undefined,
}))

vi.mock('devframe/in-page-channel', () => ({
  connectPanelChannel: (options: ChannelOptions) => {
    channel.options = options
    return {}
  },
}))

const { normalizeSharedStateValue } = await import('./panel-channel')

describe('panel channel', () => {
  it('keeps the deserializer at the channel boundary', () => {
    const wireSnapshot = serializeDevtoolsValue({
      data: { date: new Date('2026-09-01T12:00:00.000Z') },
    })

    const initialSnapshot = channel.options?.deserialize?.(wireSnapshot) ?? wireSnapshot
    const normalize = (value: unknown) =>
      normalizeSharedStateValue(value) as { data: { date: unknown } }

    expect(channel.options?.deserialize).toBe(restoreClonedDeep)
    expect(formatValue(normalize(initialSnapshot).data.date)).toBe('Date(2026-09-01T12:00:00.000Z)')
    expect(formatValue(normalize(wireSnapshot).data.date)).toBe('Date(2026-09-01T12:00:00.000Z)')
  })
})
