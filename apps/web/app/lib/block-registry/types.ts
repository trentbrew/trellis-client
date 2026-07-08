export type SharedBlockKind =
  | 'html'
  | 'mermaid'
  | 'code'
  | 'queryView'
  | 'sheetRange'
  | 'entity'
  | 'file'
  | 'bookmark'

export type SharedBlockCapability =
  | 'sourceEditable'
  | 'sandboxed'
  | 'liveData'
  | 'supportsDeckMotion'
  | 'supportsThumbnail'

export type SharedBlockGroup = 'Text' | 'Data' | 'Media' | 'Compute' | 'Presentation'

export interface SharedBlockDefinition {
  kind: SharedBlockKind
  label: string
  description: string
  icon: string
  group: SharedBlockGroup
  accent: string
  capabilities: SharedBlockCapability[]
}

export interface HtmlEmbedSafety {
  allowScripts: false
  trusted: false
}

export interface HtmlEmbedConfig {
  kind: 'html'
  id?: string
  title?: string
  source: string
  height?: number
  safety: HtmlEmbedSafety
  lastValidSource?: string
}

export interface DeckObjectFrame {
  x: number
  y: number
  width: number
  height: number
  zIndex?: number
}

export interface DeckSlideObject {
  id: string
  kind: 'html'
  block: HtmlEmbedConfig
  frame: DeckObjectFrame
  style?: {
    fit?: 'contain' | 'cover' | 'scroll'
    frame?: 'none' | 'card' | 'glass'
  }
  motion?: {
    enter?: 'none' | 'fade' | 'rise'
    transitionDelayMs?: number
  }
}
