import { stripHtml } from '~/utils/stripHtml'
import type { LocationEntityType, MapPin, PinCandidate } from './types'

const LOCATION_TYPES = new Set<LocationEntityType>(['event', 'trip', 'appointment'])

export interface ExtractableEntity {
  id: string
  type?: string
  title?: string
  latitude?: number | string | null
  longitude?: number | string | null
  location?: unknown
  origin?: unknown
  destination?: unknown
}

function parseCoord(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function textValue(value: unknown): string {
  return stripHtml(value)
}

export function extractPinCandidates(entities: ExtractableEntity[]): PinCandidate[] {
  const seen = new Set<string>()
  const out: PinCandidate[] = []

  for (const entity of entities) {
    const type = entity.type as LocationEntityType | undefined
    if (!type || !LOCATION_TYPES.has(type)) continue

    const title = textValue(entity.title) || 'Untitled'
    const lat = parseCoord(entity.latitude)
    const lng = parseCoord(entity.longitude)

    if (lat != null && lng != null) {
      const key = `${entity.id}:coordinates`
      if (!seen.has(key)) {
        seen.add(key)
        out.push({
          entityId: entity.id,
          entityType: type,
          fieldKey: 'coordinates',
          label: title,
          queryText: null,
          lat,
          lng,
        })
      }
      continue
    }

    const addText = (fieldKey: string, raw: unknown, labelSuffix = '') => {
      const queryText = textValue(raw)
      if (!queryText) return
      const key = `${entity.id}:${fieldKey}`
      if (seen.has(key)) return
      seen.add(key)
      out.push({
        entityId: entity.id,
        entityType: type,
        fieldKey,
        label: `${title}${labelSuffix}`,
        queryText,
        lat: null,
        lng: null,
      })
    }

    if (type === 'event' || type === 'appointment') {
      addText('location', entity.location)
    } else if (type === 'trip') {
      addText('origin', entity.origin, ' (origin)')
      addText('destination', entity.destination, ' (destination)')
    }
  }

  return out
}

/** Offset overlapping pins in a simple spiral (max 3 attempts). */
export function applyPinCollisionOffsets(pins: MapPin[]): MapPin[] {
  const COORD_EPS = 0.0001
  const OFFSET_DEG = 0.00012
  const placed: MapPin[] = []

  for (const pin of pins) {
    let lat = pin.lat
    let lng = pin.lng
    let attempt = 0

    while (attempt < 3) {
      const collision = placed.some(
        (p) => Math.abs(p.lat - lat) < COORD_EPS && Math.abs(p.lng - lng) < COORD_EPS,
      )
      if (!collision) break
      attempt++
      const angle = attempt * 2.1
      lat = pin.lat + Math.sin(angle) * OFFSET_DEG * attempt
      lng = pin.lng + Math.cos(angle) * OFFSET_DEG * attempt
    }

    placed.push({ ...pin, lat, lng })
  }

  return placed
}
