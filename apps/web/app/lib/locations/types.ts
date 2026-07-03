export type LocationEntityType = 'event' | 'trip' | 'appointment'

export const LOCATION_ENTITY_TYPES: LocationEntityType[] = ['event', 'trip', 'appointment']

export interface PinCandidate {
  entityId: string
  entityType: LocationEntityType
  fieldKey: string
  label: string
  queryText: string | null
  lat: number | null
  lng: number | null
}

export interface MapPin {
  id: string
  entityId: string
  entityType: LocationEntityType
  fieldKey: string
  label: string
  lat: number
  lng: number
  placeName?: string
}

export interface GeocodeResult {
  lat: number
  lng: number
  placeName: string
}

export interface MapViewport {
  lng: number
  lat: number
  zoom: number
}

export const VIEWPORT_STORAGE_KEY = 'trellis:locations:viewport'
