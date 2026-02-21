/**
 * Shared state bridge between the CalendarView component and the
 * CalendarSidebarPanel rendered inside AppSidebar.
 *
 * Module-level refs are used intentionally — this state is purely
 * client-side UI, never needed during SSR, and represents a singleton
 * concern (there is only one active calendar page at a time).
 */

import type { EntityType } from '~/types/entity'

type CalendarViewMode = 'day' | 'week' | 'month' | 'year'

const _makeToday = (): Date => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const _currentDate = ref<Date>(new Date())
const _calendarViewMode = ref<CalendarViewMode>('month')
const _selectedTypes = ref<Set<EntityType>>(new Set())
const _hiddenGcalAccounts = ref<Set<string>>(new Set())

/** Stable "today at midnight" ref — updated once per day via a timer. */
const _today = ref<Date>(_makeToday())

/**
 * Sparse index of dates that have at least one calendar event.
 * Key format: "YYYY-MM-DD". Populated by CalendarView after its `events`
 * computed runs so CalendarSidebarPanel can use it for mini-calendar dots
 * without re-scanning the full items array.
 */
const _eventDateIndex = ref<Set<string>>(new Set())

let _midnightTimer: ReturnType<typeof setTimeout> | null = null

const _scheduleMidnightRefresh = () => {
  if (_midnightTimer !== null) return
  const now = new Date()
  const msUntilMidnight =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()
  _midnightTimer = setTimeout(() => {
    _midnightTimer = null
    _today.value = _makeToday()
    _scheduleMidnightRefresh()
  }, msUntilMidnight)
}

if (import.meta.client) {
  _scheduleMidnightRefresh()
}

export function useCalendarSidebarState() {
  const reset = () => {
    _currentDate.value = new Date()
    _calendarViewMode.value = 'month'
    _selectedTypes.value = new Set()
    _hiddenGcalAccounts.value = new Set()
    _eventDateIndex.value = new Set()
  }

  return {
    currentDate: _currentDate,
    calendarViewMode: _calendarViewMode,
    selectedTypes: _selectedTypes,
    hiddenGcalAccounts: _hiddenGcalAccounts,
    today: _today,
    eventDateIndex: _eventDateIndex,
    reset,
  }
}
