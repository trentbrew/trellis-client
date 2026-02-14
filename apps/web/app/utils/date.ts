export function isYmdDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function extractYmd(value?: string | null): string {
  if (!value) return ''
  const m = String(value).match(/\d{4}-\d{2}-\d{2}/)
  return m?.[0] ?? ''
}

export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayYmdLocal(now: Date = new Date()): string {
  return formatYmdLocal(now)
}

export function parseYmdLocal(value?: string | null): Date | null {
  const ymd = extractYmd(value)
  if (!ymd || !isYmdDateString(ymd)) return null
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}
