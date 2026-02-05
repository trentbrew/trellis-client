import type { InjectionKey, Ref } from 'vue'

export type Range = 'hourly' | 'daily' | 'monthly' | 'quarterly'

export type GanttMode = 'edit' | 'read'

export type GanttStatus = {
  id: string
  name: string
  color: string
}

export type GanttFeature = {
  id: string
  name: string
  startAt: Date
  endAt: Date
  status: GanttStatus
}

export type GanttScheduleItemChangeAction = 'move' | 'resize-left' | 'resize-right'

export type GanttScheduleItemChange = {
  action: GanttScheduleItemChangeAction
  feature: GanttFeature
  startAt: Date
  endAt: Date | null
}

export type GanttMarkerProps = {
  id: string
  date: Date
  label: string
}

export type TimelineData = {
  year: number
  quarters: {
    months: {
      days: number
    }[]
  }[]
}[]

export type GanttContextProps = {
  mode: GanttMode
  zoom: number
  range: Range
  tickMinutes: number
  columnWidth: number
  sidebarWidth: number
  headerHeight: number
  rowHeight: number
  timelineStartDate: Date
  onAddItem: ((date: Date) => void) | undefined
  setZoom?: (zoom: number) => void
  setMode?: (mode: GanttMode) => void
  scrollToDate?: (date: Date, options?: { behavior?: ScrollBehavior }) => void
  scrollToToday?: () => void
  placeholderLength: number
  timelineData: TimelineData
  ref: Ref<HTMLDivElement | null>
}

export const GanttContextKey: InjectionKey<GanttContextProps> = Symbol.for(
  'GanttContext',
) as InjectionKey<GanttContextProps>
