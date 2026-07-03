// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { joinPresence } from 'trellis/realtime'
import { zonePresenceRoom } from './config'

/** In-process BroadcastChannel mesh (mirrors trellis-node realtime tests). */
class MockBroadcastChannel {
  static readonly rooms = new Map<string, Set<MockBroadcastChannel>>()
  readonly name: string
  onmessage: ((event: { data: unknown }) => void) | null = null
  private listeners = new Set<(event: { data: unknown }) => void>()

  constructor(name: string) {
    this.name = name
    if (!MockBroadcastChannel.rooms.has(name)) {
      MockBroadcastChannel.rooms.set(name, new Set())
    }
    MockBroadcastChannel.rooms.get(name)!.add(this)
  }

  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void {
    if (type === 'message') this.listeners.add(listener)
  }

  postMessage(data: unknown): void {
    for (const peer of MockBroadcastChannel.rooms.get(this.name) ?? []) {
      if (peer === this) continue
      const event = { data }
      peer.onmessage?.(event)
      for (const listener of peer.listeners) listener(event)
    }
  }

  close(): void {
    MockBroadcastChannel.rooms.get(this.name)?.delete(this)
  }
}

const SHOWROOM_ZONE = 'entity:founder-facility-showroom'

describe('zone presence (ADR-002 P0)', () => {
  afterEach(() => {
    MockBroadcastChannel.rooms.clear()
  })

  it('zonePresenceRoom prefixes zone id', () => {
    expect(zonePresenceRoom(SHOWROOM_ZONE)).toBe(`zone:${SHOWROOM_ZONE}`)
    expect(zonePresenceRoom(SHOWROOM_ZONE)).not.toMatch(/^page:/)
  })

  it('two peers in the same zone room discover each other via BroadcastChannel', () => {
    const room = zonePresenceRoom(SHOWROOM_ZONE)
    const pageA = 'page-aaa'
    const pageB = 'page-bbb'

    const a = joinPresence({
      peerId: 'peer-a',
      room,
      initialPresence: {
        name: 'Ada',
        color: '#f00',
        zoneId: SHOWROOM_ZONE,
        pageId: pageA,
      },
      BroadcastChannelImpl: MockBroadcastChannel as unknown as typeof BroadcastChannel,
      heartbeatMs: 0,
    })

    const b = joinPresence({
      peerId: 'peer-b',
      room,
      initialPresence: {
        name: 'Bob',
        color: '#00f',
        zoneId: SHOWROOM_ZONE,
        pageId: pageB,
      },
      BroadcastChannelImpl: MockBroadcastChannel as unknown as typeof BroadcastChannel,
      heartbeatMs: 0,
    })

    const aOthers = a.getOthers()
    const bOthers = b.getOthers()

    expect(aOthers.map((p) => p.id)).toEqual(['peer-b'])
    expect(bOthers.map((p) => p.id)).toEqual(['peer-a'])
    expect(aOthers[0]?.state.pageId).toBe(pageB)
    expect(aOthers[0]?.state.zoneId).toBe(SHOWROOM_ZONE)

    a.leave()
    b.leave()
  })
})
