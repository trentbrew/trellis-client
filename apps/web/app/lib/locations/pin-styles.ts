import type { LocationEntityType } from './types'

export const PIN_COLORS: Record<LocationEntityType, string> = {
  event: '#fb923c',
  trip: '#60a5fa',
  appointment: '#34d399',
}

export const PIN_ICONS: Record<LocationEntityType, string> = {
  event: 'lucide:calendar',
  trip: 'lucide:map-pin',
  appointment: 'lucide:stethoscope',
}

export function pinColor(type: LocationEntityType): string {
  return PIN_COLORS[type] ?? '#888894'
}

export function pinIcon(type: LocationEntityType): string {
  return PIN_ICONS[type] ?? 'lucide:map-pin'
}
