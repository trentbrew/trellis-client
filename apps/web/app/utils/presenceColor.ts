/**
 * presenceColor — deterministic per-user presence color palette.
 *
 * One call site, used everywhere presence is visualised:
 *   sidebar avatars, page avatar stack, AppHeader cluster,
 *   field cursors, typing indicators, activity / comment bubbles.
 *
 * Rules:
 *   - User HAS an avatar image → use `ring` class as a colored border
 *   - User has NO avatar image  → use `bg` class as the full bubble bg
 */

export interface PresenceColor {
  bg: string      // full background  e.g. 'bg-rose-500'
  ring: string    // ring / border    e.g. 'ring-rose-500'
  text: string    // text tint        e.g. 'text-rose-500'
  bgLight: string // subtle tint      e.g. 'bg-rose-500/15'
  hex: string     // raw hex for canvas/Y.js cursors e.g. '#f43f5e'
}

const PALETTE: PresenceColor[] = [
  { bg: 'bg-rose-500',    ring: 'ring-rose-500',    text: 'text-rose-500',    bgLight: 'bg-rose-500/15',    hex: '#f43f5e' },
  { bg: 'bg-orange-500',  ring: 'ring-orange-500',  text: 'text-orange-500',  bgLight: 'bg-orange-500/15',  hex: '#f97316' },
  { bg: 'bg-amber-500',   ring: 'ring-amber-500',   text: 'text-amber-500',   bgLight: 'bg-amber-500/15',   hex: '#f59e0b' },
  { bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-500', bgLight: 'bg-emerald-500/15', hex: '#10b981' },
  { bg: 'bg-teal-500',    ring: 'ring-teal-500',    text: 'text-teal-500',    bgLight: 'bg-teal-500/15',    hex: '#14b8a6' },
  { bg: 'bg-cyan-500',    ring: 'ring-cyan-500',    text: 'text-cyan-500',    bgLight: 'bg-cyan-500/15',    hex: '#06b6d4' },
  { bg: 'bg-blue-500',    ring: 'ring-blue-500',    text: 'text-blue-500',    bgLight: 'bg-blue-500/15',    hex: '#3b82f6' },
  { bg: 'bg-violet-500',  ring: 'ring-violet-500',  text: 'text-violet-500',  bgLight: 'bg-violet-500/15',  hex: '#8b5cf6' },
  { bg: 'bg-purple-500',  ring: 'ring-purple-500',  text: 'text-purple-500',  bgLight: 'bg-purple-500/15',  hex: '#a855f7' },
  { bg: 'bg-pink-500',    ring: 'ring-pink-500',    text: 'text-pink-500',    bgLight: 'bg-pink-500/15',    hex: '#ec4899' },
]

function hashUserId(userId: string): number {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  return hash
}

export function getPresenceColor(userId: string): PresenceColor {
  if (!userId) return PALETTE[0]!
  return PALETTE[hashUserId(userId) % PALETTE.length]!
}

export function getPresenceBg(userId: string): string {
  return getPresenceColor(userId).bg
}

export function getPresenceRing(userId: string): string {
  return getPresenceColor(userId).ring
}

export function getPresenceText(userId: string): string {
  return getPresenceColor(userId).text
}

export function getPresenceHex(userId: string): string {
  return getPresenceColor(userId).hex
}
